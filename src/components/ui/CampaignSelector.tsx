import { useState, useEffect } from 'react';
import { BookOpen, Users, Swords, Globe, Play } from 'lucide-react';

interface Campaign {
  id: string;
  title: string;
  description: string;
  language: string;
  level_range: string;
  players: string;
  cover_image?: string;
}

const LANG_LABELS: Record<string, string> = {
  en: 'English',
  de: 'Deutsch',
};

const LANG_FLAGS: Record<string, string> = {
  en: '🇬🇧',
  de: '🇩🇪',
};

export const CampaignSelector = ({ onSelect }: { onSelect: (campaignId: string, language: string) => void }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/campaigns')
      .then(res => res.json())
      .then(data => {
        setCampaigns(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load campaigns:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        marginBottom: '2rem',
        color: 'var(--accent-gold)',
        fontFamily: 'var(--font-heading)',
        fontSize: '1.3rem',
        letterSpacing: '0.05em'
      }}>
        <BookOpen size={24} />
        <span>Choose Your Campaign</span>
      </div>

      {loading && (
        <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3rem' }}>
          Loading campaigns...
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {campaigns.map(c => {
          const isHovered = hoveredId === c.id;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id, c.language)}
              onMouseEnter={() => setHoveredId(c.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'transform 0.2s ease',
                transform: isHovered ? 'translateY(-4px)' : 'none',
              }}
            >
              <div className="glass-panel" style={{
                overflow: 'hidden',
                border: isHovered ? '1px solid rgba(212, 175, 55, 0.5)' : '1px solid var(--panel-border)',
                transition: 'border-color 0.3s',
              }}>
                {/* Cover Image */}
                <div style={{
                  height: '160px',
                  background: `url(/api/campaigns/${c.id}/cover) center/cover`,
                  borderBottom: '1px solid var(--panel-border)',
                  position: 'relative',
                }}>
                  {/* Language Badge */}
                  <div style={{
                    position: 'absolute',
                    top: '0.75rem',
                    right: '0.75rem',
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(8px)',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}>
                    <span>{LANG_FLAGS[c.language] || ''}</span>
                    <span>{LANG_LABELS[c.language] || c.language}</span>
                  </div>

                  {/* Play overlay on hover */}
                  {isHovered && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0,0,0,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'opacity 0.3s',
                    }}>
                      <Play size={48} color="var(--accent-gold)" fill="var(--accent-gold)" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: '1.25rem' }}>
                  <h3 style={{
                    margin: '0 0 0.5rem 0',
                    fontSize: '1.1rem',
                    lineHeight: 1.3,
                  }}>
                    {c.title}
                  </h3>
                  <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                    margin: '0 0 1rem 0',
                  }}>
                    {c.description}
                  </p>
                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)',
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Swords size={13} /> Lvl {c.level_range}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Users size={13} /> {c.players} players
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        {/* Free Play card */}
        <button
          onClick={() => onSelect('', 'en')}
          onMouseEnter={() => setHoveredId('__free__')}
          onMouseLeave={() => setHoveredId(null)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'transform 0.2s ease',
            transform: hoveredId === '__free__' ? 'translateY(-4px)' : 'none',
          }}
        >
          <div className="glass-panel" style={{
            overflow: 'hidden',
            border: hoveredId === '__free__' ? '1px solid rgba(139, 92, 246, 0.5)' : '1px solid var(--panel-border)',
            transition: 'border-color 0.3s',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              height: '160px',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(212, 175, 55, 0.1) 100%)',
              borderBottom: '1px solid var(--panel-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Globe size={48} color="var(--accent-magic)" style={{ opacity: 0.6 }} />
            </div>
            <div style={{ padding: '1.25rem', flex: 1 }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: 'var(--accent-magic)' }}>
                Free Play
              </h3>
              <p style={{
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                lineHeight: 1.5,
                margin: 0,
              }}>
                Start an open adventure with no pre-loaded campaign. The DungeonMaister will improvise!
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
