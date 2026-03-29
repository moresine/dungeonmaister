import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { GameMasterInterface } from './components/ui/GameMasterInterface';
import { DiceRoller } from './components/ui/DiceRoller';
import './index.css';

const Home = () => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
    <h1 style={{ fontSize: '4rem', marginBottom: '1rem', textAlign: 'center' }}>
      <Sparkles style={{ display: 'inline', marginRight: '1rem', color: 'var(--accent-gold)' }} size={48} />
      DungeonMaister
      <Sparkles style={{ display: 'inline', marginLeft: '1rem', color: 'var(--accent-gold)' }} size={48} />
    </h1>
    <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', marginBottom: '3rem', maxWidth: '600px', textAlign: 'center', lineHeight: 1.6 }}>
      Your AI-powered game master awaits. Ready your dice, gather your party, and prepare for an unforgettable adventure.
    </p>
    <div style={{ display: 'flex', gap: '1.5rem' }}>
      <Link to="/tutorial"><button className="btn-primary">Start Tutorial</button></Link>
      <Link to="/characters"><button className="btn-secondary">Character Hub</button></Link>
    </div>
  </div>
);

const Tutorial = () => {
  const [latestRoll, setLatestRoll] = useState<number | null>(null);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <GameMasterInterface latestDiceRoll={latestRoll} />
      <DiceRoller onRoll={(res) => setLatestRoll(res)} />
    </div>
  );
};

import { CharacterHub } from './components/ui/CharacterHub';
import { CharacterCreator } from './components/ui/CharacterCreator';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tutorial" element={<Tutorial />} />
          <Route path="/characters" element={<CharacterHub />} />
          <Route path="/character-creator" element={<CharacterCreator />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
