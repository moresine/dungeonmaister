import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, type Character } from '../../db/db';

export const CharacterCreator = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [charClass, setCharClass] = useState('Fighter');
  const [race, setRace] = useState('Human');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const newChar: Character = {
      name,
      charClass,
      race,
      level: 1,
      hp: 10,
      maxHp: 10,
      stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }
    };

    await db.characters.add(newChar);
    navigate('/characters');
  };

  return (
    <div className="glass-panel" style={{ margin: '2rem auto', padding: '3rem', maxWidth: '600px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Forge Your Hero</h2>
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--accent-gold)' }}>Character Name</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="e.g. Thorian"
            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.5)', color: 'white', fontFamily: 'var(--font-body)', fontSize: '1.1rem' }}
            required
          />
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--accent-gold)' }}>Race</label>
            <select value={race} onChange={(e) => setRace(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '1.1rem' }}>
              {['Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--accent-gold)' }}>Class</label>
            <select value={charClass} onChange={(e) => setCharClass(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '1.1rem' }}>
              {['Fighter', 'Wizard', 'Rogue', 'Cleric', 'Ranger'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
          <button type="button" className="btn-secondary" onClick={() => navigate('/characters')}>Cancel</button>
          <button type="submit" className="btn-primary">Create Hero</button>
        </div>
      </form>
    </div>
  );
};
