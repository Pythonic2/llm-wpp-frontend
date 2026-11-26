import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError } from "axios";
import App from "./App";
import * as api from "./api";
import type { Company, Dashboard, Message, Session } from "./types";

vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api");
  return {
    ...actual,
    listCompanies: vi.fn(),
    getSession: vi.fn(),
    refreshSession: vi.fn(),
    login: vi.fn(),
    createStaff: vi.fn(),
    changeInitialPassword: vi.fn(),
    logout: vi.fn(),
    getCompany: vi.fn(),
    getDashboard: vi.fn(),
    listContacts: vi.fn(),
    getContact: vi.fn(),
    createContact: vi.fn(),
    setContactFollowUpConsent: vi.fn(),
    updateWarmFollowUpEnabled: vi.fn(),
    updateContact: vi.fn(),
    deleteContact: vi.fn(),
    contactConversations: vi.fn(),
    listConversations: vi.fn(),
    getConversation: vi.fn(),
    listMessages: vi.fn(),
    conversationAction: vi.fn(),
    updateConversation: vi.fn(),
    sendMessage: vi.fn(),
    getMessageAttempt: vi.fn(),
    listMembers: vi.fn(),
    removeMember: vi.fn(),
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
  return {
    ...render(
      <QueryClientProvider client={client}>
        <BrowserRouter><App /></BrowserRouter>
      </QueryClientProvider>,
    ),
    client,
  };
}

describe("Gest Tech protected app", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

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

  it("shows how many people received an automatic follow-up today", async () => {
    vi.mocked(api.getDashboard).mockResolvedValue({
      ...dashboard, warm_follow_up_enabled: true, warm_follow_up_contacts_today: 2,
      warm_follow_up_delivered_today: 1, warm_follow_up_failed_today: 0,
      warm_follow_up_attempts: [{ id: 1, conversation_id: 7, contact_name: "Maria", status: "delivered", created_at: "2026-11-16T15:00:00Z" }],
    });
    renderApp("/dashboard");
    expect(await screen.findByRole("heading", { name: "A IA entrou em contato com 2 pessoas hoje" })).toBeInTheDocument();
    expect(screen.getByText("Maria")).toBeInTheDocument();
    expect(screen.getByText(/1 entregues/)).toBeInTheDocument();
  });

  it("lets an administrator enable follow-up and record a contact's consent", async () => {
    const contact = { id: 8, name: "Maria", phone: "5511999999999", wa_id: "5511999999999",
      created_at: "2026-01-01T12:00:00Z", updated_at: "2026-01-01T12:00:00Z" };
    vi.mocked(api.getCompany).mockResolvedValue({ ...company, warm_follow_up_enabled: false });
    vi.mocked(api.updateWarmFollowUpEnabled).mockResolvedValue({ ...company, warm_follow_up_enabled: true });
    vi.mocked(api.listContacts).mockResolvedValue({ count: 1, next: null, previous: null, results: [contact] });
    vi.mocked(api.getContact).mockResolvedValue(contact);
    vi.mocked(api.setContactFollowUpConsent).mockResolvedValue({ ...contact, follow_up_consent_at: "2026-11-16T15:00:00Z", follow_up_consent_source: "Autorizado no formulário" });
    renderApp("/settings");
    fireEvent.click(await screen.findByRole("button", { name: "Ativar" }));
    expect(screen.getByRole("dialog", { name: "Ativar follow-up automático?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar ativação" }));
    await waitFor(() => expect(api.updateWarmFollowUpEnabled).toHaveBeenCalledWith(company.id, true));
    cleanup();
    renderApp("/contacts");
    fireEvent.click(await screen.findByRole("button", { name: "Ver Maria" }));
    fireEvent.change(await screen.findByLabelText("Origem da autorização de retorno"), { target: { value: "Autorizado no formulário" } });
    fireEvent.click(screen.getByRole("button", { name: "Autorizar retorno" }));
    await waitFor(() => expect(api.setContactFollowUpConsent).toHaveBeenCalledWith(company.id, contact.id, true, "Autorizado no formulário"));
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

  it("creates a staff account only for the selected manageable companies", async () => {
    const second = { ...companyB, role: "owner" as const };
    vi.mocked(api.getSession).mockResolvedValue({ ...session, companies: [company, second] });
    vi.mocked(api.createStaff).mockResolvedValue({ user: { ...session.user, username: "atendente" }, company_ids: [company.id, second.id] });
    localStorage.setItem("gest-tech-company", company.id);
    renderApp("/team");
    expect(await screen.findByRole("heading", { name: "Equipe" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Usuário do funcionário"), { target: { value: "atendente" } });
    fireEvent.change(screen.getByLabelText("Senha inicial"), { target: { value: "1234" } });
    fireEvent.click(screen.getByLabelText(second.name));
    fireEvent.click(screen.getByRole("button", { name: "Adicionar funcionário" }));
    await waitFor(() => expect(api.createStaff).toHaveBeenCalledWith({
      username: "atendente", password: "1234", email: undefined, role: "agent",
      company_ids: [company.id, second.id],
    }));
    expect(await screen.findByText(/Funcionário cadastrado/)).toBeInTheDocument();
  });

  it("confirms team removal in a modal and cancels without changing access", async () => {
    vi.mocked(api.listMembers).mockResolvedValue([
      { id: 17, user: { id: 17, username: "nelso", email: "", first_name: "", last_name: "" }, role: "agent" },
    ]);
    vi.mocked(api.removeMember).mockResolvedValue();
    renderApp("/team");
    fireEvent.click(await screen.findByRole("button", { name: "Remover nelso" }));
    expect(screen.getByRole("dialog", { name: "Remover da equipe?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(api.removeMember).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Remover nelso" }));
    fireEvent.click(screen.getByRole("button", { name: "Remover acesso" }));
    await waitFor(() => expect(api.removeMember).toHaveBeenCalledWith(company.id, 17));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Remover da equipe?" })).not.toBeInTheDocument());
  });

  it("requires the first password change before showing CRM data", async () => {
    vi.mocked(api.getSession).mockResolvedValue({ ...session, user: { ...session.user, must_change_password: true } });
    vi.mocked(api.changeInitialPassword).mockResolvedValue({ ...session.user, must_change_password: false });
    renderApp("/dashboard");
    expect(await screen.findByRole("heading", { name: "Troque sua senha" })).toBeInTheDocument();
    expect(screen.queryByText("Conversas abertas")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Senha inicial"), { target: { value: "1234" } });
    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: "NewStrongPassword-2026" } });
    fireEvent.change(screen.getByLabelText("Confirme a nova senha"), { target: { value: "NewStrongPassword-2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar nova senha" }));
    await waitFor(() => expect(api.changeInitialPassword).toHaveBeenCalledWith("1234", "NewStrongPassword-2026"));
    expect(await screen.findByText("Conversas abertas")).toBeInTheDocument();
  });

  it("loads older chronological messages without replacing the latest page", async () => {
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(function (this: HTMLElement) {
      return this.classList.contains("message-list") ? 500 + Math.max(0, this.querySelectorAll(".message-row").length - 1) * 100 : 0;
    });
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(100);
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

    const list = (await screen.findByText("Mensagem mais recente")).closest(".message-list") as HTMLDivElement;
    list.scrollTop = 100;
    fireEvent.scroll(list);
    fireEvent.click(screen.getByRole("button", { name: /Carregar mensagens anteriores/ }));

    expect(await screen.findByText("Mensagem antiga")).toBeInTheDocument();
    expect(screen.getByText("Mensagem mais recente")).toBeInTheDocument();
    await waitFor(() => expect(list.scrollTop).toBe(200));
  });

  it("returns focus to the message field after a human send", async () => {
    const conversation = await api.getConversation(company.id, 7);
    vi.mocked(api.listConversations).mockResolvedValue({ count: 1, next: null, previous: null, results: [conversation] });
    renderApp("/inbox");
    const composer = await screen.findByLabelText("Escreva uma mensagem");
    fireEvent.change(composer, { target: { value: "Olá, posso ajudar" } });
    const button = screen.getByRole("button", { name: "Enviar" });
    button.focus();
    fireEvent.click(button);
    await waitFor(() => expect(api.sendMessage).toHaveBeenCalledOnce());
    await waitFor(() => expect(composer).toHaveFocus());
  });

  it("shows a sending bubble immediately and preserves the next draft when the API responds", async () => {
    const conversation = await api.getConversation(company.id, 7);
    vi.mocked(api.listConversations).mockResolvedValue({ count: 1, next: null, previous: null, results: [conversation] });
    let saved: Message | null = null;
    vi.mocked(api.listMessages).mockImplementation(async () => ({ count: saved ? 1 : 0, next: null, previous: null, results: saved ? [saved] : [] }));
    let resolveSend!: (message: Message) => void;
    vi.mocked(api.sendMessage).mockImplementation(() => new Promise<Message>((resolve) => { resolveSend = resolve; }));
    renderApp("/inbox?conversation=7");

    const composer = await screen.findByLabelText("Escreva uma mensagem");
    await screen.findByText("As mensagens desta conversa aparecerão aqui.");
    fireEvent.change(composer, { target: { value: "Olá, posso ajudar" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(screen.getByTestId("send-preview")).toHaveTextContent("Olá, posso ajudar");
    expect(screen.getByTestId("send-preview")).toHaveTextContent("Enviando…");
    expect(composer).toHaveValue("");
    expect(composer).not.toBeDisabled();
    expect(composer).toHaveFocus();
    fireEvent.change(composer, { target: { value: "Próxima pergunta" } });
    expect(screen.getByRole("button", { name: /Enviando/ })).toBeDisabled();
    await waitFor(() => expect(api.sendMessage).toHaveBeenCalledOnce());

    saved = {
      id: 52, external_id: "wamid-sent", direction: "out", message_type: "text",
      text: "Olá, posso ajudar", status: "sent", ai_status: "na", response_to: null,
      created_at: "2026-01-01T12:05:00Z",
    };
    await act(async () => { resolveSend(saved!); });

    await waitFor(() => expect(screen.queryByTestId("send-preview")).not.toBeInTheDocument());
    expect(screen.getAllByText("Olá, posso ajudar")).toHaveLength(1);
    expect(screen.getByText("Enviada")).toBeInTheDocument();
    expect(composer).toHaveValue("Próxima pergunta");
    expect(screen.getByRole("button", { name: "Enviar" })).not.toBeDisabled();
  });

  it("shows a definitive failure without erasing a new draft", async () => {
    const conversation = await api.getConversation(company.id, 7);
    vi.mocked(api.listConversations).mockResolvedValue({ count: 1, next: null, previous: null, results: [conversation] });
    let saved: Message | null = null;
    vi.mocked(api.listMessages).mockImplementation(async () => ({ count: saved ? 1 : 0, next: null, previous: null, results: saved ? [saved] : [] }));
    let rejectSend!: (error: unknown) => void;
    vi.mocked(api.sendMessage).mockImplementation(() => new Promise<Message>((_resolve, reject) => { rejectSend = reject; }));
    renderApp("/inbox?conversation=7");

    const composer = await screen.findByLabelText("Escreva uma mensagem");
    fireEvent.change(composer, { target: { value: "Mensagem que falhou" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    await waitFor(() => expect(api.sendMessage).toHaveBeenCalledOnce());
    fireEvent.change(composer, { target: { value: "Novo rascunho" } });
    saved = {
      id: 52, external_id: "manual-pending:52", direction: "out", message_type: "text",
      text: "Mensagem que falhou", status: "failed", ai_status: "na", response_to: null,
      created_at: "2026-01-01T12:05:00Z",
    };
    const error = Object.assign(new AxiosError("Falha no WhatsApp"), {
      response: { status: 502, data: { detail: "Envio rejeitado", message: saved } },
    });
    await act(async () => { rejectSend(error); });

    await waitFor(() => expect(screen.queryByTestId("send-preview")).not.toBeInTheDocument());
    expect(screen.getAllByText("Mensagem que falhou")).toHaveLength(1);
    expect(screen.getByText("Falhou")).toBeInTheDocument();
    expect(composer).toHaveValue("Novo rascunho");
    expect(screen.getByRole("button", { name: "Enviar" })).not.toBeDisabled();
  });

  it("restores the sent text after a definitive rejection when no new draft exists", async () => {
    const conversation = await api.getConversation(company.id, 7);
    vi.mocked(api.listConversations).mockResolvedValue({ count: 1, next: null, previous: null, results: [conversation] });
    vi.mocked(api.sendMessage).mockRejectedValue(Object.assign(new AxiosError("Conversa encerrada"), {
      response: { status: 409, data: { detail: "Conversa encerrada" } },
    }));
    renderApp("/inbox?conversation=7");

    const composer = await screen.findByLabelText("Escreva uma mensagem");
    fireEvent.change(composer, { target: { value: "Texto recuperável" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    await waitFor(() => expect(screen.getByTestId("send-preview")).toHaveTextContent("Não enviada"));
    expect(composer).toHaveValue("Texto recuperável");
    expect(screen.getByRole("button", { name: "Enviar" })).not.toBeDisabled();
  });

  it("keeps an uncertain attempt blocked and retries only with the same key after lookup", async () => {
    const conversation = await api.getConversation(company.id, 7);
    vi.mocked(api.listConversations).mockResolvedValue({ count: 1, next: null, previous: null, results: [conversation] });
    let saved: Message | null = null;
    vi.mocked(api.listMessages).mockImplementation(async () => ({ count: saved ? 1 : 0, next: null, previous: null, results: saved ? [saved] : [] }));
    let rejectSend!: (error: unknown) => void;
    vi.mocked(api.sendMessage)
      .mockImplementationOnce(() => new Promise<Message>((_resolve, reject) => { rejectSend = reject; }))
      .mockImplementationOnce(async () => {
        saved = {
          id: 52, external_id: "wamid-retried", direction: "out", message_type: "text",
          text: "Mensagem incerta", status: "sent", ai_status: "na", response_to: null,
          created_at: "2026-01-01T12:05:00Z",
        };
        return saved;
      });
    vi.mocked(api.getMessageAttempt).mockRejectedValue(Object.assign(new AxiosError("Não encontrada"), {
      response: { status: 404, data: { detail: "Não encontrada" } },
    }));
    renderApp("/inbox?conversation=7");

    const composer = await screen.findByLabelText("Escreva uma mensagem");
    fireEvent.change(composer, { target: { value: "Mensagem incerta" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    await waitFor(() => expect(api.sendMessage).toHaveBeenCalledOnce());
    await act(async () => { rejectSend(new Error("Conexão caiu")); });

    expect(screen.getByTestId("send-preview")).toHaveTextContent("Resultado incerto");
    fireEvent.change(composer, { target: { value: "Outro rascunho" } });
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Consultar tentativa" }));
    fireEvent.click(await screen.findByRole("button", { name: "Repetir tentativa" }));
    await waitFor(() => expect(api.sendMessage).toHaveBeenCalledTimes(2));
    const firstKey = vi.mocked(api.sendMessage).mock.calls[0]?.[3];
    expect(vi.mocked(api.sendMessage).mock.calls[1]?.[3]).toBe(firstKey);
    expect(composer).toHaveValue("Outro rascunho");
    expect(await screen.findByText("Enviada")).toBeInTheDocument();
  });

  it("unblocks the composer when polling confirms a pending message was sent", async () => {
    const conversation = await api.getConversation(company.id, 7);
    vi.mocked(api.listConversations).mockResolvedValue({ count: 1, next: null, previous: null, results: [conversation] });
    const pending: Message = {
      id: 52, external_id: "manual-pending:52", direction: "out", message_type: "text",
      text: "Mensagem pendente", status: "pending", ai_status: "na", response_to: null,
      created_at: "2026-01-01T12:05:00Z",
    };
    let serverMessage = pending;
    vi.mocked(api.listMessages).mockImplementation(async () => ({ count: 1, next: null, previous: null, results: [serverMessage] }));
    vi.mocked(api.sendMessage).mockResolvedValue(pending);
    const { client } = renderApp("/inbox?conversation=7");

    const composer = await screen.findByLabelText("Escreva uma mensagem");
    fireEvent.change(composer, { target: { value: pending.text } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    await waitFor(() => expect(screen.getByText("Pendente")).toBeInTheDocument());
    fireEvent.change(composer, { target: { value: "Próximo rascunho" } });
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();

    serverMessage = { ...pending, external_id: "wamid-confirmed", status: "sent" };
    await act(async () => { await client.invalidateQueries({ queryKey: ["messages", company.id, 7] }); });
    await waitFor(() => expect(screen.getByRole("button", { name: "Enviar" })).not.toBeDisabled());
    expect(screen.getAllByText(pending.text)).toHaveLength(1);
    expect(composer).toHaveValue("Próximo rascunho");
  });

  it("keeps drafts and the pending bubble in their original conversation", async () => {
    const first = await api.getConversation(company.id, 7);
    const second = { ...first, id: 8, contact: { ...first.contact, name: "João" } };
    vi.mocked(api.listConversations).mockResolvedValue({ count: 2, next: null, previous: null, results: [first, second] });
    vi.mocked(api.getConversation).mockImplementation(async (_companyId, id) => id === 8 ? second : first);
    let saved: Message | null = null;
    vi.mocked(api.listMessages).mockImplementation(async (_companyId, id) => ({
      count: id === 7 && saved ? 1 : 0, next: null, previous: null,
      results: id === 7 && saved ? [saved] : [],
    }));
    let resolveSend!: (message: Message) => void;
    vi.mocked(api.sendMessage).mockImplementation(() => new Promise<Message>((resolve) => { resolveSend = resolve; }));
    renderApp("/inbox?conversation=7");

    const composer = await screen.findByLabelText("Escreva uma mensagem");
    fireEvent.change(composer, { target: { value: "Mensagem para Maria" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    await waitFor(() => expect(api.sendMessage).toHaveBeenCalledOnce());
    fireEvent.change(composer, { target: { value: "Rascunho para Maria" } });
    fireEvent.click(screen.getByRole("button", { name: /João/ }));

    expect(screen.queryByTestId("send-preview")).not.toBeInTheDocument();
    expect(composer).toHaveValue("");
    expect(screen.getByText(/Há um envio em andamento em outra conversa/)).toBeInTheDocument();
    fireEvent.change(composer, { target: { value: "Rascunho para João" } });
    saved = {
      id: 52, external_id: "wamid-maria", direction: "out", message_type: "text",
      text: "Mensagem para Maria", status: "sent", ai_status: "na", response_to: null,
      created_at: "2026-01-01T12:05:00Z",
    };
    await act(async () => { resolveSend(saved!); });
    expect(api.sendMessage).toHaveBeenCalledWith(company.id, 7, "Mensagem para Maria", expect.any(String));
    expect(composer).toHaveValue("Rascunho para João");
    fireEvent.click(screen.getByRole("button", { name: /Maria/ }));
    expect(composer).toHaveValue("Rascunho para Maria");
    expect(await screen.findByText("Mensagem para Maria")).toBeInTheDocument();
    expect(screen.queryByTestId("send-preview")).not.toBeInTheDocument();
  });

  it("opens chats at the newest message and follows updates only near the bottom", async () => {
    const scrollHeight = vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(500);
    const clientHeight = vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(100);
    try {
      const conversation = await api.getConversation(company.id, 7);
      vi.mocked(api.listConversations).mockResolvedValue({ count: 1, next: null, previous: null, results: [conversation] });
      const latest: Message = {
        id: 51, external_id: "wamid-latest", direction: "in", message_type: "text",
        text: "Mensagem recente", status: "received", ai_status: "skipped", response_to: null,
        created_at: "2026-01-01T12:05:00Z",
      };
      vi.mocked(api.listMessages).mockResolvedValue({ count: 1, next: null, previous: null, results: [latest] });
      const { client } = renderApp("/inbox");
      const list = (await screen.findByText("Mensagem recente")).closest(".message-list") as HTMLDivElement;
      await waitFor(() => expect(list.scrollTop).toBe(500));

      list.scrollTop = 100;
      fireEvent.scroll(list);
      vi.mocked(api.listMessages).mockResolvedValue({
        count: 2, next: null, previous: null,
        results: [latest, { ...latest, id: 52, external_id: "wamid-new", text: "Mensagem nova" }],
      });
      await act(async () => { await client.invalidateQueries({ queryKey: ["messages", company.id, 7] }); });
      expect(await screen.findByText("Mensagem nova")).toBeInTheDocument();
      expect(list.scrollTop).toBe(100);

      list.scrollTop = 400;
      fireEvent.scroll(list);
      vi.mocked(api.listMessages).mockResolvedValue({
        count: 3, next: null, previous: null,
        results: [latest, { ...latest, id: 52, external_id: "wamid-new", text: "Mensagem nova" },
          { ...latest, id: 53, external_id: "wamid-next", text: "Outra mensagem" }],
      });
      await act(async () => { await client.invalidateQueries({ queryKey: ["messages", company.id, 7] }); });
      expect(await screen.findByText("Outra mensagem")).toBeInTheDocument();
      expect(list.scrollTop).toBe(500);
    } finally {
      scrollHeight.mockRestore();
      clientHeight.mockRestore();
    }
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

  it("explains why a staff account with no active company cannot enter", async () => {
    vi.mocked(api.getSession).mockResolvedValue({ ...session, companies: [] });
    vi.mocked(api.listCompanies).mockResolvedValue([]);
    renderApp("/select-company");
    expect(await screen.findByText("Nenhuma empresa ativa")).toBeInTheDocument();
    expect(screen.getByText(/verificar se a assinatura da empresa está ativa/)).toBeInTheDocument();
    expect(screen.queryByText("Conversas abertas")).not.toBeInTheDocument();
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
    renderApp("/numbers");

    fireEvent.click(await screen.findByRole("button", { name: /Cadastro manual/ }));
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
    expect(screen.getByRole("dialog", { name: "Excluir número manual?" })).toHaveTextContent("+5511999999999");
    expect(api.deleteNumber).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(api.deleteNumber).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Excluir +5511999999999" }));
    fireEvent.click(screen.getByRole("button", { name: "Excluir número" }));
    await waitFor(() => expect(api.deleteNumber).toHaveBeenCalledWith(company.id, 3));
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
