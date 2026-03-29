export class SpeechClient {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private nextStartTime: number = 0;
  private recognition: any = null;
  private isRecording: boolean = false;
  private isMicOpen: boolean = false;
  private isDmSpeaking: boolean = false;
  private transcriptQueue: {speaker: 'user'|'dm', content: string}[] = [];
  
  private onMessageReceived: (speaker: 'user' | 'dm', msg: string) => void;
  private onStateChange: (state: 'connected' | 'disconnected' | 'error') => void;
  private onDmSpeakingChange: ((speaking: boolean) => void) | null = null;

  constructor(
    onMessageReceived: (speaker: 'user' | 'dm', msg: string) => void,
    onStateChange: (state: 'connected' | 'disconnected' | 'error') => void,
    onDmSpeakingChange?: (speaking: boolean) => void
  ) {
    this.onMessageReceived = onMessageReceived;
    this.onStateChange = onStateChange;
    this.onDmSpeakingChange = onDmSpeakingChange || null;
    this.initSpeechRecognition();
  }

  private initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
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
          // After sending, close the mic — user must push-to-talk again
          this.closeMic();
        }
      };

      this.recognition.onerror = (e: any) => {
        if (e.error !== 'no-speech') {
          console.error("Speech recognition error:", e.error);
        }
      };
      this.recognition.onend = () => {
         // Only auto-restart if mic is explicitly open (push-to-talk held)
         if (this.isMicOpen) {
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
        this.isRecording = true;
        // Don't auto-start mic — wait for push-to-talk
      };

      this.ws.onmessage = async (event) => {
        if (typeof event.data === 'string') {
          const data = JSON.parse(event.data);
          if (data.type === 'transcript') {
            // DM is responding — make sure mic is off
            if (!this.isDmSpeaking) {
              this.isDmSpeaking = true;
              this.closeMic();
              this.onDmSpeakingChange?.(true);
            }
            this.transcriptQueue.push({ speaker: data.speaker, content: data.content });
          } else if (data.type === 'turn_complete') {
            // DM finished speaking — allow push-to-talk again
            this.isDmSpeaking = false;
            this.onDmSpeakingChange?.(false);
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

  /** Open the mic for push-to-talk */
  public openMic() {
    if (this.isDmSpeaking) return; // Don't allow mic while DM is talking
    if (this.isMicOpen) return;
    this.isMicOpen = true;
    if (this.recognition) {
      try { this.recognition.start(); } catch(e) {}
    }
  }

  /** Close the mic (release push-to-talk) */
  public closeMic() {
    this.isMicOpen = false;
    if (this.recognition) {
      try { this.recognition.stop(); } catch(e) {}
    }
  }

  /** Check if the mic is currently open */
  public get micOpen(): boolean {
    return this.isMicOpen;
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
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime + 0.05;
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
    this.isMicOpen = false;
    this.isDmSpeaking = false;
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
