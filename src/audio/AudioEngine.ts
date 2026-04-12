// src/audio/AudioEngine.ts
// Core singleton audio pipeline: Source → Analyser → Panner(HRTF) → Convolver → Compressor → Destination

import { azimuthElevationToCartesian } from '@/audio/PannerController';

interface AudioNodes {
  analyser: AnalyserNode;
  panner: PannerNode;
  convolver: ConvolverNode;
  dryGain: GainNode;
  wetGain: GainNode;
  compressor: DynamicsCompressorNode;
  masterGain: GainNode;
}

export class AudioEngine {
  private _currentIRParams: import('@/scenes/presets').IRParams | null = null;
  private _irDebounce: any;

  setCurrentIRParams(params: import('@/scenes/presets').IRParams) {
    this._currentIRParams = { ...params };
  }

  setRoomPhysics(roomSize: number, damping: number): void {
    if (!this._currentIRParams || !this.ctx) return;
    
    // Scale parameters based on sliders
    this._currentIRParams.roomSize = roomSize / 100;
    this._currentIRParams.damping = damping / 100;
    
    // Approximate new decay time: larger room = longer decay, more damping = shorter decay
    this._currentIRParams.decayTime = Math.max(0.1, (roomSize / 100) * 4.5 * (1 - (damping / 100) * 0.5));

    clearTimeout(this._irDebounce);
    this._irDebounce = setTimeout(async () => {
      try {
        const { generateSyntheticIR } = await import('@/audio/IRLoader');
        const ir = await generateSyntheticIR(this._currentIRParams!, this.ctx!);
        this.loadIR(ir);
      } catch (err) {
        console.error('[Auris] Physics IR update failed:', err);
      }
    }, 250);
  }
  private static _instance: AudioEngine | null = null;

  ctx: AudioContext | null = null;
  private _nodes: AudioNodes | null = null;

  // Current source tracking
  private _sourceNode: AudioNode | null = null;
  private _bufferSource: AudioBufferSourceNode | null = null;
  private _mediaStream: MediaStream | null = null;
  private _fileBuffer: AudioBuffer | null = null;
  private _oscGroup: Array<{ osc: OscillatorNode; lfo: OscillatorNode; gain: GainNode }> = [];

  isPlaying = false;
  sourceType: 'demo' | 'file' | 'mic' | 'none' = 'none';

  private _devLatencyMark = 0;

  static get instance(): AudioEngine {
    if (!AudioEngine._instance) AudioEngine._instance = new AudioEngine();
    return AudioEngine._instance;
  }

  private constructor() { }

  // ─── INIT ──────────────────────────────────────────────
  init(): AudioContext {
    if (this.ctx && this.ctx.state !== 'closed') return this.ctx;

    // Safari compatibility shim
    const Ctx: typeof AudioContext =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    this.ctx = new Ctx();
    this._buildGraph();
    return this.ctx;
  }

  private _buildGraph(): void {
    const ctx = this.ctx!;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.82;

    const panner = ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = 10;
    panner.rolloffFactor = 0.4;
    
    // Protected initialization: prevent Chromium NaN crash when Panner and Listener overlap at (0,0,0)
    if (panner.positionX !== undefined) {
      panner.positionX.value = 1;
      panner.positionY.value = 0;
      panner.positionZ.value = -1;
    } else {
      (panner as any).setPosition(1, 0, -1);
    }

    const convolver = ctx.createConvolver();

    const dryGain = ctx.createGain();
    dryGain.gain.value = 0.7;

    const wetGain = ctx.createGain();
    wetGain.gain.value = 0.3;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 30;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.9;

    analyser.connect(panner);
    
    panner.connect(dryGain);
    panner.connect(convolver);

    convolver.connect(wetGain);
    dryGain.connect(compressor);
    wetGain.connect(compressor);
    compressor.connect(masterGain);
    masterGain.connect(ctx.destination);

    this._nodes = { analyser, panner, convolver, dryGain, wetGain, compressor, masterGain };
  }

  // ─── SOURCE MANAGEMENT ─────────────────────────────────
  private _disconnectSource(): void {
    if (this._bufferSource) {
      try { this._bufferSource.stop(); } catch { /* already stopped */ }
      this._bufferSource.disconnect();
      this._bufferSource = null;
    }
    if (this._sourceNode && this._sourceNode !== this._bufferSource) {
      try { this._sourceNode.disconnect(); } catch { /* ignore */ }
      this._sourceNode = null;
    }
    if (this._mediaStream) {
      this._mediaStream.getTracks().forEach((t) => t.stop());
      this._mediaStream = null;
    }
    for (const { osc, lfo, gain } of this._oscGroup) {
      try { osc.stop(); } catch { /* ignore */ }
      try { lfo.stop(); } catch { /* ignore */ }
      osc.disconnect();
      lfo.disconnect();
      gain.disconnect();
    }
    this._oscGroup = [];
  }

  /** Load ambient oscillator-based demo audio */
  loadDemo(): void {
    if (!this.ctx || !this._nodes) return;
    this._disconnectSource();
    const ctx = this.ctx;
    const { analyser } = this._nodes;

    // A minor 7 ambient pad: A2, C3, E3, G3, A3
    const notes = [
      { freq: 110.0, type: 'sine' as OscillatorType, level: 0.18 },
      { freq: 130.8, type: 'triangle' as OscillatorType, level: 0.12 },
      { freq: 164.8, type: 'sine' as OscillatorType, level: 0.14 },
      { freq: 196.0, type: 'triangle' as OscillatorType, level: 0.10 },
      { freq: 220.0, type: 'sine' as OscillatorType, level: 0.09 },
    ];

    this._oscGroup = notes.map(({ freq, type, level }, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = (Math.random() - 0.5) * 8; // subtle warmth

      lfo.type = 'sine';
      lfo.frequency.value = 0.10 + i * 0.027;
      lfoGain.gain.value = level * 0.45;

      gain.gain.value = level;

      osc.connect(gain);
      gain.connect(analyser);
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);

      osc.start();
      lfo.start();
      return { osc, lfo, gain };
    });

    this.sourceType = 'demo';
    this.isPlaying = true;

    // Resume context in case it was suspended
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => null);
    }
  }

  /** Decode and load an audio file */
  async loadFile(file: File): Promise<void> {
    if (!this.ctx || !this._nodes) return;
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this._fileBuffer = audioBuffer;
    this._disconnectSource();
    this._playBuffer();
    this.sourceType = 'file';
  }

  private _playBuffer(): void {
    if (!this.ctx || !this._nodes || !this._fileBuffer) return;
    const source = this.ctx.createBufferSource();
    source.buffer = this._fileBuffer;
    source.loop = true;
    source.connect(this._nodes.analyser);
    source.start(0);
    this._bufferSource = source;
    this._sourceNode = source;
    this.isPlaying = true;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => null);
    }
  }

  /** Connect microphone input */
  async loadMic(): Promise<void> {
    if (!this.ctx || !this._nodes) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    this._mediaStream = stream;
    this._disconnectSource();
    const source = this.ctx.createMediaStreamSource(stream);
    source.connect(this._nodes.analyser);
    this._sourceNode = source;
    this.sourceType = 'mic';
    this.isPlaying = true;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => null);
    }
  }

  // ─── PLAYBACK ─────────────────────────────────────────
  async play(): Promise<void> {
    if (!this.ctx) return;
    if (this.sourceType === 'none') this.loadDemo();
    await this.ctx.resume();
    this.isPlaying = true;
  }

  async pause(): Promise<void> {
    if (!this.ctx) return;
    await this.ctx.suspend();
    this.isPlaying = false;
  }

  async togglePlay(): Promise<void> {
    if (this.isPlaying) await this.pause();
    else await this.play();
  }

  // ─── SPATIAL CONTROLS ─────────────────────────────────
  setAzimuthElevation(azDeg: number, elDeg: number, dist: number): void {
    if (!this._nodes || !this.ctx) return;

    if ((import.meta as any).env?.DEV && this._devLatencyMark > 0) {
      const latency = performance.now() - this._devLatencyMark;
      if (latency > 30) {
        console.warn(`[Auris] ⚠️ Spatial update latency ${latency.toFixed(1)}ms > 30ms threshold`);
      }
    }
    this._devLatencyMark = performance.now();

    const { x, y, z } = azimuthElevationToCartesian(azDeg, elDeg, dist);
    const { panner } = this._nodes;

    if (panner.positionX !== undefined) {
      panner.positionX.value = x;
      panner.positionY.value = y;
      panner.positionZ.value = z;
    } else {
      (panner as any).setPosition(x, y, z);
    }
  }

  setListenerOrientation(forwardX: number, forwardZ: number): void {
    if (!this.ctx) return;
    const listener = this.ctx.listener;
    if (listener.forwardX !== undefined) {
      listener.forwardX.value = forwardX;
      listener.forwardZ.value = forwardZ;
      listener.forwardY.value = 0;
      listener.upX.value = 0;
      listener.upY.value = 1;
      listener.upZ.value = 0;
    } else {
      (listener as unknown as { setOrientation(...args: number[]): void })
        .setOrientation(forwardX, 0, forwardZ, 0, 1, 0);
    }
  }

  // ─── ROOM / REVERB ────────────────────────────────────
  loadIR(buffer: AudioBuffer): void {
    if (!this._nodes) return;
    this._nodes.convolver.buffer = null; // force clear old kernel
    this._nodes.convolver.buffer = buffer;
  }

  setWetDry(wetPct: number): void {
    if (!this._nodes || !this.ctx) return;
    const wet = Math.max(0, Math.min(1, wetPct / 100));
    const dry = 1 - wet;
    
    // Direct value assignment bypasses any setTargetAtTime state lockups
    this._nodes.wetGain.gain.value = wet;
    this._nodes.dryGain.gain.value = dry;
  }

  // ─── ANALYSIS ─────────────────────────────────────────
  getFrequencyData(): Float32Array {
    const a = this._nodes?.analyser;
    if (!a) return new Float32Array(0);
    const buf = new Float32Array(a.frequencyBinCount);
    a.getFloatFrequencyData(buf);
    return buf;
  }

  getTimeDomainData(): Float32Array {
    const a = this._nodes?.analyser;
    if (!a) return new Float32Array(0);
    const buf = new Float32Array(a.fftSize);
    a.getFloatTimeDomainData(buf);
    return buf;
  }

  getAmplitude(): number {
    const td = this.getTimeDomainData();
    if (!td.length) return 0;
    let rms = 0;
    for (let i = 0; i < td.length; i++) rms += td[i] * td[i];
    return Math.sqrt(rms / td.length);
  }

  get frequencyBinCount(): number {
    return this._nodes?.analyser.frequencyBinCount ?? 1024;
  }

  get sampleRate(): number {
    return this.ctx?.sampleRate ?? 44100;
  }

  // ─── CLEANUP ──────────────────────────────────────────
  destroy(): void {
    this._disconnectSource();
    this.ctx?.close();
    this.ctx = null;
    this._nodes = null;
    AudioEngine._instance = null;
  }
}
