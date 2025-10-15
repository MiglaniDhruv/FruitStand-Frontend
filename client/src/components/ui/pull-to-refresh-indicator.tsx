import { Loader2, ArrowDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { RefreshStatus } from '@/hooks/use-pull-to-refresh';

export interface PullToRefreshIndicatorProps {
  pullProgress: number;
  isRefreshing: boolean;
  refreshStatus: RefreshStatus;
  className?: string;
}

/**
 * Visual indicator component for pull-to-refresh functionality
 * 
 * Shows animated feedback as user pulls down to refresh:
 * - Arrow pointing down while pulling
 * - Arrow rotates to point up when ready
 * - Spinning loader while refreshing
 * 
 * @example
 * <PullToRefreshIndicator
 *   pullProgress={0.5}
 *   isRefreshing={false}
 *   refreshStatus="pulling"
 * />
 */
export function PullToRefreshIndicator({
  pullProgress,
  isRefreshing,
  refreshStatus,
  className,
}: PullToRefreshIndicatorProps) {
  const height = pullProgress * 60;
  const rotation = pullProgress * 180;

  // Determine text based on status
  const getText = () => {
    switch (refreshStatus) {
      case 'pulling':
        return 'Pull to refresh';
      case 'ready':
        return 'Release to refresh';
      case 'refreshing':
        return 'Refreshing...';
      default:
        return '';
    }
  };

  // Don't render if completely idle
  if (refreshStatus === 'idle' && !isRefreshing) {
    return null;
  }

  return (
    <div
      className={cn(
        'absolute top-0 left-0 right-0 flex items-center justify-center overflow-hidden',
        'bg-background/80 backdrop-blur-sm border-b border-border',
        'transition-all duration-150 ease-out',
        className
      )}
      style={{ height: `${height}px` }}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-1 py-2">
        {isRefreshing ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          </motion.div>
        ) : (
          <motion.div
            animate={{
              rotate: rotation,
              scale: refreshStatus === 'ready' ? 1.1 : 1,
            }}
            transition={{ duration: 0.2 }}
          >
            <ArrowDown
              className={cn(
                'h-5 w-5 transition-colors duration-200',
                refreshStatus === 'ready' ? 'text-primary' : 'text-muted-foreground'
              )}
            />
          </motion.div>
        )}
        <motion.span
          className="text-xs text-muted-foreground"
          animate={{ opacity: pullProgress > 0.2 ? 1 : 0 }}
          transition={{ duration: 0.15 }}
        >
          {getText()}
        </motion.span>
      </div>
    </div>
  );
}
