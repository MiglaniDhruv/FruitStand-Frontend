import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

export function NavigationRefreshHandler() {
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const previousLocationRef = useRef<string>();

  useEffect(() => {
    // Skip invalidation on initial mount (when ref is empty)
    if (previousLocationRef.current === undefined) {
      previousLocationRef.current = location;
      return;
    }

    // Only invalidate when location actually changes from previous value
    if (previousLocationRef.current !== location) {
      queryClient.invalidateQueries();
      previousLocationRef.current = location;
    }
  }, [location, queryClient]);

  // Return null since this is a side-effect-only component with no UI
  return null;
}