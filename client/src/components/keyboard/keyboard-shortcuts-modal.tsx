import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useKeyboardShortcutsContext } from '@/contexts/keyboard-shortcuts-context';
import { getModifierKey, formatShortcut, formatSequence } from '@/hooks/use-keyboard-shortcuts';
import { Search } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ShortcutKey = ({ children }: { children: React.ReactNode }) => (
  <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
    {children}
  </kbd>
);

const ShortcutDisplay = ({ shortcut }: { shortcut: any }) => {
  if (shortcut.sequence) {
    const formatted = formatSequence(shortcut.sequence);
    return (
      <div className="flex gap-1">
        {formatted.split(' then ').map((key, i) => (
          <div key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-muted-foreground text-xs">then</span>}
            <ShortcutKey>{key}</ShortcutKey>
          </div>
        ))}
      </div>
    );
  }

  const parts: string[] = [];
  if (shortcut.metaKey || shortcut.ctrlKey) {
    parts.push(getModifierKey());
  }
  if (shortcut.shiftKey) {
    parts.push('Shift');
  }
  if (shortcut.altKey) {
    parts.push('Alt');
  }
  parts.push(shortcut.key.toUpperCase());

  return (
    <div className="flex gap-1">
      {parts.map((part, i) => (
        <div key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-muted-foreground">+</span>}
          <ShortcutKey>{part}</ShortcutKey>
        </div>
      ))}
    </div>
  );
};

export function KeyboardShortcutsModal({ open, onOpenChange }: KeyboardShortcutsModalProps) {
  const { getShortcutsByCategory } = useKeyboardShortcutsContext();
  const [search, setSearch] = useState('');

  const shortcutsByCategory = useMemo(() => getShortcutsByCategory(), [getShortcutsByCategory]);

  const filteredShortcuts = useMemo(() => {
    if (!search) return shortcutsByCategory;

    const searchLower = search.toLowerCase();
    const filtered: Record<string, any[]> = {};

    Object.entries(shortcutsByCategory).forEach(([category, shortcuts]) => {
      const matchingShortcuts = shortcuts.filter(shortcut =>
        shortcut.description.toLowerCase().includes(searchLower) ||
        shortcut.key.toLowerCase().includes(searchLower) ||
        category.toLowerCase().includes(searchLower)
      );

      if (matchingShortcuts.length > 0) {
        filtered[category] = matchingShortcuts;
      }
    });

    return filtered;
  }, [shortcutsByCategory, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            All available keyboard shortcuts in the application
          </DialogDescription>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search shortcuts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {Object.entries(filteredShortcuts).map(([category, shortcuts]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold mb-3">{category}</h3>
              <div className="space-y-2">
                {shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <ShortcutDisplay shortcut={shortcut} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground space-y-1">
          <p>Press <ShortcutKey>?</ShortcutKey> to open this help anytime</p>
          <p>Press <ShortcutKey>Esc</ShortcutKey> to close</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
