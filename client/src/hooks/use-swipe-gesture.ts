import { useRef, useCallback, useState, useEffect } from 'react';

export interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeStart?: () => void;
  onSwipeEnd?: () => void;
  threshold?: number;
  velocityThreshold?: number;
  maxVerticalMovement?: number;
  enabled?: boolean;
}

interface SwipeState {
  isSwiping: boolean;
  swipeDistance: number;
  swipeDirection: 'left' | 'right' | null;
}

interface TouchStart {
  x: number;
  y: number;
  timestamp: number;
}

export function getSwipeProgress(distance: number, threshold: number): number {
  return Math.min(Math.abs(distance) / threshold, 1);
}

export function shouldTriggerSwipe(
  distance: number,
  velocity: number,
  options: Required<Pick<SwipeGestureOptions, 'threshold' | 'velocityThreshold'>>
): boolean {
  return Math.abs(distance) >= options.threshold || velocity >= options.velocityThreshold;
}

export function useSwipeGesture(options: SwipeGestureOptions = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeStart,
    onSwipeEnd,
    threshold = 80,
    velocityThreshold = 0.3,
    maxVerticalMovement = 50,
    enabled = true,
  } = options;

  const elementRef = useRef<HTMLElement>(null);
  const touchStartRef = useRef<TouchStart | null>(null);
  const [state, setState] = useState<SwipeState>({
    isSwiping: false,
    swipeDistance: 0,
    swipeDirection: null,
  });

  const isInteractiveElement = useCallback((target: EventTarget | null): boolean => {
    if (!target || !(target instanceof Element)) return false;
    
    const tagName = target.tagName.toLowerCase();
    const interactiveTags = ['button', 'input', 'select', 'textarea', 'a'];
    
    if (interactiveTags.includes(tagName)) return true;
    
    // Check if element has click handler or is interactive
    return target.closest('[role="button"], button, a, input, select, textarea') !== null;
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    if (isInteractiveElement(e.target)) return;

    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    };

    onSwipeStart?.();
  }, [enabled, isInteractiveElement, onSwipeStart]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || !touchStartRef.current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    // Check if movement is too vertical
    if (Math.abs(deltaY) > maxVerticalMovement) {
      touchStartRef.current = null;
      setState({
        isSwiping: false,
        swipeDistance: 0,
        swipeDirection: null,
      });
      return;
    }

    // Update swipe state
    setState({
      isSwiping: true,
      swipeDistance: deltaX,
      swipeDirection: deltaX > 0 ? 'right' : 'left',
    });

    // Prevent default if swiping horizontally
    if (Math.abs(deltaX) > 10) {
      e.preventDefault();
    }
  }, [enabled, maxVerticalMovement]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled || !touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.timestamp;
    const velocity = Math.abs(deltaX) / deltaTime;

    // Check if vertical movement is too much
    if (Math.abs(deltaY) > maxVerticalMovement) {
      touchStartRef.current = null;
      setState({
        isSwiping: false,
        swipeDistance: 0,
        swipeDirection: null,
      });
      onSwipeEnd?.();
      return;
    }

    // Trigger swipe callback if thresholds are met
    if (shouldTriggerSwipe(deltaX, velocity, { threshold, velocityThreshold })) {
      if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      } else if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      }
    }

    // Reset state
    touchStartRef.current = null;
    setState({
      isSwiping: false,
      swipeDistance: 0,
      swipeDirection: null,
    });
    onSwipeEnd?.();
  }, [enabled, maxVerticalMovement, threshold, velocityThreshold, onSwipeLeft, onSwipeRight, onSwipeEnd]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !enabled) return;

    // Add event listeners with passive: false for preventDefault
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    ref: elementRef,
    ...state,
  };
}
