import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddCompanyPage, CheckoutStatusPage, LandingPage, SignupPage, VerifyEmailPage } from "./Billing";
import { http } from "./api";

vi.mock("./api", () => ({
  http: { get: vi.fn(), post: vi.fn() },
  companyPath: (id: string, path: string) => `/companies/${id}/${path}`,
  errorMessage: (error: unknown) => error instanceof Error ? error.message : "Erro",
  getSession: vi.fn(),
}));

function renderPage(path: string, element: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><Routes><Route path={path.split("?")[0]} element={element} /></Routes></MemoryRouter></QueryClientProvider>);
}

describe("Cadastro e confirmação de assinatura", () => {
  const prices = { first_company_price: "249.90", extra_company_price: "199.90", extra_number_price: "30.00", included_numbers: 2, included_business_units: 2 };
  beforeEach(() => {
    vi.resetAllMocks(); sessionStorage.clear();
    vi.mocked(http.get).mockImplementation(async () => ({ data: prices }));
  });
  afterEach(cleanup);

  it("mostra o preço mensal e os dois números antes do cadastro", async () => {
    renderPage("/", <LandingPage />);
    expect(await screen.findByText(/R\$ 249,90/)).toBeInTheDocument();
    expect(screen.getByText(/até 2 unidades de negócio e 2 números/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Criar minha conta" })).toHaveAttribute("href", "/signup");
  });

  it("mostra o preço atualizado recebido do backend", async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { ...prices, first_company_price: "279.90" } });
    renderPage("/", <LandingPage />);
    expect(await screen.findByText(/R\$ 279,90/)).toBeInTheDocument();
    expect(screen.queryByText(/R\$ 249,90/)).not.toBeInTheDocument();
  });

  it("mantém o checkout pendente sem liberar o CRM pelo retorno do navegador", async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { status: "pending", kind: "first_company", amount: "249.90", checkout_url: "https://asaas.com/checkoutSession/show?id=example", can_login: false } });
    renderPage("/checkout/status?token=abc", <CheckoutStatusPage />);
    expect(await screen.findByText("Aguardando pagamento")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Acessar o Gest Tech" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir para o pagamento seguro" })).toHaveAttribute("href", "https://asaas.com/checkoutSession/show?id=example");
  });

  it("mantém pagamento confirmado sem acesso até confirmar o e-mail", async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { status: "paid", kind: "first_company", amount: "249.90", checkout_url: "", can_login: false, email_verified: false } });
    renderPage("/checkout/status?token=abc", <CheckoutStatusPage />);
    expect(await screen.findByText(/confirme o link enviado ao seu e-mail/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Acessar o Gest Tech" })).not.toBeInTheDocument();
  });

  it("confirma o e-mail com ação explícita", async () => {
    vi.mocked(http.post).mockResolvedValue({ data: { verified: true } });
    renderPage("/verify-email?token=abc", <VerifyEmailPage />);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar meu e-mail" }));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith("/public/verify-email/", { token: "abc" }));
    expect(await screen.findByText(/E-mail confirmado/)).toBeInTheDocument();
  });

  it("expõe erro de cadastro sem inventar pagamento confirmado", async () => {
    vi.mocked(http.post).mockRejectedValue(new Error("Documento inválido"));
    renderPage("/signup", <SignupPage />);
    await screen.findByText(/R\$ 249,90/);
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "maria@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "SenhaSegura123!" } });
    fireEvent.change(screen.getByLabelText("Nome da empresa ou negócio"), { target: { value: "Ateliê" } });
    const values: Record<string, string> = {
      "Nome completo ou razão social": "Maria da Silva", "CPF ou CNPJ": "52998224725",
      "Celular com DDD": "11999990000", "CEP": "01310000", "Rua ou avenida": "Av. Paulista",
      "Número": "100", "Bairro": "Bela Vista", "Cidade": "São Paulo", "UF": "SP",
    };
    for (const [label, value] of Object.entries(values)) fireEvent.change(screen.getByLabelText(label), { target: { value } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar para pagamento" }));
    await waitFor(() => expect(http.post).toHaveBeenCalledOnce());
    expect(await screen.findByRole("alert")).toHaveTextContent("Documento inválido");
  });

  it("pede e-mail de cobrança para uma conta legada e envia no checkout", async () => {
    vi.mocked(http.get).mockImplementation(async url => ({ data: url === "/public/prices/" ? prices : { configured: true, email_required: true } }));
    vi.mocked(http.post).mockRejectedValue(new Error("Falha simulada"));
    renderPage("/companies/new", <AddCompanyPage />);
    expect(await screen.findByLabelText("E-mail de cobrança")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Nome da nova empresa"), { target: { value: "Empresa extra" } });
    fireEvent.change(screen.getByLabelText("E-mail de cobrança"), { target: { value: "cobranca@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar para pagamento" }));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith(
      "/billing/extra-company/",
      { company_name: "Empresa extra", billing_email: "cobranca@example.com" },
      expect.objectContaining({ headers: expect.objectContaining({ "Idempotency-Key": expect.any(String) }) }),
    ));
  });
});
