import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Mic, MicOff, Send, Wifi, WifiOff, AlertCircle, Radio } from 'lucide-react';
import { SpeechClient } from '../../services/SpeechClient';
import { dmInstance } from '../../services/AiDungeonMaster';
import { PlayerView } from './PlayerView';
import { DiceRoller } from './DiceRoller';
import { type Character, getCharacters } from '../../services/api';
import './FlickeringFlame.css';

const UI_LABELS = {
  en: {
    chatLog: 'Chat Log',
    connecting: 'Connecting to DungeonMaister...',
    connected: 'Active',
    error: 'Unreachable',
    dmSpeaking: 'DM Speaking',
    pondering: 'Pondering...',
    placeholder: 'Speak or type...',
    dmSpeakingPlaceholder: 'DM is speaking...',
    welcome: 'The DungeonMaister awaits.',
  },
  de: {
    chatLog: 'Spielprotokoll',
    connecting: 'Verbinde...',
    connected: 'Aktiv',
    error: 'Fehler',
    dmSpeaking: 'DM spricht',
    pondering: 'Grübelt...',
    placeholder: 'Sprich oder tippe...',
    dmSpeakingPlaceholder: 'DM spricht...',
    welcome: 'Der DungeonMaister erwartet euch.',
  },
};

const FlickeringFlame = () => (
  <div className="flame-container">
    <div className="flame red"></div>
    <div className="flame orange"></div>
    <div className="flame gold"></div>
    <div className="flame white"></div>
  </div>
);

const TabletView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get('campaign') || '';
  const language = searchParams.get('lang') || 'en';
  const labels = UI_LABELS[language as keyof typeof UI_LABELS] || UI_LABELS.en;

  const [characters, setCharacters] = useState<Character[]>([]);

  const [messages, setMessages] = useState<{role: 'user' | 'dm', content: string, speakerName?: string}[]>([
    { role: 'dm', content: labels.welcome, speakerName: 'DungeonMaister' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isMicOpen, setIsMicOpen] = useState(false);
  const [isDmSpeaking, setIsDmSpeaking] = useState(false);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const clientRef = useRef<SpeechClient | null>(null);
  
  const [isTyping, setIsTyping] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  
  const [latestRoll, setLatestRoll] = useState<number | null>(null);
  const [requestedDie, setRequestedDie] = useState<string>('d20');
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<string>('Group');

  useEffect(() => {
    if (clientRef.current) {
      clientRef.current.setSpeaker(currentSpeaker);
    }
  }, [currentSpeaker]);

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

  useEffect(() => {
    return () => {
      if (clientRef.current) clientRef.current.stop();
    };
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (textOverride?: string, diceRoll?: number) => {
    const text = textOverride || inputText;
    if (!text.trim() && !diceRoll) return;
    
    setMessages(prev => [...prev, { role: 'user', content: text, speakerName: currentSpeaker }]);
    if (!textOverride) setInputText('');

    if (connectionState === 'connected' && clientRef.current) {
       if (!textOverride) {
          clientRef.current.sendText(text);
       }
       if (diceRoll) {
          clientRef.current.sendDiceRoll(diceRoll);
       }
    } else {
      setIsTyping(true);
      const response = await dmInstance.getResponse(text, diceRoll);
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'dm', content: response, speakerName: 'DungeonMaister' }]);
    }
  };

  useEffect(() => {
    if (latestRoll !== null) {
       handleSend(`I rolled a ${latestRoll}`, latestRoll);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestRoll]);

  const toggleSession = async () => {
    if (isSessionActive) {
      if (clientRef.current) clientRef.current.stop();
      setIsSessionActive(false);
      setIsMicOpen(false);
      setIsDmSpeaking(false);
      setConnectionState('disconnected');
    } else {
      setIsSessionActive(true);
      setConnectionState('connecting');
      
      const onMessage = (speaker: 'user' | 'dm', msg: string) => {
        setMessages(prev => [...prev, { role: speaker, content: msg, speakerName: speaker === 'dm' ? 'DungeonMaister' : currentSpeaker }]);
      };
      
      const onState = (state: 'connected' | 'disconnected' | 'error') => {
        setConnectionState(state);
        if (state === 'error' || state === 'disconnected') {
          setIsSessionActive(false);
          setIsMicOpen(false);
          setIsDmSpeaking(false);
        }
      };

      const onDmSpeaking = (speaking: boolean) => {
        setIsDmSpeaking(speaking);
        if (speaking) setIsMicOpen(false);
      };

      const handleDiceRequest = (die: string) => {
        setRequestedDie(die);
      };

      const handleTarget = (targetName: string) => {
        setCurrentSpeaker(targetName);
      };

      const client = new SpeechClient(onMessage, onState, onDmSpeaking, language, handleDiceRequest, handleTarget);
      clientRef.current = client;
      client.setSpeaker(currentSpeaker);
      
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const params = new URLSearchParams({ lang: language });
      if (campaignId) params.set('campaign', campaignId);
      await client.connect(`${wsProtocol}//${window.location.host}/api/chat/stream?${params.toString()}`, characters);
    }
  };

  const toggleMic = () => {
    if (!clientRef.current || connectionState !== 'connected') return;
    if (isDmSpeaking) return;
    
    if (isMicOpen) {
      clientRef.current.closeMic();
      setIsMicOpen(false);
    } else {
      clientRef.current.openMic();
      setIsMicOpen(true);
    }
  };

  useEffect(() => {
    let audioContext: AudioContext;
    let analyzer: AnalyserNode;
    let microphone: MediaStreamAudioSourceNode;
    let animationFrame: number;
    let stream: MediaStream;

    if (isMicOpen) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => {
        stream = s;
        audioContext = new AudioContext();
        analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 256;
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyzer);
        
        const dataArray = new Uint8Array(analyzer.frequencyBinCount);
        
        const checkLevel = () => {
          analyzer.getByteFrequencyData(dataArray);
          let sum = 0;
          for(let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          setAudioLevel(average * 2);
          animationFrame = requestAnimationFrame(checkLevel);
        };
        checkLevel();
      }).catch(err => {
        console.error("Microphone UI access failed:", err);
      });
    }

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (audioContext && audioContext.state !== 'closed') audioContext.close();
      setAudioLevel(0);
    };
  }, [isMicOpen]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', padding: '1rem', boxSizing: 'border-box' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', flexShrink: 0, alignItems: 'center' }}>
        <Link to="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none', fontFamily: 'var(--font-heading)', letterSpacing: '0.1em' }}>← Back to HUB</Link>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
           <select 
              value={currentSpeaker}
              onChange={(e) => setCurrentSpeaker(e.target.value)}
              style={{ padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid var(--accent-gold)', background: 'rgba(0,0,0,0.5)', color: 'var(--accent-gold)', fontSize: '0.9rem', outline: 'none' }}
           >
              <option value="Group">👤 Speaking as: Group</option>
              {characters.map(c => (
                 <option key={c.id} value={c.name}>👤 Speaking as: {c.name}</option>
              ))}
           </select>

           <button
             className="btn-secondary"
             onClick={() => setIsChatVisible(!isChatVisible)}
             style={{ padding: '0.25rem 1.5rem', fontSize: '0.85rem', borderRadius: '20px' }}
           >
             {isChatVisible ? 'Hide Text Log' : 'View Text Log'}
           </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: connectionState === 'connected' ? '#10b981' : connectionState === 'error' ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>
          {connectionState === 'connected' && <Wifi size={14} />}
          {connectionState === 'disconnected' && <WifiOff size={14} />}
          {connectionState === 'error' && <AlertCircle size={14} />}
          {connectionState === 'connecting' && <span className="streaming-pulse">{labels.connecting}</span>}
          {connectionState === 'connected' && <span>{labels.connected}</span>}
          {connectionState === 'error' && <span>{labels.error}</span>}
        </div>
      </div>

      {/* Main Top Row */}
      <div style={{ display: 'flex', flex: 1, gap: '2rem', minHeight: 0 }}>
        
        {/* Left Side: Flame + Big Button */}
        <div style={{ flex: isChatVisible ? 1 : '1 1 100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
          
          {isDmSpeaking && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem', marginTop: '1rem',
              borderRadius: '8px',
              background: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              color: 'var(--accent-magic)',
              fontSize: '0.85rem',
              animation: 'pulse 2s infinite',
              position: 'absolute',
              top: 0
            }}>
              <Radio size={14} />
              <span>{labels.dmSpeaking}</span>
            </div>
          )}

          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
             <FlickeringFlame />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', paddingBottom: '2rem' }}>
            {/* Connect Session Button */}
            <button 
              onClick={toggleSession}
              style={{ 
                background: isSessionActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                border: `2px solid ${isSessionActive ? '#10b981' : 'var(--panel-border)'}`,
                color: isSessionActive ? '#10b981' : 'var(--text-primary)',
                padding: '1.5rem',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s',
                boxShadow: isSessionActive ? '0 0 15px rgba(16, 185, 129, 0.3)' : 'none',
              }}
              title={isSessionActive ? "Disconnect Voice Session" : "Connect Voice Session"}
            >
              {isSessionActive ? <Wifi size={32} /> : <WifiOff size={32} />}
            </button>

            {/* Massive Push to Talk */}
            <button 
              onClick={toggleMic}
              disabled={!isSessionActive || connectionState !== 'connected' || isDmSpeaking}
              style={{ 
                background: isMicOpen 
                  ? 'rgba(239, 68, 68, 0.2)' 
                  : isDmSpeaking 
                    ? 'rgba(139, 92, 246, 0.1)' 
                    : 'rgba(212, 175, 55, 0.15)',
                border: `2px solid ${
                  isMicOpen 
                    ? 'var(--accent-danger)' 
                    : isDmSpeaking 
                      ? 'rgba(139, 92, 246, 0.3)' 
                      : (!isSessionActive || connectionState !== 'connected') 
                        ? 'var(--panel-border)' 
                        : 'var(--accent-gold)'
                }`,
                color: isMicOpen 
                  ? 'var(--accent-danger)' 
                  : isDmSpeaking 
                    ? 'rgba(139, 92, 246, 0.5)' 
                    : (!isSessionActive || connectionState !== 'connected') 
                      ? 'var(--text-secondary)' 
                      : 'var(--accent-gold)',
                padding: '2.5rem',
                borderRadius: '50%',
                cursor: (!isSessionActive || connectionState !== 'connected' || isDmSpeaking) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s',
                boxShadow: isMicOpen ? `0 0 ${20 + audioLevel}px rgba(239, 68, 68, 0.6)` : 'none',
                opacity: (!isSessionActive || connectionState !== 'connected') ? 0.4 : 1,
              }}
              title={
                isDmSpeaking 
                  ? "DM is speaking — wait for your turn" 
                  : isMicOpen 
                    ? "Tap to stop talking" 
                    : "Tap to talk"
              }
            >
              {isMicOpen ? <MicOff size={48} /> : <Mic size={48} />}
            </button>
          </div>
        </div>

        {/* Right Side: Chat Panel conditionally visible */}
        <div style={{ display: isChatVisible ? 'flex' : 'none', flex: 1, flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '1.5rem', border: '1px solid var(--panel-border)' }}>
          <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }} ref={logRef}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '90%',
                padding: '1rem 1.5rem',
                borderRadius: '12px',
                background: msg.role === 'user' ? 'rgba(212, 175, 55, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                border: `1px solid ${msg.role === 'user' ? 'rgba(212, 175, 55, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`,
              }}>
                <div style={{ color: msg.role === 'user' ? 'var(--accent-gold)' : 'var(--accent-magic)', fontWeight: 'bold', marginBottom: '0.25rem', fontFamily: 'var(--font-heading)', fontSize: '0.9rem' }}>
                  {msg.role === 'user' ? `You (${msg.speakerName || 'Group'})` : (msg.speakerName || 'DM')}
                </div>
                <div style={{ lineHeight: 1.5 }}>{msg.content}</div>
              </div>
            ))}
            {isTyping && (
               <div style={{ alignSelf: 'flex-start', padding: '0.75rem 1.25rem', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)', color: 'var(--accent-magic)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                {labels.pondering}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input 
              type="text" 
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={isDmSpeaking ? labels.dmSpeakingPlaceholder : labels.placeholder}
              disabled={isDmSpeaking}
              style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '1rem' }}
            />
            <button className="btn-primary" onClick={() => handleSend()} disabled={isDmSpeaking} style={{ display: 'flex', alignItems: 'center', padding: '0 1.5rem', opacity: isDmSpeaking ? 0.4 : 1 }}>
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      <DiceRoller onRoll={(res) => setLatestRoll(res)} requestedDie={requestedDie} />

      {/* Bottom Area: Characters */}
      <div style={{ 
          height: '420px', 
          display: 'flex', 
          gap: '1rem', 
          overflowX: 'auto', 
          overflowY: 'hidden',
          padding: '1rem 0 0 0',
          marginTop: '1rem',
          borderTop: '1px solid var(--panel-border)',
          alignItems: 'stretch'
       }}>
          {characters.map(c => (
              <div key={c.id} style={{ minWidth: '380px', flexShrink: 0, display: 'flex' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                     <PlayerView characterId={c.id!} />
                  </div>
              </div>
          ))}
          {characters.length === 0 && (
             <div style={{ margin: 'auto', color: 'var(--text-secondary)' }}>No characters found. Visit the Character Hub to recruit your party.</div>
          )}
      </div>

    </div>
  );
};

export default TabletView;
