import json
import paho.mqtt.client as mqtt

# Cliente global de MQTT
mqtt_client = None
is_connected = False

def on_connect(client, userdata, flags, rc, properties=None):
    """Callback ejecutado al conectar con el broker MQTT."""
    global is_connected
    if rc == 0:
        is_connected = True
        print("[MQTT] Conectado exitosamente al broker.")
    else:
        is_connected = False
        print(f"[MQTT] Error de conexión, código de retorno: {rc}")

def on_disconnect(client, userdata, rc, properties=None):
    """Callback ejecutado al desconectarse del broker."""
    global is_connected
    is_connected = False
    print("[MQTT] Desconectado del broker.")

def connect_mqtt(config: dict):
    """
    Inicializa y conecta el cliente MQTT de forma asíncrona (con bucle de fondo).
    No bloquea si el broker no está disponible.
    """
    global mqtt_client
    
    broker = config["mqtt_broker"]
    port = config["mqtt_port"]
    
    print(f"[MQTT] Intentando conectar a {broker}:{port}...")
    try:
        # Paho-MQTT v2.x requiere declarar CallbackAPIVersion
        mqtt_client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
        mqtt_client.on_connect = on_connect
        mqtt_client.on_disconnect = on_disconnect
        
        # Conexión asíncrona para evitar congelar el inicio
        mqtt_client.connect_async(broker, port, keepalive=60)
        mqtt_client.loop_start()
    except Exception as e:
        print(f"[MQTT] Error crítico al inicializar cliente MQTT: {e}")

def publish_cell(cell_name: str):
    """Publica la celda detectada en el canal de juego."""
    global mqtt_client, is_connected
    if mqtt_client and is_connected:
        try:
            mqtt_client.publish("game/cell", cell_name, qos=1)
            print(f"[MQTT] Publicado game/cell -> {cell_name}")
        except Exception as e:
            print(f"[MQTT] Error al publicar en game/cell: {e}")

def publish_led(cell_name: str, config: dict, state: bool = True):
    """
    Obtiene el pin GPIO asignado a la celda desde la configuración,
    envía un JSON detallado a 'game/leds' y el formato simple 'pin:state' a 'esp32/gpio'.
    """
    global mqtt_client, is_connected
    if not mqtt_client or not is_connected:
        return
        
    # Obtener el pin GPIO dinámico desde el diccionario de configuración
    gpio_key = f"gpio_{cell_name}"
    pin = config.get(gpio_key, -1)
    
    # 1. Enviar formato JSON original (para otros suscriptores)
    payload = {
        "cell": cell_name,
        "state": state,
        "gpio": pin
    }
    try:
        mqtt_client.publish("game/leds", json.dumps(payload), qos=1)
        print(f"[MQTT] Publicado game/leds -> {payload}")
    except Exception as e:
        print(f"[MQTT] Error al publicar en game/leds: {e}")
        
    # 2. Enviar formato de compatibilidad simple "pin:action" a "esp32/gpio"
    if pin != -1:
        action = "on" if state else "off"
        msg = f"{pin}:{action}"
        try:
            mqtt_client.publish("esp32/gpio", msg, qos=1)
            print(f"[MQTT] Publicado esp32/gpio -> {msg}")
        except Exception as e:
            print(f"[MQTT] Error al publicar en esp32/gpio: {e}")

def publish_move_led(cell_name: str, player: str, config: dict):
    """
    Obtiene el pin GPIO asignado a la ficha del jugador (X o O) en la celda y lo enciende.
    También lo publica en JSON original a game/moves y formato simple a esp32/gpio.
    """
    global mqtt_client, is_connected
    if not mqtt_client or not is_connected:
        return
        
    gpio_key = f"gpio_{cell_name}_{player.lower()}"
    pin = config.get(gpio_key, -1)
    
    # 1. Enviar formato JSON original
    payload = {
        "cell": cell_name,
        "player": player,
        "gpio": pin,
        "state": True
    }
    try:
        mqtt_client.publish("game/moves", json.dumps(payload), qos=1)
        print(f"[MQTT] Publicado game/moves -> {payload}")
    except Exception as e:
        print(f"[MQTT] Error al publicar en game/moves: {e}")
        
    # 2. Enviar formato de compatibilidad simple "pin:on" a "esp32/gpio"
    if pin != -1:
        msg = f"{pin}:on"
        try:
            mqtt_client.publish("esp32/gpio", msg, qos=1)
            print(f"[MQTT] Publicado esp32/gpio -> {msg}")
        except Exception as e:
            print(f"[MQTT] Error al publicar en esp32/gpio: {e}")

def publish_clear_move_led(cell_name: str, player: str, config: dict):
    """
    Obtiene el pin GPIO asignado a la ficha del jugador (X o O) en la celda y lo apaga.
    También lo publica en JSON original a game/moves y formato simple a esp32/gpio.
    """
    global mqtt_client, is_connected
    if not mqtt_client or not is_connected:
        return
        
    gpio_key = f"gpio_{cell_name}_{player.lower()}"
    pin = config.get(gpio_key, -1)
    
    # 1. Enviar formato JSON original
    payload = {
        "cell": cell_name,
        "player": player,
        "gpio": pin,
        "state": False
    }
    try:
        mqtt_client.publish("game/moves", json.dumps(payload), qos=1)
        print(f"[MQTT] Publicado game/moves (clear) -> {payload}")
    except Exception as e:
        print(f"[MQTT] Error al publicar en game/moves: {e}")
        
    # 2. Enviar formato de compatibilidad simple "pin:off" a "esp32/gpio"
    if pin != -1:
        msg = f"{pin}:off"
        try:
            mqtt_client.publish("esp32/gpio", msg, qos=1)
            print(f"[MQTT] Publicado esp32/gpio -> {msg}")
        except Exception as e:
            print(f"[MQTT] Error al publicar en esp32/gpio: {e}")

def publish_game_state(event_type: str, data: dict):
    """Publica cambios en el estado global del juego (game/reset o game/winner)."""
    global mqtt_client, is_connected
    if mqtt_client and is_connected:
        topic = f"game/{event_type}"
        try:
            mqtt_client.publish(topic, json.dumps(data), qos=1)
            print(f"[MQTT] Publicado {topic} -> {data}")
        except Exception as e:
            print(f"[MQTT] Error al publicar en {topic}: {e}")
            
        # Si la partida se reinicia, apagar todos los LEDs físicos en ambos protocolos
        if event_type == "reset":
            cells = [
                "top_left", "top_center", "top_right",
                "mid_left", "center", "mid_right",
                "bottom_left", "bottom_center", "bottom_right"
            ]
            from config.runtime import runtime_config
            for cell in cells:
                for suffix in ["", "_x", "_o"]:
                    gpio_key = f"gpio_{cell}{suffix}"
                    pin = runtime_config.get(gpio_key, -1)
                    if pin != -1:
                        # Apagar en formato esp32/gpio
                        try:
                            mqtt_client.publish("esp32/gpio", f"{pin}:off", qos=1)
                        except Exception:
                            pass
                        try:
                            payload = {"cell": cell, "state": False, "gpio": pin, "type": suffix.strip("_")}
                            mqtt_client.publish("game/leds", json.dumps(payload), qos=1)
                        except Exception:
                            pass
            print("[MQTT] Apagados todos los LEDs físicos (toque, X, O) por reinicio de juego.")

def publish_turn_leds(current_player: str, winner: str, config: dict):
    """
    Enciende el LED físico del turno correspondiente y apaga el otro.
    Si hay ganador o empate, apaga ambos.
    """
    global mqtt_client, is_connected
    if not mqtt_client or not is_connected:
        return
        
    pin_x = config.get("gpio_turn_x", -1)
    pin_o = config.get("gpio_turn_o", -1)
    
    # Publicar para X
    if pin_x != -1:
        action_x = "on" if (not winner and current_player == "X") else "off"
        msg_x = f"{pin_x}:{action_x}"
        try:
            mqtt_client.publish("esp32/gpio", msg_x, qos=1)
            print(f"[MQTT] Turno X -> esp32/gpio: {msg_x}")
        except Exception as e:
            print(f"[MQTT] Error al publicar turno X en esp32/gpio: {e}")
            
    # Publicar para O
    if pin_o != -1:
        action_o = "on" if (not winner and current_player == "O") else "off"
        msg_o = f"{pin_o}:{action_o}"
        try:
            mqtt_client.publish("esp32/gpio", msg_o, qos=1)
            print(f"[MQTT] Turno O -> esp32/gpio: {msg_o}")
        except Exception as e:
            print(f"[MQTT] Error al publicar turno O en esp32/gpio: {e}")

def reconnect_mqtt(config: dict):
    """Detiene la conexión MQTT previa si existe, e inicia una nueva con la configuración actualizada."""
    global mqtt_client, is_connected
    print("[MQTT] Solicitando reconexión por cambio de configuración...")
    
    # Detener cliente previo si existe
    if mqtt_client:
        try:
            mqtt_client.loop_stop()
            mqtt_client.disconnect()
            print("[MQTT] Cliente anterior detenido y desconectado.")
        except Exception as e:
            print(f"[MQTT] Error al desconectar cliente anterior: {e}")
            
    is_connected = False
    connect_mqtt(config)


