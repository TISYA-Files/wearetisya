import { useCallback, useRef, useEffect } from "react";

// Web Audio API-based sound synthesis (no external files needed)
export const useSoundFeedback = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const isEnabledRef = useRef(false);

  // Initialize AudioContext on first user interaction
  const enableSound = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
    isEnabledRef.current = true;
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Soft ambient UI tone - gentle fade-in chord
  const playAmbientTone = useCallback(() => {
    if (!isEnabledRef.current || !audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    const frequencies = [220, 330];
    
    frequencies.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.8);
    });
  }, []);

  // Fun click/jingle sound - playful ascending notes
  const playClickJingle = useCallback(() => {
    if (!isEnabledRef.current || !audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99];
    
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      
      gain.gain.setValueAtTime(0, now + i * 0.06);
      gain.gain.linearRampToValueAtTime(0.12, now + i * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.15);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.2);
    });
  }, []);

  // Louder heartbeat-style pulse for "Next" button
  const playPulse = useCallback(() => {
    if (!isEnabledRef.current || !audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    // Two stronger thuds like a heartbeat
    [0, 0.1].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(100, now + delay);
      osc.frequency.exponentialRampToValueAtTime(50, now + delay + 0.12);
      
      // Louder volume
      const vol = i === 0 ? 0.25 : 0.18;
      gain.gain.setValueAtTime(vol, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.15);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + delay);
      osc.stop(now + delay + 0.2);
    });
  }, []);

  // Sliding tick for sliders
  const playTick = useCallback(() => {
    if (!isEnabledRef.current || !audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.03);
    
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.06);
  }, []);

  // Hover sound - soft blip
  const playHover = useCallback(() => {
    if (!isEnabledRef.current || !audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.04);
    
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.1);
  }, []);

  // Back button sound - descending whoosh
  const playBack = useCallback(() => {
    if (!isEnabledRef.current || !audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "triangle";
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.12);
    
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.18);
  }, []);

  // Role-specific sounds
  // Pathfinder - warm welcome chord (community-focused)
  const playPathfinderSelect = useCallback(() => {
    if (!isEnabledRef.current || !audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    const notes = [261.63, 329.63, 392]; // C4, E4, G4 - major chord (welcoming)
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.02);
      osc.stop(now + 0.35);
    });
  }, []);

  // Pioneer - mechanical/tech beep sequence (building things)
  const playPioneerSelect = useCallback(() => {
    if (!isEnabledRef.current || !audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    const beeps = [440, 554.37, 659.25]; // A4, C#5, E5 - techy rising
    beeps.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.08, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.1);
    });
  }, []);

  // Ambassador - heroic brass-like fanfare (leadership)
  const playAmbassadorSelect = useCallback(() => {
    if (!isEnabledRef.current || !audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    // Bold ascending power chord - D4, F#4, A4, D5
    const notes = [293.66, 369.99, 440, 587.33];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now + i * 0.07);
      gain.gain.setValueAtTime(0, now + i * 0.07);
      gain.gain.linearRampToValueAtTime(0.08, now + i * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.35);
    });
  }, []);

  // Partner - deep resonant gong/bell (institutional gravitas)
  const playPartnerSelect = useCallback(() => {
    if (!isEnabledRef.current || !audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    // Deep bell tone with harmonics - E3, B3, E4
    const tones = [164.81, 246.94, 329.63];
    tones.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(i === 0 ? 0.15 : 0.08, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.65);
    });
  }, []);

  // Intern - curious/learning ascending tone
  const playInternSelect = useCallback(() => {
    if (!isEnabledRef.current || !audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(500, now + 0.15);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }, []);

  // Celebration sound for success screen
  const playCelebration = useCallback(() => {
    if (!isEnabledRef.current || !audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    // Celebratory fanfare - ascending major arpeggio with sparkles
    const fanfare = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    fanfare.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      gain.gain.setValueAtTime(0, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.5);
    });

    // Add sparkle overlay
    setTimeout(() => {
      if (!audioContextRef.current) return;
      const ctx2 = audioContextRef.current;
      const now2 = ctx2.currentTime;
      [1200, 1500, 1800].forEach((freq, i) => {
        const osc = ctx2.createOscillator();
        const gain = ctx2.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now2 + i * 0.05);
        gain.gain.setValueAtTime(0.05, now2 + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now2 + i * 0.05 + 0.1);
        osc.connect(gain);
        gain.connect(ctx2.destination);
        osc.start(now2 + i * 0.05);
        osc.stop(now2 + i * 0.05 + 0.15);
      });
    }, 300);
  }, []);

  // Slider change sound - subtle tick
  const playSliderTick = useCallback(() => {
    if (!isEnabledRef.current || !audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, now);
    
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.04);
  }, []);

  return {
    enableSound,
    playAmbientTone,
    playClickJingle,
    playPulse,
    playTick,
    playHover,
    playBack,
    playPathfinderSelect,
    playPioneerSelect,
    playAmbassadorSelect,
    playPartnerSelect,
    playInternSelect,
    playCelebration,
    playSliderTick,
  };
};

export default useSoundFeedback;
