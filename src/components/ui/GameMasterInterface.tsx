import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, Wifi, WifiOff, AlertCircle, Radio } from 'lucide-react';
import { dmInstance } from '../../services/AiDungeonMaster';
import { SpeechClient } from '../../services/SpeechClient';

interface GameMasterProps {
  latestDiceRoll?: number | null;
  language?: string;
  campaignId?: string;
  onDiceRequest?: (die: string) => void;
}

const UI_LABELS = {
  en: {
    chatLog: 'Chat Log',
    connecting: 'Connecting to DungeonMaister...',
    connected: 'DungeonMaister Backend Active',
    error: 'DungeonMaister Backend Unreachable',
    dmSpeaking: 'The DungeonMaister is speaking — mic is muted',
    pondering: 'The DungeonMaister is pondering...',
    placeholder: 'Speak to the DungeonMaister or type here...',
    dmSpeakingPlaceholder: 'The DungeonMaister is speaking...',
    welcome: 'Ah, travelers! Welcome to the tavern. I am the DungeonMaister. Are you ready to begin your journey, or shall we start with a tutorial of the rules?',
  },
  de: {
    chatLog: 'Spielprotokoll',
    connecting: 'Verbinde mit DungeonMaister...',
    connected: 'DungeonMaister Backend Aktiv',
    error: 'DungeonMaister Backend nicht erreichbar',
    dmSpeaking: 'Der DungeonMaister spricht — Mikrofon ist stumm',
    pondering: 'Der DungeonMaister grübelt...',
    placeholder: 'Sprich zum DungeonMaister oder tippe hier...',
    dmSpeakingPlaceholder: 'Der DungeonMaister spricht...',
    welcome: 'Ah, Reisende! Willkommen in der Taverne. Ich bin der DungeonMaister. Seid ihr bereit, euer Abenteuer zu beginnen?',
  },
};

export const GameMasterInterface = ({ latestDiceRoll, language = 'en', campaignId = '', onDiceRequest }: GameMasterProps) => {
  const labels = UI_LABELS[language as keyof typeof UI_LABELS] || UI_LABELS.en;

  const [messages, setMessages] = useState<{role: 'user' | 'dm', content: string}[]>([
    { role: 'dm', content: labels.welcome }
  ]);
  const [inputText, setInputText] = useState('');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isMicOpen, setIsMicOpen] = useState(false);
  const [isDmSpeaking, setIsDmSpeaking] = useState(false);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const clientRef = useRef<SpeechClient | null>(null);
  
  const [isTyping, setIsTyping] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

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
    
    setMessages(prev => [...prev, { role: 'user', content: text }]);
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
      setMessages(prev => [...prev, { role: 'dm', content: response }]);
    }
  };

  useEffect(() => {
    if (latestDiceRoll !== undefined && latestDiceRoll !== null) {
       handleSend(`I rolled a ${latestDiceRoll}`, latestDiceRoll);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestDiceRoll]);

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
        setMessages(prev => [...prev, { role: speaker, content: msg }]);
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
        onDiceRequest?.(die);
      };

      const client = new SpeechClient(onMessage, onState, onDmSpeaking, language, handleDiceRequest);
      clientRef.current = client;
      
      // Build WebSocket URL routed through Vite's proxy (handles TLS for remote devices)
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const params = new URLSearchParams({ lang: language });
      if (campaignId) params.set('campaign', campaignId);
      await client.connect(`${wsProtocol}//${window.location.host}/api/chat/stream?${params.toString()}`);
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

  const [audioLevel, setAudioLevel] = useState<number>(0);

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
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)', maxHeight: '800px', maxWidth: '1000px', margin: '2rem auto', padding: '0 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        <div>{labels.chatLog}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: connectionState === 'connected' ? '#10b981' : connectionState === 'error' ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>
          {connectionState === 'connected' && <Wifi size={14} />}
          {connectionState === 'disconnected' && <WifiOff size={14} />}
          {connectionState === 'error' && <AlertCircle size={14} />}
          {connectionState === 'connecting' && <span className="streaming-pulse" style={{ animation: 'pulse 2s infinite' }}>{labels.connecting}</span>}
          {connectionState === 'connected' && <span>{labels.connected}</span>}
          {connectionState === 'error' && <span>{labels.error}</span>}
        </div>
      </div>

      {isDmSpeaking && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.5rem 1rem', marginBottom: '0.5rem',
          borderRadius: '8px',
          background: 'rgba(139, 92, 246, 0.15)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          color: 'var(--accent-magic)',
          fontSize: '0.85rem',
          animation: 'pulse 2s infinite'
        }}>
          <Radio size={14} />
          <span>{labels.dmSpeaking}</span>
        </div>
      )}

      <div className="glass-panel" style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }} ref={logRef}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ 
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
            padding: '1.5rem',
            borderRadius: '12px',
            background: msg.role === 'user' ? 'rgba(212, 175, 55, 0.1)' : 'rgba(139, 92, 246, 0.1)',
            border: `1px solid ${msg.role === 'user' ? 'rgba(212, 175, 55, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`,
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
          }}>
            <div style={{ color: msg.role === 'user' ? 'var(--accent-gold)' : 'var(--accent-magic)', fontWeight: 'bold', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)', letterSpacing: '0.05em' }}>
              {msg.role === 'user' ? 'You' : 'DungeonMaister'}
            </div>
            <div style={{ lineHeight: 1.6, fontSize: '1.1rem' }}>{msg.content}</div>
          </div>
        ))}
        {isTyping && (
           <div style={{ 
            alignSelf: 'flex-start',
            padding: '1rem 1.5rem',
            borderRadius: '12px',
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            color: 'var(--accent-magic)',
            fontStyle: 'italic'
          }}>
            {labels.pondering}
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ marginTop: '1.5rem', padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
        {isMicOpen && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'rgba(255,255,255,0.05)' }}>
            <div style={{ 
              height: '100%', 
              width: `${Math.min(100, audioLevel)}%`, 
              background: 'var(--accent-gold)', 
              boxShadow: '0 0 10px var(--accent-gold)',
              transition: 'width 0.05s linear' 
            }} />
          </div>
        )}

        <button 
          onClick={toggleSession}
          style={{ 
            background: isSessionActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${isSessionActive ? '#10b981' : 'var(--panel-border)'}`,
            color: isSessionActive ? '#10b981' : 'var(--text-primary)',
            padding: '0.75rem',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s',
            boxShadow: isSessionActive ? '0 0 10px rgba(16, 185, 129, 0.3)' : 'none',
            flexShrink: 0
          }}
          title={isSessionActive ? "Disconnect Voice Session" : "Connect Voice Session"}
        >
          {isSessionActive ? <Wifi size={18} /> : <WifiOff size={18} />}
        </button>

        <button 
          onClick={toggleMic}
          disabled={!isSessionActive || connectionState !== 'connected' || isDmSpeaking}
          style={{ 
            background: isMicOpen 
              ? 'rgba(239, 68, 68, 0.2)' 
              : isDmSpeaking 
                ? 'rgba(139, 92, 246, 0.1)' 
                : 'rgba(212, 175, 55, 0.15)',
            border: `1px solid ${
              isMicOpen 
                ? 'var(--accent-danger)' 
                : isDmSpeaking 
                  ? 'rgba(139, 92, 246, 0.3)' 
                  : (!isSessionActive || connectionState !== 'connected') 
                    ? 'var(--panel-border)' 
                    : 'rgba(212, 175, 55, 0.5)'
            }`,
            color: isMicOpen 
              ? 'var(--accent-danger)' 
              : isDmSpeaking 
                ? 'rgba(139, 92, 246, 0.5)' 
                : (!isSessionActive || connectionState !== 'connected') 
                  ? 'var(--text-secondary)' 
                  : 'var(--accent-gold)',
            padding: '1rem',
            borderRadius: '50%',
            cursor: (!isSessionActive || connectionState !== 'connected' || isDmSpeaking) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s',
            boxShadow: isMicOpen ? '0 0 15px rgba(239, 68, 68, 0.5)' : 'none',
            opacity: (!isSessionActive || connectionState !== 'connected') ? 0.4 : 1,
            flexShrink: 0
          }}
          title={
            isDmSpeaking 
              ? "DM is speaking — wait for your turn" 
              : isMicOpen 
                ? "Release to stop talking" 
                : "Push to talk"
          }
        >
          {isMicOpen ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        <input 
          type="text" 
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder={isDmSpeaking ? labels.dmSpeakingPlaceholder : labels.placeholder}
          disabled={isDmSpeaking}
          style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '1.1rem', fontFamily: 'var(--font-body)' }}
        />
        <button className="btn-primary" onClick={() => handleSend()} disabled={isDmSpeaking} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 1.5rem', opacity: isDmSpeaking ? 0.4 : 1 }}>
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};
