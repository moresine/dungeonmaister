export interface Character {
  id?: number;
  name: string;
  race: string;
  charClass: string;
  level: number;
  hp: number;
  maxHp: number;
  stats: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  inventory: string[];
}

const API_BASE = '/api';

export const getCharacters = async (): Promise<Character[]> => {
  const res = await fetch(`${API_BASE}/characters`);
  if (!res.ok) throw new Error('Failed to fetch characters');
  return res.json();
};

export const createCharacter = async (char: Character): Promise<Character> => {
  const res = await fetch(`${API_BASE}/characters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(char),
  });
  if (!res.ok) throw new Error('Failed to create character');
  return res.json();
};

export const deleteCharacter = async (id: number): Promise<void> => {
  const res = await fetch(`${API_BASE}/characters/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete character');
};

export const updateCharacterInventory = async (id: number, inventory: string[]): Promise<void> => {
  const res = await fetch(`${API_BASE}/characters/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inventory }),
  });
  if (!res.ok) throw new Error('Failed to update character');
};
