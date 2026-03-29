import Dexie, { type Table } from 'dexie';

export interface Character {
  id?: number;
  name: string;
  race: string;
  charClass: string; // "class" is reserved
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
}

export class DungeonMaisterDB extends Dexie {
  characters!: Table<Character>;

  constructor() {
    super('DungeonMaisterDB');
    this.version(1).stores({
      characters: '++id, name, charClass'
    });
  }
}

export const db = new DungeonMaisterDB();
