/**
 * Web Vibration API Haptics Hook
 * Provides tactile pulse patterns for emergency countdown, warnings, and button taps.
 */

export const useHaptics = () => {
  const triggerSosVibration = () => {
    if ('vibrate' in navigator) {
      // SOS Morse code pattern: ... --- ...
      navigator.vibrate([100, 50, 100, 50, 100, 150, 300, 100, 300, 100, 300, 150, 100, 50, 100, 50, 100]);
    }
  };

  const triggerHeavyImpact = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([400, 100, 300, 100, 500]);
    }
  };

  const triggerLightTap = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(25);
    }
  };

  const cancelVibration = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  };

  return {
    triggerSosVibration,
    triggerHeavyImpact,
    triggerLightTap,
    cancelVibration,
  };
};
