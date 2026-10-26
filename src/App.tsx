import {
  createContext,
  type FormEvent,
  type PropsWithChildren,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  CheckCheck,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileText,
  Headphones,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  MessageCircle,
  Pause,
  Phone,
  Play,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Shield,
  Smartphone,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import {
  addMember,
  apiOrigin,
  contactConversations,
  conversationAction,
  createContact,
  createKnowledgeBase,
  createNumber,
  deleteContact,
  deleteDocument,
  deleteKnowledgeBase,
  deleteNumber,
  errorMessage,
  getContact,
  getCompany,
  getConversation,
  getDashboard,
  getNumber,
  getKnowledgeBase,
  getSession,
  isSessionExpiredError,
  listContacts,
  listCompanies,
  listConversations,
  listDocuments,
  listKnowledgeBases,
  listMembers,
  listMessages,
  listNumbers,
  login,
  logout,
  reprocessDocument,
  refreshSession,
  removeMember,
  sendMessage,
  updateContact,
  updateConversation,
  updateKnowledgeBase,
  updateMember,
  updateNumber,
  uploadDocumentWithTitle,
} from "./api";
import type {
  Company,
  Contact,
  Conversation,
  ConversationStatus,
  DocumentStatus,
  KnowledgeBase,
  KnowledgeDocument,
  Membership,
  Message,
  Role,
  Session,
  WhatsAppNumber,
  WhatsAppNumberInput,
} from "./types";
import { formatDate, formatPhone, formatTime } from "./format";

const AppContext = createContext<{
  session: Session;
  company: Company | null;
  selectCompany: (id: string) => void;
} | null>(null);

function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("App context is unavailable");
  return context;
}

const roleLabel: Record<Role, string> = { owner: "Proprietário", admin: "Administrador", agent: "Atendente" };
const statusLabel: Record<ConversationStatus, string> = {
  open: "Aberta",
  qualifying: "Qualificando",
  qualified: "Qualificada",
  closed: "Encerrada",
};
const documentLabel: Record<DocumentStatus, string> = {
  pending: "Na fila",
  processing: "Processando",
  ready: "Pronto",
  failed: "Falhou",
};
const queryKeys = {
  session: ["session"] as const,
  dashboard: (company: string) => ["dashboard", company] as const,
  sessionRenewal: ["session-renewal"] as const,
  conversations: (company: string, filters: Record<string, string | number | boolean>) =>
    ["conversations", company, filters] as const,
  messages: (company: string, conversation: number) => ["messages", company, conversation] as const,
  contacts: (company: string, params: Record<string, string | number>) => ["contacts", company, params] as const,
  bases: (company: string) => ["knowledge-bases", company] as const,
  documents: (company: string, base: number) => ["documents", company, base] as const,
  numbers: (company: string) => ["numbers", company] as const,
  members: (company: string) => ["members", company] as const,
  company: (company: string) => ["company", company] as const,
};

function displayName(user: Session["user"]) {
  return `${user.first_name} ${user.last_name}`.trim() || user.username;
}

function ErrorNotice({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="error-notice" role="alert">
      <CircleHelp size={18} />
      <span>{errorMessage(error)}</span>
      <button className="button button-quiet button-small" onClick={retry} type="button">
        <RefreshCw size={14} /> Tentar novamente
      </button>
    </div>
  );
}

function Loading({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="spin" size={22} /> {label}
    </div>
  );
}

function Empty({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: typeof MessageCircle;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon size={21} /></span>
      <strong>{title}</strong>
      <p>{text}</p>
      {action}
    </div>
  );
}

function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="page-actions">{action}</div>}
    </div>
  );
}

function Badge({ children, tone = "neutral" }: PropsWithChildren<{ tone?: string }>) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function roleCanManage(role: Role | undefined) {
  return role === "owner" || role === "admin";
}

function isAllowedUpload(file: File) {
  return /\.(pdf|txt|csv)$/i.test(file.name);
}

function numberErrorMessage(error: unknown) {
  const message = errorMessage(error);
  return /phone_number_id.*(already|exists|unique|duplic)/i.test(message)
    ? "Este Phone number ID já está cadastrado. Confira o valor e tente novamente."
    : message;
}

function LoginPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get("expired") === "1";
  const [formError, setFormError] = useState("");
  const form = useForm<{ username: string; password: string }>({
    resolver: zodResolver(
      z.object({
        username: z.string().trim().min(1, "Informe seu usuário ou e-mail."),
        password: z.string().min(1, "Informe sua senha."),
      }),
    ),
    defaultValues: { username: "", password: "" },
  });
  const mutation = useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) => login(username, password),
    onSuccess: (session) => {
      queryClient.clear();
      queryClient.setQueryData(queryKeys.session, session);
      localStorage.removeItem("gest-tech-company");
      navigate(session.companies.length === 1 ? "/dashboard" : "/select-company");
    },
    onError: (error: unknown) => setFormError(errorMessage(error)),
  });

  return (
    <main className="login-page">
      <div className="login-art">
        <div className="brand brand-large"><span className="brand-mark"><MessageCircle size={22} /></span>gest<span>tech</span></div>
        <div className="login-art-copy">
          <Badge tone="brand"><Sparkles size={13} /> Atendimento inteligente</Badge>
          <h1>Conversas mais humanas.<br /><em>Gestão mais simples.</em></h1>
          <p>Seu espaço de trabalho para transformar conversas no WhatsApp em relacionamentos duradouros.</p>
          <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
          <div className="art-message"><span className="art-avatar">G</span><div><strong>Gest Tech</strong><small>Sua operação, em boas mãos.</small></div><Sparkles size={17} /></div>
        </div>
        <span className="login-art-footer">GESTÃO QUE CONECTA · © {new Date().getFullYear()}</span>
      </div>
      <div className="login-form-side">
        <div className="mobile-brand brand"><span className="brand-mark"><MessageCircle size={20} /></span>gest<span>tech</span></div>
        <div className="login-form-wrap">
          <span className="eyebrow">BEM-VINDO DE VOLTA</span>
          <h2>Acesse sua conta</h2>
          <p className="form-intro">Entre com os dados da sua equipe para continuar.</p>
          {sessionExpired && <div className="session-expired-note" role="status">Sua sessão expirou. Entre novamente para continuar.</div>}
          <form className="stack-form" onSubmit={form.handleSubmit((values) => { setFormError(""); mutation.mutate(values); })}>
            <label>Usuário ou e-mail
              <input autoComplete="username" placeholder="voce@empresa.com.br" {...form.register("username")} />
              {form.formState.errors.username && <small className="field-error">{form.formState.errors.username.message}</small>}
            </label>
            <label>Senha
              <input autoComplete="current-password" type="password" placeholder="Sua senha" {...form.register("password")} />
              {form.formState.errors.password && <small className="field-error">{form.formState.errors.password.message}</small>}
            </label>
            {formError && <div className="inline-error" role="alert">{formError}</div>}
            <button className="button button-primary button-wide" type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <LoaderCircle className="spin" size={17} /> : <>Entrar na plataforma <ArrowRight size={17} /></>}
            </button>
          </form>
          <div className="login-footnote"><Shield size={14} /> Ambiente seguro, acesso protegido por sessão.</div>
        </div>
      </div>
    </main>
  );
}

function CompanyPicker() {
  const { selectCompany } = useApp();
  const navigate = useNavigate();
  const companies = useQuery({
    queryKey: ["companies"],
    queryFn: listCompanies,
  });
  return (
    <main className="picker-page">
      <div className="picker-card">
        <div className="brand"><span className="brand-mark"><MessageCircle size={20} /></span>gest<span>tech</span></div>
        <span className="eyebrow">SEU ESPAÇO DE TRABALHO</span>
        <h1>Escolha uma empresa</h1>
        <p>Selecione a organização que deseja acessar.</p>
        {companies.isPending ? <Loading label="Carregando empresas…" /> : companies.isError ? <ErrorNotice error={companies.error} retry={() => void companies.refetch()} /> : companies.data.length ? (
          <div className="company-options">
            {companies.data.map((company) => (
              <button className="company-option" key={company.id} onClick={() => { selectCompany(company.id); navigate("/dashboard"); }}>
                <span className="company-avatar"><Building2 size={19} /></span>
                <span className="company-option-info"><strong>{company.name}</strong><small>{roleLabel[company.role]}</small></span>
                <ArrowRight size={17} />
              </button>
            ))}
          </div>
        ) : (
          <Empty icon={Building2} title="Nenhuma empresa disponível" text="Peça ao administrador da sua empresa para adicionar seu usuário à equipe." />
        )}
      </div>
    </main>
  );
}

const navItems = [
  { to: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { to: "/inbox", label: "Caixa de entrada", icon: MessageCircle },
  { to: "/contacts", label: "Contatos", icon: Users },
  { to: "/knowledge", label: "Conhecimento", icon: BookOpen, admin: true },
  { to: "/numbers", label: "WhatsApp", icon: Smartphone },
  { to: "/team", label: "Equipe", icon: Users, admin: true },
  { to: "/settings", label: "Configurações", icon: Settings, admin: true },
];

function AppShell({ children }: PropsWithChildren) {
  const { session, company, selectCompany } = useApp();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState<unknown>(null);
  const renewal = useQuery({
    queryKey: queryKeys.sessionRenewal,
    queryFn: refreshSession,
    initialData: session.user,
    staleTime: 10 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    retry: false,
  });
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      localStorage.removeItem("gest-tech-company");
      queryClient.clear();
      navigate("/login");
    },
    onError: (error: unknown) => setLogoutError(error),
  });
  const switchCompany = (id: string) => {
    if (!session.companies.some((item) => item.id === id) || id === company?.id) return;
    selectCompany(id);
    navigate("/dashboard");
  };
  const items = navItems.filter((item) => !item.admin || roleCanManage(company?.role));
  return (
    <div className="app-shell">
      {menuOpen && <button className="mobile-scrim" aria-label="Fechar navegação" onClick={() => setMenuOpen(false)} />}
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <Link className="brand" to="/dashboard"><span className="brand-mark"><MessageCircle size={19} /></span>gest<span>tech</span></Link>
        <div className="company-switcher">
          <span className="company-avatar"><Building2 size={17} /></span>
          <div className="company-switch-info">
            <small>ESPAÇO DE TRABALHO</small>
            <select aria-label="Empresa ativa" value={company?.id ?? ""} onChange={(event) => switchCompany(event.target.value)}>
              {session.companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <ChevronDown size={15} />
        </div>
        <span className="nav-label">MENU PRINCIPAL</span>
        <nav className="sidebar-nav" aria-label="Navegação principal">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink end to={to} className={({ isActive }) => `nav-item ${isActive ? "nav-active" : ""}`} key={to} onClick={() => setMenuOpen(false)}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-help"><span className="help-icon"><CircleHelp size={17} /></span><strong>Precisa de ajuda?</strong><p>Estamos aqui para ajudar sua equipe.</p><a href="mailto:suporte@gesttech.com.br">Fale com o suporte <ArrowRight size={13} /></a></div>
        <button className="profile-button" onClick={() => { setLogoutError(null); logoutMutation.mutate(); }} disabled={logoutMutation.isPending}>
          <span className="profile-avatar">{displayName(session.user).slice(0, 1).toUpperCase()}</span>
          <span className="profile-details"><strong>{displayName(session.user)}</strong><small>{company ? roleLabel[company.role] : "Minha conta"}</small></span>
          <LogOut size={16} />
        </button>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <button className="icon-button mobile-menu-button" aria-label="Abrir navegação" onClick={() => setMenuOpen(true)}><Menu size={20} /></button>
          <div className="breadcrumb"><span>Gest Tech</span><span className="crumb-slash">/</span><strong>{navItems.find((item) => item.to === window.location.pathname)?.label ?? "Painel"}</strong></div>
          <div className="topbar-right">
            <span className="system-status"><i /> Sessão autenticada</span>
            <span className="topbar-avatar">{displayName(session.user).slice(0, 1).toUpperCase()}</span>
          </div>
        </header>
        <main className="main-content">
          {logoutError !== null && <ErrorNotice error={logoutError} retry={() => logoutMutation.mutate()} />}
          {renewal.isError && <ErrorNotice error={renewal.error} retry={() => void renewal.refetch()} />}
          {children}
        </main>
      </div>
    </div>
  );
}

function DashboardPage() {
  const { company, session } = useApp();
  const id = company?.id ?? "";
  const query = useQuery({ queryKey: queryKeys.dashboard(id), queryFn: () => getDashboard(id), enabled: !!id, refetchInterval: 30_000 });
  if (query.isPending) return <Loading label="Preparando seu painel…" />;
  if (query.isError) return <ErrorNotice error={query.error} retry={() => void query.refetch()} />;
  const data = query.data;
  const cards = [
    { label: "Total de conversas", value: data.total_conversations, icon: MessageCircle, tone: "lavender" },
    { label: "Conversas abertas", value: data.open_conversations, icon: MessageCircle, tone: "blue" },
    { label: "Atendimento humano", value: data.human_conversations, icon: Headphones, tone: "peach" },
    { label: "Atendidas pela IA", value: data.ai_conversations, icon: Sparkles, tone: "green" },
    { label: "Mensagens recebidas", value: data.inbound_messages, icon: ArrowDownLeft, tone: "blue" },
    { label: "Mensagens enviadas", value: data.outbound_messages, icon: Send, tone: "lavender" },
    { label: "Documentos processando", value: data.documents_processing, icon: Clock3, tone: "peach" },
    { label: "Documentos com falha", value: data.documents_failed, icon: FileText, tone: "green" },
  ];
  return (
    <div className="page-stack">
      <PageTitle eyebrow="SUA OPERAÇÃO" title={`Olá, ${displayName(session.user).split(" ")[0]} 👋`} description="Aqui está um resumo do que está acontecendo na sua operação." action={<>{query.isFetching && <Badge>Atualizando…</Badge>}<Link className="button button-primary" to="/inbox"><MessageCircle size={16} /> Abrir atendimentos</Link></>} />
      <section className="stat-grid">{cards.map(({ label, value, icon: Icon, tone }) => (
        <article className="stat-card" key={label}><span className={`stat-icon stat-${tone}`}><Icon size={19} /></span><span className="stat-label">{label}</span><strong className="stat-number">{value.toLocaleString("pt-BR")}</strong></article>
      ))}</section>
      <section className="dashboard-grid">
        <div className="panel recent-panel">
          <div className="panel-heading"><div><h2>Conversas recentes</h2><p>Os atendimentos mais recentes da sua equipe.</p></div><Link className="text-link" to="/inbox">Ver todas <ArrowRight size={14} /></Link></div>
          {data.recent_conversations.length ? <div className="recent-list">{data.recent_conversations.map((conversation) => (
            <Link className="recent-row" key={conversation.id} to={`/inbox?conversation=${conversation.id}`}>
              <span className="contact-avatar">{(conversation.contact.name || conversation.contact.phone || "?").slice(0, 1).toUpperCase()}</span>
              <span className="recent-contact"><strong>{conversation.contact.name || formatPhone(conversation.contact.phone || conversation.contact.wa_id)}</strong><small>{formatPhone(conversation.contact.phone || conversation.contact.wa_id)}</small></span>
              <Badge tone={conversation.status === "closed" ? "neutral" : "brand"}>{statusLabel[conversation.status]}</Badge>
              <span className="recent-date">{formatDate(conversation.last_message_at || conversation.created_at)}</span>
            </Link>
          ))}</div> : <Empty icon={MessageCircle} title="Sua caixa está pronta" text="As conversas recebidas pelo WhatsApp aparecerão aqui." action={<Link to="/inbox" className="button button-secondary button-small">Ir para a caixa de entrada</Link>} />}
        </div>
        <div className="dashboard-side">
          <div className="panel quick-panel"><div className="panel-heading"><div><h2>Acesso rápido</h2><p>Continue de onde sua equipe precisa.</p></div></div>
            <Link className="quick-link" to="/inbox"><span className="quick-icon quick-purple"><MessageCircle size={17} /></span><span><strong>Caixa de entrada</strong><small>Gerencie conversas ativas</small></span><ArrowRight size={15} /></Link>
            {roleCanManage(company?.role) && <Link className="quick-link" to="/knowledge"><span className="quick-icon quick-blue"><BookOpen size={17} /></span><span><strong>Base de conhecimento</strong><small>Documentos para sua IA</small></span><ArrowRight size={15} /></Link>}
          </div>
          {roleCanManage(company?.role) && <div className="panel processing-panel"><span className="processing-art"><FileText size={20} /></span><div><strong>Base de conhecimento</strong><p>{data.documents_processing} em processamento · {data.documents_failed} com falha</p><Link to="/knowledge">Ver documentos <ArrowRight size={13} /></Link></div></div>}
        </div>
      </section>
    </div>
  );
}

function pageNumberFromLink(link: string | null): number | undefined {
  if (!link) return undefined;
  const page = Number(new URL(link, apiOrigin).searchParams.get("page"));
  return Number.isInteger(page) && page > 0 ? page : undefined;
}

function InboxPage() {
  const { company, session } = useApp();
  const companyId = company?.id ?? "";
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedId = Number(searchParams.get("conversation")) || null;
  const [selectedId, setSelectedId] = useState<number | null>(requestedId);
  const initialSelection = useRef(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [human, setHuman] = useState("");
  const [assignee, setAssignee] = useState("");
  const [numberId, setNumberId] = useState("");
  const [hideClosed, setHideClosed] = useState(true);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const filters = {
    search,
    ai_paused: human,
    assigned_to_id: assignee,
    whatsapp_number_id: numberId,
    page,
    ...(status ? { status } : hideClosed ? { status: "" } : {}),
  };
  const list = useQuery({
    queryKey: queryKeys.conversations(companyId, filters),
    queryFn: () => listConversations(companyId, filters),
    enabled: !!companyId,
    refetchInterval: 15_000,
  });
  const conversations = list.data?.results ?? EMPTY_CONVERSATIONS;
  const selectedFromList = conversations.find((item) => item.id === selectedId) ?? null;
  const conversationDetail = useQuery({
    queryKey: ["conversation", companyId, selectedId],
    queryFn: () => getConversation(companyId, selectedId ?? 0),
    enabled: !!companyId && !!selectedId,
    refetchInterval: 15_000,
  });
  const selected = conversationDetail.data ?? selectedFromList;
  const messageQuery = useInfiniteQuery({
    queryKey: queryKeys.messages(companyId, selectedId ?? 0),
    queryFn: ({ pageParam }) => listMessages(companyId, selectedId ?? 0, pageParam ?? undefined),
    initialPageParam: null as number | null,
    getPreviousPageParam: (page) => pageNumberFromLink(page.previous),
    getNextPageParam: (page) => pageNumberFromLink(page.next),
    enabled: !!selectedId && !!companyId,
    refetchInterval: 5_000,
  });
  const queryClient = useQueryClient();
  const refreshConversation = () => {
    void queryClient.invalidateQueries({ queryKey: ["conversations", companyId] });
    if (selectedId) {
      void queryClient.invalidateQueries({ queryKey: ["conversation", companyId, selectedId] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.messages(companyId, selectedId) });
    }
  };
  const action = useMutation({
    mutationFn: ({ name, payload }: { name: "pause-ai" | "resume-ai" | "close" | "reopen" | "assign"; payload?: Record<string, unknown> }) =>
      conversationAction(companyId, selectedId ?? 0, name, payload),
    onSuccess: () => { setActionError(""); refreshConversation(); },
    onError: (error: unknown) => setActionError(errorMessage(error)),
  });
  const update = useMutation({
    mutationFn: (values: Record<string, unknown>) => updateConversation(companyId, selectedId ?? 0, values),
    onSuccess: () => { setActionError(""); refreshConversation(); },
    onError: (error: unknown) => setActionError(errorMessage(error)),
  });
  const send = useMutation({
    mutationFn: (text: string) => sendMessage(companyId, selectedId ?? 0, text),
    onSuccess: () => { setMessage(""); refreshConversation(); },
    onError: () => refreshConversation(),
  });
  const members = useQuery({ queryKey: queryKeys.members(companyId), queryFn: () => listMembers(companyId), enabled: !!companyId });
  const numbers = useQuery({
    queryKey: [...queryKeys.numbers(companyId), "all"],
    queryFn: () => listNumbers(companyId, { page_size: 100 }),
    enabled: !!companyId,
  });
  useEffect(() => {
    setSelectedId(requestedId);
  }, [requestedId]);
  useEffect(() => {
    if (!initialSelection.current && !selectedId && conversations.length) {
      initialSelection.current = true;
      const firstId = conversations[0]?.id;
      if (firstId) {
        setSelectedId(firstId);
        setSearchParams({ conversation: String(firstId) }, { replace: true });
      }
    }
  }, [conversations, selectedId, setSearchParams]);
  useEffect(() => { setActionError(""); }, [selectedId]);
  const selectConversation = (id: number | null) => {
    initialSelection.current = true;
    setSelectedId(id);
    if (id === null) {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ conversation: String(id) }, { replace: true });
    }
  };
  const sendForm = (event: FormEvent) => {
    event.preventDefault();
    if (message.trim() && selected && selected.status !== "closed" && !send.isPending) send.mutate(message.trim());
  };
  return (
    <div className="inbox-page">
      <div className="inbox-heading"><div><span className="eyebrow">CENTRAL DE ATENDIMENTO</span><h1>Caixa de entrada</h1><p>Converse com seus clientes e acompanhe a operação da IA.</p></div><Badge tone="green"><i /> Atualização automática</Badge></div>
      <div className="inbox-layout">
        <aside className="conversation-list panel">
          <div className="inbox-tools"><label className="search-field"><Search size={16} /><input aria-label="Buscar conversas" placeholder="Nome, telefone ou WhatsApp ID" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />{search && <button aria-label="Limpar busca" onClick={() => { setSearch(""); setPage(1); }}><X size={14} /></button>}</label>
            <div className="filter-row"><select aria-label="Filtrar por status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">Todos os status</option><option value="open">Abertas</option><option value="qualifying">Qualificando</option><option value="qualified">Qualificadas</option><option value="closed">Encerradas</option></select><select aria-label="Filtrar atendimento" value={human} onChange={(event) => { setHuman(event.target.value); setPage(1); }}><option value="">IA e pessoas</option><option value="false">IA ativa</option><option value="true">Atendimento humano</option></select></div>
            <div className="filter-row"><select aria-label="Filtrar por responsável" value={assignee} onChange={(event) => { setAssignee(event.target.value); setPage(1); }}><option value="">Todos responsáveis</option>{members.data?.map((member) => <option key={member.id} value={member.user.id}>{displayName(member.user)}</option>)}</select><select aria-label="Filtrar por número" value={numberId} onChange={(event) => { setNumberId(event.target.value); setPage(1); }}><option value="">Todos números</option>{numbers.data?.results.map((number) => <option key={number.id} value={number.id}>{number.display_phone_number}</option>)}</select></div>
            <label className="closed-filter"><input type="checkbox" checked={hideClosed} onChange={(event) => { setHideClosed(event.target.checked); setPage(1); }} /> Ocultar conversas encerradas</label>
            {members.isError && <ErrorNotice error={members.error} retry={() => void members.refetch()} />}
            {numbers.isError && <ErrorNotice error={numbers.error} retry={() => void numbers.refetch()} />}
          </div>
          <div className="list-caption"><span>CONVERSAS</span><span>{list.data?.count ?? "—"}</span></div>
          <div className="conversation-items">
            {list.isPending ? <Loading label="Buscando conversas…" /> : list.isError ? <ErrorNotice error={list.error} retry={() => void list.refetch()} /> : conversations.length ? conversations.map((item) => <button className={`conversation-item ${item.id === selectedId ? "conversation-selected" : ""}`} key={item.id} onClick={() => selectConversation(item.id)}>
              <span className="contact-avatar">{(item.contact.name || item.contact.phone || "?").slice(0, 1).toUpperCase()}</span>
              <span className="conversation-copy"><span className="conversation-line"><strong>{item.contact.name || formatPhone(item.contact.phone || item.contact.wa_id)}</strong><small>{formatTime(item.last_message_at || item.created_at)}</small></span><span className="conversation-preview">{item.lead_stage || formatPhone(item.contact.phone || item.contact.wa_id)}</span><span className="conversation-tags"><Badge tone={item.ai_paused ? "peach" : "green"}>{item.ai_paused ? "Humano" : "IA"}</Badge><Badge tone={item.status === "closed" ? "neutral" : "brand"}>{statusLabel[item.status]}</Badge></span><span className="conversation-assignee">{item.assigned_to ? `Atendente: ${displayName(item.assigned_to)}` : "Sem responsável"}</span></span>
            </button>) : <Empty icon={MessageCircle} title="Nenhuma conversa" text="Ajuste os filtros ou aguarde novas mensagens." />}
          </div>
          {list.data && <Pagination page={page} count={list.data.count} onPage={setPage} />}
        </aside>
        {selected ? <section className="chat-panel panel">
          <header className="chat-header"><button className="icon-button mobile-back" aria-label="Voltar à lista de conversas" onClick={() => selectConversation(null)}><ArrowLeft size={18} /></button><span className="contact-avatar">{(selected.contact.name || selected.contact.phone || "?").slice(0, 1).toUpperCase()}</span><div className="chat-person"><strong>{selected.contact.name || formatPhone(selected.contact.phone || selected.contact.wa_id)}</strong><small>{formatPhone(selected.contact.phone || selected.contact.wa_id)}</small></div><Badge tone={selected.ai_paused ? "peach" : "green"}>{selected.ai_paused ? "Atendimento humano · IA pausada" : "IA ativa"}</Badge></header>
          {actionError && <div className="chat-error" role="alert">{actionError}<button onClick={() => setActionError("")} aria-label="Fechar"><X size={14} /></button></div>}
          {conversationDetail.isError && <ErrorNotice error={conversationDetail.error} retry={() => void conversationDetail.refetch()} />}
          <div className="chat-context-strip"><span><Smartphone size={14} /> Conversa #{selected.id}</span><span>Atualizada {formatTime(selected.last_message_at)}</span></div>
          <div className="message-list">
            {messageQuery.isPending ? <Loading label="Carregando mensagens…" /> : messageQuery.isError ? <ErrorNotice error={messageQuery.error} retry={() => void messageQuery.refetch()} /> : <>
              {messageQuery.hasPreviousPage && <button className="load-older" disabled={messageQuery.isFetchingPreviousPage} onClick={() => void messageQuery.fetchPreviousPage()}>{messageQuery.isFetchingPreviousPage ? <LoaderCircle className="spin" size={14} /> : <Clock3 size={14} />} Carregar mensagens anteriores</button>}
              {(messageQuery.data?.pages.flatMap((page) => page.results) ?? []).map((item) => <MessageBubble key={item.id} message={item} />)}
              {!messageQuery.data?.pages.some((page) => page.results.length) && <div className="chat-empty">As mensagens desta conversa aparecerão aqui.</div>}
            </>}
          </div>
          <form className="message-composer" onSubmit={sendForm}><div className="composer-hint"><Sparkles size={13} /> {selected.status === "closed" ? "Reabra a conversa para enviar mensagens" : selected.ai_paused ? "Atendimento humano · a IA está pausada" : "Sua mensagem será enviada pelo WhatsApp e pausará a IA"}</div><div className="composer-row"><textarea aria-label="Escreva uma mensagem" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escreva sua mensagem…" rows={2} disabled={selected.status === "closed" || send.isPending} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (message.trim() && selected && selected.status !== "closed" && !send.isPending) send.mutate(message.trim()); } }} /><button className="button button-primary send-button" type="submit" disabled={!message.trim() || selected.status === "closed" || send.isPending}><Send size={16} /><span>{send.isPending ? "Enviando…" : "Enviar"}</span></button></div>{send.isError && <small className="field-error">{errorMessage(send.error)}</small>}</form>
        </section> : <section className="chat-panel panel chat-no-selection">{conversationDetail.isError && selectedId ? <ErrorNotice error={conversationDetail.error} retry={() => void conversationDetail.refetch()} /> : <Empty icon={MessageCircle} title="Escolha uma conversa" text="Selecione uma conversa à esquerda para ver as mensagens e iniciar o atendimento." />}</section>}
        {selected && <aside className="contact-panel panel"><div className="contact-panel-title"><h2>Detalhes</h2></div><div className="contact-profile"><span className="contact-avatar contact-avatar-large">{(selected.contact.name || selected.contact.phone || "?").slice(0, 1).toUpperCase()}</span><strong>{selected.contact.name || formatPhone(selected.contact.phone || selected.contact.wa_id)}</strong><span>{formatPhone(selected.contact.phone || selected.contact.wa_id)}</span><Badge tone={selected.status === "closed" ? "neutral" : "brand"}>{statusLabel[selected.status]}</Badge></div>
          <div className="detail-section"><span className="detail-label">ATENDIMENTO</span><label className="detail-control">Responsável<select aria-label="Responsável da conversa" value={selected.assigned_to?.id ?? ""} disabled={action.isPending} onChange={(event) => action.mutate({ name: "assign", payload: { user_id: event.target.value || null } })}><option value="">Não atribuído</option>{members.data?.map((member) => <option value={member.user.id} key={member.id}>{displayName(member.user)}</option>)}{session.user && !members.data?.some((item) => item.user.id === session.user.id) && <option value={session.user.id}>{displayName(session.user)}</option>}</select></label>{selected.assigned_to?.id !== session.user.id && <button className="button button-secondary button-small" disabled={action.isPending} onClick={() => action.mutate({ name: "assign", payload: { user_id: session.user.id } })}>Assumir conversa</button>}<label className="detail-control">Status<select aria-label="Status da conversa" value={selected.status} disabled={update.isPending} onChange={(event) => update.mutate({ status: event.target.value })}><option value="open">Aberta</option><option value="qualifying">Em qualificação</option><option value="qualified">Qualificada</option><option value="closed">Encerrada</option></select></label><LeadStageEditor key={`${selected.id}-${selected.lead_stage}`} value={selected.lead_stage} disabled={update.isPending} onSave={(lead_stage) => update.mutate({ lead_stage })} /><label className="detail-control">Dados do lead (JSON)<LeadDataEditor key={`${selected.id}-${JSON.stringify(selected.lead_data)}`} data={selected.lead_data} disabled={update.isPending} onSave={(value) => update.mutate({ lead_data: value })} /></label></div>
          <div className="detail-section"><span className="detail-label">AÇÕES</span><button className="detail-action" disabled={action.isPending} onClick={() => action.mutate({ name: selected.ai_paused ? "resume-ai" : "pause-ai" })}>{selected.ai_paused ? <><Play size={15} /> Reativar IA</> : <><Pause size={15} /> Pausar IA</>}</button><button className="detail-action danger-action" disabled={action.isPending} onClick={() => { if (window.confirm(selected.status === "closed" ? "Reabrir esta conversa?" : "Encerrar esta conversa?")) action.mutate({ name: selected.status === "closed" ? "reopen" : "close" }); }}>{selected.status === "closed" ? <><Play size={15} /> Reabrir conversa</> : <><X size={15} /> Encerrar conversa</>}</button></div>
          <div className="detail-foot"><Phone size={14} /> WhatsApp · contato #{selected.contact.id}</div>
        </aside>}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const outgoing = message.direction === "out";
  const aiLabel: Record<Message["ai_status"], string> = { na: "", queued: "IA na fila", processing: "IA processando", completed: "Respondida pela IA", skipped: "IA ignorada", failed: "Falha na IA" };
  return <div className={`message-row ${outgoing ? "message-outgoing" : ""}`}><div className={`message-bubble ${outgoing ? "bubble-outgoing" : "bubble-incoming"}`}><p>{message.text || <em>Mensagem {message.message_type} não textual</em>}</p><span className="message-meta">{formatTime(message.created_at)}<MessageStatus status={message.status} />{!outgoing && aiLabel[message.ai_status] && <small className="ai-message-label">{aiLabel[message.ai_status]}</small>}</span></div></div>;
}

function MessageStatus({ status }: { status: Message["status"] }) {
  if (status === "failed") return <span className="message-failed">Falhou</span>;
  if (status === "pending") return <span title="Pendente"><Clock3 size={12} /> Pendente</span>;
  if (status === "delivered") return <span title="Entregue"><CheckCheck size={13} /> Entregue</span>;
  if (status === "read") return <span title="Lida" className="read-check"><CheckCheck size={13} /> Lida</span>;
  if (status === "received") return <span title="Recebida">Recebida</span>;
  return <span title="Enviada"><Check size={13} /> Enviada</span>;
}

function LeadStageEditor({
  value,
  disabled,
  onSave,
}: {
  value: string;
  disabled: boolean;
  onSave: (value: string) => void;
}) {
  const [stage, setStage] = useState(value);
  return (
    <div className="lead-stage-editor">
      <label className="detail-control">Etapa do lead
        <input value={stage} maxLength={80} disabled={disabled} onChange={(event) => setStage(event.target.value)} placeholder="Ex.: Novo lead" />
      </label>
      <button className="button button-secondary button-small" type="button" disabled={disabled || stage === value} onClick={() => onSave(stage.trim())}>Salvar etapa</button>
    </div>
  );
}

function LeadDataEditor({ data, disabled, onSave }: { data: Record<string, unknown>; disabled: boolean; onSave: (value: Record<string, unknown>) => void }) {
  const [value, setValue] = useState(() => JSON.stringify(data ?? {}, null, 2));
  const [error, setError] = useState("");
  return <div className="lead-editor"><textarea aria-label="Dados do lead em JSON" rows={5} value={value} disabled={disabled} onChange={(event) => setValue(event.target.value)} /><button className="button button-secondary button-small" disabled={disabled} onClick={() => { try { const parsed: unknown = JSON.parse(value); if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error(); onSave(parsed as Record<string, unknown>); setError(""); } catch { setError("Informe um objeto JSON válido."); } }}>Salvar dados</button>{error && <small className="field-error">{error}</small>}</div>;
}

function ContactsPage() {
  const { company } = useApp();
  const companyId = company?.id ?? "";
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [waId, setWaId] = useState("");
  const [formError, setFormError] = useState("");
  const params = { search, page };
  const query = useQuery({ queryKey: queryKeys.contacts(companyId, params), queryFn: () => listContacts(companyId, params), enabled: !!companyId });
  const detail = useQuery({
    queryKey: ["contact", companyId, selectedId],
    queryFn: () => getContact(companyId, selectedId ?? 0),
    enabled: !!selectedId,
  });
  const selected = detail.data ?? query.data?.results.find((contact) => contact.id === selectedId) ?? null;
  const conversations = useQuery({
    queryKey: ["contact-conversations", companyId, selectedId],
    queryFn: () => contactConversations(companyId, selectedId ?? 0),
    enabled: !!selectedId,
  });
  const invalidateContacts = () => queryClient.invalidateQueries({ queryKey: ["contacts", companyId] });
  const create = useMutation({
    mutationFn: () => createContact(companyId, { name: name.trim(), phone: phone.trim(), wa_id: waId.trim() }),
    onSuccess: async () => {
      setCreateOpen(false);
      setName("");
      setPhone("");
      setWaId("");
      setFormError("");
      await invalidateContacts();
    },
    onError: (error: unknown) => setFormError(errorMessage(error)),
  });
  const update = useMutation({
    mutationFn: () => updateContact(companyId, selected?.id ?? 0, { name, phone }),
    onSuccess: async () => {
      setSelectedId(null);
      setFormError("");
      await invalidateContacts();
    },
    onError: (error: unknown) => setFormError(errorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (contactId: number) => deleteContact(companyId, contactId),
    onSuccess: async () => {
      setSelectedId(null);
      setFormError("");
      await invalidateContacts();
    },
    onError: (error: unknown) => setFormError(errorMessage(error)),
  });
  useEffect(() => {
    if (detail.data) {
      setName(detail.data.name);
      setPhone(detail.data.phone);
    }
  }, [detail.data]);
  const openContact = (contact: Contact) => {
    setSelectedId(contact.id);
    setCreateOpen(false);
    setName(contact.name);
    setPhone(contact.phone);
    setFormError("");
  };
  return <div className="page-stack">
    <PageTitle eyebrow="RELACIONAMENTO" title="Contatos" description="Conheça e acompanhe as pessoas que conversam com sua empresa pelo WhatsApp." action={<button className="button button-primary" onClick={() => { setCreateOpen(true); setSelectedId(null); setName(""); setPhone(""); setWaId(""); setFormError(""); }}><Plus size={16} /> Novo contato</button>} />
    <section className="panel table-panel">
      <div className="table-toolbar"><div><strong>Todos os contatos</strong><small>{query.data?.count ?? 0} registros{query.isFetching && !query.isPending ? " · Atualizando…" : ""}</small></div><label className="search-field"><Search size={16} /><input aria-label="Buscar contatos" placeholder="Buscar nome, telefone ou WhatsApp ID…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />{search && <button aria-label="Limpar busca" onClick={() => { setSearch(""); setPage(1); }}><X size={14} /></button>}</label></div>
      {query.isPending ? <Loading /> : query.isError ? <ErrorNotice error={query.error} retry={() => void query.refetch()} /> : query.data.results.length ? <>
        <div className="table-scroll"><table><thead><tr><th>CONTATO</th><th>TELEFONE</th><th>WHATSAPP ID</th><th>ATUALIZADO</th><th /></tr></thead><tbody>{query.data.results.map((contact) => <tr key={contact.id}><td><button className="table-person" onClick={() => openContact(contact)}><span className="contact-avatar">{(contact.name || contact.wa_id).slice(0, 1).toUpperCase()}</span><strong>{contact.name || "Sem nome"}</strong></button></td><td>{formatPhone(contact.phone || contact.wa_id)}</td><td className="subtle-cell">{contact.wa_id}</td><td>{formatDate(contact.updated_at)}</td><td className="contact-row-actions"><button className="icon-button" aria-label={`Ver ${contact.name || contact.wa_id}`} onClick={() => openContact(contact)}><ArrowRight size={16} /></button><button className="icon-button danger-icon" aria-label={`Excluir ${contact.name || contact.wa_id}`} disabled={remove.isPending} onClick={() => { if (window.confirm(`Excluir o contato ${contact.name || contact.wa_id}?`)) remove.mutate(contact.id); }}><X size={15} /></button></td></tr>)}</tbody></table></div>
        <Pagination page={page} count={query.data.count} onPage={setPage} />
      </> : <Empty icon={Users} title="Nenhum contato encontrado" text={search ? "Tente buscar por outro nome ou telefone." : "Os contatos aparecerão aqui após a primeira mensagem pelo WhatsApp."} />}</section>
    {formError && !selected && !createOpen && <div className="inline-error" role="alert">{formError}<button onClick={() => setFormError("")} aria-label="Fechar"><X size={14} /></button></div>}
    {(selected || createOpen) && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setSelectedId(null); setCreateOpen(false); } }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="contact-modal-title"><div className="modal-heading"><div><span className="eyebrow">{createOpen ? "NOVO CONTATO" : "PERFIL DO CONTATO"}</span><h2 id="contact-modal-title">{createOpen ? "Cadastrar contato" : selected?.name || selected?.phone || selected?.wa_id || "Contato"}</h2></div><button className="icon-button" aria-label="Fechar" onClick={() => { setSelectedId(null); setCreateOpen(false); }}><X size={18} /></button></div>
      {formError && <div className="inline-error" role="alert">{formError}</div>}
      {detail.isError && <ErrorNotice error={detail.error} retry={() => void detail.refetch()} />}
      {detail.isPending && !createOpen ? <Loading /> : detail.isError && !createOpen ? null : <form className="stack-form" onSubmit={(event) => { event.preventDefault(); if (createOpen) create.mutate(); else update.mutate(); }}>
        <label>Nome<input value={name} maxLength={160} onChange={(event) => setName(event.target.value)} /></label>
        <label>Telefone<input value={phone} maxLength={32} onChange={(event) => setPhone(event.target.value)} /></label>
        {createOpen && <label>WhatsApp ID<input required value={waId} maxLength={64} onChange={(event) => setWaId(event.target.value)} /></label>}
        {!createOpen && selected && <label>WhatsApp ID<input value={selected.wa_id} readOnly /></label>}
        <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => { setSelectedId(null); setCreateOpen(false); }}>Cancelar</button><button className="button button-primary" disabled={create.isPending || update.isPending || (!createOpen && !selected)}>{createOpen ? "Criar contato" : update.isPending ? "Salvando…" : "Salvar alterações"}</button></div>
      </form>}
      {!createOpen && selected && <div className="contact-conversations"><strong>Conversas deste contato</strong>{conversations.isPending ? <Loading /> : conversations.isError ? <ErrorNotice error={conversations.error} retry={() => void conversations.refetch()} /> : conversations.data?.length ? conversations.data.map((item) => <Link key={item.id} to={`/inbox?conversation=${item.id}`} className="contact-conversation-row"><span>Conversa #{item.id}</span><Badge tone={item.status === "closed" ? "neutral" : "brand"}>{statusLabel[item.status]}</Badge><ArrowRight size={14} /></Link>) : <small>Este contato ainda não tem conversas.</small>}</div>}
    </section></div>}
  </div>;
}

function Pagination({ page, count, onPage, pageSize = 25 }: { page: number; count: number; onPage: (page: number) => void; pageSize?: number }) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  return <div className="pagination"><span>{count ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, count)} de ${count}` : "0 registros"}</span><div><button className="button button-secondary button-small" onClick={() => onPage(Math.max(1, page - 1))} disabled={page <= 1}><ArrowLeft size={14} /> Anterior</button><span className="pagination-current">{page} / {pages}</span><button className="button button-secondary button-small" onClick={() => onPage(Math.min(pages, page + 1))} disabled={page >= pages}>Próxima <ArrowRight size={14} /></button></div></div>;
}

function KnowledgePage() {
  const { company } = useApp();
  const companyId = company?.id ?? "";
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [baseName, setBaseName] = useState("");
  const [editBaseName, setEditBaseName] = useState("");
  const [baseError, setBaseError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const basesQuery = useQuery({ queryKey: queryKeys.bases(companyId), queryFn: () => listKnowledgeBases(companyId), enabled: !!companyId });
  const bases = basesQuery.data?.results ?? EMPTY_BASES;
  const selected = bases.find((base) => base.id === selectedId) ?? bases[0] ?? null;
  useEffect(() => { if (!selectedId && bases.length) setSelectedId(bases[0]?.id ?? null); }, [bases, selectedId]);
  useEffect(() => { if (selected) setEditBaseName(selected.name); }, [selected]);
  const baseDetail = useQuery({
    queryKey: ["knowledge-base", companyId, selected?.id],
    queryFn: () => getKnowledgeBase(companyId, selected?.id ?? 0),
    enabled: !!selected,
  });
  const docsQuery = useQuery({
    queryKey: queryKeys.documents(companyId, selected?.id ?? 0),
    queryFn: () => listDocuments(companyId, selected?.id ?? 0),
    enabled: !!selected,
    refetchInterval: (query) => query.state.data?.results.some((doc) => doc.status === "pending" || doc.status === "processing") ? 4_000 : false,
  });
  const create = useMutation({
    mutationFn: () => createKnowledgeBase(companyId, { name: baseName.trim(), is_active: true }),
    onSuccess: async (base) => { setBaseName(""); setBaseError(""); setSelectedId(base.id); await queryClient.invalidateQueries({ queryKey: queryKeys.bases(companyId) }); },
    onError: (error: unknown) => setBaseError(errorMessage(error)),
  });
  const modify = useMutation({
    mutationFn: ({ base, values }: { base: KnowledgeBase; values: Partial<Pick<KnowledgeBase, "name" | "is_active">> }) => updateKnowledgeBase(companyId, base.id, values),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.bases(companyId) }),
    onError: (error: unknown) => setBaseError(errorMessage(error)),
  });
  const removeBase = useMutation({
    mutationFn: (base: KnowledgeBase) => deleteKnowledgeBase(companyId, base.id),
    onSuccess: async () => { setSelectedId(null); await queryClient.invalidateQueries({ queryKey: queryKeys.bases(companyId) }); },
    onError: (error: unknown) => setBaseError(errorMessage(error)),
  });
  const upload = useMutation({
    mutationFn: ({ title, file }: { title: string; file: File }) =>
      uploadDocumentWithTitle(companyId, selected?.id ?? 0, title, file),
    onSuccess: () => { setUploadError(""); void queryClient.invalidateQueries({ queryKey: queryKeys.documents(companyId, selected?.id ?? 0) }); },
    onError: (error: unknown) => setUploadError(errorMessage(error)),
  });
  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !selected) return;
    if (!isAllowedUpload(file)) { setUploadError("Formato não aceito. Envie um arquivo PDF, TXT ou CSV."); return; }
    if (!documentTitle.trim()) { setUploadError("Informe um título para o documento."); return; }
    setUploadError("");
    upload.mutate({ title: documentTitle.trim(), file });
  };
  const fileAction = useMutation({
    mutationFn: async ({ baseId, docId, action }: { baseId: number; docId: number; action: "delete" | "reprocess" }) => {
      if (action === "delete") await deleteDocument(companyId, baseId, docId);
      else await reprocessDocument(companyId, baseId, docId);
    },
    onSuccess: (_, variables) => void queryClient.invalidateQueries({ queryKey: queryKeys.documents(companyId, variables.baseId) }),
    onError: (error: unknown) => setUploadError(errorMessage(error)),
  });
  return <div className="page-stack">
    <PageTitle eyebrow="INTELIGÊNCIA DA SUA OPERAÇÃO" title="Base de conhecimento" description="Organize as informações que orientam as respostas da IA." action={<Badge tone="brand"><Sparkles size={13} /> RAG · Gemini</Badge>} />
    {baseError && <div className="inline-error" role="alert">{baseError}<button onClick={() => setBaseError("")} aria-label="Fechar"><X size={14} /></button></div>}
    {basesQuery.isPending ? <Loading /> : basesQuery.isError ? <ErrorNotice error={basesQuery.error} retry={() => void basesQuery.refetch()} /> : <div className="knowledge-layout">
      <aside className="panel knowledge-sidebar"><div className="panel-heading"><div><h2>Bases</h2><p>Informações da sua empresa.</p></div><Badge>{bases.length}</Badge></div>
        <div className="base-list">{bases.map((base) => <button key={base.id} className={`base-item ${selected?.id === base.id ? "base-selected" : ""}`} onClick={() => setSelectedId(base.id)}><span className="base-icon"><BookOpen size={17} /></span><span><strong>{base.name}</strong><small>{base.is_active ? "Ativa para a IA" : "Desativada"}</small></span><i className={base.is_active ? "status-light-on" : "status-light-off"} /></button>)}</div>
        <form className="new-base-form" onSubmit={(event) => { event.preventDefault(); if (baseName.trim()) create.mutate(); }}><label htmlFor="new-base">Nova base</label><div className="inline-create"><input id="new-base" placeholder="Ex.: Políticas e FAQ" value={baseName} onChange={(event) => setBaseName(event.target.value)} /><button className="icon-button create-button" type="submit" aria-label="Criar base" disabled={!baseName.trim() || create.isPending}><Plus size={17} /></button></div></form>
      </aside>
      {selected ? <section className="panel documents-panel"><div className="panel-heading document-heading"><div><span className="eyebrow">DOCUMENTOS DA BASE</span><form className="base-rename-form" onSubmit={(event) => { event.preventDefault(); if (editBaseName.trim() && editBaseName.trim() !== selected.name) modify.mutate({ base: selected, values: { name: editBaseName.trim() } }); }}><input aria-label="Nome da base" value={editBaseName} maxLength={120} onChange={(event) => setEditBaseName(event.target.value)} /><button className="button button-secondary button-small" disabled={modify.isPending || !editBaseName.trim() || editBaseName.trim() === selected.name}>Salvar nome</button></form><p>Os arquivos são processados em segundo plano para uso pela IA.</p></div><div className="document-actions"><button className="button button-secondary button-small" disabled={modify.isPending} onClick={() => modify.mutate({ base: selected, values: { is_active: !selected.is_active } })}>{selected.is_active ? "Desativar base" : "Ativar base"}</button><button className="icon-button danger-icon" aria-label="Excluir base" disabled={removeBase.isPending} onClick={() => { if (window.confirm(`Excluir a base “${selected.name}” e seus documentos?`)) removeBase.mutate(selected); }}><X size={16} /></button></div></div>
        {baseDetail.isError && <ErrorNotice error={baseDetail.error} retry={() => void baseDetail.refetch()} />}
        <label className="document-title-field">Título do documento<input value={documentTitle} maxLength={200} onChange={(event) => setDocumentTitle(event.target.value)} placeholder="Ex.: Política de atendimento" /></label>
        <div className={`upload-zone ${dragging ? "upload-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); handleFiles(event.dataTransfer.files); }}><span className="upload-icon"><FileText size={20} /></span><strong>Arraste um arquivo para cá</strong><span>ou <button type="button" className="upload-browse" onClick={() => fileRef.current?.click()}>escolha no computador</button></span><small>PDF, TXT ou CSV · processamento seguro com a sua empresa</small><input ref={fileRef} className="visually-hidden" type="file" accept=".pdf,.txt,.csv,application/pdf,text/plain,text/csv" onChange={(event) => { handleFiles(event.target.files); event.currentTarget.value = ""; }} /></div>
        {uploadError && <div className="inline-error" role="alert">{uploadError}<button onClick={() => setUploadError("")} aria-label="Fechar"><X size={14} /></button></div>}
        {upload.isPending && <div className="upload-progress"><LoaderCircle className="spin" size={16} /> Enviando arquivo…</div>}
        {docsQuery.isPending ? <Loading /> : docsQuery.isError ? <ErrorNotice error={docsQuery.error} retry={() => void docsQuery.refetch()} /> : docsQuery.data.results.length ? <div className="document-list"><div className="document-list-heading"><span>ARQUIVO</span><span>STATUS</span><span>ADICIONADO</span><span /></div>{docsQuery.data.results.map((doc) => <DocumentRow key={doc.id} doc={doc} disabled={fileAction.isPending} onDelete={() => { if (window.confirm(`Excluir “${doc.title}”?`)) fileAction.mutate({ baseId: selected.id, docId: doc.id, action: "delete" }); }} onReprocess={() => fileAction.mutate({ baseId: selected.id, docId: doc.id, action: "reprocess" })} />)}</div> : <Empty icon={FileText} title="Nenhum documento ainda" text="Adicione arquivos para que a IA possa consultar as informações da sua empresa." />}
      </section> : <section className="panel documents-panel no-base-panel"><Empty icon={BookOpen} title="Crie sua primeira base" text="As bases de conhecimento guardam os documentos usados pela IA para responder às conversas." /></section>}
    </div>}
  </div>;
}

function DocumentRow({ doc, disabled, onDelete, onReprocess }: { doc: KnowledgeDocument; disabled: boolean; onDelete: () => void; onReprocess: () => void }) {
  const tone = doc.status === "ready" ? "green" : doc.status === "failed" ? "red" : doc.status === "processing" ? "brand" : "neutral";
  return <div className="document-row"><span className="document-name"><span className="document-file-icon"><FileText size={16} /></span><span><strong>{doc.title}</strong><small>{doc.file_name}</small>{doc.error && <small className="document-error">{doc.error}</small>}</span></span><span><Badge tone={tone}>{doc.status === "processing" && <LoaderCircle className="spin" size={11} />}{documentLabel[doc.status]}</Badge></span><span className="document-date">{formatDate(doc.created_at)}</span><span className="document-row-actions">{doc.status === "failed" && <button className="icon-button" aria-label={`Reprocessar ${doc.title}`} disabled={disabled} onClick={onReprocess}><RefreshCw size={15} /></button>}<button className="icon-button danger-icon" aria-label={`Excluir ${doc.title}`} disabled={disabled} onClick={onDelete}><X size={15} /></button></span></div>;
}

function NumbersPage() {
  const { company } = useApp();
  const companyId = company?.id ?? "";
  const canManage = roleCanManage(company?.role);
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [values, setValues] = useState<WhatsAppNumberInput>(emptyNumberInput());
  const query = useQuery({
    queryKey: [...queryKeys.numbers(companyId), page],
    queryFn: () => listNumbers(companyId, { page }),
    enabled: !!companyId,
  });
  const detail = useQuery({
    queryKey: ["number-detail", companyId, editingId],
    queryFn: () => getNumber(companyId, editingId ?? 0),
    enabled: editingId !== null,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.numbers(companyId) });
  const closeForm = () => { setEditingId(null); setCreateOpen(false); setFormError(""); };
  const create = useMutation({
    mutationFn: (input: WhatsAppNumberInput) => createNumber(companyId, input),
    onSuccess: async () => { closeForm(); await invalidate(); },
    onError: (error: unknown) => setFormError(numberErrorMessage(error)),
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<WhatsAppNumberInput> }) => updateNumber(companyId, id, input),
    onSuccess: async () => { closeForm(); await invalidate(); },
    onError: (error: unknown) => setFormError(numberErrorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (id: number) => deleteNumber(companyId, id),
    onSuccess: () => void invalidate(),
    onError: (error: unknown) => setFormError(errorMessage(error)),
  });
  useEffect(() => {
    if (detail.data && detail.data.id === editingId) {
      const { phone_number_id, display_phone_number, business_account_id, ai_enabled, is_active } = detail.data;
      setValues({ phone_number_id, display_phone_number, business_account_id, ai_enabled, is_active });
    }
  }, [detail.data, editingId]);
  const openCreate = () => {
    setValues(emptyNumberInput());
    setFormError("");
    setEditingId(null);
    setCreateOpen(true);
  };
  const openEdit = (number: WhatsAppNumber) => {
    setValues({
      phone_number_id: number.phone_number_id,
      display_phone_number: number.display_phone_number,
      business_account_id: number.business_account_id,
      ai_enabled: number.ai_enabled,
      is_active: number.is_active,
    });
    setFormError("");
    setCreateOpen(false);
    setEditingId(number.id);
  };
  const saveNumber = (event: FormEvent) => {
    event.preventDefault();
    const cleanValues = {
      ...values,
      phone_number_id: values.phone_number_id.trim(),
      display_phone_number: values.display_phone_number.trim(),
      business_account_id: values.business_account_id.trim(),
    };
    setValues(cleanValues);
    if (createOpen) create.mutate(cleanValues);
    else if (editingId !== null) update.mutate({ id: editingId, input: cleanValues });
  };
  return <div className="page-stack"><PageTitle eyebrow="CANAIS DE ATENDIMENTO" title="Números do WhatsApp" description={canManage ? "Cadastre e gerencie números já configurados na Meta." : "Consulte os números cadastrados para esta empresa."} action={canManage && <button className="button button-primary" onClick={openCreate}><Plus size={16} /> Cadastrar número</button>} />
    <div className="settings-note"><CircleHelp size={16} /> O número e os IDs precisam existir previamente na Meta. O Gest Tech não cria números nem inicia conexões com a Meta.</div>
    {formError && !createOpen && editingId === null && <div className="inline-error" role="alert">{formError}<button onClick={() => setFormError("")} aria-label="Fechar"><X size={14} /></button></div>}
    {query.isPending ? <Loading /> : query.isError ? <ErrorNotice error={query.error} retry={() => void query.refetch()} /> : query.data.results.length ? <>
      <div className="number-grid">{query.data.results.map((number) => <article className="panel number-card" key={number.id}><div className="number-card-head"><span className="number-icon"><Smartphone size={20} /></span><span className="number-statuses"><Badge tone={number.is_active ? "green" : "neutral"}>{number.is_active ? "Ativo" : "Inativo"}</Badge><Badge tone={number.ai_enabled ? "brand" : "neutral"}>{number.ai_enabled ? "IA ativa" : "IA desativada"}</Badge></span></div><span className="eyebrow">NÚMERO CADASTRADO</span><h2>{number.display_phone_number}</h2><p>ID do número · {number.phone_number_id}</p><p>Conta empresarial · {number.business_account_id || "Não informada"}</p>{canManage && <><div className="number-actions"><button className="button button-secondary button-small" onClick={() => openEdit(number)}>Detalhes e editar</button><button className="icon-button danger-icon" aria-label={`Excluir ${number.display_phone_number}`} disabled={remove.isPending} onClick={() => { if (window.confirm(`Excluir o número ${number.display_phone_number}?`)) remove.mutate(number.id); }}><X size={15} /></button></div><div className="number-toggles"><Toggle label="Número ativo" description="Recebe mensagens pelo webhook." disabled={update.isPending} checked={number.is_active} onChange={(active) => update.mutate({ id: number.id, input: { is_active: active, ...(!active ? { ai_enabled: false } : {}) } })} /><Toggle label="Respostas da IA" description="Permite respostas automáticas com Gemini." disabled={update.isPending || !number.is_active} checked={number.ai_enabled} onChange={(enabled) => update.mutate({ id: number.id, input: { ai_enabled: enabled } })} /></div></>}</article>)}</div>
      <Pagination page={page} count={query.data.count} onPage={setPage} />
    </> : <div className="panel empty-panel"><Empty icon={Smartphone} title="Nenhum número cadastrado" text="Cadastre os IDs do número já configurado no painel da Meta." action={<button className="button button-primary button-small" onClick={openCreate}><Plus size={15} /> Cadastrar número</button>} /></div>}
    {canManage && (createOpen || editingId !== null) && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="number-modal-title"><div className="modal-heading"><div><span className="eyebrow">CONFIGURAÇÃO MANUAL</span><h2 id="number-modal-title">{createOpen ? "Cadastrar número" : "Detalhes do número"}</h2></div><button className="icon-button" aria-label="Fechar" onClick={closeForm}><X size={18} /></button></div>
      {detail.isError && <ErrorNotice error={detail.error} retry={() => void detail.refetch()} />}
      {detail.isPending && !createOpen ? <Loading /> : <form className="stack-form" onSubmit={saveNumber}>
        <label>Phone number ID<input required maxLength={64} value={values.phone_number_id} onChange={(event) => setValues({ ...values, phone_number_id: event.target.value })} /></label>
        <label>Número exibido<input required maxLength={32} placeholder="+55 11 99999-9999" value={values.display_phone_number} onChange={(event) => setValues({ ...values, display_phone_number: event.target.value })} /></label>
        <label>Business account ID<input maxLength={64} value={values.business_account_id} onChange={(event) => setValues({ ...values, business_account_id: event.target.value })} /></label>
        <Toggle label="Número ativo" description="Permite o recebimento pelo webhook." checked={values.is_active} onChange={(is_active) => setValues({ ...values, is_active, ...(!is_active ? { ai_enabled: false } : {}) })} />
        <Toggle label="Respostas da IA" description="Permite respostas automáticas nesta linha." checked={values.ai_enabled} disabled={!values.is_active} onChange={(ai_enabled) => setValues({ ...values, ai_enabled })} />
        {formError && <div className="inline-error" role="alert">{formError}</div>}
        <div className="modal-actions"><button type="button" className="button button-secondary" onClick={closeForm}>Cancelar</button><button className="button button-primary" disabled={create.isPending || update.isPending || (editingId !== null && detail.isPending)}>{create.isPending || update.isPending ? "Salvando…" : "Salvar"}</button></div>
      </form>}</section></div>}
  </div>;
}

function emptyNumberInput(): WhatsAppNumberInput {
  return {
    phone_number_id: "",
    display_phone_number: "",
    business_account_id: "",
    ai_enabled: true,
    is_active: true,
  };
}

function Toggle({ label, description, checked, disabled, onChange }: { label: string; description: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return <div className="toggle-row"><span><strong>{label}</strong><small>{description}</small></span><button type="button" role="switch" aria-label={label} aria-checked={checked} className={`toggle ${checked ? "toggle-on" : ""}`} disabled={disabled} onClick={() => onChange(!checked)}><span /></button></div>;
}

function TeamPage() {
  const { company } = useApp();
  const companyId = company?.id ?? "";
  const [identifier, setIdentifier] = useState("");
  const [role, setRole] = useState<"admin" | "agent">("agent");
  const [formError, setFormError] = useState("");
  const query = useQuery({ queryKey: queryKeys.members(companyId), queryFn: () => listMembers(companyId), enabled: !!companyId });
  const queryClient = useQueryClient();
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: queryKeys.members(companyId) });
  const add = useMutation({
    mutationFn: () => {
      const value = identifier.trim();
      return addMember(companyId, value.includes("@") ? { email: value, role } : { username: value, role });
    },
    onSuccess: () => { setIdentifier(""); setFormError(""); invalidate(); },
    onError: (error: unknown) => setFormError(errorMessage(error)),
  });
  const changeRole = useMutation({ mutationFn: ({ member, next }: { member: Membership; next: string }) => updateMember(companyId, member.id, next), onSuccess: invalidate, onError: (error: unknown) => setFormError(errorMessage(error)) });
  const remove = useMutation({ mutationFn: (memberId: number) => removeMember(companyId, memberId), onSuccess: invalidate, onError: (error: unknown) => setFormError(errorMessage(error)) });
  return <div className="page-stack"><PageTitle eyebrow="PESSOAS E ACESSOS" title="Equipe" description="Convide pessoas que já possuem conta no sistema e defina o nível de acesso da equipe." />
    {formError && <div className="inline-error" role="alert">{formError}<button onClick={() => setFormError("")} aria-label="Fechar"><X size={14} /></button></div>}
    <section className="panel team-invite"><span className="invite-icon"><Users size={19} /></span><div className="invite-copy"><strong>Adicionar membro</strong><small>Use o usuário ou e-mail de uma conta existente.</small></div><form className="invite-form" onSubmit={(event) => { event.preventDefault(); if (identifier.trim()) add.mutate(); }}><input aria-label="Usuário ou e-mail existente" placeholder="Usuário ou e-mail" value={identifier} onChange={(event) => setIdentifier(event.target.value)} /><select aria-label="Papel do novo membro" value={role} onChange={(event) => setRole(event.target.value as "admin" | "agent")}><option value="agent">Atendente</option><option value="admin">Administrador</option></select><button className="button button-primary" disabled={!identifier.trim() || add.isPending}><Plus size={16} /> {add.isPending ? "Adicionando…" : "Adicionar"}</button></form></section>
    <section className="panel table-panel"><div className="table-toolbar"><div><strong>Membros da empresa</strong><small>{query.data?.length ?? 0} pessoas com acesso</small></div></div>{query.isPending ? <Loading /> : query.isError ? <ErrorNotice error={query.error} retry={() => void query.refetch()} /> : query.data?.length ? <div className="table-scroll"><table><thead><tr><th>MEMBRO</th><th>USUÁRIO</th><th>E-MAIL</th><th>PAPEL</th><th>PERMISSÕES</th><th /></tr></thead><tbody>{query.data.map((member) => <tr key={member.id}><td><span className="table-person static-person"><span className="contact-avatar">{displayName(member.user).slice(0, 1).toUpperCase()}</span><strong>{displayName(member.user)}</strong></span></td><td className="subtle-cell">{member.user.username}</td><td className="subtle-cell">{member.user.email || "—"}</td><td>{member.role === "owner" ? <Badge tone="brand">Proprietário</Badge> : <select aria-label={`Papel de ${member.user.username}`} className="role-select" disabled={changeRole.isPending} value={member.role} onChange={(event) => changeRole.mutate({ member, next: event.target.value })}><option value="admin">Administrador</option><option value="agent">Atendente</option></select>}</td><td><small>{member.role === "agent" ? "Atendimento e contatos" : "Operação, equipe e configurações"}</small></td><td>{member.role !== "owner" && <button className="icon-button danger-icon" aria-label={`Remover ${member.user.username}`} disabled={remove.isPending} onClick={() => { if (window.confirm(`Remover ${displayName(member.user)} da equipe?`)) remove.mutate(member.id); }}><X size={16} /></button>}</td></tr>)}</tbody></table></div> : <Empty icon={Users} title="Sua equipe começa aqui" text="Adicione um usuário existente para compartilhar o atendimento." />}</section>
  </div>;
}

function SettingsPage() {
  const { company, session } = useApp();
  const companyId = company?.id ?? "";
  const [copyFeedback, setCopyFeedback] = useState("");
  const query = useQuery({ queryKey: queryKeys.company(companyId), queryFn: () => getCompany(companyId), enabled: !!companyId });
  if (query.isPending) return <Loading />;
  if (query.isError) return <ErrorNotice error={query.error} retry={() => void query.refetch()} />;
  const data = query.data;
  const webhookUrl = `${apiOrigin}${data.integrations?.webhook_path ?? "/api/webhooks/whatsapp/"}`;
  const copyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopyFeedback("URL copiada.");
    } catch {
      setCopyFeedback("Não foi possível copiar. Selecione e copie a URL manualmente.");
    }
  };
  return <div className="page-stack"><PageTitle eyebrow="SUA ORGANIZAÇÃO" title="Configurações" description="Informações da empresa e situação das integrações conectadas." />
    <section className="panel settings-card"><div className="settings-section-heading"><span className="settings-icon"><Building2 size={18} /></span><div><h2>Dados da empresa</h2><p>Identificação do espaço de trabalho.</p></div></div><div className="settings-fields"><label>Nome da empresa<input value={data.name} readOnly /></label><label>Identificador<input value={data.slug} readOnly /></label><label>Papel do usuário<input value={roleLabel[company?.role ?? "agent"]} readOnly /></label><label>Usuário<input value={session.user.username} readOnly /></label><label>ID da empresa<input value={data.id} readOnly /></label><label>Desde<input value={formatDate(data.created_at)} readOnly /></label></div><div className="settings-note"><Shield size={16} /> Os dados cadastrais são gerenciados pelo administrador do sistema.</div></section>
    <section className="panel settings-card"><div className="settings-section-heading"><span className="settings-icon"><Sparkles size={18} /></span><div><h2>Integrações</h2><p>Conexões configuradas no servidor, sem exposição de credenciais.</p></div></div><div className="integration-row"><span className="integration-logo whats-logo"><MessageCircle size={19} /></span><span><strong>WhatsApp Cloud API</strong><small>Integração para envio e recebimento de mensagens.</small></span><Badge tone={data.integrations?.whatsapp_configured ? "green" : "peach"}>{data.integrations?.whatsapp_configured ? "Configurada" : "Pendente"}</Badge></div><div className="integration-row"><span className="integration-logo gemini-logo"><Sparkles size={19} /></span><span><strong>Google Gemini</strong><small>Geração de respostas e embeddings para busca RAG.</small></span><Badge tone={data.integrations?.gemini_configured ? "green" : "peach"}>{data.integrations?.gemini_configured ? "Configurada" : "Pendente"}</Badge></div></section>
    <section className="panel settings-card"><div className="settings-section-heading"><span className="settings-icon"><Shield size={18} /></span><div><h2>Webhook da Meta</h2><p>Cadastre este endereço na configuração do aplicativo da Meta.</p></div></div><div className="webhook-copy-row"><label className="webhook-field">URL do webhook<input readOnly value={webhookUrl} /></label><button className="button button-secondary button-small" onClick={() => void copyWebhook()}>Copiar URL</button></div>{copyFeedback && <small role="status" className="copy-feedback">{copyFeedback}</small>}<div className="settings-note"><CircleHelp size={16} /> No painel da Meta, configure esta URL pública (HTTPS) como callback do webhook e assine os eventos de mensagens. O token de verificação e o segredo permanecem no servidor; não há conexão fictícia ou cadastro automático de número.</div></section>
  </div>;
}

function ProtectedApp({ session }: { session: Session }) {
  const location = useLocation();
  const [activeId, setActiveId] = useState(() =>
    localStorage.getItem("gest-tech-company")
      ?? (session.companies.length === 1 ? session.companies[0]?.id ?? "" : ""),
  );
  const queryClient = useQueryClient();
  const company = session.companies.find((item) => item.id === activeId)
    ?? (session.companies.length === 1 ? session.companies[0] ?? null : null);
  const selectCompany = (id: string) => {
    if (!session.companies.some((item) => item.id === id)) return;
    if (id !== company?.id) {
      void queryClient.cancelQueries();
      queryClient.removeQueries({
        predicate: (query) => !["session", "session-renewal", "companies"].includes(String(query.queryKey[0])),
      });
    }
    setActiveId(id);
    localStorage.setItem("gest-tech-company", id);
  };
  const value = { session, company, selectCompany };
  useEffect(() => {
    if (company && activeId !== company.id) {
      setActiveId(company.id);
      localStorage.setItem("gest-tech-company", company.id);
    } else if (activeId && !company) {
      localStorage.removeItem("gest-tech-company");
      setActiveId("");
    }
  }, [activeId, company]);
  if (location.pathname === "/select-company") {
    return <AppContext.Provider value={value}><CompanyPicker /></AppContext.Provider>;
  }
  if (!company) {
    return <Navigate to="/select-company" replace />;
  }
  return <AppContext.Provider value={value}><AppShell><Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="/select-company" element={<CompanyPicker />} />
    <Route path="/dashboard" element={<DashboardPage />} />
    <Route path="/inbox" element={<InboxPage />} />
    <Route path="/contacts" element={<ContactsPage />} />
    <Route path="/knowledge" element={roleCanManage(company.role) ? <KnowledgePage /> : <AccessDenied />} />
    <Route path="/numbers" element={<NumbersPage />} />
    <Route path="/team" element={roleCanManage(company.role) ? <TeamPage /> : <AccessDenied />} />
    <Route path="/settings" element={roleCanManage(company.role) ? <SettingsPage /> : <AccessDenied />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes></AppShell></AppContext.Provider>;
}

function AccessDenied() {
  return <div className="panel access-denied"><span className="empty-icon"><Shield size={21} /></span><h2>Área restrita</h2><p>Seu papel não tem permissão para acessar esta página. Fale com um administrador da empresa.</p><Link className="button button-secondary" to="/dashboard">Voltar ao painel</Link></div>;
}

function NotFoundPage() {
  return <div className="panel access-denied"><span className="empty-icon"><CircleHelp size={21} /></span><h2>Página não encontrada</h2><p>O endereço não corresponde a uma tela disponível no Gest Tech.</p><Link className="button button-secondary" to="/dashboard">Voltar ao painel</Link></div>;
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const cachedSession = queryClient.getQueryData<Session>(queryKeys.session);
  const shouldCheckSession = location.pathname !== "/login" || !!cachedSession;
  useEffect(() => {
    const onExpired = () => {
      localStorage.removeItem("gest-tech-company");
      queryClient.clear();
      navigate("/login?expired=1", { replace: true });
    };
    window.addEventListener("gest-tech:session-expired", onExpired);
    return () => window.removeEventListener("gest-tech:session-expired", onExpired);
  }, [navigate, queryClient]);
  const sessionQuery = useQuery({
    queryKey: queryKeys.session,
    queryFn: getSession,
    retry: false,
    enabled: shouldCheckSession,
    staleTime: 5 * 60 * 1000,
  });
  if (location.pathname === "/login" && !sessionQuery.data) return <LoginPage />;
  if (sessionQuery.isPending) return <div className="full-loading"><Loading label="Preparando seu espaço…" /></div>;
  if (sessionQuery.isError && !isSessionExpiredError(sessionQuery.error)) {
    return <div className="full-loading"><ErrorNotice error={sessionQuery.error} retry={() => void sessionQuery.refetch()} /></div>;
  }
  if (!sessionQuery.data) return <Routes><Route path="*" element={<Navigate to="/login" replace />} /></Routes>;
  return <Routes><Route path="/login" element={<Navigate to="/dashboard" replace />} /><Route path="*" element={<ProtectedApp session={sessionQuery.data} />} /></Routes>;
}

const EMPTY_CONVERSATIONS: Conversation[] = [];
const EMPTY_BASES: KnowledgeBase[] = [];
