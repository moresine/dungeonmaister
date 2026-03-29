import { useState } from 'react';
import { Dices } from 'lucide-react';

export const DiceRoller = ({ onRoll }: { onRoll: (result: number) => void }) => {
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [flashingValue, setFlashingValue] = useState<number | null>(null);

  const handleRoll = (value: number) => {
    setFlashingValue(value);
    setLastRoll(value);
    onRoll(value);
    // Clear the flash effect after animation
    setTimeout(() => setFlashingValue(null), 600);
  };

  const values = Array.from({ length: 20 }, (_, i) => i + 1);

  return (
    <div style={{
      position: 'fixed',
      bottom: '1.5rem',
      right: '1.5rem',
      zIndex: 100,
      width: '240px'
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
          <span>D20 — Tap your roll</span>
          {lastRoll !== null && (
            <span style={{
              marginLeft: 'auto',
              background: lastRoll === 20 ? 'rgba(16, 185, 129, 0.3)' : lastRoll === 1 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(212, 175, 55, 0.2)',
              border: `1px solid ${lastRoll === 20 ? '#10b981' : lastRoll === 1 ? 'var(--accent-danger)' : 'rgba(212, 175, 55, 0.4)'}`,
              padding: '0.15rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.8rem',
              color: lastRoll === 20 ? '#10b981' : lastRoll === 1 ? 'var(--accent-danger)' : 'var(--accent-gold)'
            }}>
              {lastRoll}
            </span>
          )}
        </div>

        {/* Grid of 1-20 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '4px'
        }}>
          {values.map(v => {
            const isNat20 = v === 20;
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
                        : isNat20
                          ? 'rgba(16, 185, 129, 0.3)'
                          : isNat1
                            ? 'rgba(239, 68, 68, 0.3)'
                            : 'rgba(255,255,255,0.08)'
                  }`,
                  background: isFlashing
                    ? 'rgba(212, 175, 55, 0.35)'
                    : isLast
                      ? 'rgba(212, 175, 55, 0.12)'
                      : isNat20
                        ? 'rgba(16, 185, 129, 0.08)'
                        : isNat1
                          ? 'rgba(239, 68, 68, 0.08)'
                          : 'rgba(255,255,255,0.03)',
                  color: isFlashing
                    ? 'var(--accent-gold)'
                    : isLast
                      ? 'var(--accent-gold)'
                      : isNat20
                        ? '#10b981'
                        : isNat1
                          ? 'var(--accent-danger)'
                          : 'var(--text-primary)',
                  fontSize: '0.9rem',
                  fontWeight: (isNat20 || isNat1 || isFlashing || isLast) ? 'bold' : 'normal',
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
      </div>
    </div>
  );
};
