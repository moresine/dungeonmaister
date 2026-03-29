export class SpeechClient {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private nextStartTime: number = 0;
  private recognition: any = null;
  private isRecording: boolean = false;
  private transcriptQueue: {speaker: 'user'|'dm', content: string}[] = [];
  
  private onMessageReceived: (speaker: 'user' | 'dm', msg: string) => void;
  private onStateChange: (state: 'connected' | 'disconnected' | 'error') => void;

  constructor(
    onMessageReceived: (speaker: 'user' | 'dm', msg: string) => void,
    onStateChange: (state: 'connected' | 'disconnected' | 'error') => void
  ) {
    this.onMessageReceived = onMessageReceived;
    this.onStateChange = onStateChange;
    this.initSpeechRecognition();
  }

  private initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      // By using continuous=false, the browser forcefully finalizes the transcript 
      // the moment you take a breath. We auto-restart it in onend() instantly anyway!
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (interimTranscript.trim().length > 0) {
           console.log("Listening...", interimTranscript);
        }

        if (finalTranscript.trim().length > 0) {
          console.log("Finalized Speech:", finalTranscript.trim());
          this.onMessageReceived('user', finalTranscript.trim());
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ text: finalTranscript.trim() }));
          }
        }
      };

      this.recognition.onerror = (e: any) => {
        // "no-speech" is a completely normal browser behavior when you don't say anything for ~10 seconds.
        // It automatically kills the microphone, but we reboot it automatically in onend!
        if (e.error !== 'no-speech') {
          console.error("Speech recognition error:", e.error);
        }
      };
      this.recognition.onend = () => {
         // Auto-restart if we are supposed to be recording
         if (this.isRecording) {
            try { this.recognition.start(); } catch(e) {}
         }
      }
    } else {
      console.warn("Web Speech API not supported in this browser. User must type.");
    }
  }

  public async connect(url: string = `ws://${window.location.hostname}:8001/api/chat/stream`) {
    try {
      if (!this.audioContext) this.audioContext = new AudioContext();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      this.nextStartTime = this.audioContext.currentTime;

      this.ws = new WebSocket(url);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.onStateChange('connected');
        if (this.recognition && !this.isRecording) {
          try {
            this.recognition.start();
            this.isRecording = true;
          } catch(e) {}
        }
      };

      this.ws.onmessage = async (event) => {
        if (typeof event.data === 'string') {
          const data = JSON.parse(event.data);
          if (data.type === 'transcript') {
            this.transcriptQueue.push({ speaker: data.speaker, content: data.content });
          }
        } else if (event.data instanceof ArrayBuffer) {
           const queuedTranscript = this.transcriptQueue.shift();
           await this.playAudio(event.data, queuedTranscript);
        }
      };

      this.ws.onclose = () => {
        this.onStateChange('disconnected');
        this.stop();
      };

      this.ws.onerror = () => {
        this.onStateChange('error');
      };
    } catch (err) {
      console.error('SpeechClient Connection failed:', err);
      this.onStateChange('error');
    }
  }

  public async sendText(text: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ text: text }));
    }
  }

  public async sendDiceRoll(roll: number) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ text: `I rolled a ${roll}!`, dice_roll: roll }));
    }
  }

  private async playAudio(arrayBuffer: ArrayBuffer, queuedTranscript?: {speaker: 'user'|'dm', content: string}) {
    if (!this.audioContext) return;
    try {
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      const currentTime = this.audioContext.currentTime;
      // Sync clock if we drifted
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime + 0.05; // Tight 50ms buffer
      }
      
      const delayMs = Math.max(0, (this.nextStartTime - currentTime) * 1000);
      
      if (queuedTranscript) {
        setTimeout(() => {
          this.onMessageReceived(queuedTranscript.speaker, queuedTranscript.content);
        }, delayMs);
      }
      
      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
    } catch(e) {
      console.error("Failed to decode WAV chunk:", e);
    }
  }

  public stop() {
    this.isRecording = false;
    if (this.recognition) {
       try { this.recognition.stop(); } catch(e) {}
    }
    if (this.ws) {
      this.ws.close();
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
