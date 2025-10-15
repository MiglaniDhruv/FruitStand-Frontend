import * as React from "react"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"
import { ToastAction } from "@/components/ui/toast"

// Simple haptic feedback function (not a hook, so can be used in toast function)
function triggerHaptic(pattern: number | number[]) {
  if ('vibrate' in navigator && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    try {
      navigator.vibrate(pattern);
    } catch (error) {
      // Silently ignore
    }
  }
}

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
  icon?: React.ReactNode
  duration?: number
  onRetry?: () => void
  disableHaptic?: boolean
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
  const id = genId()

  // Trigger haptic feedback based on variant
  if (!props.disableHaptic) {
    if (props.variant === 'destructive') {
      triggerHaptic([100, 50, 100, 50, 100]); // Error pattern
    } else {
      triggerHaptic(50); // Light feedback for default toasts
    }
  }

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open: boolean) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

// Success toast helper
toast.success = (title: string, description?: string) => {
  triggerHaptic([50, 50, 100]); // Success pattern
  return toast({
    title,
    description,
    icon: <CheckCircle className="h-5 w-5 text-green-600" />,
    variant: "default",
    disableHaptic: true, // Already triggered above
  });
};

// Error toast helper with retry support
toast.error = (
  title: string, 
  description?: string, 
  options?: { onRetry?: () => void }
) => {
  triggerHaptic([100, 50, 100, 50, 100]); // Error pattern
  return toast({
    title,
    description,
    icon: <XCircle className="h-5 w-5" />,
    variant: "destructive",
    disableHaptic: true, // Already triggered above
    action: options?.onRetry 
      ? <ToastAction altText="Retry" onClick={options.onRetry}>Retry</ToastAction>
      : undefined,
  });
};

// Loading toast helper
toast.loading = (title: string, description?: string) => {
  return toast({
    title,
    description,
    icon: <Loader2 className="h-5 w-5 animate-spin" />,
    variant: "default",
    duration: Infinity, // Don't auto-dismiss loading toasts
  });
};

// Update toast helper
toast.update = (id: string, props: Partial<ToasterToast>) => {
  dispatch({
    type: "UPDATE_TOAST",
    toast: { ...props, id },
  });
};

// Promise toast helper
toast.promise = async <T,>(
  promise: Promise<T>,
  msgs: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: Error) => string);
  }
) => {
  const toastId = toast.loading(msgs.loading);

  try {
    const data = await promise;
    const successMsg = typeof msgs.success === 'function' ? msgs.success(data) : msgs.success;
    toastId.update({
      id: toastId.id,
      title: successMsg,
      icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      variant: "default",
      duration: 5000,
    });
    return data;
  } catch (error) {
    const errorMsg = typeof msgs.error === 'function' 
      ? msgs.error(error as Error) 
      : msgs.error;
    toastId.update({
      id: toastId.id,
      title: errorMsg,
      icon: <XCircle className="h-5 w-5" />,
      variant: "destructive",
      duration: 5000,
    });
    throw error;
  }
};

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
