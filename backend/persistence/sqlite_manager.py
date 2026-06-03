import sqlite3
import os

DB_NAME = "game.db"

def get_connection():
    """Retorna una conexión activa a la base de datos SQLite."""
    return sqlite3.connect(DB_NAME)

def initialize_db():
    """Inicializa la base de datos y crea la tabla settings si no existe."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        '''
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
        '''
    )
    conn.commit()
    conn.close()

def save_setting(key: str, value: str):
    """Guarda o actualiza un parámetro en la base de datos."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        '''
        INSERT OR REPLACE INTO settings(key, value)
        VALUES (?, ?)
        ''',
        (key, str(value))
    )
    conn.commit()
    conn.close()

def get_all_settings():
    """Obtiene todos los parámetros de configuración de la base de datos."""
    if not os.path.exists(DB_NAME):
        initialize_db()
        return []
    
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT key, value FROM settings')
    rows = cursor.fetchall()
    conn.close()
    return rows
