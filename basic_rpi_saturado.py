#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
================================================================================
RPLIDAR C1 - Script de Pruebas Asíncrono para Raspberry Pi (SSH / Modo Texto)
================================================================================
Este script permite probar y validar el RPLidar C1 a través de una conexión SSH.
No requiere entorno gráfico (X11/matplotlib) y ofrece 3 modos de visualización:
1. Dashboard (Predeterminado): Radar ASCII en tiempo real y distancias por sector.
2. Vector (--vector): Imprime el vector completo de 360 grados periódicamente.
3. Raw (--raw): Muestra el flujo continuo de puntos (Ángulo, Distancia, Calidad).

Uso:
  python basic_rpi.py --port /dev/ttyUSB0
  python basic_rpi.py --vector
  python basic_rpi.py --raw
================================================================================
"""

import os
import sys
import math
import time
import asyncio
import argparse

# --- CONFIGURACIÓN DE RUTAS ---
# Permitir que el script encuentre la librería local si está en la subcarpeta rplidarc1
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(CURRENT_DIR)
sys.path.append(os.path.join(CURRENT_DIR, "rplidarc1"))

try:
    from rplidarc1 import RPLidar
except ImportError:
    try:
        from rplidarc1.rplidarc1 import RPLidar
    except ImportError:
        print("\033[91mError: No se pudo importar rplidarc1.\033[0m")
        print("Asegúrate de:")
        print("  1. Haber clonado el repositorio 'rplidarc1' en esta carpeta.")
        print("  2. Instalar las dependencias: pip install -r requirements.txt")
        print("  3. Instalar la librería local: pip install -e ./rplidarc1")
        sys.exit(1)

# --- CONFIGURACIÓN POR DEFECTO ---
DEFAULT_PORT = "/dev/ttyUSB0"  # Puerto serial estándar en Raspberry Pi para adaptadores USB
DEFAULT_BAUDRATE = 460800      # Baudrate por defecto para RPLidar C1
MAX_RANGE_MM = 1000           # Rango máximo de visualización en el radar (1 metro / 100 cm)

# --- ESTRUCTURAS DE DATOS GLOBALES ---
scan_vector = [0.0] * 360      # Vector de 360 elementos (índice = ángulo en grados, valor = distancia en mm)
point_counter = 0              # Contador total de puntos leídos
scan_frequency = 0.0           # Frecuencia estimada de rotación (Hz)
last_freq_calc_time = time.time()
points_in_last_sec = 0

# --- FUNCIONES DE SOPORTE ---

def clear_screen():
    """Limpia la terminal de forma ultra rápida y sin parpadeos usando secuencias ANSI."""
    sys.stdout.write("\033[H\033[J")
    sys.stdout.flush()

def check_serial_permission(port):
    """
    Diagnostica y muestra consejos útiles si hay problemas de permisos seriales.
    Esto es sumamente común al usar Raspberry Pi por primera vez con puertos seriales.
    """
    print(f"\n\033[93m[DIAGNÓSTICO DE CONEXIÓN]\033[0m")
    print(f"Intentando acceder al puerto: {port}")
    
    # Comprobar si existe el puerto
    if not os.path.exists(port):
        print(f"\033[91mError: El puerto '{port}' no existe.\033[0m")
        print("Sugerencias:")
        print("  - Verifica que el LiDAR esté conectado por USB al Raspberry Pi.")
        print("  - Ejecuta 'ls /dev/ttyUSB*' para listar puertos USB activos.")
        return

    # Si existe, comprobar permisos de lectura/escritura
    if not os.access(port, os.R_OK) or not os.access(port, os.W_OK):
        print(f"\033[91mError: No tienes permisos de lectura/escritura en '{port}'.\033[0m")
        print("Solución permanente (Recomendado):")
        print(f"  sudo usermod -a -G dialout $USER")
        print("  (Nota: Debes cerrar sesión y volver a iniciarla para aplicar el cambio)")
        print("\nSolución rápida temporal:")
        print(f"  sudo chmod 666 {port}")
        print("\nO ejecuta el script con privilegios de superusuario:")
        print(f"  sudo python basic_rpi.py --port {port}")
    else:
        print("\033[92mPermisos correctos. Si falla, el dispositivo podría estar ocupado por otro proceso.\033[0m")

def get_radar_template(width=31, height=15):
    """
    Genera una plantilla de fondo con una rejilla de radar circular limpia y ejes coordenados,
    compensando la relación de aspecto del terminal de texto (~2:1).
    """
    grid = [[" " for _ in range(width)] for _ in range(height)]
    center_x = width // 2
    center_y = height // 2
    
    for y in range(height):
        for x in range(width):
            # Relación de aspecto compensada para terminal
            dx = (x - center_x) / center_x
            dy = (y - center_y) / center_y
            r = math.sqrt(dx*dx + dy*dy)
            
            # Anillo de rango exterior
            if 0.96 <= r <= 1.04:
                grid[y][x] = "\033[90m·\033[0m"
            # Anillo de rango medio (1.5 metros)
            elif 0.46 <= r <= 0.54:
                grid[y][x] = "\033[90m·\033[0m"
            # Ejes cardinales
            elif x == center_x and y == center_y:
                grid[y][x] = "\033[91m▲\033[0m"  # LiDAR en el centro
            elif x == center_x:
                grid[y][x] = "\033[90m│\033[0m"
            elif y == center_y:
                grid[y][x] = "\033[90m─\033[0m"
                
    return grid

def calculate_sectors():
    """
    Divide el vector de 360 grados en 8 sectores cardinales y calcula la
    distancia mínima (el obstáculo más cercano) en cada uno.
    """
    sectors = {
        "N (Frente) ": (337.5, 22.5),
        "NE         ": (22.5, 67.5),
        "E (Derecha)": (67.5, 112.5),
        "SE         ": (112.5, 157.5),
        "S (Atrás)  ": (157.5, 202.5),
        "SO         ": (202.5, 247.5),
        "O (Izq.)   ": (247.5, 292.5),
        "NO         ": (292.5, 337.5)
    }
    
    results = {}
    for name, (start, end) in sectors.items():
        distances = []
        if start > end:  # Cruce de 0 grados (Norte)
            # De start a 360
            distances.extend([scan_vector[i] for i in range(int(start), 360) if scan_vector[i] > 0])
            # De 0 a end
            distances.extend([scan_vector[i] for i in range(0, int(end)) if scan_vector[i] > 0])
        else:
            distances.extend([scan_vector[i] for i in range(int(start), int(end)) if scan_vector[i] > 0])
            
        if distances:
            results[name] = min(distances)
        else:
            results[name] = float('inf')
            
    return results

# --- TAREAS ASÍNCRONAS ---

async def collect_points(lidar_obj, raw_mode):
    """
    Lee continuamente los datos de la cola del LiDAR, actualiza el vector de 360 grados
    y realiza cálculos de métricas y rendimiento.
    """
    global scan_vector, point_counter, scan_frequency, last_freq_calc_time, points_in_last_sec
    
    while not lidar_obj.stop_event.is_set():
        try:
            # Leemos de la cola asíncrona con un timeout corto
            point = await asyncio.wait_for(lidar_obj.output_queue.get(), timeout=0.1)
            
            angle = point['a_deg']
            dist = point['d_mm']
            qual = point['q']
            
            point_counter += 1
            points_in_last_sec += 1
            
            # Incorporar la lectura al vector de 360 grados con saturación a 1000 mm (100 cm)
            int_angle = int(round(angle)) % 360
            
            if dist is not None and dist > 0:
                # Cualquier valor superior a 1000 mm (100 cm) se satura a 1000 mm
                saturated_dist = min(dist, 1000.0)
                scan_vector[int_angle] = saturated_dist
                
                if raw_mode:
                    print(f"[{point_counter:05d}] Ángulo: {angle:6.2f}° | Distancia: {saturated_dist:6.1f} mm | Calidad: {qual} (Saturado)")
            else:
                # Si no hay lectura (sin obstáculo en rango o pérdida de señal), satura a 1000 mm
                # Esto mantiene el vector completo, eliminando ruidos y parpadeos en la terminal
                scan_vector[int_angle] = 1000.0
            
            # Calcular frecuencia de actualización cada segundo
            now = time.time()
            if now - last_freq_calc_time >= 1.0:
                # El sensor entrega aprox. 320-360 puntos por revolución a 10Hz
                # Estimamos la frecuencia basándonos en la tasa de transferencia de puntos
                scan_frequency = (points_in_last_sec / 360.0) / (now - last_freq_calc_time)
                points_in_last_sec = 0
                last_freq_calc_time = now
                
            lidar_obj.output_queue.task_done()
            
        except asyncio.TimeoutError:
            # Es completamente normal si no hay puntos inmediatamente
            continue
        except asyncio.CancelledError:
            break
        except Exception as e:
            # Ignorar de forma segura errores menores de deserialización
            pass

async def display_loop(lidar_obj, mode, port, range_limit):
    """
    Bucle encargado de mostrar los resultados en pantalla según el modo elegido.
    No interfiere con la lectura asíncrona del LiDAR.
    """
    if mode == "raw":
        # En modo raw, los puntos se imprimen al llegar en la tarea collect_points
        return

    try:
        while not lidar_obj.stop_event.is_set():
            if mode == "dashboard":
                clear_screen()
                
                # Generar plantilla de radar limpia
                grid_w, grid_h = 31, 15
                grid = get_radar_template(width=grid_w, height=grid_h)
                center_x = grid_w // 2
                center_y = grid_h // 2
                
                # Mapear los puntos del vector de 360 grados al plano ASCII
                scale_x = range_limit / center_x
                scale_y = range_limit / center_y
                
                for angle_deg in range(360):
                    dist = scan_vector[angle_deg]
                    # Solo dibujamos obstáculos que estén estrictamente dentro del rango de 100 cm (1000 mm)
                    # Si está saturado a 1000 mm, representa 'libre' (sin obstáculo en rango)
                    if 0 < dist < range_limit:
                        rad = math.radians(angle_deg)
                        # Cálculo con compensación de ejes (0° arriba, horario)
                        x = center_x + int((dist * math.sin(rad)) / scale_x)
                        y = center_y - int((dist * math.cos(rad)) / scale_y)
                        
                        if 0 <= x < grid_w and 0 <= y < grid_h:
                            # Evitamos sobreescribir el centro del sensor
                            if not (x == center_x and y == center_y):
                                grid[y][x] = "\033[96m●\033[0m"  # Obstáculo en cian resplandeciente
                
                # Imprimir interfaz de cabecera
                print("┌────────────────────────────────────────────────────────┐")
                print("│ \033[1;96mRPLIDAR C1 - PANEL DE MONITOREO EN SSH (TEXTO)\033[0m         │")
                print("└────────────────────────────────────────────────────────┘")
                print(f" Puerto: \033[93m{port}\033[0m | Est. Freq: \033[92m{scan_frequency*10:.1f} Hz\033[0m | Ptos Totales: \033[92m{point_counter}\033[0m")
                print(f" Límite Visual: \033[95m{range_limit/1000:.1f} metros\033[0m (Ajustable con --range)")
                print("----------------------------------------------------------")
                print("                ▲ FRENTE / NORTE (0°)")
                
                # Imprimir el radar ASCII
                for row in grid:
                    print(" " * 12 + "".join(row))
                print("                ▼ ATRÁS / SUR (180°)")
                print("----------------------------------------------------------")
                
                # Calcular y mostrar las distancias mínimas por sectores cardinales
                sectors = calculate_sectors()
                print(" Obstáculos más cercanos por dirección:")
                
                keys = list(sectors.keys())
                for i in range(0, len(keys), 2):
                    sec1, sec2 = keys[i], keys[i+1]
                    # Si la distancia mínima es menor que 1000.0, hay un obstáculo real dentro de la zona de protección
                    dist1 = f"{sectors[sec1]:.0f} mm" if sectors[sec1] < 1000.0 else " >100 cm"
                    dist2 = f"{sectors[sec2]:.0f} mm" if sectors[sec2] < 1000.0 else " >100 cm"
                    
                    # Colorear en rojo si hay obstáculos a menos de 500 mm (Cuidado de choque)
                    c1 = "\033[91m" if (sectors[sec1] < 500.0) else "\033[0m"
                    c2 = "\033[91m" if (sectors[sec2] < 500.0) else "\033[0m"
                    
                    print(f"  [{sec1}]: {c1}{dist1:>7}\033[0m    │    [{sec2}]: {c2}{dist2:>7}\033[0m")
                    
                print("----------------------------------------------------------")
                print(" [Ctrl+C] para detener y apagar el motor de forma segura.")
                
                await asyncio.sleep(0.3)  # Actualiza a aprox. 3 FPS (Ideal para SSH)
                
            elif mode == "vector":
                # Imprime el vector completo como un arreglo de Python
                clear_screen()
                print("┌────────────────────────────────────────────────────────┐")
                print("│ \033[1;92mRPLIDAR C1 - REPRESENTACIÓN DEL VECTOR COMPLETO (360°)\033[0m │")
                print("└────────────────────────────────────────────────────────┘")
                print(f"Puerto: {port} | Frecuencia: {scan_frequency*10:.1f} Hz | Puntos: {point_counter}")
                print("\nEstructura: [Ángulo 0°, Ángulo 1°, ..., Ángulo 359°] (mm)")
                print("----------------------------------------------------------")
                
                # Formatear el vector en líneas ordenadas de 20 elementos
                formatted_vector = []
                for i in range(0, 360, 15):
                    chunk = scan_vector[i:i+15]
                    chunk_str = ", ".join([f"{x:4.0f}" if x > 0 else "   0" for x in chunk])
                    formatted_vector.append(f"Degs {i:03d}-{i+14:03d}: [{chunk_str}]")
                
                print("\n".join(formatted_vector))
                print("----------------------------------------------------------")
                print("Imprimiendo vector en tiempo real. [Ctrl+C] para salir.")
                
                await asyncio.sleep(1.0)  # Imprimir una vez por segundo para evitar spam
                
    except asyncio.CancelledError:
        pass

async def main():
    # --- PARSEO DE ARGUMENTOS ---
    parser = argparse.ArgumentParser(description="Probador SSH básico de RPLidar C1 para Raspberry Pi.")
    parser.add_argument("--port", type=str, default=DEFAULT_PORT, help="Puerto serial al que está conectado el LiDAR (ej: /dev/ttyUSB0)")
    parser.add_argument("--baudrate", type=int, default=DEFAULT_BAUDRATE, help="Baudrate para el puerto serial (default: 460800)")
    parser.add_argument("--range", type=int, default=MAX_RANGE_MM, help="Rango máximo de distancia a renderizar en el radar en mm (default: 3000)")
    
    # Exclusividad mutua de modos
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--vector", action="store_true", help="Activa el modo impresión del vector de 360 elementos.")
    group.add_argument("--raw", action="store_true", help="Activa el modo streaming crudo en tiempo real de cada punto.")
    
    args = parser.parse_args()

    mode = "dashboard"
    if args.vector:
        mode = "vector"
    elif args.raw:
        mode = "raw"

    lidar = None
    stop_event = asyncio.Event()

    print("\033[96mIniciando el sistema de pruebas del RPLidar C1...\033[0m")
    
    try:
        # Intentamos inicializar el puerto serial
        lidar = RPLidar(port=args.port, baudrate=args.baudrate)
        lidar.stop_event = stop_event
        
    except Exception as e:
        print(f"\n\033[91mError crítico al conectar con el LiDAR C1: {e}\033[0m")
        check_serial_permission(args.port)
        print("\nCerrando script.")
        return

    # Iniciar escaneo en el hardware
    scan_coroutine = lidar.simple_scan()

    # Creación y ejecución paralela de tareas asíncronas
    scan_task = asyncio.create_task(scan_coroutine)
    collect_task = asyncio.create_task(collect_points(lidar, args.raw))
    display_task = asyncio.create_task(display_loop(lidar, mode, args.port, args.range))

    print(f"\033[92m¡Láser y Motor inicializados con éxito! Modo: {mode.upper()}\033[0m")
    if mode == "dashboard":
        print("Cargando interfaz visual interactiva en 1 segundo...")
        await asyncio.sleep(1.0)

    try:
        # Esperamos a que terminen las tareas o ocurra una interrupción
        await asyncio.gather(scan_task, collect_task, display_task)
    except (KeyboardInterrupt, asyncio.CancelledError):
        print("\n\033[93mDeteniendo adquisición de forma controlada...\033[0m")
    finally:
        # Apagado y limpieza ordenada
        stop_event.set()
        
        # Cancelar tareas activas de asyncio de forma limpia
        for task in [scan_task, collect_task, display_task]:
            task.cancel()
            
        # Damos un momento para que se detenga el bucle asíncrono
        await asyncio.gather(scan_task, collect_task, display_task, return_exceptions=True)
        
        if lidar:
            print("\033[96mApagando láser, deteniendo motor y cerrando el puerto serial...\033[0m")
            lidar.shutdown()
            print("\033[92m¡LiDAR desconectado y apagado correctamente! Sesión de pruebas finalizada.\033[0m")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nScript finalizado por teclado.")
