import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { GameMasterInterface } from './components/ui/GameMasterInterface';
import { DiceRoller } from './components/ui/DiceRoller';
import { CampaignSelector } from './components/ui/CampaignSelector';
import { CharacterHub } from './components/ui/CharacterHub';
import { CharacterCreator } from './components/ui/CharacterCreator';
import TabletView from './components/ui/TabletView';
import './index.css';

const Home = () => {
  const navigate = useNavigate();

  const handleCampaignSelect = (campaignId: string, language: string) => {
    const params = new URLSearchParams();
    if (campaignId) params.set('campaign', campaignId);
    params.set('lang', language);
    navigate(`/play?${params.toString()}`);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
      <h1 style={{ fontSize: '4rem', marginBottom: '1rem', textAlign: 'center' }}>
        <Sparkles style={{ display: 'inline', marginRight: '1rem', color: 'var(--accent-gold)' }} size={48} />
        DungeonMaister
        <Sparkles style={{ display: 'inline', marginLeft: '1rem', color: 'var(--accent-gold)' }} size={48} />
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', marginBottom: '3rem', maxWidth: '600px', textAlign: 'center', lineHeight: 1.6 }}>
        Your AI-powered game master awaits. Choose a campaign, gather your party, and prepare for an unforgettable adventure.
      </p>

      <CampaignSelector onSelect={handleCampaignSelect} />

      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem' }}>
        <Link to="/characters"><button className="btn-secondary">Character Hub</button></Link>
        <Link to="/tablet"><button className="btn-secondary">Tablet View</button></Link>
      </div>
    </div>
  );
};

const PlaySession = () => {
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get('campaign') || '';
  const language = searchParams.get('lang') || 'en';
  const [latestRoll, setLatestRoll] = useState<number | null>(null);
  const [requestedDie, setRequestedDie] = useState<string>('d20');

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div style={{
        padding: '0.5rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--panel-border)',
        background: 'rgba(0,0,0,0.3)',
      }}>
        <Link to="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none', fontFamily: 'var(--font-heading)', fontSize: '0.9rem', letterSpacing: '0.1em' }}>
          ← Back
        </Link>
        {campaignId && (
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            Campaign: {campaignId} • {language.toUpperCase()}
          </span>
        )}
      </div>
      <GameMasterInterface latestDiceRoll={latestRoll} language={language} campaignId={campaignId} onDiceRequest={setRequestedDie} />
      <DiceRoller onRoll={(res) => setLatestRoll(res)} requestedDie={requestedDie} />
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/play" element={<PlaySession />} />
          <Route path="/characters" element={<CharacterHub />} />
          <Route path="/character-creator" element={<CharacterCreator />} />
          <Route path="/tablet" element={<TabletView />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
