import { useState, useEffect } from 'react';
import { Dices } from 'lucide-react';

const DICE_TYPES = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'] as const;
type DieType = typeof DICE_TYPES[number];

const DIE_MAX: Record<DieType, number> = {
  d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20, d100: 100,
};

// Grid columns per die type for a nice layout
const DIE_COLS: Record<DieType, number> = {
  d4: 4, d6: 3, d8: 4, d10: 5, d12: 4, d20: 5, d100: 1,
};

interface DiceRollerProps {
  onRoll: (result: number) => void;
  requestedDie?: string;
}

export const DiceRoller = ({ onRoll, requestedDie }: DiceRollerProps) => {
  const [activeDie, setActiveDie] = useState<DieType>('d20');
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [flashingValue, setFlashingValue] = useState<number | null>(null);
  const [pulseSelector, setPulseSelector] = useState(false);

  // When the DM requests a specific die, switch to it with a visual pulse
  useEffect(() => {
    if (requestedDie && DICE_TYPES.includes(requestedDie as DieType)) {
      setActiveDie(requestedDie as DieType);
      setLastRoll(null);
      setPulseSelector(true);
      setTimeout(() => setPulseSelector(false), 1200);
    }
  }, [requestedDie]);

  const max = DIE_MAX[activeDie];
  const cols = DIE_COLS[activeDie];

  const handleRoll = (value: number) => {
    setFlashingValue(value);
    setLastRoll(value);
    onRoll(value);
    setTimeout(() => setFlashingValue(null), 600);
  };

  const handleRandomRoll = () => {
    const value = Math.floor(Math.random() * max) + 1;
    handleRoll(value);
  };

  // For d100, show a single roll button instead of 100 tap targets
  const isD100 = activeDie === 'd100';
  const values = isD100 ? [] : Array.from({ length: max }, (_, i) => i + 1);

  return (
    <div style={{
      position: 'fixed',
      bottom: '1.5rem',
      right: '1.5rem',
      zIndex: 100,
      width: '260px'
    }}>
      <div className="glass-panel" style={{
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'var(--accent-gold)',
          fontFamily: 'var(--font-heading)',
          fontSize: '0.85rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase'
        }}>
          <Dices size={16} />
          <span>{activeDie.toUpperCase()} — Tap your roll</span>
          {lastRoll !== null && (
            <span style={{
              marginLeft: 'auto',
              background: lastRoll === max ? 'rgba(16, 185, 129, 0.3)' : lastRoll === 1 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(212, 175, 55, 0.2)',
              border: `1px solid ${lastRoll === max ? '#10b981' : lastRoll === 1 ? 'var(--accent-danger)' : 'rgba(212, 175, 55, 0.4)'}`,
              padding: '0.15rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.8rem',
              color: lastRoll === max ? '#10b981' : lastRoll === 1 ? 'var(--accent-danger)' : 'var(--accent-gold)'
            }}>
              {lastRoll}
            </span>
          )}
        </div>

        {/* Die type selector */}
        <div style={{
          display: 'flex',
          gap: '3px',
          flexWrap: 'wrap',
          animation: pulseSelector ? 'pulse 0.6s ease-in-out 2' : 'none',
        }}>
          {DICE_TYPES.map(d => {
            const isActive = activeDie === d;
            return (
              <button
                key={d}
                onClick={() => { setActiveDie(d); setLastRoll(null); }}
                style={{
                  flex: '1 0 auto',
                  minWidth: '30px',
                  padding: '0.25rem 0.4rem',
                  borderRadius: '4px',
                  border: `1px solid ${isActive ? 'var(--accent-gold)' : 'rgba(255,255,255,0.08)'}`,
                  background: isActive ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255,255,255,0.03)',
                  color: isActive ? 'var(--accent-gold)' : 'var(--text-secondary)',
                  fontSize: '0.7rem',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: isActive ? 'bold' : 'normal',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                {d}
              </button>
            );
          })}
        </div>

        {/* Number grid (d4–d20) or roll button (d100) */}
        {isD100 ? (
          <button
            onClick={handleRandomRoll}
            style={{
              width: '100%',
              padding: '1.25rem',
              borderRadius: '8px',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              background: flashingValue !== null
                ? 'rgba(212, 175, 55, 0.35)'
                : 'rgba(212, 175, 55, 0.1)',
              color: 'var(--accent-gold)',
              fontSize: '1.1rem',
              fontFamily: 'var(--font-heading)',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <Dices size={20} />
            {lastRoll !== null ? `Rolled: ${lastRoll}` : 'Roll D100'}
          </button>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: '4px'
          }}>
            {values.map(v => {
              const isNatMax = v === max;
              const isNat1 = v === 1;
              const isFlashing = flashingValue === v;
              const isLast = lastRoll === v && !isFlashing;

              return (
                <button
                  key={v}
                  onClick={() => handleRoll(v)}
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                    border: `1px solid ${
                      isFlashing
                        ? 'var(--accent-gold)'
                        : isLast
                          ? 'rgba(212, 175, 55, 0.5)'
                          : isNatMax
                            ? 'rgba(16, 185, 129, 0.3)'
                            : isNat1
                              ? 'rgba(239, 68, 68, 0.3)'
                              : 'rgba(255,255,255,0.08)'
                    }`,
                    background: isFlashing
                      ? 'rgba(212, 175, 55, 0.35)'
                      : isLast
                        ? 'rgba(212, 175, 55, 0.12)'
                        : isNatMax
                          ? 'rgba(16, 185, 129, 0.08)'
                          : isNat1
                            ? 'rgba(239, 68, 68, 0.08)'
                            : 'rgba(255,255,255,0.03)',
                    color: isFlashing
                      ? 'var(--accent-gold)'
                      : isLast
                        ? 'var(--accent-gold)'
                        : isNatMax
                          ? '#10b981'
                          : isNat1
                            ? 'var(--accent-danger)'
                            : 'var(--text-primary)',
                    fontSize: '0.9rem',
                    fontWeight: (isNatMax || isNat1 || isFlashing || isLast) ? 'bold' : 'normal',
                    fontFamily: 'var(--font-heading)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    transform: isFlashing ? 'scale(1.15)' : 'scale(1)',
                    boxShadow: isFlashing
                      ? '0 0 12px rgba(212, 175, 55, 0.6)'
                      : 'none',
                    padding: 0
                  }}
                  title={`Roll ${v}`}
                >
                  {v}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
