import { useState } from 'react';
import { Dices, Check, X } from 'lucide-react';

export const DiceRoller = ({ onRoll }: { onRoll: (result: number) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [rolling, setRolling] = useState(false);
  const [diceResult, setDiceResult] = useState<number | null>(null);

  const handleVirtualRoll = () => {
    setRolling(true);
    setDiceResult(null);
    setTimeout(() => {
      const result = Math.floor(Math.random() * 20) + 1;
      setDiceResult(result);
      setRolling(false);
      onRoll(result);
      setTimeout(() => setIsOpen(false), 2000);
    }, 1500);
  };

  const submitManualRoll = () => {
    const val = parseInt(manualInput, 10);
    if (!isNaN(val) && val > 0 && val <= 20) {
      onRoll(val);
      setIsOpen(false);
      setManualInput('');
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 100 }}>
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="btn-primary"
          style={{ width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(212, 175, 55, 0.4)' }}
          title="Roll Dice"
        >
          <Dices size={32} />
        </button>
      )}

      {isOpen && (
        <div className="glass-panel" style={{ padding: '1.5rem', width: '300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: 'var(--accent-gold)' }}>Roll D20</h3>
            <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20}/></button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.25rem', borderRadius: '8px' }}>
            <button 
              onClick={() => setManualMode(false)}
              style={{ flex: 1, padding: '0.5rem', background: !manualMode ? 'var(--panel-bg)' : 'transparent', border: 'none', borderRadius: '4px', color: !manualMode ? 'var(--accent-gold)' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'var(--font-body)' }}>
              Virtual
            </button>
            <button 
              onClick={() => setManualMode(true)}
              style={{ flex: 1, padding: '0.5rem', background: manualMode ? 'var(--panel-bg)' : 'transparent', border: 'none', borderRadius: '4px', color: manualMode ? 'var(--accent-gold)' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'var(--font-body)' }}>
              Manual
            </button>
          </div>

          {!manualMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '1rem 0' }}>
              <div style={{ 
                width: '100px', height: '100px', 
                border: '2px solid var(--accent-gold)', 
                borderRadius: '16px', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2.5rem', fontFamily: 'var(--font-heading)',
                transform: rolling ? 'rotate(360deg)' : 'none',
                transition: rolling ? 'transform 1.5s cubic-bezier(0.25, 1, 0.5, 1)' : 'none',
                boxShadow: rolling ? '0 0 20px var(--accent-gold-glow)' : 'none',
                background: 'rgba(212, 175, 55, 0.1)'
              }}>
                {rolling ? '...' : (diceResult || '20')}
              </div>
              <button className="btn-primary" onClick={handleVirtualRoll} disabled={rolling} style={{ width: '100%' }}>
                Roll Now
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 0' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Enter the result of your physical dice roll:</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="number" 
                  min="1" max="20"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '1.2rem', textAlign: 'center' }}
                  placeholder="1-20"
                />
                <button className="btn-primary" onClick={submitManualRoll} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 1rem' }}>
                  <Check size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
