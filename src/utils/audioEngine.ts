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
  private synthUtterance: SpeechSynthesisUtterance | null = null;
  private synthSpeakingSegmentId: string | null = null;
  private isPausedState: boolean = true;

  // Callbacks
  public onTimeUpdate: ((time: number, duration: number) => void) | null = null;
  public onStateChange: ((isPlaying: boolean) => void) | null = null;
  public onSegmentChange: ((segment: TranscriptSegment | null) => void) | null = null;
  public onEnded: (() => void) | null = null;

  constructor() {
    this.audioElement = new Audio();
    this.audioElement.preload = 'auto';

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
      // Use speech synthesis clock
      this.isSynthesizing = true;
      this.synthCurrentTime = 0;
      const dur = item.audioDuration || (item.segments.length > 0 ? item.segments[item.segments.length - 1].endTime : 30);
      this.onTimeUpdate?.(0, dur);
    }
  }

  public play() {
    this.isPausedState = false;
    if (this.isSynthesizing) {
      this.playSynthetic();
    } else if (this.audioElement && this.audioElement.src) {
      this.audioElement.play().catch(e => console.warn('Audio play error:', e));
    }
    this.onStateChange?.(true);
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
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      this.synthSpeakingSegmentId = null;
      this.onTimeUpdate?.(clamped, totalDuration);
      if (!this.isPausedState) {
        this.playSynthetic();
      }
    } else if (this.audioElement) {
      this.audioElement.currentTime = clamped;
      this.onTimeUpdate?.(clamped, totalDuration);
    }
  }

  public setPlaybackRate(rate: number) {
    this.playbackRate = rate;
    if (this.audioElement) {
      this.audioElement.playbackRate = rate;
    }
    if (this.isSynthesizing && !this.isPausedState) {
      // Refresh current spoken utterance rate
      if (this.synthUtterance) {
        this.synthUtterance.rate = rate;
      }
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
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    this.pauseSynthetic();
    this.synthCurrentTime = 0;
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

    const stepMs = 50;
    this.synthTimerId = setInterval(() => {
      if (this.isPausedState) return;

      const dur = this.getDuration();
      this.synthCurrentTime += (stepMs / 1000) * this.playbackRate;

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
    if (window.speechSynthesis) {
      window.speechSynthesis.pause();
    }
  }

  private triggerSyntheticVoiceForTime(time: number) {
    if (!('speechSynthesis' in window) || !this.currentItem) return;

    const seg = this.currentItem.segments.find(
      s => time >= s.startTime && time < s.endTime
    );

    if (seg && seg.id !== this.synthSpeakingSegmentId) {
      this.synthSpeakingSegmentId = seg.id;
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(seg.text);
      utterance.lang = this.currentItem.accent === 'UK' ? 'en-GB' : 'en-US';
      utterance.rate = this.playbackRate;
      utterance.volume = this.volume;

      const voices = window.speechSynthesis.getVoices();
      const targetVoice = voices.find(v => 
        this.currentItem?.accent === 'UK' 
          ? v.lang.startsWith('en-GB') 
          : (v.lang.startsWith('en-US') || v.lang.startsWith('en'))
      );
      if (targetVoice) utterance.voice = targetVoice;

      this.synthUtterance = utterance;
      window.speechSynthesis.speak(utterance);
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
