import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type Character, createCharacter } from '../../services/api';
import { Shield, Sword, Heart, Star, BookOpen, Dices, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';

const RACES = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn', 'Tiefling', 'Half-Orc', 'Gnome'];
const CLASSES = ['Fighter', 'Wizard', 'Rogue', 'Cleric', 'Ranger', 'Paladin', 'Barbarian', 'Bard', 'Warlock'];

const STARTING_EQUIPMENT: Record<string, string[]> = {
  Fighter: ['Longsword', 'Shield', 'Chainmail', 'Health Potion'],
  Wizard: ['Quarterstaff', 'Spellbook', 'Component Pouch', 'Health Potion'],
  Rogue: ['Dagger', 'Shortbow', 'Leather Armor', 'Thieves Tools'],
  Cleric: ['Mace', 'Shield', 'Holy Symbol', 'Health Potion'],
  Ranger: ['Longbow', 'Quiver', 'Shortsword', 'Rations'],
  Paladin: ['Greatsword', 'Chainmail', 'Holy Symbol', 'Health Potion'],
  Barbarian: ['Greataxe', 'Handaxe', 'Explorer Pack'],
  Bard: ['Rapier', 'Lute', 'Leather Armor', 'Health Potion'],
  Warlock: ['Light Crossbow', 'Arcane Focus', 'Dagger', 'Health Potion'],
  Default: ['Shortsword', 'Traveler Clothes', 'Health Potion', 'Rations']
};

const STAT_ICONS: Record<string, React.ReactNode> = {
  str: <Sword size={16} />,
  dex: <Shield size={16} />,
  con: <Heart size={16} />,
  int: <BookOpen size={16} />,
  wis: <Star size={16} />,
  cha: <Star size={16} />
};

export const CharacterCreator = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  
  // Step 1 State
  const [name, setName] = useState('');
  const [charClass, setCharClass] = useState('Fighter');
  const [race, setRace] = useState('Human');

  // Step 2 State
  const [rolledPool, setRolledPool] = useState<number[]>([]);
  const [stats, setStats] = useState({
    str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10
  });

  // Step 3 State
  const [inventory, setInventory] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');

  // Step 4 State
  const [calculatedHp, setCalculatedHp] = useState(10); 

  const roll4d6DropLowest = () => {
    const rolls = Array.from({length: 4}, () => Math.floor(Math.random() * 6) + 1);
    rolls.sort((a, b) => a - b);
    return rolls[1] + rolls[2] + rolls[3];
  };

  const generateStatPool = () => {
    const pool = Array.from({length: 6}, () => roll4d6DropLowest());
    setStats({
      str: pool[0], dex: pool[1], con: pool[2], int: pool[3], wis: pool[4], cha: pool[5]
    });
    setRolledPool(pool.sort((a,b) => b - a));
  };

  const useStandardArray = () => {
    const standard = [15, 14, 13, 12, 10, 8];
    setStats({
      str: standard[0], dex: standard[1], con: standard[2], int: standard[3], wis: standard[4], cha: standard[5]
    });
    setRolledPool(standard);
  };

  const calculateHp = () => {
    let base = 8;
    if (charClass === 'Barbarian') base = 12;
    if (charClass === 'Fighter' || charClass === 'Paladin' || charClass === 'Ranger') base = 10;
    if (charClass === 'Wizard' || charClass === 'Sorcerer') base = 6;
    
    const conMod = Math.floor((stats.con - 10) / 2);
    return base + conMod;
  };

  const nextStep = () => {
    if (step === 1) {
      if (!name) return;
      setStep(2);
    } else if (step === 2) {
      if (inventory.length === 0) setInventory([...(STARTING_EQUIPMENT[charClass] || STARTING_EQUIPMENT['Default'])]);
      setStep(3);
    } else if (step === 3) {
      setCalculatedHp(calculateHp());
      setStep(4);
    }
  };

  const handleSave = async () => {
    const newChar: Character = {
      name,
      charClass,
      race,
      level: 1,
      hp: calculatedHp,
      maxHp: calculatedHp,
      stats,
      inventory: inventory
    };

    try {
      await createCharacter(newChar);
      navigate('/characters');
    } catch (err) {
      console.error(err);
      alert("Failed to save character to the cloud database.");
    }
  };

  return (
     <div style={{ display: 'flex', height: '100vh', width: '100vw', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      {/* Left Pane - Instructions & Controls */}
      <div style={{ flex: 1, padding: '3rem', overflowY: 'auto', borderRight: '1px solid var(--panel-border)', background: 'linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(20,20,20,0.5) 100%)' }}>
         <h1 style={{ color: 'var(--accent-gold)', marginBottom: '1rem', fontFamily: 'var(--font-heading)' }}>Interactive Forge</h1>
         <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '3rem', lineHeight: 1.6 }}>
            Follow the official rules to forge a mortal champion. The gods demand a hero for this campaign.
         </p>

         {step === 1 && (
            <div className="glass-panel" style={{ padding: '2rem', animation: 'fadeIn 0.5s' }}>
              <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ background: 'var(--accent-gold)', color: 'black', width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '1rem' }}>1</span>
                Identity
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Every legend starts with a name and an origin. What race is your hero? What class dictates their training?</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--accent-gold)' }}>Character Name</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="e.g. Thorian Stormbringer"
                    style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.5)', color: 'white', fontFamily: 'var(--font-body)', fontSize: '1.1rem', boxSizing: 'border-box' }}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                     <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--accent-gold)' }}>Race</label>
                     <select value={race} onChange={(e) => setRace(e.target.value)} style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '1.1rem', boxSizing: 'border-box' }}>
                       {RACES.map(r => <option key={r} value={r}>{r}</option>)}
                     </select>
                  </div>
                  <div style={{ flex: 1 }}>
                     <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--accent-gold)' }}>Class</label>
                     <select value={charClass} onChange={(e) => setCharClass(e.target.value)} style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '1.1rem', boxSizing: 'border-box' }}>
                       {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={nextStep} disabled={!name} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Next Step <ArrowRight size={18}/></button>
              </div>
            </div>
         )}

         {step === 2 && (
            <div className="glass-panel" style={{ padding: '2rem', animation: 'fadeIn 0.5s' }}>
              <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ background: 'var(--accent-gold)', color: 'black', width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '1rem' }}>2</span>
                Ability Scores
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                Roll 4d6, drop the lowest die, and sum the remaining three. 
                Do this six times. Alternatively, use the Standard Array. Assign your values manually.
              </p>
              
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                  <button onClick={generateStatPool} style={{ flex: 1, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(212, 175, 55, 0.2)', border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.3s' }}>
                     <Dices /> Roll 4d6 (Drop Lowest)
                  </button>
                  <button onClick={useStandardArray} style={{ flex: 1, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--panel-border)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.3s' }}>
                     Standard Array
                  </button>
              </div>

              {rolledPool.length > 0 && (
                 <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Your Stat Pool</div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {rolledPool.map((v, i) => <div key={i} style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontWeight: 'bold' }}>{v}</div>)}
                    </div>
                 </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                 {Object.keys(stats).map((statKey) => (
                    <div key={statKey} style={{ display: 'flex', flexDirection: 'column' }}>
                       <label style={{ color: 'var(--accent-gold)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>{statKey}</label>
                       <input 
                         type="number" 
                         value={stats[statKey as keyof typeof stats]}
                         onChange={e => setStats({...stats, [statKey]: parseInt(e.target.value) || 0})}
                         style={{ padding: '0.75rem', borderRadius: '4px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--panel-border)', color: 'white', textAlign: 'center' }}
                       />
                    </div>
                 ))}
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={() => setStep(1)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ArrowLeft size={18}/> Back</button>
                <button onClick={nextStep} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Next Step <ArrowRight size={18}/></button>
              </div>
            </div>
         )}


         {step === 3 && (
            <div className="glass-panel" style={{ padding: '2rem', animation: 'fadeIn 0.5s' }}>
              <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ background: 'var(--accent-gold)', color: 'black', width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '1rem' }}>3</span>
                Equipment
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                Customize your starting inventory. We've populated standard gear for a {charClass}, but you can modify it as needed.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
                {inventory.map((item, idx) => (
                   <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                     <span style={{ color: 'white' }}>{item}</span>
                     <button onClick={() => setInventory(inventory.filter((_, i) => i !== idx))} style={{ color: 'var(--accent-danger)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 'bold' }}>Remove</button>
                   </div>
                ))}
                {inventory.length === 0 && <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Inventory is empty</div>}
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <input 
                  type="text" 
                  value={newItem}
                  onChange={e => setNewItem(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newItem.trim()) {
                      setInventory([...inventory, newItem.trim()]);
                      setNewItem('');
                    }
                  }}
                  placeholder="Add custom weapon or item..."
                  style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '1rem', boxSizing: 'border-box' }}
                />
                <button 
                  onClick={() => {
                    if (newItem.trim()) {
                      setInventory([...inventory, newItem.trim()]);
                      setNewItem('');
                    }
                  }}
                  className="btn-secondary"
                >Add</button>
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={() => setStep(2)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ArrowLeft size={18}/> Back</button>
                <button onClick={nextStep} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Next Step <ArrowRight size={18}/></button>
              </div>
            </div>
         )}

         {step === 4 && (
            <div className="glass-panel" style={{ padding: '2rem', animation: 'fadeIn 0.5s' }}>
              <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ background: 'var(--accent-gold)', color: 'black', width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '1rem' }}>4</span>
                Finalize
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                Your base health points (HP) are calculated automatically using your class hit die and constitution modifier. Ensure your stats reflect your desired build correctly.
              </p>
              
              <div style={{ padding: '1.5rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                 <div>
                    <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '0.25rem' }}>Max Hit Points</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Class Hit Die + CON Mod ({Math.floor((stats.con - 10) / 2)})</div>
                 </div>
                 <div style={{ fontSize: '2.5rem', color: '#10b981', fontWeight: 'bold' }}>{calculatedHp}</div>
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={() => setStep(3)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ArrowLeft size={18}/> Back</button>
                <button onClick={handleSave} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={18}/> Forge Hero</button>
              </div>
            </div>
         )}
         
      </div>

      {/* Right Pane - Character Sheet Preview */}
      <div style={{ flex: 1, padding: '3rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
         <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
            <button className="btn-secondary" onClick={() => navigate('/characters')}>Exit</button>
         </div>

         <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem', transition: 'all 0.3s', border: '1px solid rgba(212, 175, 55, 0.3)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
               <h3 style={{ fontSize: '2.5rem', color: 'var(--accent-gold)', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>
                  {name || 'Unnamed Hero'}
               </h3>
               <div style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', letterSpacing: '0.05em' }}>
                  Level 1 {race} {charClass}
               </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
               {Object.entries(stats).map(([k, v]) => {
                  const mod = Math.floor((v - 10) / 2);
                  const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
                  return (
                     <div key={k} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--panel-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', color: 'var(--accent-gold)', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                           {STAT_ICONS[k]} {k}
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{v}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Mod {modStr}</div>
                     </div>
                  )
               })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
               <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.75rem 2rem', borderRadius: '99px', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                 <Heart size={18} /> {step >= 3 ? calculatedHp : '?'} HP
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};
