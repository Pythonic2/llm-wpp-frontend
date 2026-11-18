import { createContext, useContext, type ReactNode } from "react";

export type Confirmation = {
  title: string;
  description: ReactNode;
  actionLabel: string;
  eyebrow?: string;
};

export const ConfirmationContext = createContext<((options: Confirmation) => Promise<boolean>) | null>(null);

export function useConfirm() {
  const confirm = useContext(ConfirmationContext);
  if (!confirm) throw new Error("Confirmação indisponível.");
  return confirm;
}
