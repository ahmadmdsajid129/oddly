/**
 * Multi-sensory feedback helpers (Haptics and Web Audio synthesizers)
 * Respects system settings and manual sound/haptic toggles.
 */

class FeedbackManager {
  private soundEnabled: boolean = false;
  private hapticsEnabled: boolean = true;
  private audioContext: AudioContext | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.soundEnabled = localStorage.getItem("oddly_sound") === "true";
      this.hapticsEnabled = localStorage.getItem("oddly_haptics") !== "false";
    }
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("oddly_sound", String(enabled));
    }
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public setHapticsEnabled(enabled: boolean) {
    this.hapticsEnabled = enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("oddly_haptics", String(enabled));
    }
  }

  public isHapticsEnabled(): boolean {
    return this.hapticsEnabled;
  }

  /**
   * Fires tactile vibration via navigator.vibrate
   */
  public triggerHaptic(type: "select" | "reveal" | "milestone" | "error") {
    if (!this.hapticsEnabled || typeof navigator === "undefined" || !navigator.vibrate) {
      return;
    }

    try {
      switch (type) {
        case "select":
          navigator.vibrate(5);
          break;
        case "reveal":
          navigator.vibrate(20);
          break;
        case "milestone":
          navigator.vibrate([15, 40, 25]);
          break;
        case "error":
          navigator.vibrate([30, 20, 30]);
          break;
      }
    } catch {
      // Ignore vibration errors if blocked by browser
    }
  }

  /**
   * Synthesizes audio feedback using Web Audio API (zero external assets)
   */
  public playSound(type: "tick" | "chime" | "celebrate") {
    if (!this.soundEnabled || typeof window === "undefined") {
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }

      const ctx = this.audioContext;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "tick") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === "chime") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === "celebrate") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.3);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      }
    } catch {
      // Audio autoplay policy fallback
    }
  }
}

export const feedback = new FeedbackManager();
