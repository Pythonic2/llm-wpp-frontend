import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import * as api from "./api";
import type { Company, Dashboard, Session } from "./types";

vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api");
  return {
    ...actual,
    listCompanies: vi.fn(),
    getSession: vi.fn(),
    refreshSession: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    getCompany: vi.fn(),
    getDashboard: vi.fn(),
    listContacts: vi.fn(),
    getContact: vi.fn(),
    createContact: vi.fn(),
    updateContact: vi.fn(),
    deleteContact: vi.fn(),
    contactConversations: vi.fn(),
    listConversations: vi.fn(),
    getConversation: vi.fn(),
    listMessages: vi.fn(),
    conversationAction: vi.fn(),
    updateConversation: vi.fn(),
    sendMessage: vi.fn(),
    listMembers: vi.fn(),
    listNumbers: vi.fn(),
    getNumber: vi.fn(),
    createNumber: vi.fn(),
    updateNumber: vi.fn(),
    deleteNumber: vi.fn(),
    listKnowledgeBases: vi.fn(),
    getKnowledgeBase: vi.fn(),
    listDocuments: vi.fn(),
  };
});

const company: Company = {
  id: "company-test",
  name: "Gest Tech",
  slug: "gest-tech",
  created_at: "2026-01-01T12:00:00Z",
  role: "admin",
};
const companyB: Company = {
  id: "company-test-b",
  name: "Outra empresa",
  slug: "outra-empresa",
  created_at: "2026-01-01T12:00:00Z",
  role: "agent",
};

const session: Session = {
  user: { id: 1, username: "ana", email: "ana@example.com", first_name: "Ana", last_name: "Costa" },
  companies: [company],
};

const dashboard: Dashboard = {
  total_conversations: 2,
  open_conversations: 1,
  human_conversations: 1,
  ai_conversations: 0,
  inbound_messages: 5,
  outbound_messages: 3,
  documents_processing: 0,
  documents_failed: 0,
  recent_conversations: [],
};

function renderApp(path: string) {
  window.history.replaceState({}, "", path);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <BrowserRouter><App /></BrowserRouter>
    </QueryClientProvider>,
  );
}

describe("Gest Tech protected app", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    vi.mocked(api.getSession).mockResolvedValue(session);
    vi.mocked(api.refreshSession).mockResolvedValue(session.user);
    vi.mocked(api.listCompanies).mockResolvedValue([company]);
    vi.mocked(api.logout).mockResolvedValue();
    vi.mocked(api.getDashboard).mockResolvedValue(dashboard);
    vi.mocked(api.getCompany).mockResolvedValue({
      ...company,
      integrations: {
        whatsapp_configured: false,
        gemini_configured: false,
        webhook_path: "/api/webhooks/whatsapp/",
      },
    });
    vi.mocked(api.listContacts).mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
    vi.mocked(api.getContact).mockRejectedValue(new api.ApiError("Not found", 404));
    vi.mocked(api.createContact).mockImplementation(async (_companyId, contact) => ({
      id: 19,
      ...contact,
      created_at: "2026-01-01T12:00:00Z",
      updated_at: "2026-01-01T12:00:00Z",
    }));
    vi.mocked(api.updateContact).mockRejectedValue(new Error("Unexpected contact update"));
    vi.mocked(api.deleteContact).mockResolvedValue();
    vi.mocked(api.contactConversations).mockResolvedValue([]);
    vi.mocked(api.listConversations).mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
    vi.mocked(api.getConversation).mockImplementation(async (_companyId, id) => ({
      id,
      contact: {
        id: 8,
        name: "Maria",
        phone: "5511999999999",
        wa_id: "5511999999999",
        created_at: "2026-01-01T12:00:00Z",
        updated_at: "2026-01-01T12:00:00Z",
      },
      whatsapp_number: 1,
      status: "open",
      lead_stage: "",
      lead_data: {},
      ai_paused: false,
      ai_paused_at: null,
      assigned_to: null,
      last_message_at: "2026-01-01T12:05:00Z",
      created_at: "2026-01-01T12:00:00Z",
    }));
    vi.mocked(api.listMessages).mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
    vi.mocked(api.conversationAction).mockResolvedValue({
      id: 7,
      contact: {
        id: 8,
        name: "Maria",
        phone: "5511999999999",
        wa_id: "5511999999999",
        created_at: "2026-01-01T12:00:00Z",
        updated_at: "2026-01-01T12:00:00Z",
      },
      whatsapp_number: 1,
      status: "open",
      lead_stage: "",
      lead_data: {},
      ai_paused: true,
      ai_paused_at: "2026-01-01T12:00:00Z",
      assigned_to: null,
      last_message_at: "2026-01-01T12:05:00Z",
      created_at: "2026-01-01T12:00:00Z",
    });
    vi.mocked(api.updateConversation).mockResolvedValue({
      id: 7,
      contact: {
        id: 8,
        name: "Maria",
        phone: "5511999999999",
        wa_id: "5511999999999",
        created_at: "2026-01-01T12:00:00Z",
        updated_at: "2026-01-01T12:00:00Z",
      },
      whatsapp_number: 1,
      status: "qualified",
      lead_stage: "Novo lead",
      lead_data: {},
      ai_paused: false,
      ai_paused_at: null,
      assigned_to: null,
      last_message_at: "2026-01-01T12:05:00Z",
      created_at: "2026-01-01T12:00:00Z",
    });
    vi.mocked(api.sendMessage).mockResolvedValue({
      id: 52,
      external_id: "pending-52",
      direction: "out",
      message_type: "text",
      text: "Olá",
      status: "pending",
      ai_status: "na",
      response_to: null,
      created_at: "2026-01-01T12:05:00Z",
    });
    vi.mocked(api.listMembers).mockResolvedValue([]);
    vi.mocked(api.listNumbers).mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
    vi.mocked(api.getNumber).mockRejectedValue(new api.ApiError("Not found", 404));
    vi.mocked(api.createNumber).mockRejectedValue(new Error("Unexpected number creation"));
    vi.mocked(api.updateNumber).mockResolvedValue({
      id: 3,
      phone_number_id: "phone-id",
      display_phone_number: "+5511999999999",
      business_account_id: "business-id",
      ai_enabled: true,
      is_active: true,
      created_at: "2026-01-01T12:00:00Z",
    });
    vi.mocked(api.deleteNumber).mockResolvedValue();
    vi.mocked(api.listKnowledgeBases).mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
    vi.mocked(api.getKnowledgeBase).mockRejectedValue(new api.ApiError("Not found", 404));
    vi.mocked(api.listDocuments).mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
  });

  it("redirects unauthenticated visitors to the login form", async () => {
    vi.mocked(api.getSession).mockRejectedValue(new api.ApiError("Unauthorized", 403));
    renderApp("/inbox");

    expect(await screen.findByRole("heading", { name: "Acesse sua conta" })).toBeInTheDocument();
    expect(screen.getByLabelText("Usuário ou e-mail")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
  });

  it("shows live dashboard data after restoring an authenticated session", async () => {
    renderApp("/dashboard");

    expect(await screen.findByText("Conversas abertas")).toBeInTheDocument();
    expect(screen.getAllByText("1", { selector: ".stat-number" })).toHaveLength(2);
    expect(screen.getByText("Olá, Ana 👋")).toBeInTheDocument();
  });

  it("protects administration routes from agent accounts", async () => {
    vi.mocked(api.getSession).mockResolvedValue({
      ...session,
      companies: [{ ...company, role: "agent" }],
    });
    renderApp("/team");

    expect(await screen.findByRole("heading", { name: "Área restrita" })).toBeInTheDocument();
    expect(screen.getByText(/Seu papel não tem permissão/)).toBeInTheDocument();
  });

  it("loads older chronological messages without replacing the latest page", async () => {
    vi.mocked(api.listConversations).mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [{
        id: 7,
        contact: {
          id: 8,
          name: "Maria",
          phone: "5511999999999",
          wa_id: "5511999999999",
          created_at: "2026-01-01T12:00:00Z",
          updated_at: "2026-01-01T12:00:00Z",
        },
        whatsapp_number: 1,
        status: "open",
        lead_stage: "",
        lead_data: {},
        ai_paused: false,
        ai_paused_at: null,
        assigned_to: null,
        last_message_at: "2026-01-01T12:05:00Z",
        created_at: "2026-01-01T12:00:00Z",
      }],
    });
    vi.mocked(api.listMessages).mockImplementation(async (_companyId, _conversationId, page) => page === 1
      ? {
        count: 51, next: "http://192.168.0.6:8123/api/v1/messages/?page=2", previous: null, results: [{
          id: 1,
          external_id: "wamid-older",
          direction: "in",
          message_type: "text",
          text: "Mensagem antiga",
          status: "received",
          ai_status: "skipped",
          response_to: null,
          created_at: "2026-01-01T12:00:00Z",
        }]
      }
      : {
        count: 51, next: null, previous: "http://192.168.0.6:8123/api/v1/messages/?page=1", results: [{
          id: 51,
          external_id: "wamid-latest",
          direction: "out",
          message_type: "text",
          text: "Mensagem mais recente",
          status: "sent",
          ai_status: "na",
          response_to: null,
          created_at: "2026-01-01T12:05:00Z",
        }]
      });
    renderApp("/inbox");

    expect(await screen.findByText("Mensagem mais recente")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Carregar mensagens anteriores/ }));

    expect(await screen.findByText("Mensagem antiga")).toBeInTheDocument();
    expect(screen.getByText("Mensagem mais recente")).toBeInTheDocument();
  });

  it("submits credentials and opens the authenticated dashboard", async () => {
    vi.mocked(api.getSession)
      .mockRejectedValueOnce(new Error("Unauthorized"))
      .mockResolvedValue(session);
    vi.mocked(api.login).mockResolvedValue(session);
    renderApp("/login");

    fireEvent.change(await screen.findByLabelText("Usuário ou e-mail"), { target: { value: "ana" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "password" } });
    fireEvent.click(screen.getByRole("button", { name: /Entrar na plataforma/ }));

    await waitFor(() => expect(api.login).toHaveBeenCalledWith("ana", "password"));
    expect(await screen.findByText("Conversas abertas")).toBeInTheDocument();
  });

  it("lets an agent consult numbers but blocks knowledge administration", async () => {
    vi.mocked(api.getSession).mockResolvedValue({
      ...session,
      companies: [{ ...company, role: "agent" }],
    });
    vi.mocked(api.listNumbers).mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [{
        id: 3,
        phone_number_id: "phone-id",
        display_phone_number: "+5511999999999",
        business_account_id: "business-id",
        ai_enabled: true,
        is_active: true,
        created_at: "2026-01-01T12:00:00Z",
      }],
    });
    renderApp("/numbers");

    expect(await screen.findByText("+5511999999999")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Cadastrar número/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();

    window.history.replaceState({}, "", "/knowledge");
    fireEvent.popState(window);
    expect(await screen.findByRole("heading", { name: "Área restrita" })).toBeInTheDocument();
    expect(api.listKnowledgeBases).not.toHaveBeenCalled();
  });

  it("loads permitted companies and persists company changes", async () => {
    vi.mocked(api.getSession).mockResolvedValue({ ...session, companies: [company, companyB] });
    vi.mocked(api.listCompanies).mockResolvedValue([company, companyB]);
    renderApp("/select-company");

    fireEvent.click(await screen.findByRole("button", { name: /Outra empresa/ }));
    expect(await screen.findByText("Conversas abertas")).toBeInTheDocument();
    expect(localStorage.getItem("gest-tech-company")).toBe(companyB.id);
    expect(api.listCompanies).toHaveBeenCalled();
  });

  it("passes inbox filters and paginates conversation results", async () => {
    vi.mocked(api.listConversations).mockImplementation(async (_companyId, filters) => ({
      count: 26,
      next: null,
      previous: null,
      results: [{
        id: 7,
        contact: {
          id: 8,
          name: "Maria",
          phone: "5511999999999",
          wa_id: "5511999999999",
          created_at: "2026-01-01T12:00:00Z",
          updated_at: "2026-01-01T12:00:00Z",
        },
        whatsapp_number: 1,
        status: "open",
        lead_stage: "",
        lead_data: {},
        ai_paused: filters.ai_paused === "true",
        ai_paused_at: null,
        assigned_to: null,
        last_message_at: "2026-01-01T12:05:00Z",
        created_at: "2026-01-01T12:00:00Z",
      }],
    }));
    renderApp("/inbox");

    await waitFor(() => expect(api.listConversations).toHaveBeenCalledWith(
      company.id,
      expect.objectContaining({ page: 1, status: "" }),
    ));
    fireEvent.click(screen.getByLabelText("Ocultar conversas encerradas"));
    await waitFor(() => expect(api.listConversations).toHaveBeenCalledWith(
      company.id,
      expect.not.objectContaining({ status: "" }),
    ));
    fireEvent.change(screen.getByLabelText("Filtrar atendimento"), { target: { value: "true" } });
    await waitFor(() => expect(api.listConversations).toHaveBeenCalledWith(
      company.id,
      expect.objectContaining({ ai_paused: "true", page: 1 }),
    ));
    fireEvent.click(screen.getByRole("button", { name: /Próxima/ }));
    await waitFor(() => expect(api.listConversations).toHaveBeenCalledWith(
      company.id,
      expect.objectContaining({ ai_paused: "true", page: 2 }),
    ));
  });

  it("creates contacts with the backend-required WhatsApp ID", async () => {
    renderApp("/contacts");
    fireEvent.click(await screen.findByRole("button", { name: /Novo contato/ }));
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Joana" } });
    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "+5511987654321" } });
    fireEvent.change(screen.getByLabelText("WhatsApp ID"), { target: { value: "5511987654321" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar contato" }));

    await waitFor(() => expect(api.createContact).toHaveBeenCalledWith(company.id, {
      name: "Joana",
      phone: "+5511987654321",
      wa_id: "5511987654321",
    }));
  });

  it("creates, edits, and deletes WhatsApp numbers through the real API methods", async () => {
    vi.mocked(api.createNumber).mockImplementation(async (_companyId, input) => ({
      id: 3,
      ...input,
      created_at: "2026-01-01T12:00:00Z",
    }));
    vi.mocked(api.listNumbers).mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [{
        id: 3,
        phone_number_id: "phone-id",
        display_phone_number: "+5511999999999",
        business_account_id: "business-id",
        ai_enabled: true,
        is_active: true,
        created_at: "2026-01-01T12:00:00Z",
      }],
    });
    vi.mocked(api.getNumber).mockResolvedValue({
      id: 3,
      phone_number_id: "phone-id",
      display_phone_number: "+5511999999999",
      business_account_id: "business-id",
      ai_enabled: true,
      is_active: true,
      created_at: "2026-01-01T12:00:00Z",
    });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderApp("/numbers");

    fireEvent.click(await screen.findByRole("button", { name: /Cadastrar número/ }));
    fireEvent.change(screen.getByLabelText("Phone number ID"), { target: { value: "new-phone-id" } });
    fireEvent.change(screen.getByLabelText("Número exibido"), { target: { value: "+5511888888888" } });
    fireEvent.change(screen.getByLabelText("Business account ID"), { target: { value: "new-business-id" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(api.createNumber).toHaveBeenCalledWith(company.id, {
      phone_number_id: "new-phone-id",
      display_phone_number: "+5511888888888",
      business_account_id: "new-business-id",
      ai_enabled: true,
      is_active: true,
    }));

    fireEvent.click(await screen.findByRole("button", { name: "Detalhes e editar" }));
    expect(await screen.findByRole("heading", { name: "Detalhes do número" })).toBeInTheDocument();
    await waitFor(() => expect(api.getNumber).toHaveBeenCalledWith(company.id, 3));
    fireEvent.change(screen.getByLabelText("Número exibido"), { target: { value: "+5511777777777" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(api.updateNumber).toHaveBeenCalledWith(company.id, 3, expect.objectContaining({
      display_phone_number: "+5511777777777",
    })));

    fireEvent.click(await screen.findByRole("button", { name: "Excluir +5511999999999" }));
    await waitFor(() => expect(api.deleteNumber).toHaveBeenCalledWith(company.id, 3));
    expect(confirm).toHaveBeenCalled();
  });

  it("routes expired sessions to login", async () => {
    renderApp("/dashboard");
    expect(await screen.findByText("Conversas abertas")).toBeInTheDocument();

    window.dispatchEvent(new Event("gest-tech:session-expired"));
    expect(await screen.findByRole("heading", { name: "Acesse sua conta" })).toBeInTheDocument();
    expect(api.logout).not.toHaveBeenCalled();
  });

  it("logs out through the session endpoint", async () => {
    renderApp("/dashboard");
    expect(await screen.findByText("Conversas abertas")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Ana Costa/ }));
    await waitFor(() => expect(api.logout).toHaveBeenCalled());
    expect(await screen.findByRole("heading", { name: "Acesse sua conta" })).toBeInTheDocument();
  });
});
