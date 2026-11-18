import { cleanup, render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { ConfirmProvider } from "./ConfirmDialog";
import { useConfirm } from "./ConfirmContext";

function Example({ onRemove }: { onRemove: () => void }) {
  const confirm = useConfirm();
  const [number] = useState("+55 11 99999-0000");
  return <button onClick={() => { void confirm({ title: "Excluir número manual?", description: `O número ${number} será removido.`, actionLabel: "Excluir número" }).then(accepted => { if (accepted) onRemove(); }); }}>Pedir exclusão</button>;
}

describe("confirmação de exclusão", () => {
  afterEach(cleanup);
  it("mostra o alvo e não executa a ação ao cancelar", async () => {
    const onRemove = vi.fn();
    render(<ConfirmProvider><Example onRemove={onRemove} /></ConfirmProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Pedir exclusão" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("+55 11 99999-0000");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("executa a ação somente após confirmação", async () => {
    const onRemove = vi.fn();
    render(<ConfirmProvider><Example onRemove={onRemove} /></ConfirmProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Pedir exclusão" }));
    expect(onRemove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Excluir número" }));
    await vi.waitFor(() => expect(onRemove).toHaveBeenCalledOnce());
  });
});
