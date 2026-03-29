import Recorder from "opus-recorder";
// @ts-ignore
import encoderPath from "opus-recorder/dist/encoderWorker.min.js?url";

export class PersonaPlexClient {
  private ws: WebSocket | null = null;
  private recorder: any = null;
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private decoderWorker: Worker | null = null;
  private nextStartTime: number = 0;
  private onMessageReceived: (speaker: 'user' | 'dm', msg: string) => void;
  private onStateChange: (state: 'connected' | 'disconnected' | 'error') => void;

  constructor(
    onMessageReceived: (speaker: 'user' | 'dm', msg: string) => void,
    onStateChange: (state: 'connected' | 'disconnected' | 'error') => void
  ) {
    this.onMessageReceived = onMessageReceived;
    this.onStateChange = onStateChange;
  }

  public async connect(url: string = 'ws://127.0.0.1:8998/api/chat?text_prompt=Hello&voice_prompt=NATM0.pt') {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!this.audioContext) this.audioContext = new AudioContext();
      this.nextStartTime = this.audioContext.currentTime;

      // Initialize the WASM Opus Decoder Worker
      this.decoderWorker = new Worker('/decoderWorker.min.js');
      this.decoderWorker.onmessage = (e) => {
        if (e.data && e.data[0]) {
          this.playDecodedPCM(e.data[0]);
        }
      };

      this.decoderWorker.postMessage({
        command: "init",
        bufferLength: Math.round(960 * this.audioContext.sampleRate / 24000),
        decoderSampleRate: 24000,
        outputBufferSampleRate: this.audioContext.sampleRate,
        resampleQuality: 0,
      });

      // Warm up the decoder worker with a dummy BOS page so it allocates WASM memory
      setTimeout(() => {
        const bosPage = new Uint8Array([
          0x4F, 0x67, 0x67, 0x53, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x13,
          0x4F, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64, 0x01, 0x01, 0x38, 0x01, 0x80, 0xBB,
          0x00, 0x00, 0x00, 0x00, 0x00
        ]);
        this.decoderWorker?.postMessage({ command: "decode", pages: bosPage });
      }, 100);
      
      this.ws = new WebSocket(url);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        // We wait for the server handshake (kind === 0) before starting to stream
        console.log('WS Open. Waiting for server warmup & handshake...');
      };

      this.ws.onmessage = async (event) => {
        if (event.data instanceof ArrayBuffer) {
          const view = new Uint8Array(event.data);
          const kind = view[0];
          
          if (kind === 0) { // Handshake returned from Moshi (signifies warmup complete)
            console.log('Handshake received. System ready.');
            this.onStateChange('connected');
            this.startStreaming();
          } else if (kind === 1) { // Audio returned from Moshi
            const payload = view.slice(1);
            if (this.decoderWorker) {
              const copy = new Uint8Array(payload);
              this.decoderWorker.postMessage({ command: "decode", pages: copy }, [copy.buffer]);
            }
          } else if (kind === 2) { // Text transcript returned from Moshi
            const text = new TextDecoder().decode(view.slice(1));
            this.onMessageReceived('dm', text);
          }
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
      console.error('PersonaPlex Connection failed:', err);
      this.onStateChange('error');
    }
  }

  private startStreaming() {
    if (!this.stream || !this.ws) return;

    const recorderOptions = {
      encoderPath,
      encoderFrameSize: 20,
      encoderSampleRate: 24000,
      maxFramesPerPage: 2,
      numberOfChannels: 1,
      recordingGain: 1,
      resampleQuality: 3,
      encoderComplexity: 0,
      encoderApplication: 2049,
      streamPages: true,
      mediaTrackConstraints: {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        }
      }
    };

    this.recorder = new Recorder(recorderOptions);

    this.recorder.ondataavailable = (data: Uint8Array) => {
      if (this.ws?.readyState === WebSocket.OPEN && data.length > 0) {
        const payload = new Uint8Array(data.length + 1);
        payload[0] = 0x01; // Prefix with 1-byte Moshi audio header
        payload.set(data, 1);
        this.ws.send(payload);
      }
    };
    
    this.recorder.start().catch(console.error);
  }

  private playDecodedPCM(pcm: Float32Array) {
    if (!this.audioContext) return;
    try {
      const audioBuffer = this.audioContext.createBuffer(1, pcm.length, this.audioContext.sampleRate);
      audioBuffer.getChannelData(0).set(pcm);
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      const currentTime = this.audioContext.currentTime;
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime + 0.1; // Add 100ms buffering
      }
      
      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
    } catch(e) {
      console.error(e);
    }
  }

  public stop() {
    if (this.recorder) {
      this.recorder.stop();
    }
    if (this.decoderWorker) {
      this.decoderWorker.terminate();
      this.decoderWorker = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(new Uint8Array([0x00])); // Close handshake
      }
      this.ws.close();
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
