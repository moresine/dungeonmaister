import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { dmInstance } from '../../services/AiDungeonMaster';
import { SpeechClient } from '../../services/SpeechClient';

export const GameMasterInterface = ({ latestDiceRoll }: { latestDiceRoll?: number | null }) => {
  const [messages, setMessages] = useState<{role: 'user' | 'dm', content: string}[]>([
    { role: 'dm', content: 'Ah, travelers! Welcome to the tavern. I am the DungeonMaister. Are you ready to begin your journey, or shall we start with a tutorial of the rules?' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
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
       // Only send manual text explicitly if the client is connected
       // SpeechClient sends spoken text automatically.
       if (!textOverride) {
          // If it was a typed message from the input box, send it manually via the socket
          clientRef.current.sendText(text);
       }
       if (diceRoll) {
          clientRef.current.sendDiceRoll(diceRoll);
       }
    } else {
      // Fallback Mock DM if disconnected
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

  const toggleVoiceMode = async () => {
    if (isRecording) {
      if (clientRef.current) clientRef.current.stop();
      setIsRecording(false);
      setConnectionState('disconnected');
    } else {
      setIsRecording(true);
      setConnectionState('connecting');
      
      const onMessage = (speaker: 'user' | 'dm', msg: string) => {
        setMessages(prev => {
          // If the user spoke, we don't want to duplicate messages if they rapidly trigger multiple transcript lines.
          // For now, simply appending.
          return [...prev, { role: speaker, content: msg }];
        });
      };
      
      const onState = (state: 'connected' | 'disconnected' | 'error') => {
        setConnectionState(state);
        if (state === 'error' || state === 'disconnected') {
          setIsRecording(false);
        }
      };

      const client = new SpeechClient(onMessage, onState);
      clientRef.current = client;
      
      // Connect to the new Python FastAPI backend serving our XTTSv2 and Ollama pipeline
      await client.connect(`ws://${window.location.hostname}:8001/api/chat/stream`);
    }
  };

  const [audioLevel, setAudioLevel] = useState<number>(0);

  useEffect(() => {
    let audioContext: AudioContext;
    let analyzer: AnalyserNode;
    let microphone: MediaStreamAudioSourceNode;
    let animationFrame: number;
    let stream: MediaStream;

    if (isRecording) {
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
          // Scale it up a bit so it looks reactive
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
  }, [isRecording]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)', maxHeight: '800px', maxWidth: '1000px', margin: '2rem auto', padding: '0 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        <div>Chat Log</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: connectionState === 'connected' ? '#10b981' : connectionState === 'error' ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>
          {connectionState === 'connected' && <Wifi size={14} />}
          {connectionState === 'disconnected' && <WifiOff size={14} />}
          {connectionState === 'error' && <AlertCircle size={14} />}
          {connectionState === 'connecting' && <span className="streaming-pulse" style={{ animation: 'pulse 2s infinite' }}>Connecting to PersonaPlex...</span>}
          {connectionState === 'connected' && <span>PersonaPlex Local Active</span>}
          {connectionState === 'error' && <span>PersonaPlex Local Unreachable</span>}
        </div>
      </div>
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
            The DungeonMaister is pondering...
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ marginTop: '1.5rem', padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
        {isRecording && (
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
          onClick={toggleVoiceMode}
          style={{ 
            background: isRecording ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${isRecording ? 'var(--accent-danger)' : 'var(--panel-border)'}`,
            color: isRecording ? 'var(--accent-danger)' : 'var(--text-primary)',
            padding: '1rem',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s',
            boxShadow: isRecording ? '0 0 15px rgba(239, 68, 68, 0.5)' : 'none'
          }}
          title={isRecording ? "Stop Recording" : "Start Voice Interaction"}
        >
          {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
        <input 
          type="text" 
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Speak to the DungeonMaister or type here..."
          style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '1.1rem', fontFamily: 'var(--font-body)' }}
        />
        <button className="btn-primary" onClick={() => handleSend()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 1.5rem' }}>
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};
