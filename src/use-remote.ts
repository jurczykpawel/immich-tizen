import { useLayoutEffect, useRef } from 'preact/hooks';
import { keyToIntent, type Intent } from './keys';

/** Calls the latest handler for every recognised remote key; unknown keys pass through. */
export function useRemote(handler: (intent: Intent) => void): void {
  const ref = useRef(handler);
  ref.current = handler;
  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const intent = keyToIntent(e.keyCode);
      if (!intent) return;
      e.preventDefault();
      ref.current(intent);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
