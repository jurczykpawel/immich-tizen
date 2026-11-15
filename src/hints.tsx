import type { ComponentChildren } from 'preact';

export interface Hint { keys: string; label: string }

/** Bottom bar that always tells which remote keys do what on the current screen. */
export function HintBar({ hints }: { hints: Hint[] }): ComponentChildren {
  return (
    <div class="hintbar">
      {hints.map((h) => (
        <span class="hint-item" key={h.label}>
          <kbd>{h.keys}</kbd>
          <span>{h.label}</span>
        </span>
      ))}
    </div>
  );
}
