/**
 * Sound utility for playing success sounds
 */

// Create audio context for better browser compatibility
let audioContext = null;

// Initialize audio context on first use
const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
};

/**
 * Play a success sound using Web Audio API
 * @param {string} type - Type of success: 'bill', 'cash-in', 'cash-out', 'payment', 'default'
 */
export const playSuccessSound = (type = 'default') => {
  try {
    const ctx = getAudioContext();
    
    // Resume audio context if suspended (required by some browsers)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Different sounds for different actions
    const sounds = {
      'bill': {
        frequencies: [523.25, 659.25, 783.99], // C5, E5, G5 (major chord)
        duration: 0.15,
        gap: 0.05
      },
      'cash-in': {
        frequencies: [659.25, 783.99, 987.77], // E5, G5, B5 (ascending)
        duration: 0.12,
        gap: 0.04
      },
      'cash-out': {
        frequencies: [783.99, 659.25, 523.25], // G5, E5, C5 (descending)
        duration: 0.12,
        gap: 0.04
      },
      'payment': {
        frequencies: [523.25, 783.99], // C5, G5 (quick ding)
        duration: 0.1,
        gap: 0.03
      },
      'default': {
        frequencies: [523.25, 659.25], // C5, E5
        duration: 0.1,
        gap: 0.03
      }
    };

    const sound = sounds[type] || sounds.default;
    
    // Play sequence of notes
    sound.frequencies.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.value = freq;
      osc.type = 'sine';
      
      const startTime = ctx.currentTime + (index * (sound.duration + sound.gap));
      const endTime = startTime + sound.duration;
      
      // Envelope for smooth sound
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, endTime);
      
      osc.start(startTime);
      osc.stop(endTime);
    });
    
  } catch (error) {
    console.warn('Could not play sound:', error);
    // Silently fail - sound is not critical
  }
};

/**
 * Play error sound
 */
export const playErrorSound = () => {
  try {
    const ctx = getAudioContext();
    
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = 200; // Low frequency for error
    oscillator.type = 'sawtooth';
    
    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    
    oscillator.start(now);
    oscillator.stop(now + 0.2);
    
  } catch (error) {
    console.warn('Could not play error sound:', error);
  }
};

/**
 * Enable sound (call this on user interaction to unlock audio)
 */
export const enableSound = () => {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
  } catch (error) {
    console.warn('Could not enable sound:', error);
  }
};
