import { toasts } from '../../app/store';

/** Notifiche brevi, annunciate dagli screen reader. */
export function Toasts() {
  return (
    <div class="toasts" role="status" aria-live="polite">
      {toasts.value.map((t) => (
        <div key={t.id} class={`toast toast--${t.tone}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
