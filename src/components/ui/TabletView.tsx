import React, { useState, useRef, useEffect } from 'react';
import { SpeechClient } from '../../services/SpeechClient';
import { PlayerView } from './PlayerView';
import { DiceRoller } from './DiceRoller';
import './FlickeringFlame.css';

const FlickeringFlame = () => (
  <div className="flame-container">
    <div className="flame red"></div>
    <div className="flame orange"></div>
    <div className="flame gold"></div>
    <div className="flame white"></div>
  </div>
);

const TabletView: React.FC = () => {
  const [spokenText, setSpokenText] = useState('');
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const clientRef = useRef<SpeechClient | null>(null);

  const handleSpokenText = (text: string) => {
    setSpokenText(text);
    setTimeout(() => {
      setSpokenText('');
    }, 3000); // clear after 3 seconds
  };

  useEffect(() => {
    const onMessage = (speaker: 'user' | 'dm', msg: string) => {
      if (speaker === 'user') {
        handleSpokenText(msg);
      }
    };

    const onState = (state: 'connected' | 'disconnected' | 'error') => {
      setConnectionState(state);
    };
    
    const language = 'en';
    const campaignId = '';

    const client = new SpeechClient(onMessage, onState, undefined, language, undefined);
    clientRef.current = client;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const params = new URLSearchParams({ lang: language });
    if (campaignId) params.set('campaign', campaignId);
    client.connect(`${wsProtocol}//${window.location.host}/api/chat/stream?${params.toString()}`);

    return () => {
      if (clientRef.current) clientRef.current.stop();
    };
  }, []);

  const handleMicDown = () => {
    if (clientRef.current && connectionState === 'connected') {
      clientRef.current.openMic();
    }
  };

  const handleMicUp = () => {
    if (clientRef.current) {
      clientRef.current.closeMic();
    }
  };


  return (
    <div style={{ display: 'flex', height: '100vh', position: 'relative' }}>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <FlickeringFlame />
      </div>
      <div style={{ flex: 1 }}>
        <DiceRoller />
        <div style={{ position: 'absolute', bottom: 10, left: '75%', transform: 'translateX(-50%)' }}>
          <button onMouseDown={handleMicDown} onMouseUp={handleMicUp}>Push to Talk</button>
        </div>
        {spokenText && (
          <div style={{ position: 'absolute', bottom: 50, left: '25%', transform: 'translateX(-50%)', backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', padding: '10px', borderRadius: '5px' }}>
            {spokenText}
          </div>
        )}
      </div>
      <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', width: '30%' }}>
        <PlayerView characterId={1} />
      </div>
    </div>
  );
};

export default TabletView;
