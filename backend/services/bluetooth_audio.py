import asyncio
import re

async def run_cmd_async(cmd):
    """Ejecuta un comando del sistema de forma asíncrona y retorna stdout, stderr y código de salida."""
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        return stdout.decode('utf-8', errors='ignore'), stderr.decode('utf-8', errors='ignore'), proc.returncode
    except Exception as e:
        return "", str(e), -1

async def list_devices():
    """Retorna la lista de dispositivos Bluetooth vinculados o conocidos con su estado."""
    stdout, _, code = await run_cmd_async(["bluetoothctl", "devices"])
    if code != 0:
        return []
    
    lines = stdout.strip().split("\n")
    tasks = []
    
    for line in lines:
        if not line:
            continue
        # Ejemplo: Device 8C:C5:D0:AD:E1:8B QF S25U
        parts = line.split(" ", 2)
        if len(parts) >= 3 and parts[0] == "Device":
            mac = parts[1]
            alias = parts[2]
            tasks.append(get_device_details(mac, alias))
            
    devices = []
    if tasks:
        devices = await asyncio.gather(*tasks)
    return devices

async def get_device_details(mac, alias):
    """Obtiene los detalles detallados de un dispositivo Bluetooth por su dirección MAC."""
    stdout, _, _ = await run_cmd_async(["bluetoothctl", "info", mac])
    
    paired = "Paired: yes" in stdout
    connected = "Connected: yes" in stdout
    trusted = "Trusted: yes" in stdout
    
    # Extraer el nombre real si existe
    name_match = re.search(r"^\s*Name:\s*(.*)$", stdout, re.MULTILINE)
    name = name_match.group(1).strip() if name_match else alias
    
    # Determinar si el dispositivo soporta perfiles de audio
    is_audio = any(profile in stdout for profile in ["Audio", "Headphone", "Speaker", "A/V Remote Control", "Handsfree"])
    
    return {
        "mac": mac,
        "name": name,
        "paired": paired,
        "connected": connected,
        "trusted": trusted,
        "is_audio": is_audio
    }

async def scan_devices():
    """Ejecuta un escaneo de dispositivos Bluetooth durante 3 segundos."""
    print("[BLUETOOTH] Iniciando escaneo de periféricos por 3 segundos...")
    await run_cmd_async(["bluetoothctl", "--timeout", "3", "scan", "on"])
    return await list_devices()

async def pair_device(mac):
    """Vincula un dispositivo Bluetooth."""
    stdout, stderr, code = await run_cmd_async(["bluetoothctl", "pair", mac])
    if code != 0:
        return {"success": False, "message": f"Error al vincular: {stderr or stdout}"}
    return {"success": True, "message": "Vinculado con éxito."}

async def trust_device(mac):
    """Confía en un dispositivo Bluetooth."""
    stdout, stderr, code = await run_cmd_async(["bluetoothctl", "trust", mac])
    if code != 0:
        return {"success": False, "message": f"Error al confiar: {stderr or stdout}"}
    return {"success": True, "message": "Establecido como de confianza."}

async def connect_device(mac):
    """Conecta un dispositivo Bluetooth, asegurando que sea de confianza primero."""
    await trust_device(mac)
    stdout, stderr, code = await run_cmd_async(["bluetoothctl", "connect", mac])
    if code != 0:
        # Si no está vinculado, intentamos vincularlo primero
        if "Failed to connect: org.bluez.Error.Failed" in stdout or "Not paired" in stderr:
            pair_res = await pair_device(mac)
            if not pair_res["success"]:
                return pair_res
            # Intentar conectar de nuevo tras vincular
            stdout, stderr, code = await run_cmd_async(["bluetoothctl", "connect", mac])
            if code != 0:
                return {"success": False, "message": f"Vinculado pero no se pudo conectar: {stderr or stdout}"}
        else:
            return {"success": False, "message": f"Error al conectar: {stderr or stdout}"}
            
    return {"success": True, "message": "Conectado con éxito."}

async def disconnect_device(mac):
    """Desconecta un dispositivo Bluetooth."""
    stdout, stderr, code = await run_cmd_async(["bluetoothctl", "disconnect", mac])
    if code != 0:
        return {"success": False, "message": f"Error al desconectar: {stderr or stdout}"}
    return {"success": True, "message": "Desconectado con éxito."}

async def remove_device(mac):
    """Elimina / desvincula un dispositivo Bluetooth de la lista de conocidos."""
    stdout, stderr, code = await run_cmd_async(["bluetoothctl", "remove", mac])
    if code != 0:
        return {"success": False, "message": f"Error al eliminar: {stderr or stdout}"}
    return {"success": True, "message": "Dispositivo olvidado con éxito."}

# --- SERVICIOS DE AUDIO ---

async def list_sinks():
    """Retorna la lista de salidas de audio y cuál es la predeterminada."""
    try:
        # Obtener el sink por defecto
        stdout_default, _, _ = await run_cmd_async(["pactl", "get-default-sink"])
        default_sink = stdout_default.strip()
        
        # Obtener todos los sinks disponibles
        stdout_list, _, _ = await run_cmd_async(["pactl", "list", "short", "sinks"])
        sinks = []
        
        for line in stdout_list.strip().split("\n"):
            if not line:
                continue
            # Ejemplo: 52  alsa_output.pci-...  PipeWire  s24-32le ...
            parts = line.split("\t")
            if len(parts) >= 2:
                sink_name = parts[1]
                
                # Asignar un nombre amigable al dispositivo
                display_name = sink_name
                if "bluez" in sink_name:
                    display_name = "Altavoz/Bocina Bluetooth"
                    # Si podemos extraer la MAC amigable del sink:
                    mac_match = re.search(r"bluez_sink\.([0-9A-F_]+)", sink_name, re.IGNORECASE)
                    if mac_match:
                        mac_clean = mac_match.group(1).replace("_", ":")
                        display_name = f"Bocina Bluetooth ({mac_clean})"
                elif "hdmi" in sink_name:
                    display_name = "Salida HDMI (Proyector/Pantalla)"
                elif "analog" in sink_name or "sof" in sink_name:
                    display_name = "Salida Analógica / Auxiliar Integrada"
                
                sinks.append({
                    "name": sink_name,
                    "display_name": display_name,
                    "is_default": sink_name == default_sink
                })
                
        return {
            "sinks": sinks,
            "default_sink": default_sink
        }
    except Exception as e:
        print(f"[AUDIO] Error al listar salidas: {e}")
        return {"sinks": [], "default_sink": ""}

async def set_default_sink(sink_name):
    """Establece la salida de audio predeterminada del sistema."""
    stdout, stderr, code = await run_cmd_async(["pactl", "set-default-sink", sink_name])
    if code != 0:
        return {"success": False, "message": f"Error al configurar salida predeterminada: {stderr or stdout}"}
    return {"success": True, "message": "Salida de audio configurada correctamente."}

async def get_volume():
    """Retorna el volumen actual de la salida por defecto en porcentaje (0-100)."""
    try:
        stdout, _, code = await run_cmd_async(["pactl", "get-sink-volume", "@DEFAULT_SINK@"])
        if code == 0:
            matches = re.findall(r"(\d+)%", stdout)
            if matches:
                return int(matches[0])
    except Exception as e:
        print(f"[AUDIO] Error al obtener volumen: {e}")
    return 100

async def set_volume(level: int):
    """Establece el nivel de volumen en la salida por defecto (0-100)."""
    level = max(0, min(100, level))
    stdout, stderr, code = await run_cmd_async(["pactl", "set-sink-volume", "@DEFAULT_SINK@", f"{level}%"])
    if code != 0:
        return {"success": False, "message": f"Error al establecer volumen: {stderr or stdout}"}
    return {"success": True, "message": f"Volumen ajustado al {level}%."}

async def play_test_sound():
    """Reproduce un sonido corto en segundo plano para verificar el altavoz activo."""
    try:
        # Usar aplay para mandar un sonido directamente a la salida de audio por defecto
        # Se ejecuta sin wait() para retornar instantáneamente en la API rest
        await asyncio.create_subprocess_exec(
            "aplay", "/usr/share/sounds/alsa/Front_Center.wav",
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL
        )
        return {"success": True, "message": "Sonido de prueba emitido."}
    except Exception as e:
        return {"success": False, "message": f"Error al emitir sonido: {e}"}
