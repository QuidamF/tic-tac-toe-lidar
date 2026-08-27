import asyncio
import sys
import math
import os
import subprocess
from asyncio.subprocess import Process

class LanhaiLidar:
    """
    Adapter class for the Lanhai LDS-50C-2A lidar.
    It matches the interface of RPLidar so the main service can use it seamlessly.
    It launches the compiled uart-demo binary in a subprocess and reads stdout to parse points.
    """
    def __init__(self, port, baudrate):
        self.port = port
        self.baudrate = baudrate
        self.output_queue = asyncio.Queue()
        self.stop_event = asyncio.Event()
        self.process: Process = None
        
        # We need the absolute path to the lanhai driver bin
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.abspath(os.path.join(current_dir, "../../"))
        self.bin_path = os.path.join(project_root, "lanhai-driver", "bin", "uart-demo")
        self.param_path = os.path.join(project_root, "lanhai-driver", "params", "LDS-50C-2.txt")
        
        if not os.path.exists(self.bin_path):
            print(f"[LANHAI] Advertencia: No se encontró el binario compilado en {self.bin_path}.")

    def shutdown(self):
        """Detiene el subprocess."""
        if self.process:
            try:
                self.process.terminate()
            except Exception:
                pass

    async def _read_stream(self):
        """Lee el stdout del proceso en una tarea."""
        try:
            while not self.stop_event.is_set():
                line = await self.process.stdout.readline()
                if not line:
                    break
                line = line.decode('utf-8').strip()
                
                # Nuestra modificación en user.cpp imprime: LDP <angle_rad> <dist_m> <confidence>
                if line.startswith("LDP"):
                    parts = line.split(" ")
                    if len(parts) >= 4:
                        try:
                            angle_rad = float(parts[1])
                            dist_m = float(parts[2])
                            
                            # Convertimos a grados [0-360] y mm para ser compatibles con rplidarc1
                            # El Lanhai envía de -pi a pi
                            angle_deg = math.degrees(angle_rad) % 360.0
                            dist_mm = dist_m * 1000.0
                            
                            point = {
                                'a_deg': angle_deg,
                                'd_mm': dist_mm
                            }
                            # Enviar al queue con el mismo formato que rplidarc1
                            self.output_queue.put_nowait(point)
                            
                        except ValueError:
                            pass
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"[LANHAI] Error leyendo stream: {e}")

    async def simple_scan(self):
        """
        Simula el simple_scan() the rplidarc1. 
        Mantiene el proceso vivo hasta que stop_event se activa.
        """
        print(f"[LANHAI] Iniciando uart-demo con port={self.port}, params={self.param_path}")
        
        try:
            self.process = await asyncio.create_subprocess_exec(
                self.bin_path, self.param_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT
            )
            
            # Lanzar tarea de lectura
            read_task = asyncio.create_task(self._read_stream())
            
            # Esperar a que nos pidan detener
            await self.stop_event.wait()
            
            # Detener proceso
            self.shutdown()
            await read_task
            await self.process.wait()
            print("[LANHAI] Proceso detenido.")
            
        except Exception as e:
            print(f"[LANHAI] Error iniciando subprocess: {e}")
            raise
