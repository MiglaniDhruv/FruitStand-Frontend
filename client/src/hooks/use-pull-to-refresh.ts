import { useRef, useCallback, useState, useEffect } from 'react';

export interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPullDistance?: number;
  enabled?: boolean;
  resistance?: number;
}

export type RefreshStatus = 'idle' | 'pulling' | 'ready' | 'refreshing';

interface PullState {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  pullProgress: number;
  refreshStatus: RefreshStatus;
}

export function usePullToRefresh(options: PullToRefreshOptions) {
  const {
    onRefresh,
    threshold = 80,
    maxPullDistance = 150,
    enabled = true,
    resistance = 0.5,
  } = options;

  const elementRef = useRef<HTMLElement>(null);
  const touchStartRef = useRef<number | null>(null);
  const [state, setState] = useState<PullState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
    pullProgress: 0,
    refreshStatus: 'idle',
  });

  const applyResistance = useCallback((distance: number): number => {
    const resistanceFactor = 1 - (distance / maxPullDistance) * (1 - resistance);
    return distance * Math.max(resistanceFactor, resistance);
  }, [maxPullDistance, resistance]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;

    const element = elementRef.current;
    if (!element) return;

    // Only start pull if at the top of the scroll container
    if (element.scrollTop === 0) {
      touchStartRef.current = e.touches[0].clientY;
    }
  }, [enabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || touchStartRef.current === null) return;

    const element = elementRef.current;
    if (!element || element.scrollTop > 0) {
      touchStartRef.current = null;
      return;
    }

    const currentY = e.touches[0].clientY;
    const rawDistance = currentY - touchStartRef.current;

    // Only handle downward pulls
    if (rawDistance < 0) {
      touchStartRef.current = null;
      return;
    }

    // Apply resistance and clamp to max distance
    const distance = Math.min(applyResistance(rawDistance), maxPullDistance);
    const progress = Math.min(distance / threshold, 1);
    const status: RefreshStatus = distance >= threshold ? 'ready' : 'pulling';

    setState({
      isPulling: true,
      isRefreshing: false,
      pullDistance: distance,
      pullProgress: progress,
      refreshStatus: status,
    });

    // Prevent default scroll behavior during pull
    if (distance > 10) {
      e.preventDefault();
    }
  }, [enabled, applyResistance, maxPullDistance, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || !state.isPulling) return;

    const shouldRefresh = state.pullDistance >= threshold;

    if (shouldRefresh) {
      setState(prev => ({
        ...prev,
        isPulling: false,
        isRefreshing: true,
        refreshStatus: 'refreshing',
      }));

      try {
        await onRefresh();
      } finally {
        setState({
          isPulling: false,
          isRefreshing: false,
          pullDistance: 0,
          pullProgress: 0,
          refreshStatus: 'idle',
        });
      }
    } else {
      setState({
        isPulling: false,
        isRefreshing: false,
        pullDistance: 0,
        pullProgress: 0,
        refreshStatus: 'idle',
      });
    }

    touchStartRef.current = null;
  }, [enabled, state.isPulling, state.pullDistance, threshold, onRefresh]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !enabled) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Visual state for rendering
  const pullIndicatorStyle = {
    transform: `translateY(${state.pullDistance}px)`,
    opacity: state.pullProgress,
  };

  const shouldShowIndicator = state.isPulling || state.isRefreshing;

  return {
    ref: elementRef,
    ...state,
    pullIndicatorStyle,
    shouldShowIndicator,
  };
}
