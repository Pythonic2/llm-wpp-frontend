import { useEffect, useRef, useState, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { ConfirmationContext, type Confirmation } from "./ConfirmContext";

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Confirmation | null>(null);
  const resolver = useRef<((accepted: boolean) => void) | null>(null);
  const confirm = (options: Confirmation) => new Promise<boolean>((resolve) => {
    resolver.current?.(false);
    resolver.current = resolve;
    setPending(options);
  });
  const finish = (accepted: boolean) => {
    setPending(null);
    resolver.current?.(accepted);
    resolver.current = null;
  };
  useEffect(() => {
    if (!pending) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [pending]);
  useEffect(() => () => { resolver.current?.(false); resolver.current = null; }, []);

  return <ConfirmationContext.Provider value={confirm}>{children}{pending &&
    <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) finish(false); }}>
      <section className="modal-card team-remove-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description">
        <div className="team-remove-icon"><TriangleAlert size={23} /></div>
        <span className="eyebrow">{pending.eyebrow || "CONFIRMAR AÇÃO"}</span>
        <h2 id="confirm-dialog-title">{pending.title}</h2>
        <p id="confirm-dialog-description">{pending.description}</p>
        <div className="modal-actions"><button type="button" className="button button-secondary" autoFocus onClick={() => finish(false)}>Cancelar</button><button type="button" className="button button-danger" onClick={() => finish(true)}>{pending.actionLabel}</button></div>
      </section>
    </div>}
  </ConfirmationContext.Provider>;
}
