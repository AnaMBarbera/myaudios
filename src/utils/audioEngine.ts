import { AudioTranscriptItem, TranscriptSegment } from '../types';

export class UnifiedAudioPlayer {
  private audioElement: HTMLAudioElement | null = null;
  private currentItem: AudioTranscriptItem | null = null;
  private isSynthesizing: boolean = false;
  private playbackRate: number = 1.0;
  private volume: number = 1.0;
  private loopSegment: TranscriptSegment | null = null;
  private autoPauseAfterSentence: boolean = false;
  
  // Timer & state for synthetic audio
  private synthCurrentTime: number = 0;
  private synthTimerId: any = null;
  private synthLastTickTime: number = 0;
  private synthUtterance: SpeechSynthesisUtterance | null = null;
  private synthSpeakingSegmentId: string | null = null;
  private isPausedState: boolean = true;
  private cachedVoices: SpeechSynthesisVoice[] = [];

  // Callbacks
  public onTimeUpdate: ((time: number, duration: number) => void) | null = null;
  public onStateChange: ((isPlaying: boolean) => void) | null = null;
  public onSegmentChange: ((segment: TranscriptSegment | null) => void) | null = null;
  public onEnded: (() => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioElement = new Audio();
      this.audioElement.preload = 'auto';
      // Cross-platform mobile attributes (crucial for Samsung Internet, Chrome Android, Firefox)
      (this.audioElement as any).playsInline = true;
      this.audioElement.crossOrigin = 'anonymous';

      this.audioElement.addEventListener('timeupdate', () => {
        if (!this.audioElement || this.isSynthesizing) return;
        const cur = this.audioElement.currentTime;
        const dur = this.audioElement.duration || this.currentItem?.audioDuration || 0;
        this.handlePlaybackTick(cur, dur);
      });

      this.audioElement.addEventListener('play', () => {
        this.isPausedState = false;
        this.onStateChange?.(true);
      });

      this.audioElement.addEventListener('pause', () => {
        this.isPausedState = true;
        this.onStateChange?.(false);
      });

      this.audioElement.addEventListener('ended', () => {
        this.isPausedState = true;
        this.onStateChange?.(false);
        this.onEnded?.();
      });

      this.audioElement.addEventListener('error', (e) => {
        console.warn('HTMLAudioElement error encountered:', this.audioElement?.error, e);
        this.isPausedState = true;
        this.onStateChange?.(false);
      });

      // Cache SpeechSynthesis voices asynchronously for Firefox and Android
      if ('speechSynthesis' in window) {
        this.loadVoices();
        window.speechSynthesis.onvoiceschanged = () => {
          this.loadVoices();
        };
      }
    }
  }

  private loadVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) {
          this.cachedVoices = v;
        }
      } catch (e) {
        console.warn('Error reading speechSynthesis voices:', e);
      }
    }
  }

  public loadTrack(item: AudioTranscriptItem, audioBlobUrl?: string | null) {
    this.stop();
    this.currentItem = item;
    this.loopSegment = null;

    if (audioBlobUrl || item.audioUrl) {
      this.isSynthesizing = false;
      if (this.audioElement) {
        this.audioElement.src = audioBlobUrl || item.audioUrl || '';
        this.audioElement.playbackRate = this.playbackRate;
        this.audioElement.volume = this.volume;
        this.audioElement.currentTime = 0;
      }
    } else {
      // Use speech synthesis clock with accurate performance.now() delta
      this.isSynthesizing = true;
      this.synthCurrentTime = 0;
      const dur = item.audioDuration || (item.segments.length > 0 ? item.segments[item.segments.length - 1].endTime : 30);
      this.onTimeUpdate?.(0, dur);
    }
  }

  public play() {
    this.isPausedState = false;

    // Unblock speech synthesis on mobile user gestures (Samsung Internet & Chrome Android)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.resume();
      } catch (e) {}
    }

    if (this.isSynthesizing) {
      this.playSynthetic();
      this.onStateChange?.(true);
    } else if (this.audioElement && this.audioElement.src) {
      const playPromise = this.audioElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.isPausedState = false;
            this.onStateChange?.(true);
          })
          .catch((err) => {
            console.warn('Audio playback was blocked or failed in this browser:', err);
            this.isPausedState = true;
            this.onStateChange?.(false);
          });
      } else {
        this.onStateChange?.(true);
      }
    }
  }

  public pause() {
    this.isPausedState = true;
    if (this.isSynthesizing) {
      this.pauseSynthetic();
    } else if (this.audioElement) {
      this.audioElement.pause();
    }
    this.onStateChange?.(false);
  }

  public togglePlay() {
    if (this.isPlaying()) {
      this.pause();
    } else {
      this.play();
    }
  }

  public seek(seconds: number) {
    const totalDuration = this.getDuration();
    const clamped = Math.max(0, Math.min(seconds, totalDuration));

    if (this.isSynthesizing) {
      this.synthCurrentTime = clamped;
      this.synthSpeakingSegmentId = null;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
      }
      this.onTimeUpdate?.(clamped, totalDuration);
      if (!this.isPausedState) {
        this.playSynthetic();
      }
    } else if (this.audioElement) {
      try {
        this.audioElement.currentTime = clamped;
      } catch (e) {
        console.warn('Seek error on audioElement:', e);
      }
      this.onTimeUpdate?.(clamped, totalDuration);
    }
  }

  public setPlaybackRate(rate: number) {
    this.playbackRate = Math.max(0.5, Math.min(2.0, rate));
    if (this.audioElement) {
      this.audioElement.playbackRate = this.playbackRate;
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.audioElement) {
      this.audioElement.volume = this.volume;
    }
  }

  public setLoopSegment(segment: TranscriptSegment | null) {
    this.loopSegment = segment;
  }

  public getLoopSegment(): TranscriptSegment | null {
    return this.loopSegment;
  }

  public setAutoPauseAfterSentence(val: boolean) {
    this.autoPauseAfterSentence = val;
  }

  public isAutoPauseEnabled(): boolean {
    return this.autoPauseAfterSentence;
  }

  public isPlaying(): boolean {
    return !this.isPausedState;
  }

  public getCurrentTime(): number {
    if (this.isSynthesizing) {
      return this.synthCurrentTime;
    }
    return this.audioElement?.currentTime || 0;
  }

  public getDuration(): number {
    if (this.isSynthesizing) {
      return this.currentItem?.audioDuration || 30;
    }
    if (this.audioElement && this.audioElement.duration && !isNaN(this.audioElement.duration)) {
      return this.audioElement.duration;
    }
    return this.currentItem?.audioDuration || 30;
  }

  public stop() {
    this.isPausedState = true;
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      } catch (e) {}
    }
    this.pauseSynthetic();
    this.synthCurrentTime = 0;
    this.synthSpeakingSegmentId = null;
    this.onStateChange?.(false);
  }

  private handlePlaybackTick(currentTime: number, duration: number) {
    this.onTimeUpdate?.(currentTime, duration);

    // Check loop segment
    if (this.loopSegment) {
      if (currentTime >= this.loopSegment.endTime || currentTime < this.loopSegment.startTime) {
        this.seek(this.loopSegment.startTime);
        return;
      }
    }

    // Check active segment
    const activeSeg = this.currentItem?.segments.find(
      s => currentTime >= s.startTime && currentTime <= s.endTime
    ) || null;
    this.onSegmentChange?.(activeSeg);

    // Check auto-pause after sentence
    if (this.autoPauseAfterSentence && activeSeg) {
      if (Math.abs(currentTime - activeSeg.endTime) < 0.25) {
        this.pause();
      }
    }
  }

  // --- Synthetic Speech Synchronization Engine ---
  private playSynthetic() {
    if (this.synthTimerId) clearInterval(this.synthTimerId);

    this.synthLastTickTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());

    const stepMs = 40;
    this.synthTimerId = setInterval(() => {
      if (this.isPausedState) return;

      const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const deltaSec = Math.max(0, (now - this.synthLastTickTime) / 1000);
      this.synthLastTickTime = now;

      const dur = this.getDuration();
      // Accurate real-time delta prevents speed drift on throttled mobile processors (Samsung / Android)
      this.synthCurrentTime += deltaSec * this.playbackRate;

      if (this.synthCurrentTime >= dur) {
        this.synthCurrentTime = dur;
        this.pause();
        this.onEnded?.();
        return;
      }

      this.handlePlaybackTick(this.synthCurrentTime, dur);
      this.triggerSyntheticVoiceForTime(this.synthCurrentTime);
    }, stepMs);

    this.triggerSyntheticVoiceForTime(this.synthCurrentTime);
  }

  private pauseSynthetic() {
    if (this.synthTimerId) {
      clearInterval(this.synthTimerId);
      this.synthTimerId = null;
    }
    // Cross-browser note: on Android & Samsung Internet, speechSynthesis.pause() hangs the speech engine.
    // Calling cancel() stops output cleanly and allows resuming on next play.
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    this.synthSpeakingSegmentId = null;
  }

  private triggerSyntheticVoiceForTime(time: number) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !this.currentItem) return;

    const seg = this.currentItem.segments.find(
      s => time >= s.startTime && time < s.endTime
    );

    if (seg && seg.id !== this.synthSpeakingSegmentId) {
      this.synthSpeakingSegmentId = seg.id;

      try {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(seg.text);
        utterance.lang = this.currentItem.accent === 'UK' ? 'en-GB' : 'en-US';
        utterance.rate = this.playbackRate;
        utterance.volume = this.volume;

        // Find voice safely across Firefox and Chromium
        if (this.cachedVoices.length === 0) {
          this.loadVoices();
        }

        const targetVoice = this.cachedVoices.find(v => 
          this.currentItem?.accent === 'UK' 
            ? (v.lang.toLowerCase().includes('gb') || v.lang.toLowerCase().includes('en-uk'))
            : (v.lang.toLowerCase().includes('us') || v.lang.toLowerCase().startsWith('en'))
        );
        if (targetVoice) {
          utterance.voice = targetVoice;
        }

        utterance.onerror = (e) => {
          console.warn('SpeechSynthesis utterance event error:', e);
        };

        // Delay speech slightly after cancel() to prevent Firefox and Samsung Internet queue drop
        setTimeout(() => {
          if (!this.isPausedState && 'speechSynthesis' in window) {
            window.speechSynthesis.speak(utterance);
          }
        }, 20);
      } catch (e) {
        console.warn('SpeechSynthesis error:', e);
      }
    }
  }

  public destroy() {
    this.stop();
    if (this.audioElement) {
      this.audioElement.src = '';
      this.audioElement = null;
    }
  }
}
