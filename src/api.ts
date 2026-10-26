import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import type {
  Company,
  Contact,
  Conversation,
  Dashboard,
  KnowledgeBase,
  KnowledgeDocument,
  Membership,
  Message,
  Page,
  Session,
  User,
  WhatsAppNumber,
  WhatsAppNumberInput,
} from "./types";

const baseURL = import.meta.env.VITE_API_BASE_URL || "/api/v1";
export const apiOrigin = new URL(
  baseURL,
  typeof window === "undefined" ? "http://localhost" : window.location.origin,
).origin;
let sessionEstablished = false;

export const http = axios.create({
  baseURL,
  withCredentials: true,
  headers: { Accept: "application/json" },
});

function readCookie(name: string): string | undefined {
  return document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");
}

http.interceptors.request.use(async (config) => {
  const method = config.method?.toLowerCase();
  if (method && !["get", "head", "options", "trace"].includes(method)) {
    let csrf = readCookie("csrftoken");
    if (!csrf) {
      const { data } = await http.get<{ csrfToken: string }>("/auth/csrf/");
      csrf = data.csrfToken;
    }
    config.headers.set("X-CSRFToken", decodeURIComponent(csrf));
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const url = error.config?.url ?? "";
      const authFailure = status === 401
        || (status === 403 && /\/auth\/(me|refresh)\/?$/.test(url));
      if (authFailure && sessionEstablished && typeof window !== "undefined") {
        sessionEstablished = false;
        window.dispatchEvent(new Event("gest-tech:session-expired"));
      }
    }
    return Promise.reject(error);
  },
);

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const data: unknown = error.response?.data;
    if (typeof data === "object" && data !== null) {
      const record = data as Record<string, unknown>;
      const detail = record.detail;
      if (typeof detail === "string") return detail;
      const fieldErrors = Object.entries(record)
        .map(([field, value]) => {
          const message = Array.isArray(value) ? value.join(" ") : typeof value === "string" ? value : "";
          return message ? `${field}: ${message}` : "";
        })
        .filter(Boolean);
      if (fieldErrors.length) return fieldErrors.join(" · ");
    }
    if (error.response?.status === 403) return "Você não tem permissão para esta ação.";
    if (error.response?.status === 404) return "O recurso não foi encontrado ou não está disponível para esta empresa.";
    if (error.response?.status === 502) return "A mensagem não pôde ser enviada pelo WhatsApp. Verifique a integração e tente novamente.";
    if (error.response?.status === 0 || !error.response) return "Não foi possível conectar ao servidor. Verifique sua conexão.";
    return "Não foi possível concluir a solicitação. Tente novamente.";
  }
  return error instanceof Error ? error.message : "Ocorreu um erro inesperado.";
}

export function isSessionExpiredError(error: unknown): boolean {
  return (error instanceof ApiError && (error.status === 401 || error.status === 403))
    || (axios.isAxiosError(error)
      && (error.response?.status === 401 || error.response?.status === 403));
}

export async function getCsrf(): Promise<void> {
  await http.get("/auth/csrf/");
}

export async function getSession(): Promise<Session> {
  const { data } = await http.get<Session>("/auth/me/");
  sessionEstablished = true;
  return data;
}

export async function refreshSession(): Promise<User> {
  const { data } = await http.post<{ user: User }>("/auth/refresh/");
  sessionEstablished = true;
  return data.user;
}

export async function login(username: string, password: string): Promise<Session> {
  await getCsrf();
  const { data } = await http.post<Session>("/auth/login/", { username, password });
  sessionEstablished = true;
  return data;
}

export async function logout(): Promise<void> {
  await http.post("/auth/logout/");
  sessionEstablished = false;
}

export const companyPath = (companyId: string, path = "") =>
  `/companies/${encodeURIComponent(companyId)}/${path}`;

export async function listCompanies(): Promise<Company[]> {
  const { data } = await http.get<Company[]>("/companies/");
  return data;
}

export async function getCompany(companyId: string): Promise<Company> {
  const { data } = await http.get<Company>(companyPath(companyId));
  return data;
}

export async function getDashboard(companyId: string): Promise<Dashboard> {
  const { data } = await http.get<Dashboard>(companyPath(companyId, "dashboard/"));
  return data;
}

export async function listConversations(
  companyId: string,
  filters: Record<string, string | number | boolean>,
): Promise<Page<Conversation>> {
  const { data } = await http.get<Page<Conversation>>(companyPath(companyId, "conversations/"), {
    params: filters,
  });
  return data;
}

export async function getConversation(companyId: string, conversationId: number): Promise<Conversation> {
  const { data } = await http.get<Conversation>(
    companyPath(companyId, `conversations/${conversationId}/`),
  );
  return data;
}

export async function listMessages(companyId: string, conversationId: number, page?: number): Promise<Page<Message>> {
  const { data } = await http.get<Page<Message>>(
    companyPath(companyId, `conversations/${conversationId}/messages/`),
    { params: page ? { page } : undefined },
  );
  return data;
}

export async function sendMessage(companyId: string, conversationId: number, text: string): Promise<Message> {
  const config: AxiosRequestConfig = { headers: { "Idempotency-Key": crypto.randomUUID() } };
  const { data } = await http.post<Message>(
    companyPath(companyId, `conversations/${conversationId}/messages/`),
    { text },
    config,
  );
  return data;
}

export async function conversationAction(
  companyId: string,
  conversationId: number,
  action: "pause-ai" | "resume-ai" | "close" | "reopen" | "assign",
  data: Record<string, unknown> = {},
): Promise<Conversation> {
  const { data: result } = await http.post<Conversation>(
    companyPath(companyId, `conversations/${conversationId}/${action}/`),
    data,
  );
  return result;
}

export async function updateConversation(
  companyId: string,
  conversationId: number,
  data: Record<string, unknown>,
): Promise<Conversation> {
  const { data: result } = await http.patch<Conversation>(
    companyPath(companyId, `conversations/${conversationId}/`),
    data,
  );
  return result;
}

export async function listContacts(companyId: string, params: Record<string, string | number> = {}) {
  const { data } = await http.get<Page<Contact>>(companyPath(companyId, "contacts/"), { params });
  return data;
}

export async function getContact(companyId: string, contactId: number): Promise<Contact> {
  const { data } = await http.get<Contact>(companyPath(companyId, `contacts/${contactId}/`));
  return data;
}

export async function createContact(
  companyId: string,
  values: Pick<Contact, "name" | "phone" | "wa_id">,
): Promise<Contact> {
  const { data } = await http.post<Contact>(companyPath(companyId, "contacts/"), values);
  return data;
}

export async function updateContact(companyId: string, contactId: number, values: Record<string, unknown>) {
  const { data } = await http.patch<Contact>(companyPath(companyId, `contacts/${contactId}/`), values);
  return data;
}

export async function deleteContact(companyId: string, contactId: number): Promise<void> {
  await http.delete(companyPath(companyId, `contacts/${contactId}/`));
}

export async function contactConversations(companyId: string, contactId: number) {
  const { data } = await http.get<Conversation[]>(
    companyPath(companyId, `contacts/${contactId}/conversations/`),
  );
  return data;
}

export async function listKnowledgeBases(companyId: string) {
  const { data } = await http.get<Page<KnowledgeBase>>(companyPath(companyId, "knowledge-bases/"));
  return data;
}

export async function getKnowledgeBase(companyId: string, baseId: number): Promise<KnowledgeBase> {
  const { data } = await http.get<KnowledgeBase>(companyPath(companyId, `knowledge-bases/${baseId}/`));
  return data;
}

export async function createKnowledgeBase(companyId: string, values: { name: string; is_active: boolean }) {
  const { data } = await http.post<KnowledgeBase>(companyPath(companyId, "knowledge-bases/"), values);
  return data;
}

export async function updateKnowledgeBase(
  companyId: string,
  baseId: number,
  values: Partial<Pick<KnowledgeBase, "name" | "is_active">>,
) {
  const { data } = await http.patch<KnowledgeBase>(
    companyPath(companyId, `knowledge-bases/${baseId}/`),
    values,
  );
  return data;
}

export async function deleteKnowledgeBase(companyId: string, baseId: number) {
  await http.delete(companyPath(companyId, `knowledge-bases/${baseId}/`));
}

export async function listDocuments(companyId: string, baseId: number) {
  const { data } = await http.get<Page<KnowledgeDocument>>(
    companyPath(companyId, `knowledge-bases/${baseId}/documents/`),
  );
  return data;
}

export async function uploadDocument(companyId: string, baseId: number, file: File) {
  return uploadDocumentWithTitle(companyId, baseId, file.name, file);
}

export async function uploadDocumentWithTitle(companyId: string, baseId: number, title: string, file: File) {
  const body = new FormData();
  body.set("title", title);
  body.set("file", file);
  const { data } = await http.post<KnowledgeDocument>(
    companyPath(companyId, `knowledge-bases/${baseId}/documents/`),
    body,
  );
  return data;
}

export async function deleteDocument(companyId: string, baseId: number, documentId: number) {
  await http.delete(companyPath(companyId, `knowledge-bases/${baseId}/documents/${documentId}/`));
}

export async function reprocessDocument(companyId: string, baseId: number, documentId: number) {
  const { data } = await http.post<KnowledgeDocument>(
    companyPath(companyId, `knowledge-bases/${baseId}/documents/${documentId}/reprocess/`),
  );
  return data;
}

export async function listNumbers(companyId: string, params: Record<string, string | number> = {}) {
  const { data } = await http.get<Page<WhatsAppNumber>>(
    companyPath(companyId, "whatsapp-numbers/"),
    { params },
  );
  return data;
}

export async function getNumber(companyId: string, numberId: number): Promise<WhatsAppNumber> {
  const { data } = await http.get<WhatsAppNumber>(
    companyPath(companyId, `whatsapp-numbers/${numberId}/`),
  );
  return data;
}

export async function createNumber(companyId: string, values: WhatsAppNumberInput): Promise<WhatsAppNumber> {
  const { data } = await http.post<WhatsAppNumber>(
    companyPath(companyId, "whatsapp-numbers/"),
    values,
  );
  return data;
}

export async function updateNumber(
  companyId: string,
  numberId: number,
  values: Partial<WhatsAppNumberInput>,
) {
  const { data } = await http.patch<WhatsAppNumber>(
    companyPath(companyId, `whatsapp-numbers/${numberId}/`),
    values,
  );
  return data;
}

export async function deleteNumber(companyId: string, numberId: number): Promise<void> {
  await http.delete(companyPath(companyId, `whatsapp-numbers/${numberId}/`));
}

export async function listMembers(companyId: string) {
  const { data } = await http.get<Membership[]>(companyPath(companyId, "members/"));
  return data;
}

export async function addMember(
  companyId: string,
  values: { username?: string; email?: string; role: "admin" | "agent" },
) {
  const { data } = await http.post<Membership>(companyPath(companyId, "members/"), values);
  return data;
}

export async function updateMember(companyId: string, memberId: number, role: string) {
  const { data } = await http.patch<Membership>(
    companyPath(companyId, `members/${memberId}/`),
    { role },
  );
  return data;
}

export async function removeMember(companyId: string, memberId: number): Promise<void> {
  await http.delete(companyPath(companyId, `members/${memberId}/`));
}
