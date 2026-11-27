import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { TourGuide } from "./TourGuide";
import type { Role } from "./types";

afterEach(cleanup);

function Location() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

function renderTour(role: Role, path = "/dashboard") {
  return render(<MemoryRouter initialEntries={[path]}><TourGuide role={role} /><Location /></MemoryRouter>);
}

describe("TourGuide", () => {
  it("explains modules and fields without navigating until the user chooses a screen", () => {
    renderTour("agent", "/inbox");
    const trigger = screen.getByRole("button", { name: "Abrir tour do sistema" });
    fireEvent.click(trigger);

    expect(screen.getByRole("dialog", { name: "Conheça o Gest Tech" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Caixa de entrada" })).toBeInTheDocument();
    expect(screen.getByText("Busca")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "2 Enviar e acompanhar" }));
    expect(screen.getByText("Escreva uma mensagem")).toBeInTheDocument();
    expect(screen.getByText(/a Meta ainda pode rejeitar/)).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/inbox");

    fireEvent.click(screen.getByRole("button", { name: "Contatos" }));
    expect(screen.getByText("Telefone e WhatsApp ID")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Abrir Contatos" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/contacts");
  });

  it("only lists modules that the user's role can open", () => {
    renderTour("agent");
    fireEvent.click(screen.getByRole("button", { name: "Abrir tour do sistema" }));
    const modules = screen.getByRole("navigation", { name: "Módulos do tour" });
    expect(modules).toHaveTextContent("Pedidos");
    expect(modules).toHaveTextContent("WhatsApp");
    expect(modules).not.toHaveTextContent("Vendas");
    expect(modules).not.toHaveTextContent("Configurações");
    expect(modules).not.toHaveTextContent("Assinaturas");
  });

  it("includes owner topics and closes with Escape, restoring focus", () => {
    renderTour("owner", "/billing/subscriptions");
    const trigger = screen.getByRole("button", { name: "Abrir tour do sistema" });
    fireEvent.click(trigger);
    expect(screen.getByRole("heading", { name: "Assinaturas" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Módulos do tour" })).toHaveTextContent("Adicionar empresa");
    expect(screen.getByRole("button", { name: "Fechar tour" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
