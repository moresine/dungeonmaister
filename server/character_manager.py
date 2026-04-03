import sqlite3
import json
import os
from typing import List, Dict, Any

DB_PATH = os.path.join(os.path.dirname(__file__), "characters.db")

class CharacterManager:
    def __init__(self):
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS characters (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    race TEXT NOT NULL,
                    charClass TEXT NOT NULL,
                    level INTEGER NOT NULL,
                    hp INTEGER NOT NULL,
                    maxHp INTEGER NOT NULL,
                    stats TEXT NOT NULL,
                    inventory TEXT NOT NULL
                )
            ''')
            conn.commit()

    def get_all_characters(self) -> List[Dict[str, Any]]:
        with sqlite3.connect(DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM characters')
            rows = cursor.fetchall()

            characters = []
            for row in rows:
                char = dict(row)
                char['stats'] = json.loads(char['stats'])
                char['inventory'] = json.loads(char['inventory'])
                characters.append(char)
            return characters

    def create_character(self, char_data: Dict[str, Any]) -> Dict[str, Any]:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO characters (name, race, charClass, level, hp, maxHp, stats, inventory)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                char_data['name'],
                char_data['race'],
                char_data['charClass'],
                char_data.get('level', 1),
                char_data.get('hp', 10),
                char_data.get('maxHp', 10),
                json.dumps(char_data['stats']),
                json.dumps(char_data.get('inventory', []))
            ))
            conn.commit()
            
            char_data['id'] = cursor.lastrowid
            return char_data

    def delete_character(self, char_id: int) -> bool:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM characters WHERE id = ?', (char_id,))
            conn.commit()
            return cursor.rowcount > 0

    def update_character(self, char_id: int, char_data: Dict[str, Any]) -> bool:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            if 'inventory' in char_data:
                cursor.execute('UPDATE characters SET inventory = ? WHERE id = ?', (json.dumps(char_data['inventory']), char_id))
            conn.commit()
            return cursor.rowcount > 0

# Singleton instance
character_mgr = CharacterManager()
