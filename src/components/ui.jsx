// Small shared UI pieces.
import { useEffect, useId, useRef, useState } from 'react';

/** Coloured status chip: never colour alone, always with text. */
export const STATUS = {
  ready: { label: 'Ready', chip: 'bg-tofu text-ink', dot: 'bg-tofu' },
  suggested: { label: 'Check', chip: 'bg-blaze text-ink', dot: 'bg-blaze' },
  unknown: { label: 'Unknown', chip: 'bg-violet text-white', dot: 'bg-violet' },
  excluded: { label: 'Skipped', chip: 'bg-neutral-300 text-ink dark:bg-neutral-700 dark:text-paper', dot: 'bg-neutral-400' },
};

export function StatusChip({ status }) {
  const s = STATUS[status];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${s.chip}`}>{s.label}</span>;
}

/** Label + control, wired with an id. */
export function Field({ label, hint, children }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children(id)}
      {hint && <p className="muted mt-1 text-xs">{hint}</p>}
    </div>
  );
}

/** Chips with an input: Enter or comma adds, Backspace on empty removes the last. */
export function TagInput({ id, value = [], onChange, placeholder = 'Type and press Enter' }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const t = draft.trim().replace(/,$/, '');
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft('');
  };
  return (
    <div className="input flex flex-wrap items-center gap-1.5 py-1.5">
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-full bg-violet px-2.5 py-0.5 text-sm text-white">
          {t}
          <button type="button" aria-label={`Remove ${t}`} className="rounded-full px-1 hover:bg-white/20" onClick={() => onChange(value.filter((x) => x !== t))}>
            ×
          </button>
        </span>
      ))}
      <input
        id={id}
        className="min-w-[8rem] flex-1 bg-transparent px-1 py-0.5 outline-none"
        value={draft}
        placeholder={value.length ? '' : placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={add}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add();
          } else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
        }}
      />
    </div>
  );
}

/** Native <dialog> confirmation. */
export function ConfirmDialog({ open, title, children, confirmLabel, onConfirm, onCancel, danger, confirmDisabled }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onCancel={onCancel} className="card max-w-md p-0 text-ink backdrop:bg-ink/60 dark:text-paper">
      <div className="flex flex-col gap-4 p-6">
        <h2 className="display text-2xl">{title}</h2>
        {children}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className={danger ? 'btn-warn' : 'btn-primary'} onClick={onConfirm} disabled={confirmDisabled}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}

/** A short-lived status message, announced to screen readers. */
export function useToast() {
  const [msg, setMsg] = useState('');
  const timer = useRef(0);
  const show = (m) => {
    setMsg(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(''), 2600);
  };
  const node = (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center">
      {msg && <span className="rounded-full bg-ink px-4 py-2 text-sm text-paper shadow-lg motion-safe:animate-reveal dark:bg-paper dark:text-ink">{msg}</span>}
    </div>
  );
  return [node, show];
}

/** Fades content in when it scrolls into view (skipped with reduced motion). */
export function Reveal({ children, className = '' }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!('IntersectionObserver' in window)) return setShown(true);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setShown(true), io.disconnect()), { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`${shown ? 'motion-safe:animate-reveal' : 'motion-safe:opacity-0'} ${className}`}>
      {children}
    </div>
  );
}
