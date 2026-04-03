import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { type Character, getCharacters } from '../../services/api';
import { Shield, Sword, Heart, Sparkles } from 'lucide-react';

export const CharacterHub = () => {
  const [characters, setCharacters] = useState<Character[]>([]);

  useEffect(() => {
    const loadChars = async () => {
      try {
        const chars = await getCharacters();
        setCharacters(chars);
      } catch (err) {
        console.error(err);
      }
    };
    loadChars();
  }, []);

  return (
    <div style={{ maxWidth: '1000px', margin: '2rem auto', width: '100%', padding: '0 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Your Heroes</h2>
        <Link to="/character-creator">
          <button className="btn-primary">Create New Hero</button>
        </Link>
      </div>

      {characters.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
          <Sparkles size={48} style={{ color: 'var(--accent-gold)', marginBottom: '1rem', opacity: 0.5 }} />
          <h3 style={{ color: 'var(--text-secondary)' }}>No heroes found</h3>
          <p style={{ marginTop: '1rem' }}>Forge your first hero to begin the adventure.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {characters.map(char => (
            <div key={char.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--panel-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.5rem', color: 'var(--accent-gold)', marginBottom: '0.25rem' }}>{char.name}</h3>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Level {char.level} {char.race} {char.charClass}</div>
                </div>
                <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--accent-danger)', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Heart size={14} /> {char.hp}/{char.maxHp}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}><Sword size={16} /> STR: {char.stats.str}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}><Shield size={16} /> DEX: {char.stats.dex}</div>
              </div>

              <button className="btn-secondary" style={{ marginTop: 'auto' }}>View Details</button>
            </div>
          ))}
        </div>
      )}
      
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <Link to="/"><button className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Return to Tavern</button></Link>
      </div>
    </div>
  );
};
