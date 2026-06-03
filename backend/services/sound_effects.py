import math
import struct
import asyncio

def generate_tone_bytes(freq_fn, duration, sample_rate=44100, wave_type="square", volume=0.15):
    """
    Genera bytes PCM crudos (16-bit mono 44.1kHz) para una forma de onda y frecuencia específica.
    Permite frecuencia fija o una función generadora para barridos.
    """
    num_samples = int(sample_rate * duration)
    data = bytearray(num_samples * 2)
    
    phase = 0.0
    for i in range(num_samples):
        t = i / sample_rate
        
        if callable(freq_fn):
            freq = freq_fn(t)
        else:
            freq = freq_fn
            
        phase += 2.0 * math.pi * freq / sample_rate
        phase %= 2.0 * math.pi
        
        if wave_type == "sine":
            val = math.sin(phase)
        elif wave_type == "square":
            val = 1.0 if phase < math.pi else -1.0
        elif wave_type == "sawtooth":
            val = 1.0 - (phase / math.pi)
        elif wave_type == "triangle":
            if phase < math.pi:
                val = -1.0 + 2.0 * (phase / math.pi)
            else:
                val = 3.0 - 2.0 * (phase / math.pi)
        else:
            val = math.sin(phase)
            
        # Desvanecimiento lineal para suavizar clicks
        fade = 1.0 - (t / duration)
        amplitude = val * volume * fade
        
        sample = int(amplitude * 32767)
        sample = max(-32768, min(32767, sample))
        struct.pack_into("<h", data, i * 2, sample)
        
    return bytes(data)

async def play_pcm_bytes(pcm_bytes):
    """Escribe los bytes PCM crudos directamente a stdin de aplay de forma no bloqueante."""
    try:
        proc = await asyncio.create_subprocess_exec(
            "aplay", "-t", "raw", "-r", "44100", "-f", "S16_LE", "-c", "1", "-",
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL
        )
        await proc.communicate(input=pcm_bytes)
    except Exception as e:
        print(f"[SOUND] Error al reproducir audio de fondo: {e}")

# Buffer de cache para efectos de sonido pre-renderizados
START_SOUND_BYTES = b""
MOVE_X_SOUND_BYTES = b""
MOVE_O_SOUND_BYTES = b""
STEAL_SOUND_BYTES = b""
WIN_SOUND_BYTES = b""
RESET_SOUND_BYTES = b""

def init_sounds():
    global START_SOUND_BYTES, MOVE_X_SOUND_BYTES, MOVE_O_SOUND_BYTES, STEAL_SOUND_BYTES, WIN_SOUND_BYTES, RESET_SOUND_BYTES
    
    # 1. Melodía de Bienvenida (Start)
    note1 = generate_tone_bytes(330, 0.12, wave_type="square")
    note2 = generate_tone_bytes(440, 0.12, wave_type="square")
    note3 = generate_tone_bytes(554, 0.25, wave_type="square")
    START_SOUND_BYTES = note1 + note2 + note3
    
    # 2. Movimiento X (C5 Triángulo)
    MOVE_X_SOUND_BYTES = generate_tone_bytes(523.25, 0.12, wave_type="triangle")
    
    # 3. Movimiento O (G4 Triángulo)
    MOVE_O_SOUND_BYTES = generate_tone_bytes(392.00, 0.12, wave_type="triangle")
    
    # 4. Robo de Casilla (Sierra descendente de D5 a D3)
    freq_fn_steal = lambda t: 587.33 * ((146.83 / 587.33) ** (t / 0.35))
    STEAL_SOUND_BYTES = generate_tone_bytes(freq_fn_steal, 0.35, wave_type="sawtooth")
    
    # 5. Victoria (Arpegio rápido C Mayor + C5 sostenido)
    w1 = generate_tone_bytes(261.63, 0.12, wave_type="triangle")
    w2 = generate_tone_bytes(329.63, 0.12, wave_type="triangle")
    w3 = generate_tone_bytes(392.00, 0.12, wave_type="triangle")
    w4 = generate_tone_bytes(523.25, 0.12, wave_type="triangle")
    w5 = generate_tone_bytes(523.25, 0.8, wave_type="square")
    WIN_SOUND_BYTES = w1 + w2 + w3 + w4 + w5
    
    # 6. Reset / Empate (Triángulo descendente)
    freq_fn_reset = lambda t: 440.0 * ((110.0 / 440.0) ** (t / 0.4))
    RESET_SOUND_BYTES = generate_tone_bytes(freq_fn_reset, 0.4, wave_type="triangle")

# Inicializar buffers
init_sounds()

def play_start_sound():
    asyncio.create_task(play_pcm_bytes(START_SOUND_BYTES))

def play_move_sound(player):
    pcm = MOVE_X_SOUND_BYTES if player == "X" else MOVE_O_SOUND_BYTES
    asyncio.create_task(play_pcm_bytes(pcm))

def play_steal_sound():
    asyncio.create_task(play_pcm_bytes(STEAL_SOUND_BYTES))

def play_win_sound():
    asyncio.create_task(play_pcm_bytes(WIN_SOUND_BYTES))

def play_reset_sound():
    asyncio.create_task(play_pcm_bytes(RESET_SOUND_BYTES))
