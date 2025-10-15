import { useCallback, useEffect, useState } from 'react';

/**
 * Haptic feedback patterns for different interaction types
 * 
 * - light: 50ms - Subtle feedback for button presses, toggles
 * - medium: 100ms - Confirmations, success actions, selections
 * - heavy: 200ms - Important events, errors, delete actions
 * - success: [50, 50, 100] - Success pattern with double pulse
 * - error: [100, 50, 100, 50, 100] - Error pattern with triple pulse
 * - warning: [50, 100, 50] - Warning pattern with emphasis
 */
export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 50,
  medium: 100,
  heavy: 200,
  success: [50, 50, 100],
  error: [100, 50, 100, 50, 100],
  warning: [50, 100, 50],
};

/**
 * Custom hook for haptic feedback using the Vibration API
 * 
 * Provides tactile feedback for touch interactions on supported devices.
 * Automatically respects user's reduced motion preferences.
 * 
 * @example
 * const { triggerHaptic, isSupported } = useHapticFeedback();
 * 
 * // Trigger haptic feedback
 * triggerHaptic('light'); // Button press
 * triggerHaptic('success'); // Successful action
 */
export function useHapticFeedback() {
  const [isSupported, setIsSupported] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if Vibration API is supported
    setIsSupported('vibrate' in navigator);

    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const triggerHaptic = useCallback((pattern: HapticPattern) => {
    // Don't vibrate if not supported, reduced motion is preferred, or in development
    if (!isSupported || prefersReducedMotion) {
      return;
    }

    try {
      const vibrationPattern = HAPTIC_PATTERNS[pattern];
      navigator.vibrate(vibrationPattern);
    } catch (error) {
      // Silently catch errors in production
      if (process.env.NODE_ENV === 'development') {
        console.error('Haptic feedback error:', error);
      }
    }
  }, [isSupported, prefersReducedMotion]);

  // Convenience functions for common patterns
  const hapticLight = useCallback(() => triggerHaptic('light'), [triggerHaptic]);
  const hapticMedium = useCallback(() => triggerHaptic('medium'), [triggerHaptic]);
  const hapticHeavy = useCallback(() => triggerHaptic('heavy'), [triggerHaptic]);
  const hapticSuccess = useCallback(() => triggerHaptic('success'), [triggerHaptic]);
  const hapticError = useCallback(() => triggerHaptic('error'), [triggerHaptic]);
  const hapticWarning = useCallback(() => triggerHaptic('warning'), [triggerHaptic]);

  return {
    triggerHaptic,
    isSupported,
    hapticLight,
    hapticMedium,
    hapticHeavy,
    hapticSuccess,
    hapticError,
    hapticWarning,
  };
}
