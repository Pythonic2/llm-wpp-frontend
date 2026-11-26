import {
  createContext,
  type FormEvent,
  type PropsWithChildren,
  type ReactNode,
  useContext,
  useEffect,
  useLayoutEffect,
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
  Download,
  FileText,
  Film,
  Flame,
  FolderTree,
  Headphones,
  ImageIcon,
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
  Target,
  ShoppingCart,
  UploadCloud,
  Users, UserX,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import {
  changeInitialPassword,
  createStaff,
  apiOrigin,
  contactConversations,
  conversationAction,
  createContact,
  createKnowledgeBase,
  createMediaAssets,
  createMediaCategory,
  createNumber,
  deleteContact,
  deleteDocument,
  deleteKnowledgeBase,
  deleteMediaAsset,
  deleteMediaCategory,
  deleteNumber,
  disconnectNumber,
  downloadMessageAttachment,
  errorMessage,
  getContact,
  getCompany,
  getConversation,
  getDashboard,
  getAIUsage,
  getMessageAttempt,
  getNumber,
  getKnowledgeBase,
  getMediaAssetBlob,
  getSession,
  isSessionExpiredError,
  listContacts,
  listCompanies,
  listConversations,
  listConversationTemplates,
  listDocuments,
  listKnowledgeBases,
  listMediaAssets,
  listMediaCategories,
  listMembers,
  listMessages,
  listNumbers,
  login,
  idempotencyKey,
  previewAI,
  logout,
  reprocessDocument,
  refreshSession,
  removeMember,
  sendMessage,
  sendConversationTemplate,
  setContactFollowUpConsent,
  updateContact,
  updateCompanyAIInstructions,
  updateWarmFollowUpEnabled,
  updateConversation,
  updateKnowledgeBase,
  updateMediaAsset,
  updateMember,
  updateNumber,
  uploadDocuments,
  getEmbeddedSignupConfig,
  completeEmbeddedSignup,
  listOrders,
  decideOrder,
} from "./api";
import type {
  Company,
  Contact,
  Conversation,
  ConversationStatus,
  DocumentStatus,
  KnowledgeBase,
  KnowledgeDocument,
  MediaAsset,
  MediaCategory,
  Membership,
  Message,
  Role,
  Session,
  WhatsAppNumber,
  WhatsAppNumberInput,
  Order,
} from "./types";
import { formatDate, formatPhone, formatTime } from "./format";
import { loadFacebookSdk, launchEmbeddedSignup } from "./facebookSignup";
import { CatalogPage, SalesPage, FinancePage, CommercialSettings, CommercialSummary } from "./Commercial";
import { LandingPage, SignupPage, CheckoutStatusPage, VerifyEmailPage, AddCompanyPage, ExtraNumberPurchase, SubscriptionsPage } from "./Billing";
import { TeamInviteAcceptPage } from "./TeamInvite";
import { DocumentShareControl, UnitManager, UnitSwitcher } from "./BusinessUnits";
import { listBusinessUnits, unitsKey } from "./businessUnitsApi";
import { ConfirmProvider } from "./ConfirmDialog";
import { useConfirm } from "./ConfirmContext";

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
const temperatureLabel = { unknown: "Não analisada", hot: "Quente", warm: "Morna", cold: "Fria" } as const;
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
  mediaCategories: (company: string) => ["media-categories", company] as const,
  mediaAssets: (company: string, filters: Record<string, string | number>) => ["media-assets", company, filters] as const,
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
      navigate(session.user.must_change_password ? "/change-password" : session.companies.length === 1 ? "/dashboard" : "/select-company");
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
          <div className="login-footnote"><Shield size={14} /> Ambiente seguro, acesso protegido por sessão.</div><div className="login-footnote">Ainda não tem conta? <Link to="/signup">Criar conta e assinar</Link></div>
        </div>
      </div>
    </main>
  );
}

function InitialPasswordPage({ session }: { session: Session }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [formError, setFormError] = useState("");
  const change = useMutation({
    mutationFn: () => changeInitialPassword(current, next),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.session, { ...session, user });
      navigate(session.companies.length === 1 ? "/dashboard" : "/select-company", { replace: true });
    },
    onError: (error: unknown) => setFormError(errorMessage(error)),
  });
  const leave = useMutation({ mutationFn: logout, onSuccess: () => { queryClient.clear(); navigate("/login", { replace: true }); } });
  return <main className="login-page"><div className="login-art"><div className="brand brand-large"><span className="brand-mark"><MessageCircle size={22} /></span>gest<span>tech</span></div><div className="login-art-copy"><h1>Seu acesso começa aqui.</h1><p>Defina uma senha pessoal antes de acessar as empresas da sua equipe.</p></div></div><div className="login-form-side"><div className="login-form-wrap"><span className="eyebrow">PRIMEIRO ACESSO</span><h2>Troque sua senha</h2><p className="form-intro">A senha inicial foi definida pelo administrador. Escolha uma nova senha para sua conta.</p><form className="stack-form" onSubmit={(event) => { event.preventDefault(); setFormError(""); if (next !== confirmation) { setFormError("As novas senhas não coincidem."); return; } change.mutate(); }}><label>Senha inicial<input type="password" autoComplete="current-password" required value={current} onChange={(event) => setCurrent(event.target.value)} /></label><label>Nova senha<input type="password" autoComplete="new-password" minLength={8} required value={next} onChange={(event) => setNext(event.target.value)} /></label><label>Confirme a nova senha<input type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>{formError && <div className="inline-error" role="alert">{formError}</div>}<button className="button button-primary button-wide" disabled={change.isPending}>{change.isPending ? "Salvando…" : "Salvar nova senha"}</button></form><button className="button button-secondary button-wide staff-leave" type="button" disabled={leave.isPending} onClick={() => leave.mutate()}>Sair</button></div></div></main>;
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
          <><Empty icon={Building2} title="Nenhuma empresa ativa" text="Peça ao administrador para conferir seu acesso e verificar se a assinatura da empresa está ativa." /><Link className="button button-secondary" to="/billing/subscriptions">Consultar minhas assinaturas</Link></>
        )}
      </div>
    </main>
  );
}

const navItems = [
  { to: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { to: "/inbox", label: "Caixa de entrada", icon: MessageCircle },
  { to: "/contacts", label: "Contatos", icon: Users },
  { to: "/orders", label: "Pedidos", icon: ShoppingCart },
  { to: "/sales", label: "Vendas", icon: ShoppingCart, admin: true },
  { to: "/catalog", label: "Catálogo", icon: FolderTree, admin: true },
  { to: "/finance", label: "Financeiro", icon: LayoutDashboard, admin: true },
  { to: "/knowledge", label: "Conhecimento", icon: BookOpen, admin: true },
  { to: "/media", label: "Mídias da IA", icon: ImageIcon, admin: true },
  { to: "/numbers", label: "WhatsApp", icon: Smartphone },
  { to: "/team", label: "Equipe", icon: Users, admin: true },
  { to: "/settings", label: "Configurações", icon: Settings, admin: true },
];

function AppShell({ children }: PropsWithChildren) {
  const { session, company, selectCompany } = useApp();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [companyMenuOpen, setCompanyMenuOpen] = useState(false);
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
    setCompanyMenuOpen(false);
    navigate("/dashboard");
  };
  const items = navItems.filter((item) => !item.admin || roleCanManage(company?.role));
  return (
    <div className="app-shell">
      {menuOpen && <button className="mobile-scrim" aria-label="Fechar navegação" onClick={() => setMenuOpen(false)} />}
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <Link className="brand" to="/dashboard"><span className="brand-mark"><MessageCircle size={19} /></span>gest<span>tech</span></Link>
        <div className="company-switcher company-switcher-custom">
          <button className="company-menu-trigger" aria-label="Empresa ativa" aria-expanded={companyMenuOpen} onClick={() => setCompanyMenuOpen(!companyMenuOpen)}><span className="company-avatar"><Building2 size={17} /></span><span className="company-switch-info"><small>ESPAÇO DE TRABALHO</small><strong>{company?.name}</strong></span><ChevronDown size={15} /></button>
          {companyMenuOpen && <div className="company-menu" role="menu"><span className="company-menu-title">Suas empresas</span>{session.companies.map(item => <button role="menuitem" className={item.id === company?.id ? "company-menu-current" : ""} key={item.id} onClick={() => switchCompany(item.id)}><span className="company-avatar"><Building2 size={15} /></span><span>{item.name}<small>{roleLabel[item.role]}</small></span>{item.id === company?.id && <Check size={14} />}</button>)}{company?.role === "owner" && <Link className="company-menu-add" role="menuitem" to="/companies/new" onClick={() => setCompanyMenuOpen(false)}><Plus size={16} /> Adicionar empresa <small>R$ 199,90/mês</small></Link>}</div>}
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
          {company && <UnitSwitcher companyId={company.id} />}
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
    { label: "Leads quentes", value: data.hot_leads ?? 0, icon: Flame, tone: "peach" },
    { label: "Follow-ups pendentes", value: data.follow_ups_due ?? 0, icon: Target, tone: "lavender" },
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
      {roleCanManage(company?.role) && <OnboardingChecklist companyId={id} />}
      <section className="panel recent-panel" aria-label="Pendências de atendimento"><div className="panel-heading"><div><h2>Precisa de atenção</h2><p>Falhas de entrega, respostas da IA e pedidos para conferir agora.</p></div></div>
        <div className="commercial-metrics"><Link to="/orders"><span>Pedidos e avisos pendentes</span><strong>{data.orders_needing_attention ?? 0}</strong></Link><span>Mensagens que falharam<strong>{data.failed_outbound_messages ?? 0}</strong></span><span>Respostas da IA com falha<strong>{data.failed_ai_messages ?? 0}</strong></span></div>
        {(data.operational_alerts ?? []).map((alert, index) => <Link className="recent-row" key={`${alert.kind}-${alert.conversation_id}-${index}`} to={`/inbox?conversation=${alert.conversation_id}`}><strong>{alert.contact_name}</strong><span>{alert.kind === "outbound_failed" ? "Mensagem não entregue" : "Resposta da IA falhou"}</span><ArrowRight size={14} /></Link>)}
        {!data.orders_needing_attention && !(data.operational_alerts ?? []).length && <p className="settings-note">Nenhuma falha ou pedido pendente agora.</p>}
      </section>
      <section className="panel warm-follow-up-summary" aria-label="Resumo dos contatos automáticos"><div><span className="eyebrow">RETOMADA AUTOMÁTICA</span><h2>A IA entrou em contato com {data.warm_follow_up_contacts_today ?? 0} {data.warm_follow_up_contacts_today === 1 ? "pessoa" : "pessoas"} hoje</h2><p>{data.warm_follow_up_delivered_today ?? 0} entregues · {data.warm_follow_up_replied_today ?? 0} responderam · {data.warm_follow_up_optouts_today ?? 0} descadastros · {data.warm_follow_up_failed_today ?? 0} falhas · {data.warm_follow_up_unknown_today ?? 0} incertos · {data.warm_follow_up_enabled ? "Automação ativa" : "Automação desativada"}</p></div>{(data.warm_follow_up_attempts ?? []).length > 0 && <div className="warm-follow-up-rows">{data.warm_follow_up_attempts?.map((attempt) => <Link key={attempt.id} to={`/inbox?conversation=${attempt.conversation_id}`}><strong>{attempt.contact_name}</strong><span>{attempt.status === "replied" ? "Respondeu" : attempt.status === "opted_out" ? "Descadastrou" : attempt.status === "sent" ? "Enviada" : attempt.status === "delivered" ? "Entregue" : attempt.status === "read" ? "Lida" : attempt.status === "failed" ? "Falhou" : attempt.status === "sending" ? "Enviando" : attempt.status === "unknown" ? "Estado incerto" : "Ignorada"} · {formatTime(attempt.created_at)}</span><ArrowRight size={14} /></Link>)}</div>}</section>
      {roleCanManage(company?.role) && <CommercialSummary companyId={id} />}
      <section className="dashboard-grid">
        <div className="panel recent-panel">
          <div className="follow-up-heading"><div><span className="follow-up-alert"><Target size={14} /> OPORTUNIDADES PARA RETOMAR</span><h2>Follow-ups pendentes</h2><p>Leads com potencial que ainda não fecharam.</p></div><strong>{data.follow_ups_due ?? 0}</strong></div>
          {(data.follow_up_conversations ?? []).length ? <div className="follow-up-list">{(data.follow_up_conversations ?? []).map((conversation) => <Link className={`follow-up-card follow-up-${conversation.lead_temperature}`} key={conversation.id} to={`/inbox?conversation=${conversation.id}`}>
            <span className="follow-up-pulse" /><span className="contact-avatar">{(conversation.contact.name || conversation.contact.phone || "?").slice(0, 1).toUpperCase()}</span>
            <span className="follow-up-copy"><strong>{conversation.contact.name || formatPhone(conversation.contact.phone || conversation.contact.wa_id)}</strong><small>{conversation.recommended_action || conversation.analysis_summary || "Retomar contato comercial"}</small></span>
            <span className={`temperature-pill temperature-${conversation.lead_temperature ?? "unknown"}`}>{temperatureLabel[conversation.lead_temperature ?? "unknown"]} · {conversation.purchase_intent_score ?? 0}%</span><ArrowRight size={15} />
          </Link>)}</div> : <div className="follow-up-clear"><Check size={16} /> Nenhum follow-up vencido agora.</div>}
          <div className="panel-divider" />
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

function OnboardingChecklist({ companyId }: { companyId: string }) {
  const company = useQuery({ queryKey: queryKeys.company(companyId), queryFn: () => getCompany(companyId) });
  const numbers = useQuery({ queryKey: [...queryKeys.numbers(companyId), "onboarding"], queryFn: () => listNumbers(companyId, { page_size: 100 }) });
  const bases = useQuery({ queryKey: ["knowledge-bases", companyId, "onboarding"], queryFn: () => listKnowledgeBases(companyId) });
  const usage = useQuery({ queryKey: ["ai-usage", companyId, 90], queryFn: () => getAIUsage(companyId, 90) });
  const steps = [
    { label: "Conectar um número de WhatsApp", done: !!numbers.data?.results.some(number => number.is_active && number.connection_state !== "disconnected"), to: "/numbers" },
    { label: "Definir o atendimento para vendas consultivas", done: !!company.data?.ai_instructions?.trim(), to: "/settings" },
    { label: "Cadastrar respostas e materiais da empresa", done: !!bases.data?.results.length, to: "/knowledge" },
    { label: "Testar perguntas reais antes de ligar a IA", done: !!usage.data?.by_purpose.some(item => item.purpose === "ai_preview"), to: "/settings" },
  ];
  if (steps.every(step => step.done)) return null;
  return <section className="panel recent-panel" aria-label="Primeiros passos"><div className="panel-heading"><div><h2>Prepare seu atendimento</h2><p>Configure e confira a experiência antes de ativar respostas automáticas.</p></div></div>{steps.map(step => <Link className="recent-row" key={step.label} to={step.to}><span>{step.done ? "✓" : "○"} {step.label}</span><ArrowRight size={14} /></Link>)}</section>;
}

function pageNumberFromLink(link: string | null): number | undefined {
  if (!link) return undefined;
  const page = Number(new URL(link, apiOrigin).searchParams.get("page"));
  return Number.isInteger(page) && page > 0 ? page : undefined;
}

function InboxPage() {
  const confirm = useConfirm();
  const { company, session } = useApp();
  const companyId = company?.id ?? "";
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedId = Number(searchParams.get("conversation")) || null;
  const [selectedId, setSelectedId] = useState<number | null>(requestedId);
  const initialSelection = useRef(false);
  const messageListRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const sendingConversationIdRef = useRef<number | null>(null);
  const [focusAfterSendConversationId, setFocusAfterSendConversationId] = useState<number | null>(null);
  const followLatestRef = useRef(true);
  const scrollConversationIdRef = useRef<number | null>(null);
  const olderMessagesAnchorRef = useRef<{ top: number; height: number } | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [human, setHuman] = useState("");
  const [assignee, setAssignee] = useState("");
  const [numberId, setNumberId] = useState("");
  const [hideClosed, setHideClosed] = useState(true);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  const [sendFeedback, setSendFeedback] = useState("");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const pendingTemplateRef = useRef<{ conversationId: number; name: string; language: string; key: string } | null>(null);
  const pendingSendRef = useRef<{ conversationId: number; text: string; key: string } | null>(null);
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
  const templates = useQuery({
    queryKey: ["conversation-templates", companyId, selectedId],
    queryFn: () => listConversationTemplates(companyId, selectedId ?? 0),
    enabled: templatesOpen && !!companyId && !!selectedId,
    staleTime: 60_000,
  });
  useLayoutEffect(() => {
    const element = messageListRef.current;
    if (!element) return;
    if (scrollConversationIdRef.current !== selectedId) {
      scrollConversationIdRef.current = selectedId;
      followLatestRef.current = true;
      olderMessagesAnchorRef.current = null;
    }
    if (olderMessagesAnchorRef.current) {
      if (messageQuery.isFetchingPreviousPage) return;
      const { top, height } = olderMessagesAnchorRef.current;
      element.scrollTop = top + element.scrollHeight - height;
      olderMessagesAnchorRef.current = null;
    } else if (followLatestRef.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [selectedId, messageQuery.data, messageQuery.isFetchingPreviousPage]);
  const loadOlderMessages = () => {
    const element = messageListRef.current;
    if (element) olderMessagesAnchorRef.current = { top: element.scrollTop, height: element.scrollHeight };
    void messageQuery.fetchPreviousPage();
  };
  const queryClient = useQueryClient();
  const refreshConversation = () => {
    void queryClient.invalidateQueries({ queryKey: ["conversations", companyId] });
    if (selectedId) {
      void queryClient.invalidateQueries({ queryKey: ["conversation", companyId, selectedId] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.messages(companyId, selectedId) });
    }
  };
  const action = useMutation({
    mutationFn: ({ name, payload }: { name: "pause-ai" | "resume-ai" | "close" | "reopen" | "assign" | "analyze" | "mark-won" | "mark-lost" | "reopen-opportunity" | "complete-follow-up" | "snooze-follow-up"; payload?: Record<string, unknown> }) =>
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
    mutationFn: ({ text, key }: { text: string; key: string }) => sendMessage(companyId, selectedId ?? 0, text, key),
    onSuccess: (result) => {
      if (result.status === "pending") {
        setSendFeedback("O resultado deste envio ainda é incerto. Consulte a tentativa antes de escrever outra mensagem.");
      } else if (result.status === "failed") {
        pendingSendRef.current = null;
        setSendFeedback("O envio falhou. Confira a conversa e tente novamente.");
      } else {
        pendingSendRef.current = null;
        setSendFeedback("");
        setMessage("");
      }
      followLatestRef.current = true;
      refreshConversation();
    },
    onError: (error: unknown) => { setSendFeedback(errorMessage(error)); refreshConversation(); },
    onSettled: () => setFocusAfterSendConversationId(sendingConversationIdRef.current),
  });
  const templateSend = useMutation({
    mutationFn: ({ name, language, key }: { name: string; language: string; key: string }) =>
      sendConversationTemplate(companyId, selectedId ?? 0, name, language, key),
    onSuccess: result => {
      if (result.status === "pending") setSendFeedback("Resultado do template incerto. Consulte a tentativa antes de reenviar.");
      else if (result.status === "failed") { pendingTemplateRef.current = null; setSendFeedback("O template falhou. Verifique a conversa antes de tentar novamente."); }
      else { pendingTemplateRef.current = null; setSendFeedback("Template enviado ao cliente."); setTemplatesOpen(false); }
      refreshConversation();
    },
    onError: error => { setSendFeedback(errorMessage(error)); refreshConversation(); },
  });
  useEffect(() => {
    if (send.isPending || focusAfterSendConversationId === null) return;
    if (focusAfterSendConversationId === selectedId && selected?.status !== "closed") {
      composerRef.current?.focus();
    }
    sendingConversationIdRef.current = null;
    setFocusAfterSendConversationId(null);
  }, [send.isPending, focusAfterSendConversationId, selectedId, selected?.status]);
  const submitMessage = () => {
    if (!message.trim() || !selected || selected.status === "closed" || send.isPending) return;
    sendingConversationIdRef.current = selected.id;
    const text = message.trim();
    if (!pendingSendRef.current || pendingSendRef.current.conversationId !== selected.id || pendingSendRef.current.text !== text) {
      pendingSendRef.current = { conversationId: selected.id, text, key: idempotencyKey() };
    }
    setSendFeedback("");
    send.mutate({ text, key: pendingSendRef.current.key });
  };
  const inspectSend = async () => {
    const attempt = pendingSendRef.current;
    if (!attempt) return;
    try {
      const result = await getMessageAttempt(companyId, attempt.conversationId, attempt.key);
      if (result.status === "sent" || result.status === "delivered" || result.status === "read") {
        pendingSendRef.current = null;
        setMessage("");
        setSendFeedback("Mensagem enviada. A conversa foi atualizada.");
      } else if (result.status === "failed") {
        pendingSendRef.current = null;
        setSendFeedback("O envio falhou. Você pode tentar novamente.");
      } else {
        setSendFeedback("O envio ainda está pendente. Verifique novamente antes de reenviar.");
      }
      refreshConversation();
    } catch (error) {
      setSendFeedback(errorMessage(error));
    }
  };
  const submitTemplate = (name: string, language: string) => {
    if (!selectedId || templateSend.isPending) return;
    if (!pendingTemplateRef.current || pendingTemplateRef.current.conversationId !== selectedId || pendingTemplateRef.current.name !== name || pendingTemplateRef.current.language !== language) {
      pendingTemplateRef.current = { conversationId: selectedId, name, language, key: idempotencyKey() };
    }
    setSendFeedback("");
    templateSend.mutate(pendingTemplateRef.current);
  };
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
    submitMessage();
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
              <span className="conversation-copy"><span className="conversation-line"><strong>{item.contact.name || formatPhone(item.contact.phone || item.contact.wa_id)}</strong><small>{formatTime(item.last_message_at || item.created_at)}</small></span><span className="conversation-preview">{item.lead_stage || formatPhone(item.contact.phone || item.contact.wa_id)}</span><span className="conversation-tags"><Badge tone={item.ai_paused ? "peach" : "green"}>{item.ai_paused ? "Humano" : "IA"}</Badge><Badge tone={item.status === "closed" ? "neutral" : "brand"}>{statusLabel[item.status]}</Badge>{item.lead_temperature && item.lead_temperature !== "unknown" && <span className={`temperature-pill temperature-${item.lead_temperature}`}>{temperatureLabel[item.lead_temperature]}</span>}</span><span className="conversation-assignee">{item.assigned_to ? `Atendente: ${displayName(item.assigned_to)}` : "Sem responsável"}</span></span>
            </button>) : <Empty icon={MessageCircle} title="Nenhuma conversa" text="Ajuste os filtros ou aguarde novas mensagens." />}
          </div>
          {list.data && <Pagination page={page} count={list.data.count} onPage={setPage} />}
        </aside>
        {selected ? <section className="chat-panel panel">
          <header className="chat-header"><button className="icon-button mobile-back" aria-label="Voltar à lista de conversas" onClick={() => selectConversation(null)}><ArrowLeft size={18} /></button><span className="contact-avatar">{(selected.contact.name || selected.contact.phone || "?").slice(0, 1).toUpperCase()}</span><div className="chat-person"><strong>{selected.contact.name || formatPhone(selected.contact.phone || selected.contact.wa_id)}</strong><small>{formatPhone(selected.contact.phone || selected.contact.wa_id)}</small></div><Badge tone={selected.ai_paused ? "peach" : "green"}>{selected.ai_paused ? "Atendimento humano · IA pausada" : "IA ativa"}</Badge></header>
          {actionError && <div className="chat-error" role="alert">{actionError}<button onClick={() => setActionError("")} aria-label="Fechar"><X size={14} /></button></div>}
          {conversationDetail.isError && <ErrorNotice error={conversationDetail.error} retry={() => void conversationDetail.refetch()} />}
          <div className="chat-context-strip"><span><Smartphone size={14} /> Conversa #{selected.id}</span><span>Atualizada {formatTime(selected.last_message_at)}</span></div>
          <div className="message-list" ref={messageListRef} onScroll={(event) => {
            const element = event.currentTarget;
            followLatestRef.current = element.scrollHeight - element.scrollTop - element.clientHeight <= 80;
          }}>
            {messageQuery.isPending ? <Loading label="Carregando mensagens…" /> : messageQuery.isError ? <ErrorNotice error={messageQuery.error} retry={() => void messageQuery.refetch()} /> : <>
              {messageQuery.hasPreviousPage && <button className="load-older" disabled={messageQuery.isFetchingPreviousPage} onClick={loadOlderMessages}>{messageQuery.isFetchingPreviousPage ? <LoaderCircle className="spin" size={14} /> : <Clock3 size={14} />} Carregar mensagens anteriores</button>}
              {(messageQuery.data?.pages.flatMap((page) => page.results) ?? []).map((item) => <MessageBubble key={item.id} message={item} />)}
              {!messageQuery.data?.pages.some((page) => page.results.length) && <div className="chat-empty">As mensagens desta conversa aparecerão aqui.</div>}
            </>}
          </div>
          <form className="message-composer" onSubmit={sendForm}><div className="composer-hint"><Sparkles size={13} /> {selected.status === "closed" ? "Reabra a conversa para enviar mensagens" : selected.ai_paused ? "Atendimento humano · a IA está pausada" : "Sua mensagem será enviada pelo WhatsApp e pausará a IA"}</div><div className="composer-row"><textarea ref={composerRef} aria-label="Escreva uma mensagem" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escreva sua mensagem…" rows={2} disabled={selected.status === "closed" || send.isPending} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submitMessage(); } }} /><button className="button button-primary send-button" type="submit" disabled={!message.trim() || selected.status === "closed" || send.isPending}><Send size={16} /><span>{send.isPending ? "Enviando…" : "Enviar"}</span></button></div>{sendFeedback && <small className="field-error" role="status">{sendFeedback} {pendingSendRef.current && <button type="button" onClick={() => void inspectSend()}>Consultar tentativa</button>}</small>}<button type="button" className="button button-secondary button-small" disabled={selected.status === "closed"} onClick={() => setTemplatesOpen(open => !open)}>Templates aprovados</button>{templatesOpen && <div className="settings-note">{templates.isPending ? "Consultando templates…" : templates.isError ? errorMessage(templates.error) : !templates.data?.consent_registered ? "Registre o consentimento de retorno no contato antes de enviar template." : templates.data.templates.length ? templates.data.templates.map(template => <div key={`${template.name}-${template.language}`}><p>{template.body}</p><button type="button" className="button button-secondary button-small" disabled={templateSend.isPending} onClick={() => submitTemplate(template.name, template.language)}>Enviar {template.name}</button></div>) : "Nenhum template de utilidade aprovado e sem variáveis foi encontrado nesta conta Meta."}</div>}</form>
        </section> : <section className="chat-panel panel chat-no-selection">{conversationDetail.isError && selectedId ? <ErrorNotice error={conversationDetail.error} retry={() => void conversationDetail.refetch()} /> : <Empty icon={MessageCircle} title="Escolha uma conversa" text="Selecione uma conversa à esquerda para ver as mensagens e iniciar o atendimento." />}</section>}
        {selected && <aside className="contact-panel panel"><div className="contact-panel-title"><h2>Detalhes</h2></div><div className="contact-profile"><span className="contact-avatar contact-avatar-large">{(selected.contact.name || selected.contact.phone || "?").slice(0, 1).toUpperCase()}</span><strong>{selected.contact.name || formatPhone(selected.contact.phone || selected.contact.wa_id)}</strong><span>{formatPhone(selected.contact.phone || selected.contact.wa_id)}</span><Badge tone={selected.status === "closed" ? "neutral" : "brand"}>{statusLabel[selected.status]}</Badge></div>
          <div className="detail-section sales-analysis"><span className="detail-label">ANÁLISE COMERCIAL DA IA</span><div className="analysis-score"><span className={`temperature-pill temperature-${selected.lead_temperature ?? "unknown"}`}>{temperatureLabel[selected.lead_temperature ?? "unknown"]}</span><strong>{selected.purchase_intent_score ?? 0}%</strong></div>{selected.analysis_summary && <p>{selected.analysis_summary}</p>}{(selected.buying_signals ?? []).length > 0 && <div><small>Sinais de compra</small><ul>{(selected.buying_signals ?? []).map((signal) => <li key={signal}>{signal}</li>)}</ul></div>}{(selected.objections ?? []).length > 0 && <div><small>Objeções</small><ul>{(selected.objections ?? []).map((objection) => <li key={objection}>{objection}</li>)}</ul></div>}{selected.recommended_action && <div className="recommended-action"><Target size={13} /><span>{selected.recommended_action}</span></div>}<button className="button button-secondary button-small" disabled={action.isPending} onClick={() => action.mutate({ name: "analyze" })}><RefreshCw size={13} /> Reanalisar</button></div>
          {selected.opportunity_status === "open" && selected.lead_temperature && selected.lead_temperature !== "unknown" && <div className="detail-section"><span className="detail-label">FOLLOW-UP</span>{selected.next_follow_up_at && <p className="follow-up-date"><Clock3 size={13} /> Retorno em {formatDate(selected.next_follow_up_at)}</p>}<button className="button button-primary button-small" disabled={action.isPending} onClick={() => action.mutate({ name: "complete-follow-up" })}><Check size={13} /> Follow-up realizado</button><button className="button button-secondary button-small" disabled={action.isPending} onClick={() => action.mutate({ name: "snooze-follow-up", payload: { days: 3 } })}><Clock3 size={13} /> Adiar 3 dias</button><div className="opportunity-actions"><button disabled={action.isPending} onClick={() => action.mutate({ name: "mark-won" })}>Marcar como ganha</button><button disabled={action.isPending} onClick={() => action.mutate({ name: "mark-lost" })}>Marcar como perdida</button></div></div>}
          <div className="detail-section"><span className="detail-label">ATENDIMENTO</span><label className="detail-control">Responsável<select aria-label="Responsável da conversa" value={selected.assigned_to?.id ?? ""} disabled={action.isPending} onChange={(event) => action.mutate({ name: "assign", payload: { user_id: event.target.value || null } })}><option value="">Não atribuído</option>{members.data?.map((member) => <option value={member.user.id} key={member.id}>{displayName(member.user)}</option>)}{session.user && !members.data?.some((item) => item.user.id === session.user.id) && <option value={session.user.id}>{displayName(session.user)}</option>}</select></label>{selected.assigned_to?.id !== session.user.id && <button className="button button-secondary button-small" disabled={action.isPending} onClick={() => action.mutate({ name: "assign", payload: { user_id: session.user.id } })}>Assumir conversa</button>}<button className="button button-secondary button-small ai-control-button" disabled={action.isPending} onClick={() => action.mutate({ name: selected.ai_paused ? "resume-ai" : "pause-ai" })}>{selected.ai_paused ? <><Play size={15} /> Reativar IA</> : <><Pause size={15} /> Pausar IA</>}</button><label className="detail-control">Status<select aria-label="Status da conversa" value={selected.status} disabled={update.isPending} onChange={(event) => update.mutate({ status: event.target.value })}><option value="open">Aberta</option><option value="qualifying">Em qualificação</option><option value="qualified">Qualificada</option><option value="closed">Encerrada</option></select></label><LeadStageEditor key={`${selected.id}-${selected.lead_stage}`} value={selected.lead_stage} disabled={update.isPending} onSave={(lead_stage) => update.mutate({ lead_stage })} /><label className="detail-control">Dados do lead (JSON)<LeadDataEditor key={`${selected.id}-${JSON.stringify(selected.lead_data)}`} data={selected.lead_data} disabled={update.isPending} onSave={(value) => update.mutate({ lead_data: value })} /></label></div>
          <div className="detail-section"><span className="detail-label">AÇÕES</span>{roleCanManage(company?.role) && <Link className="button button-primary button-small" to={`/sales?conversation=${selected.id}`}>Registrar venda</Link>}<button className="detail-action danger-action" disabled={action.isPending} onClick={() => { void confirm({ title: selected.status === "closed" ? "Reabrir conversa?" : "Encerrar conversa?", description: selected.status === "closed" ? "A conversa voltará para a lista de atendimentos abertos." : "A conversa será encerrada e poderá ser reaberta depois.", actionLabel: selected.status === "closed" ? "Reabrir conversa" : "Encerrar conversa", eyebrow: "ATENDIMENTO" }).then(approved => { if (approved) action.mutate({ name: selected.status === "closed" ? "reopen" : "close" }); }); }}>{selected.status === "closed" ? <><Play size={15} /> Reabrir conversa</> : <><X size={15} /> Encerrar conversa</>}</button></div>
          <div className="detail-foot"><Phone size={14} /> WhatsApp · contato #{selected.contact.id}</div>
        </aside>}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const outgoing = message.direction === "out";
  const aiLabel: Record<Message["ai_status"], string> = { na: "", queued: "IA na fila", processing: "IA processando", completed: "Respondida pela IA", skipped: "IA ignorada", failed: "Falha na IA" };
  return <div className={`message-row ${outgoing ? "message-outgoing" : ""}`}><div className={`message-bubble ${outgoing ? "bubble-outgoing" : "bubble-incoming"}`}><p>{message.text || <em>Mensagem {message.message_type} não textual</em>}</p>{message.source_media_id && <MessageAttachment message={message} />}<span className="message-meta">{formatTime(message.sent_at || message.created_at)}<MessageStatus status={message.status} />{!outgoing && aiLabel[message.ai_status] && <small className="ai-message-label">{aiLabel[message.ai_status]}</small>}</span></div></div>;
}

function MessageAttachment({ message }: { message: Message }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const attachmentFailed = !!message.attachment_error && message.attachment_error !== "processing";
  if (!message.attachment_url) return <span className={`message-attachment-pending ${attachmentFailed ? "message-attachment-error" : ""}`}>{attachmentFailed ? "Anexo indisponível" : "Preparando anexo para download…"}</span>;
  const attachmentUrl = message.attachment_url;
  const attachmentName = message.attachment_name || (message.message_type === "image" ? "foto.jpg" : message.message_type === "video" ? "video.mp4" : "anexo");
  return <button className="message-attachment" disabled={downloading} onClick={() => {
    setDownloading(true); setError("");
    void downloadMessageAttachment(attachmentUrl, attachmentName).catch((downloadError: unknown) => setError(errorMessage(downloadError))).finally(() => setDownloading(false));
  }}><span className="message-attachment-icon">{downloading ? <LoaderCircle className="spin" size={16} /> : <Download size={16} />}</span><span><strong>{message.attachment_name || "Anexo"}</strong><small>{message.attachment_size ? `${Math.max(1, Math.round(message.attachment_size / 1024))} KB · ` : ""}{error || "Baixar arquivo"}</small></span></button>;
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
  const confirm = useConfirm();
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
  const [consentSource, setConsentSource] = useState("");
  const [consentFeedback, setConsentFeedback] = useState("");
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
  const consentMutation = useMutation({
    mutationFn: (consent: boolean) => setContactFollowUpConsent(companyId, selected?.id ?? 0, consent, consentSource.trim()),
    onSuccess: async () => {
      setConsentFeedback("Preferência de retorno atualizada.");
      await queryClient.invalidateQueries({ queryKey: ["contact", companyId, selectedId] });
      await invalidateContacts();
    },
    onError: (error: unknown) => setConsentFeedback(errorMessage(error)),
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
    setConsentSource(contact.follow_up_consent_source || "");
    setConsentFeedback("");
    setFormError("");
  };
  return <div className="page-stack">
    <PageTitle eyebrow="RELACIONAMENTO" title="Contatos" description="Conheça e acompanhe as pessoas que conversam com sua empresa pelo WhatsApp." action={<button className="button button-primary" onClick={() => { setCreateOpen(true); setSelectedId(null); setName(""); setPhone(""); setWaId(""); setFormError(""); }}><Plus size={16} /> Novo contato</button>} />
    <section className="panel table-panel">
      <div className="table-toolbar"><div><strong>Todos os contatos</strong><small>{query.data?.count ?? 0} registros{query.isFetching && !query.isPending ? " · Atualizando…" : ""}</small></div><label className="search-field"><Search size={16} /><input aria-label="Buscar contatos" placeholder="Buscar nome, telefone ou WhatsApp ID…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />{search && <button aria-label="Limpar busca" onClick={() => { setSearch(""); setPage(1); }}><X size={14} /></button>}</label></div>
      {query.isPending ? <Loading /> : query.isError ? <ErrorNotice error={query.error} retry={() => void query.refetch()} /> : query.data.results.length ? <>
        <div className="table-scroll"><table><thead><tr><th>CONTATO</th><th>TELEFONE</th><th>WHATSAPP ID</th><th>ATUALIZADO</th><th /></tr></thead><tbody>{query.data.results.map((contact) => <tr key={contact.id}><td><button className="table-person" onClick={() => openContact(contact)}><span className="contact-avatar">{(contact.name || contact.wa_id).slice(0, 1).toUpperCase()}</span><strong>{contact.name || "Sem nome"}</strong></button></td><td>{formatPhone(contact.phone || contact.wa_id)}</td><td className="subtle-cell">{contact.wa_id}</td><td>{formatDate(contact.updated_at)}</td><td className="contact-row-actions"><button className="icon-button" aria-label={`Ver ${contact.name || contact.wa_id}`} onClick={() => openContact(contact)}><ArrowRight size={16} /></button><button className="icon-button danger-icon" aria-label={`Excluir ${contact.name || contact.wa_id}`} disabled={remove.isPending} onClick={() => { void confirm({ title: "Excluir contato?", description: `O contato ${contact.name || contact.wa_id} será removido. Registros vinculados podem impedir a exclusão.`, actionLabel: "Excluir contato", eyebrow: "CONTATOS" }).then(approved => { if (approved) remove.mutate(contact.id); }); }}><X size={15} /></button></td></tr>)}</tbody></table></div>
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
      {!createOpen && selected && roleCanManage(company?.role) && <div className="contact-consent"><strong>Retorno automático pelo WhatsApp</strong><p>Registre autorização explícita do cliente para que a IA possa retomar uma conversa morna. O cliente pode retirar essa autorização a qualquer momento.</p><label>Onde o cliente autorizou?<input aria-label="Origem da autorização de retorno" maxLength={160} value={consentSource} onChange={(event) => setConsentSource(event.target.value)} placeholder="Ex.: formulário de cadastro de 16/11" /></label><div className="contact-consent-actions"><button type="button" className="button button-primary button-small" disabled={consentMutation.isPending || consentSource.trim().length < 5} onClick={() => consentMutation.mutate(true)}>{selected.follow_up_consent_at ? "Atualizar autorização" : "Autorizar retorno"}</button>{selected.follow_up_consent_at && <button type="button" className="button button-secondary button-small" disabled={consentMutation.isPending} onClick={() => consentMutation.mutate(false)}>Revogar autorização</button>}</div><small>{selected.follow_up_consent_at ? `Autorizado em ${formatDate(selected.follow_up_consent_at)}` : "Sem autorização registrada"}</small>{consentFeedback && <small role="status">{consentFeedback}</small>}</div>}
      {!createOpen && selected && <div className="contact-conversations"><strong>Conversas deste contato</strong>{conversations.isPending ? <Loading /> : conversations.isError ? <ErrorNotice error={conversations.error} retry={() => void conversations.refetch()} /> : conversations.data?.length ? conversations.data.map((item) => <Link key={item.id} to={`/inbox?conversation=${item.id}`} className="contact-conversation-row"><span>Conversa #{item.id}</span><Badge tone={item.status === "closed" ? "neutral" : "brand"}>{statusLabel[item.status]}</Badge><ArrowRight size={14} /></Link>) : <small>Este contato ainda não tem conversas.</small>}</div>}
    </section></div>}
  </div>;
}

function Pagination({ page, count, onPage, pageSize = 25 }: { page: number; count: number; onPage: (page: number) => void; pageSize?: number }) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  return <div className="pagination"><span>{count ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, count)} de ${count}` : "0 registros"}</span><div><button className="button button-secondary button-small" onClick={() => onPage(Math.max(1, page - 1))} disabled={page <= 1}><ArrowLeft size={14} /> Anterior</button><span className="pagination-current">{page} / {pages}</span><button className="button button-secondary button-small" onClick={() => onPage(Math.min(pages, page + 1))} disabled={page >= pages}>Próxima <ArrowRight size={14} /></button></div></div>;
}

function KnowledgePage() {
  const confirm = useConfirm();
  const { company } = useApp();
  const companyId = company?.id ?? "";
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [baseName, setBaseName] = useState("");
  const [editBaseName, setEditBaseName] = useState("");
  const [baseError, setBaseError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState("");
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
    mutationFn: (files: File[]) => uploadDocuments(companyId, selected?.id ?? 0, files),
    onSuccess: () => { setUploadError(""); void queryClient.invalidateQueries({ queryKey: queryKeys.documents(companyId, selected?.id ?? 0) }); },
    onError: (error: unknown) => setUploadError(errorMessage(error)),
  });
  const handleFiles = (files: FileList | null) => {
    const selectedFiles = Array.from(files ?? []);
    if (!selectedFiles.length || !selected) return;
    if (selectedFiles.some((file) => !isAllowedUpload(file))) { setUploadError("Um ou mais arquivos têm formato inválido. Envie apenas PDF, TXT ou CSV."); return; }
    setUploadError("");
    upload.mutate(selectedFiles);
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
      {selected ? <section className="panel documents-panel"><div className="panel-heading document-heading"><div><span className="eyebrow">DOCUMENTOS DA BASE</span><form className="base-rename-form" onSubmit={(event) => { event.preventDefault(); if (editBaseName.trim() && editBaseName.trim() !== selected.name) modify.mutate({ base: selected, values: { name: editBaseName.trim() } }); }}><input aria-label="Nome da base" value={editBaseName} maxLength={120} onChange={(event) => setEditBaseName(event.target.value)} /><button className="button button-secondary button-small" disabled={modify.isPending || !editBaseName.trim() || editBaseName.trim() === selected.name}>Salvar nome</button></form><p>Os arquivos são processados em segundo plano para uso pela IA.</p></div><div className="document-actions"><button className="button button-secondary button-small" disabled={modify.isPending} onClick={() => modify.mutate({ base: selected, values: { is_active: !selected.is_active } })}>{selected.is_active ? "Desativar base" : "Ativar base"}</button><button className="icon-button danger-icon" aria-label="Excluir base" disabled={removeBase.isPending} onClick={() => { void confirm({ title: "Excluir base e documentos?", description: `A base “${selected.name}” e seus documentos serão removidos. Esta ação não pode ser desfeita.`, actionLabel: "Excluir base", eyebrow: "CONHECIMENTO" }).then(approved => { if (approved) removeBase.mutate(selected); }); }}><X size={16} /></button></div></div>
        {baseDetail.isError && <ErrorNotice error={baseDetail.error} retry={() => void baseDetail.refetch()} />}
        <div className={`upload-zone ${dragging ? "upload-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); handleFiles(event.dataTransfer.files); }}><span className="upload-icon"><FileText size={20} /></span><strong>Arraste vários documentos para cá</strong><span>ou <button type="button" className="upload-browse" onClick={() => fileRef.current?.click()}>escolha no computador</button></span><small>PDF, TXT ou CSV · cada arquivo será criado com o próprio nome</small><input ref={fileRef} className="visually-hidden" type="file" multiple accept=".pdf,.txt,.csv,application/pdf,text/plain,text/csv" onChange={(event) => { handleFiles(event.target.files); event.currentTarget.value = ""; }} /></div>
        {uploadError && <div className="inline-error" role="alert">{uploadError}<button onClick={() => setUploadError("")} aria-label="Fechar"><X size={14} /></button></div>}
        {upload.isPending && <div className="upload-progress"><LoaderCircle className="spin" size={16} /> Enviando documentos…</div>}
        {docsQuery.isPending ? <Loading /> : docsQuery.isError ? <ErrorNotice error={docsQuery.error} retry={() => void docsQuery.refetch()} /> : docsQuery.data.results.length ? <div className="document-list"><div className="document-list-heading"><span>ARQUIVO</span><span>STATUS</span><span>ADICIONADO</span><span /></div>{docsQuery.data.results.map((doc) => <DocumentRow key={doc.id} doc={doc} companyId={companyId} sourceUnitId={selected.business_unit_id} disabled={fileAction.isPending} onDelete={() => { void confirm({ title: "Excluir documento?", description: `O documento “${doc.title}” será removido desta base. Esta ação não pode ser desfeita.`, actionLabel: "Excluir documento", eyebrow: "CONHECIMENTO" }).then(approved => { if (approved) fileAction.mutate({ baseId: selected.id, docId: doc.id, action: "delete" }); }); }} onReprocess={() => fileAction.mutate({ baseId: selected.id, docId: doc.id, action: "reprocess" })} />)}</div> : <Empty icon={FileText} title="Nenhum documento ainda" text="Adicione arquivos para que a IA possa consultar as informações da sua empresa." />}
      </section> : <section className="panel documents-panel no-base-panel"><Empty icon={BookOpen} title="Crie sua primeira base" text="As bases de conhecimento guardam os documentos usados pela IA para responder às conversas." /></section>}
    </div>}
  </div>;
}

type MediaFormState = {
  name: string;
  description: string;
  category: number | null;
  tags: string;
  keywords: string;
  product_service: string;
  search_text: string;
  is_active: boolean;
  allow_ai_send: boolean;
};

const EMPTY_MEDIA_FORM: MediaFormState = {
  name: "",
  description: "",
  category: null,
  tags: "",
  keywords: "",
  product_service: "",
  search_text: "",
  is_active: true,
  allow_ai_send: true,
};

function commaList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function mediaForm(asset: MediaAsset): MediaFormState {
  return {
    name: asset.name,
    description: asset.description,
    category: asset.category,
    tags: asset.tags.join(", "),
    keywords: asset.keywords.join(", "),
    product_service: asset.product_service,
    search_text: asset.search_text,
    is_active: asset.is_active,
    allow_ai_send: asset.allow_ai_send,
  };
}

function MediaLibraryPage() {
  const confirm = useConfirm();
  const { company } = useApp();
  const companyId = company?.id ?? "";
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<number | "">("");
  const [fileType, setFileType] = useState("");
  const [page, setPage] = useState(1);
  const [categoryName, setCategoryName] = useState("");
  const [editing, setEditing] = useState<MediaAsset | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<MediaFormState>(EMPTY_MEDIA_FORM);
  const [files, setFiles] = useState<File[]>([]);
  const [formError, setFormError] = useState("");
  const filters: Record<string, string | number> = { page };
  if (search.trim()) filters.q = search.trim();
  if (category !== "") filters.category = category;
  if (fileType) filters.file_type = fileType;

  const categories = useQuery({
    queryKey: queryKeys.mediaCategories(companyId),
    queryFn: () => listMediaCategories(companyId),
    enabled: !!companyId,
  });
  const assets = useQuery({
    queryKey: queryKeys.mediaAssets(companyId, filters),
    queryFn: () => listMediaAssets(companyId, filters),
    enabled: !!companyId,
    refetchInterval: (query) => query.state.data?.results.some((asset) => asset.status === "pending") ? 4_000 : false,
  });
  const invalidateCategories = () => queryClient.invalidateQueries({ queryKey: queryKeys.mediaCategories(companyId) });
  const invalidateAssets = () => queryClient.invalidateQueries({ queryKey: ["media-assets", companyId] });
  const createCategory = useMutation({
    mutationFn: () => createMediaCategory(companyId, { name: categoryName.trim(), parent: null }),
    onSuccess: async () => { setCategoryName(""); await invalidateCategories(); },
    onError: (error: unknown) => setFormError(errorMessage(error)),
  });
  const removeCategory = useMutation({
    mutationFn: (item: MediaCategory) => deleteMediaCategory(companyId, item.id),
    onSuccess: async (_, item) => { if (category === item.id) setCategory(""); await invalidateCategories(); },
    onError: (error: unknown) => setFormError(errorMessage(error)),
  });
  const saveAsset = useMutation<MediaAsset | MediaAsset[]>({
    mutationFn: () => {
      const values = {
        ...form,
        tags: commaList(form.tags),
        keywords: commaList(form.keywords),
      };
      if (editing) return updateMediaAsset(companyId, editing.id, values);
      if (!files.length) throw new Error("Selecione uma ou mais imagens, vídeos ou PDFs.");
      return createMediaAssets(companyId, values, files);
    },
    onSuccess: async () => {
      setFormOpen(false); setEditing(null); setForm(EMPTY_MEDIA_FORM); setFiles([]); setFormError("");
      await invalidateAssets();
    },
    onError: (error: unknown) => setFormError(errorMessage(error)),
  });
  const removeAsset = useMutation({
    mutationFn: (asset: MediaAsset) => deleteMediaAsset(companyId, asset.id),
    onSuccess: () => void invalidateAssets(),
    onError: (error: unknown) => setFormError(errorMessage(error)),
  });
  const reprocessAsset = useMutation({
    mutationFn: (asset: MediaAsset) => updateMediaAsset(companyId, asset.id, {
      name: asset.name,
      description: asset.description,
      category: asset.category,
      tags: asset.tags,
      keywords: asset.keywords,
      product_service: asset.product_service,
      search_text: asset.search_text,
      is_active: asset.is_active,
      allow_ai_send: asset.allow_ai_send,
    }),
    onSuccess: () => void invalidateAssets(),
    onError: (error: unknown) => setFormError(errorMessage(error)),
  });
  const openCreate = () => {
    setEditing(null); setForm({ ...EMPTY_MEDIA_FORM, category: category === "" ? null : category });
    setFiles([]); setFormError(""); setFormOpen(true);
  };
  const openEdit = (asset: MediaAsset) => {
    setEditing(asset); setForm(mediaForm(asset)); setFiles([]); setFormError(""); setFormOpen(true);
  };
  const updateField = <K extends keyof MediaFormState>(field: K, value: MediaFormState[K]) =>
    setForm((current) => ({ ...current, [field]: value }));

  return <div className="page-stack media-library-page">
    <PageTitle eyebrow="CONTEÚDO PARA O WHATSAPP" title="Mídias da IA" description="Cadastre fotos, vídeos, catálogos e tutoriais para a IA encontrar e enviar no momento certo." action={<button className="button button-primary" onClick={openCreate}><Plus size={16} /> Nova mídia</button>} />
    {formError && !formOpen && <div className="inline-error" role="alert">{formError}<button onClick={() => setFormError("")} aria-label="Fechar"><X size={14} /></button></div>}
    <div className="media-layout">
      <aside className="panel media-category-panel">
        <div className="panel-heading"><div><h2>Categorias</h2><p>Organize produtos e serviços.</p></div><Badge>{categories.data?.length ?? 0}</Badge></div>
        {categories.isPending ? <Loading /> : categories.isError ? <ErrorNotice error={categories.error} retry={() => void categories.refetch()} /> : <div className="media-category-list">
          <button className={category === "" ? "media-category-active" : ""} onClick={() => { setCategory(""); setPage(1); }}><FolderTree size={16} /><span>Todas as mídias</span></button>
          {categories.data.map((item) => <div className="media-category-row" key={item.id}><button className={category === item.id ? "media-category-active" : ""} onClick={() => { setCategory(item.id); setPage(1); }}><FolderTree size={15} /><span>{item.name}</span></button><button className="icon-button danger-icon" aria-label={`Excluir categoria ${item.name}`} onClick={() => { void confirm({ title: "Excluir categoria?", description: `A categoria “${item.name}” será removida. As mídias cadastradas permanecem na biblioteca.`, actionLabel: "Excluir categoria", eyebrow: "BIBLIOTECA" }).then(approved => { if (approved) removeCategory.mutate(item); }); }}><X size={13} /></button></div>)}
        </div>}
        <form className="new-base-form" onSubmit={(event) => { event.preventDefault(); if (categoryName.trim()) createCategory.mutate(); }}><label htmlFor="new-media-category">Nova categoria</label><div className="inline-create"><input id="new-media-category" placeholder="Nome da categoria" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} /><button className="icon-button create-button" aria-label="Criar categoria" disabled={!categoryName.trim() || createCategory.isPending}><Plus size={17} /></button></div></form>
      </aside>
      <section className="panel media-content-panel">
        <div className="media-toolbar"><label className="search-field"><Search size={16} /><input placeholder="Buscar nome, descrição, produto ou tag…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />{search && <button aria-label="Limpar busca" onClick={() => setSearch("")}><X size={14} /></button>}</label><select aria-label="Filtrar tipo" value={fileType} onChange={(event) => { setFileType(event.target.value); setPage(1); }}><option value="">Todos os tipos</option><option value="image">Imagens</option><option value="video">Vídeos</option><option value="document">Documentos</option></select></div>
        {assets.isPending ? <Loading label="Carregando biblioteca…" /> : assets.isError ? <ErrorNotice error={assets.error} retry={() => void assets.refetch()} /> : assets.data.results.length ? <><div className="media-grid">{assets.data.results.map((asset) => <article className="media-card" key={asset.id}>
          <div className="media-preview">{asset.file_type === "image" || asset.file_type === "video" ? <AuthenticatedMediaPreview asset={asset} /> : <a href={asset.download_url} target="_blank" rel="noreferrer"><FileText size={34} /><span>Abrir documento</span></a>}<span className={`media-status media-status-${asset.status}`}>{asset.status === "ready" ? "Pronto" : asset.status === "failed" ? "Falhou" : "Processando"}</span></div>
          <div className="media-card-body"><div className="media-card-heading"><div><small>{asset.category_name || "Sem categoria"}</small><h3>{asset.name}</h3></div><span className="media-type-icon">{asset.file_type === "image" ? <ImageIcon size={15} /> : asset.file_type === "video" ? <Film size={15} /> : <FileText size={15} />}</span></div><p>{asset.description}</p>{asset.product_service && <span className="media-product">{asset.product_service}</span>}<div className="media-card-flags"><Badge tone={asset.is_active ? "green" : "neutral"}>{asset.is_active ? "Ativa" : "Inativa"}</Badge><Badge tone={asset.allow_ai_send ? "brand" : "neutral"}>{asset.allow_ai_send ? "IA pode enviar" : "Envio manual"}</Badge></div>{asset.error && <small className="document-error">{asset.error}</small>}<div className="media-card-actions">{asset.status !== "ready" && <button className="button button-secondary button-small" disabled={reprocessAsset.isPending} onClick={() => reprocessAsset.mutate(asset)}><RefreshCw size={13} /> Reprocessar</button>}<button className="button button-secondary button-small" onClick={() => openEdit(asset)}>Editar</button><button className="icon-button danger-icon" aria-label={`Excluir ${asset.name}`} onClick={() => { void confirm({ title: "Excluir mídia?", description: `A mídia “${asset.name}” será removida da biblioteca. Esta ação não pode ser desfeita.`, actionLabel: "Excluir mídia", eyebrow: "BIBLIOTECA" }).then(approved => { if (approved) removeAsset.mutate(asset); }); }}><X size={15} /></button></div></div>
        </article>)}</div><Pagination page={page} count={assets.data.count} onPage={setPage} /></> : <Empty icon={ImageIcon} title="Nenhuma mídia encontrada" text="Adicione imagens, vídeos ou PDFs para a IA usar no atendimento." action={<button className="button button-primary button-small" onClick={openCreate}><Plus size={15} /> Adicionar mídia</button>} />}
      </section>
    </div>
    {formOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false); }}><section className="modal-card media-modal" role="dialog" aria-modal="true" aria-labelledby="media-modal-title"><div className="modal-heading"><div><span className="eyebrow">BIBLIOTECA INTELIGENTE</span><h2 id="media-modal-title">{editing ? "Editar mídia" : "Adicionar mídia"}</h2></div><button className="icon-button" aria-label="Fechar" onClick={() => setFormOpen(false)}><X size={18} /></button></div>
      {formError && <div className="inline-error" role="alert">{formError}</div>}
      <form className="stack-form media-form" onSubmit={(event) => { event.preventDefault(); setFormError(""); saveAsset.mutate(); }}>
        {!editing && <><label className="media-file-picker"><UploadCloud size={22} /><strong>{files.length ? `${files.length} arquivo${files.length > 1 ? "s" : ""} selecionado${files.length > 1 ? "s" : ""}` : "Escolher imagens, vídeos ou PDFs"}</strong><small>Seleção múltipla · JPEG, PNG, WebP, GIF, MP4, 3GPP ou PDF · até 16 MB cada</small><input required type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/3gpp,application/pdf" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} /></label>{files.length > 0 && <div className="media-selected-files">{files.map((selectedFile, index) => <span key={`${selectedFile.name}-${selectedFile.lastModified}`}><FileText size={13} /><span>{selectedFile.name}</span><button type="button" aria-label={`Remover ${selectedFile.name}`} onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}><X size={12} /></button></span>)}</div>}</>}
        <div className="settings-fields">{(editing || files.length <= 1) && <label>Nome<input required={!!editing} maxLength={200} value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder={files.length === 1 ? "Opcional — usa o nome do arquivo" : "Nome da mídia"} /></label>}<label className={files.length > 1 && !editing ? "media-category-wide" : ""}>Categoria<span className="media-select"><select value={form.category ?? ""} onChange={(event) => updateField("category", event.target.value ? Number(event.target.value) : null)}><option value="">Sem categoria</option>{categories.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown aria-hidden="true" size={16} /></span></label></div>
        {!editing && files.length > 1 && <p className="media-batch-note">Cada mídia receberá o nome do próprio arquivo. Os campos abaixo serão aplicados a todo o lote.</p>}
        <label>Descrição para a IA<textarea required rows={3} maxLength={4000} value={form.description} onChange={(event) => updateField("description", event.target.value)} placeholder="Explique quando este arquivo é útil e o que ele mostra." /></label>
        <label>Produto ou serviço associado<input maxLength={200} value={form.product_service} onChange={(event) => updateField("product_service", event.target.value)} placeholder="Nome do produto ou serviço (opcional)" /></label>
        <div className="settings-fields"><label>Tags (etiquetas)<small className="field-help">Rótulos para organizar e filtrar. Ex.: chopeira, catálogo, instalação.</small><input value={form.tags} onChange={(event) => updateField("tags", event.target.value)} placeholder="Separe as tags por vírgulas" /></label><label>Palavras-chave<small className="field-help">Termos e sinônimos que ajudam a IA a encontrar esta mídia.</small><input value={form.keywords} onChange={(event) => updateField("keywords", event.target.value)} placeholder="Separe as palavras por vírgulas" /></label></div>
        <label>Texto para pesquisa semântica<textarea required rows={3} maxLength={8000} value={form.search_text} onChange={(event) => updateField("search_text", event.target.value)} placeholder="Descreva com detalhes o conteúdo para facilitar a busca da IA." /></label>
        <div className="media-switches"><label className="media-switch"><input type="checkbox" checked={form.is_active} onChange={(event) => updateField("is_active", event.target.checked)} /><i aria-hidden="true" /><span><strong>Mídia ativa</strong><small>Aparece nas buscas da biblioteca.</small></span></label><label className="media-switch"><input type="checkbox" checked={form.allow_ai_send} onChange={(event) => updateField("allow_ai_send", event.target.checked)} /><i aria-hidden="true" /><span><strong>Permitir envio automático</strong><small>A IA poderá selecionar e enviar este arquivo.</small></span></label></div>
        <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setFormOpen(false)}>Cancelar</button><button className="button button-primary" disabled={saveAsset.isPending || (!editing && !files.length)}>{saveAsset.isPending ? <><LoaderCircle className="spin" size={16} /> Salvando…</> : editing ? "Salvar alterações" : files.length > 1 ? `Adicionar ${files.length} mídias` : "Adicionar mídia"}</button></div>
      </form>
    </section></div>}
  </div>;
}

function DocumentRow({ doc, companyId, sourceUnitId, disabled, onDelete, onReprocess }: { doc: KnowledgeDocument; companyId: string; sourceUnitId: string; disabled: boolean; onDelete: () => void; onReprocess: () => void }) {
  const tone = doc.status === "ready" ? "green" : doc.status === "failed" ? "red" : doc.status === "processing" ? "brand" : "neutral";
  return <div className="document-row"><span className="document-name"><span className="document-file-icon"><FileText size={16} /></span><span><strong>{doc.title}</strong><small>{doc.file_name}</small>{doc.error && <small className="document-error">{doc.error}</small>}</span></span><span><Badge tone={tone}>{doc.status === "processing" && <LoaderCircle className="spin" size={11} />}{documentLabel[doc.status]}</Badge></span><span className="document-date">{formatDate(doc.created_at)}</span><span className="document-row-actions"><DocumentShareControl companyId={companyId} documentId={doc.id} sourceUnitId={sourceUnitId} />{doc.status === "failed" && <button className="icon-button" aria-label={`Reprocessar ${doc.title}`} disabled={disabled} onClick={onReprocess}><RefreshCw size={15} /></button>}<button className="icon-button danger-icon" aria-label={`Excluir ${doc.title}`} disabled={disabled} onClick={onDelete}><X size={15} /></button></span></div>;
}

function AuthenticatedMediaPreview({ asset }: { asset: MediaAsset }) {
  const [source, setSource] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let objectUrl = "";
    let active = true;
    setSource("");
    setFailed(false);
    void getMediaAssetBlob(asset.download_url).then((blob) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setSource(objectUrl);
    }).catch(() => { if (active) setFailed(true); });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [asset.download_url]);
  if (failed) return <span className="media-preview-error"><ImageIcon size={24} />Preview indisponível</span>;
  if (!source) return <LoaderCircle className="spin" size={22} />;
  return asset.file_type === "image"
    ? <img src={source} alt={asset.name} loading="lazy" />
    : <video src={source} controls preload="metadata" />;
}

function NumbersPage() {
  const confirm = useConfirm();
  const { company } = useApp();
  const companyId = company?.id ?? "";
  const canManage = roleCanManage(company?.role);
  const queryClient = useQueryClient();
  const units = useQuery({ queryKey: unitsKey(companyId), queryFn: () => listBusinessUnits(companyId), enabled: !!companyId });
  const [sdkReady, setSdkReady] = useState(false);
  const [migrationConsent, setMigrationConsent] = useState(false);
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [values, setValues] = useState<WhatsAppNumberInput>(emptyNumberInput());
  const signupConfig = useQuery({
    queryKey: ["embedded-signup-config", companyId],
    queryFn: () => getEmbeddedSignupConfig(companyId),
    enabled: !!companyId && canManage,
    refetchInterval: 240_000,
  });
  useEffect(() => {
    if (!signupConfig.data) return;
    let cancelled = false;
    setSdkReady(false);
    loadFacebookSdk(signupConfig.data.app_id, signupConfig.data.api_version)
      .then(() => { if (!cancelled) setSdkReady(true); })
      .catch((error: unknown) => { if (!cancelled) setFormError(errorMessage(error)); });
    return () => { cancelled = true; };
  }, [signupConfig.data]);
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
  const connect = useMutation({
    mutationFn: (payload: Awaited<ReturnType<typeof launchEmbeddedSignup>>) => completeEmbeddedSignup(companyId, payload),
    onSuccess: async () => { setFormError(""); await invalidate(); void signupConfig.refetch(); },
    onError: (error: unknown) => { setFormError(errorMessage(error)); void signupConfig.refetch(); },
  });
  const disconnect = useMutation({
    mutationFn: (id: number) => disconnectNumber(companyId, id),
    onSuccess: () => void invalidate(),
    onError: (error: unknown) => setFormError(errorMessage(error)),
  });
  const startConnection = () => {
    if (!migrationConsent) { setFormError("Leia e confirme os riscos antes de continuar."); return; }
    if (!signupConfig.data || !sdkReady || Date.now() - signupConfig.dataUpdatedAt > 300_000) {
      setFormError(signupConfig.isError ? errorMessage(signupConfig.error) : "A conexão está sendo preparada. Aguarde e tente novamente.");
      void signupConfig.refetch();
      return;
    }
    setFormError("");
    void launchEmbeddedSignup(signupConfig.data).then((payload) => connect.mutate(payload)).catch((error: unknown) => {
      setFormError(errorMessage(error));
      void signupConfig.refetch();
    });
  };
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
  return <div className="page-stack"><PageTitle eyebrow="CANAIS DE ATENDIMENTO" title="Números do WhatsApp" description={canManage ? "Conecte um número pela Meta. Números elegíveis podem continuar no WhatsApp Business." : "Consulte os números cadastrados para esta empresa."} action={canManage && <><button className="button button-primary" disabled={connect.isPending || !sdkReady || !signupConfig.data || !migrationConsent} onClick={startConnection}><Smartphone size={16} /> {connect.isPending ? "Conectando…" : "Conectar WhatsApp"}</button><button className="button button-secondary" onClick={openCreate}><Plus size={16} /> Cadastro manual</button></>} />{companyId && <ExtraNumberPurchase companyId={companyId} />}
    <div className="whatsapp-consent-card"><div className="whatsapp-consent-info"><CircleHelp size={20} /><p>A Meta oferece conexão normal ou coexistência para números elegíveis. A coexistência mantém o aplicativo, mas alguns recursos e aparelhos vinculados podem mudar. A conexão normal de um número usado no WhatsApp Business pode impedir seu uso no aplicativo. O Gest Tech não inicia uma migração por API.</p></div><label className="whatsapp-consent-check"><input type="checkbox" checked={migrationConsent} onChange={(event) => setMigrationConsent(event.target.checked)} /><span>Entendi os riscos e autorizo a opção que eu selecionar na Meta, inclusive a possível migração se escolher conexão normal.</span></label></div>
    {signupConfig.isError && canManage && <ErrorNotice error={signupConfig.error} retry={() => void signupConfig.refetch()} />}
    {formError && !createOpen && editingId === null && <div className="inline-error" role="alert">{formError}<button onClick={() => setFormError("")} aria-label="Fechar"><X size={14} /></button></div>}
    {query.isPending ? <Loading /> : query.isError ? <ErrorNotice error={query.error} retry={() => void query.refetch()} /> : query.data.results.length ? <>
      <div className="number-grid">{query.data.results.map((number) => <article className="panel number-card" key={number.id}><div className="number-card-head"><span className="number-icon"><Smartphone size={20} /></span><span className="number-statuses"><Badge tone={number.is_active ? "green" : "neutral"}>{number.is_active ? "Ativo" : "Inativo"}</Badge><Badge tone={number.ai_enabled ? "brand" : "neutral"}>{number.ai_enabled ? "IA ativa" : "IA desativada"}</Badge></span></div><span className="eyebrow">NÚMERO CADASTRADO</span><h2>{number.display_phone_number}</h2><p>Atividade · {units.data?.results.find(unit => unit.id === number.business_unit_id)?.name || "Geral"}</p><p>ID do número · {number.phone_number_id}</p><p>Conta empresarial · {number.business_account_name || number.business_account_id || "Não informada"}</p><p>Integração · {number.connection_state === "syncing" ? "Sincronizando" : number.connection_state === "sync_failed" ? "Sincronização pendente" : number.connection_state === "history_declined" ? "Histórico não compartilhado" : number.connection_state === "disconnected" ? "Desconectada" : "Conectada"}</p><p>Última sincronização · {number.last_synced_at ? new Date(number.last_synced_at).toLocaleString("pt-BR") : "Ainda não disponível"}</p><p>Última entrada · {number.last_inbound_at ? formatDate(number.last_inbound_at) : "Nenhuma mensagem recebida"}</p><p>Última saída · {number.last_outbound_at ? formatDate(number.last_outbound_at) : "Nenhuma mensagem enviada"}</p><p>Falhas de envio nas últimas 24h · {number.outbound_failures_24h ?? 0}</p>{number.connection_error && <p role="alert">{number.connection_error}</p>}{canManage && <><div className="number-actions"><button className="button button-secondary button-small" onClick={() => openEdit(number)}>Detalhes e editar</button>{(number.connection_mode ?? "manual") === "manual" ? <button className="icon-button danger-icon" aria-label={`Excluir ${number.display_phone_number}`} disabled={remove.isPending} onClick={() => { void confirm({ title: "Excluir número manual?", description: `O número ${number.display_phone_number} será removido do cadastro. Conversas vinculadas podem impedir a exclusão.`, actionLabel: "Excluir número", eyebrow: "WHATSAPP" }).then(approved => { if (approved) remove.mutate(number.id); }); }}><X size={15} /></button> : number.connection_state !== "disconnected" ? <button className="button button-secondary button-small" disabled={disconnect.isPending} onClick={() => { void confirm({ title: "Desconectar WhatsApp?", description: `O número ${number.display_phone_number} será desconectado do Gest Tech. O histórico permanece. Na coexistência, a desconexão no aplicativo WhatsApp Business é uma etapa separada.`, actionLabel: "Desconectar", eyebrow: "WHATSAPP" }).then(approved => { if (approved) disconnect.mutate(number.id); }); }}>Desconectar</button> : <button className="button button-secondary button-small" onClick={startConnection}>Reconectar</button>}</div><div className="number-toggles">{number.connection_mode === "coexistence" && <Toggle label="Pausar IA após resposta no aplicativo" description="Evita respostas automáticas após um atendente responder no WhatsApp Business." disabled={update.isPending || number.connection_state === "disconnected"} checked={number.pause_ai_on_app_echo ?? true} onChange={(enabled) => update.mutate({ id: number.id, input: { pause_ai_on_app_echo: enabled } })} />}<Toggle label="Número ativo" description="Recebe mensagens pelo webhook." disabled={update.isPending || number.connection_state === "disconnected"} checked={number.is_active} onChange={(active) => update.mutate({ id: number.id, input: { is_active: active, ...(!active ? { ai_enabled: false } : {}) } })} /><Toggle label="Respostas da IA" description="Permite respostas automáticas com Gemini." disabled={update.isPending || !number.is_active || number.connection_state === "disconnected"} checked={number.ai_enabled} onChange={(enabled) => update.mutate({ id: number.id, input: { ai_enabled: enabled } })} /></div></>}</article>)}</div>
      <Pagination page={page} count={query.data.count} onPage={setPage} />
    </> : <div className="panel empty-panel"><Empty icon={Smartphone} title="Nenhum número cadastrado" text="Conecte um número pelo cadastro oficial da Meta para começar o atendimento." action={canManage ? <button className="button button-primary button-small" disabled={connect.isPending || !sdkReady || !signupConfig.data || !migrationConsent} onClick={startConnection}><Smartphone size={15} /> Conectar WhatsApp</button> : undefined} /></div>}
    {canManage && (createOpen || editingId !== null) && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="number-modal-title"><div className="modal-heading"><div><span className="eyebrow">{createOpen || detail.data?.connection_mode === "manual" ? "CONFIGURAÇÃO MANUAL" : "INTEGRAÇÃO OFICIAL"}</span><h2 id="number-modal-title">{createOpen ? "Cadastrar número" : "Detalhes do número"}</h2></div><button className="icon-button" aria-label="Fechar" onClick={closeForm}><X size={18} /></button></div>
      {detail.isError && <ErrorNotice error={detail.error} retry={() => void detail.refetch()} />}
      {detail.isPending && !createOpen ? <Loading /> : <form className="stack-form" onSubmit={saveNumber}>
        <label>Phone number ID<input required disabled={!createOpen && detail.data?.connection_mode !== "manual"} maxLength={64} value={values.phone_number_id} onChange={(event) => setValues({ ...values, phone_number_id: event.target.value })} /></label>
        <label>Número exibido<input required disabled={!createOpen && detail.data?.connection_mode !== "manual"} maxLength={32} placeholder="+55 11 99999-9999" value={values.display_phone_number} onChange={(event) => setValues({ ...values, display_phone_number: event.target.value })} /></label>
        <label>Business account ID<input disabled={!createOpen && detail.data?.connection_mode !== "manual"} maxLength={64} value={values.business_account_id} onChange={(event) => setValues({ ...values, business_account_id: event.target.value })} /></label>
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
  const { company, session } = useApp();
  const companyId = company?.id ?? "";
  const manageableCompanies = session.companies.filter((item) => roleCanManage(item.role));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [companyIds, setCompanyIds] = useState<string[]>([companyId]);
  useEffect(() => setCompanyIds([companyId]), [companyId]);
  const [role, setRole] = useState<"admin" | "agent">("agent");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [pendingRemoval, setPendingRemoval] = useState<Membership | null>(null);
  const [removeError, setRemoveError] = useState("");
  const query = useQuery({ queryKey: queryKeys.members(companyId), queryFn: () => listMembers(companyId), enabled: !!companyId });
  const queryClient = useQueryClient();
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["members"] });
  const add = useMutation({
    mutationFn: () => createStaff({ username: username.trim(), password, email: email.trim() || undefined, role, company_ids: companyIds }),
    onSuccess: () => { setUsername(""); setPassword(""); setEmail(""); setFormError(""); setFormSuccess("Funcionário cadastrado. A troca de senha será exigida no primeiro acesso." + (email.trim() ? " O envio da notificação por e-mail foi solicitado." : " Entregue o usuário e a senha inicial à pessoa cadastrada.")); invalidate(); },
    onError: (error: unknown) => { setFormSuccess(""); setFormError(errorMessage(error)); },
  });
  const changeRole = useMutation({ mutationFn: ({ member, next }: { member: Membership; next: string }) => updateMember(companyId, member.id, next), onSuccess: invalidate, onError: (error: unknown) => setFormError(errorMessage(error)) });
  const remove = useMutation({ mutationFn: (memberId: number) => removeMember(companyId, memberId), onSuccess: () => { setPendingRemoval(null); setRemoveError(""); invalidate(); }, onError: (error: unknown) => setRemoveError(errorMessage(error)) });
  return <div className="page-stack"><PageTitle eyebrow="PESSOAS E ACESSOS" title="Equipe" description="Cadastre funcionários e escolha os negócios que cada pessoa pode acessar." />
    {formError && <div className="inline-error" role="alert">{formError}<button onClick={() => setFormError("")} aria-label="Fechar"><X size={14} /></button></div>}
    {formSuccess && <div className="team-success" role="status">{formSuccess}</div>}
    <section className="panel team-invite"><span className="invite-icon"><Users size={19} /></span><div className="invite-copy"><strong>Adicionar funcionário</strong><small>Defina usuário, senha inicial e empresas. O e-mail é opcional e serve para notificar a pessoa.</small></div><form className="invite-form staff-form" onSubmit={(event) => { event.preventDefault(); if (username.trim() && password && companyIds.length) add.mutate(); }}>
      <div className="staff-fields"><label>Usuário<input aria-label="Usuário do funcionário" autoComplete="off" required maxLength={150} value={username} onChange={(event) => setUsername(event.target.value)} /></label><label>Senha inicial<input aria-label="Senha inicial" type="password" autoComplete="new-password" required minLength={4} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} /></label><label>E-mail (opcional)<input aria-label="E-mail do funcionário" type="email" autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Papel<select aria-label="Papel do novo membro" value={role} onChange={(event) => setRole(event.target.value as "admin" | "agent")}><option value="agent">Atendente</option><option value="admin">Administrador</option></select></label></div>
      <fieldset className="staff-companies"><legend>Negócios com acesso</legend>{manageableCompanies.map((item) => <label key={item.id}><input type="checkbox" checked={companyIds.includes(item.id)} onChange={(event) => setCompanyIds((previous) => event.target.checked ? [...previous, item.id] : previous.filter((id) => id !== item.id))} /> {item.name}</label>)}</fieldset>
      <button className="button button-primary" disabled={!username.trim() || password.length < 4 || !companyIds.length || add.isPending}><Plus size={16} /> {add.isPending ? "Cadastrando…" : "Adicionar funcionário"}</button></form></section>
    <section className="panel table-panel"><div className="table-toolbar"><div><strong>Membros da empresa</strong><small>{query.data?.length ?? 0} pessoas com acesso</small></div></div>{query.isPending ? <Loading /> : query.isError ? <ErrorNotice error={query.error} retry={() => void query.refetch()} /> : query.data?.length ? <div className="table-scroll"><table><thead><tr><th>MEMBRO</th><th>USUÁRIO</th><th>E-MAIL</th><th>PAPEL</th><th>PERMISSÕES</th><th /></tr></thead><tbody>{query.data.map((member) => <tr key={member.id}><td><span className="table-person static-person"><span className="contact-avatar">{displayName(member.user).slice(0, 1).toUpperCase()}</span><strong>{displayName(member.user)}</strong></span></td><td className="subtle-cell">{member.user.username}</td><td className="subtle-cell">{member.user.email || "—"}</td><td>{member.role === "owner" ? <Badge tone="brand">Proprietário</Badge> : <select aria-label={`Papel de ${member.user.username}`} className="role-select" disabled={changeRole.isPending} value={member.role} onChange={(event) => changeRole.mutate({ member, next: event.target.value })}><option value="admin">Administrador</option><option value="agent">Atendente</option></select>}</td><td><small>{member.role === "agent" ? "Atendimento e contatos" : "Operação, equipe e configurações"}</small></td><td>{member.role !== "owner" && <button className="icon-button danger-icon" aria-label={`Remover ${member.user.username}`} disabled={remove.isPending} onClick={() => { setPendingRemoval(member); setRemoveError(""); }}><X size={16} /></button>}</td></tr>)}</tbody></table></div> : <Empty icon={Users} title="Sua equipe começa aqui" text="Cadastre um funcionário para compartilhar o atendimento." />}</section>
    {pendingRemoval && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !remove.isPending) setPendingRemoval(null); }}><section className="modal-card team-remove-modal" role="dialog" aria-modal="true" aria-labelledby="team-remove-title" onKeyDown={(event) => { if (event.key === "Escape" && !remove.isPending) setPendingRemoval(null); }}><div className="team-remove-icon"><UserX size={23} /></div><span className="eyebrow">ACESSO À EMPRESA</span><h2 id="team-remove-title">Remover da equipe?</h2><p><strong>{displayName(pendingRemoval.user)}</strong> perderá o acesso a esta empresa. O cadastro da pessoa e os acessos a outros negócios serão preservados.</p>{removeError && <div className="inline-error" role="alert">{removeError}</div>}<div className="modal-actions"><button type="button" className="button button-secondary" autoFocus disabled={remove.isPending} onClick={() => setPendingRemoval(null)}>Cancelar</button><button type="button" className="button button-danger" disabled={remove.isPending} onClick={() => remove.mutate(pendingRemoval.id)}>{remove.isPending ? "Removendo…" : "Remover acesso"}</button></div></section></div>}
  </div>;
}

function OrdersPage() {
  const { company } = useApp();
  const companyId = company?.id ?? "";
  const canDecide = roleCanManage(company?.role);
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("awaiting_approval");
  const [feedback, setFeedback] = useState("");
  const query = useQuery({
    queryKey: ["orders", companyId, status],
    queryFn: () => listOrders(companyId, status),
    enabled: !!companyId,
  });
  const decision = useMutation({
    mutationFn: ({ order, action }: { order: Order; action: "approve" | "reject" | "notify" }) =>
      decideOrder(companyId, order.id, action),
    onSuccess: async (result) => {
      setFeedback(result.customer_notice_status === "sent" ? "Decisão registrada e cliente avisado." :
        result.customer_notice_error || "Decisão registrada. Confira o estado do aviso ao cliente.");
      await queryClient.invalidateQueries({ queryKey: ["orders", companyId] });
    },
    onError: (error: unknown) => setFeedback(errorMessage(error)),
  });
  const statusLabel: Record<string, string> = {
    awaiting_approval: "Aguardando aprovação", approved: "Aprovado", rejected: "Rejeitado", cancelled: "Cancelado",
  };
  return <div className="page-stack">
    <PageTitle eyebrow="VALIDAÇÃO HUMANA" title="Pedidos" description="Pedidos preparados pela IA só são confirmados após uma decisão humana registrada." />
    <div className="filter-row"><select aria-label="Status do pedido" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos</option><option value="awaiting_approval">Aguardando aprovação</option><option value="approved">Aprovados</option><option value="rejected">Rejeitados</option><option value="cancelled">Cancelados</option></select></div>
    {feedback && <div className="settings-note">{feedback}</div>}
    {query.isPending ? <Loading /> : query.isError ? <ErrorNotice error={query.error} retry={() => void query.refetch()} /> : query.data.results.length ? <div className="number-grid">{query.data.results.map((order) => <article className="panel number-card" key={order.id}>
      <div className="number-card-head"><span className="number-icon"><ShoppingCart size={20} /></span><Badge tone={order.status === "awaiting_approval" ? "brand" : order.status === "approved" ? "green" : "neutral"}>{statusLabel[order.status]}</Badge></div>
      <span className="eyebrow">PEDIDO {order.id.slice(0, 8).toUpperCase()}</span><h2>{order.customer_name || order.customer_phone}</h2>
      {order.items.map((item, index) => <p key={`${item.name}-${index}`}>{item.quantity || "Quantidade não informada"} · {item.name}</p>)}
      {order.total && <p><strong>R$ {order.total}</strong></p>}{order.requested_for && <p>Prazo: {order.requested_for}</p>}{order.summary && <p>{order.summary}</p>}
      {order.status !== "awaiting_approval" && <p role="status">Aviso ao cliente: {order.customer_notice_status === "sent" ? "Enviado" : order.customer_notice_status === "blocked" ? "Aguardando nova janela de atendimento" : order.customer_notice_status === "failed" ? "Falhou" : order.customer_notice_status === "unknown" ? "Resultado incerto; confira a conversa" : order.customer_notice_status === "sending" ? "Enviando" : "Não enviado"}. {order.customer_notice_error}</p>}
      {canDecide && order.status === "awaiting_approval" && <div className="number-actions"><button className="button button-primary button-small" disabled={decision.isPending} onClick={() => decision.mutate({ order, action: "approve" })}><Check size={15} /> Aprovar</button><button className="button button-secondary button-small" disabled={decision.isPending} onClick={() => decision.mutate({ order, action: "reject" })}><X size={15} /> Rejeitar</button></div>}
      {canDecide && ["approved", "rejected"].includes(order.status) && ["blocked", "failed", "not_sent"].includes(order.customer_notice_status) && <button className="button button-secondary button-small" disabled={decision.isPending} onClick={() => decision.mutate({ order, action: "notify" })}>Tentar avisar cliente</button>}
      {canDecide && order.status === "approved" && <Link className="button button-secondary button-small" to={`/sales?order=${order.id}`}>Registrar venda deste pedido</Link>}
    </article>)}</div> : <div className="panel empty-panel"><Empty icon={ShoppingCart} title="Nenhum pedido neste status" text="Pedidos identificados pela IA aparecerão aqui para validação humana." /></div>}
  </div>;
}

function SettingsPage() {
  const { company, session } = useApp();
  const companyId = company?.id ?? "";
  const [copyFeedback, setCopyFeedback] = useState("");
  const [aiInstructions, setAiInstructions] = useState("");
  const [previewQuestion, setPreviewQuestion] = useState("");
  const [promptFeedback, setPromptFeedback] = useState("");
  const [enableConfirmOpen, setEnableConfirmOpen] = useState(false);
  const query = useQuery({ queryKey: queryKeys.company(companyId), queryFn: () => getCompany(companyId), enabled: !!companyId });
  const aiUsage = useQuery({ queryKey: ["ai-usage", companyId, 30], queryFn: () => getAIUsage(companyId), enabled: !!companyId });
  const queryClient = useQueryClient();
  useEffect(() => {
    if (query.data?.ai_instructions !== undefined) setAiInstructions(query.data.ai_instructions);
  }, [query.data?.ai_instructions]);
  const saveInstructions = useMutation({
    mutationFn: () => updateCompanyAIInstructions(companyId, aiInstructions.trim()),
    onSuccess: async () => {
      setPromptFeedback("Instruções salvas. As próximas respostas da IA usarão esta configuração.");
      await queryClient.invalidateQueries({ queryKey: queryKeys.company(companyId) });
    },
    onError: (error: unknown) => setPromptFeedback(errorMessage(error)),
  });
  const preview = useMutation({
    mutationFn: () => previewAI(companyId, previewQuestion.trim()),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["ai-usage", companyId] }),
  });
  const followUpToggle = useMutation({
    mutationFn: (enabled: boolean) => updateWarmFollowUpEnabled(companyId, enabled),
    onSuccess: async () => { setEnableConfirmOpen(false); await queryClient.invalidateQueries({ queryKey: queryKeys.company(companyId) }); },
    onError: (error: unknown) => setPromptFeedback(errorMessage(error)),
  });
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
    <UnitManager companyId={companyId} canManage={roleCanManage(company?.role)} />
    <section className="panel settings-card"><div className="settings-section-heading"><span className="settings-icon"><Building2 size={18} /></span><div><h2>Dados da empresa</h2><p>Identificação do espaço de trabalho.</p></div></div><div className="settings-fields"><label>Nome da empresa<input value={data.name} readOnly /></label><label>Identificador<input value={data.slug} readOnly /></label><label>Papel do usuário<input value={roleLabel[company?.role ?? "agent"]} readOnly /></label><label>Usuário<input value={session.user.username} readOnly /></label><label>ID da empresa<input value={data.id} readOnly /></label><label>Desde<input value={formatDate(data.created_at)} readOnly /></label></div><div className="settings-note"><Shield size={16} /> Os dados cadastrais são gerenciados pelo administrador do sistema.</div></section>
    <section className="panel settings-card"><div className="settings-section-heading"><span className="settings-icon"><ShoppingCart size={18} /></span><div><h2>Perfil comercial</h2><p>Produtos, serviços e configurações financeiras opcionais.</p></div></div><Link className="button button-secondary" to="/commercial-settings">Abrir configurações comerciais</Link></section>
    {company?.role === "owner" && <section className="panel settings-card"><h2>Assinatura do Gest Tech</h2><p>Consulte cobranças, vagas extras e a data de encerramento do período pago.</p><Link className="button button-secondary" to="/billing/subscriptions">Gerenciar assinatura</Link></section>}
    <section className="panel settings-card"><div className="settings-section-heading"><span className="settings-icon"><Sparkles size={18} /></span><div><h2>Integrações</h2><p>Conexões configuradas no servidor, sem exposição de credenciais.</p></div></div><div className="integration-row"><span className="integration-logo whats-logo"><MessageCircle size={19} /></span><span><strong>WhatsApp Cloud API</strong><small>Integração para envio e recebimento de mensagens.</small></span><Badge tone={data.integrations?.whatsapp_configured ? "green" : "peach"}>{data.integrations?.whatsapp_configured ? "Configurada" : "Pendente"}</Badge></div><div className="integration-row"><span className="integration-logo gemini-logo"><Sparkles size={19} /></span><span><strong>Google Gemini</strong><small>Geração de respostas e embeddings para busca RAG.</small></span><Badge tone={data.integrations?.gemini_configured ? "green" : "peach"}>{data.integrations?.gemini_configured ? "Configurada" : "Pendente"}</Badge></div></section>
    <section className="panel settings-card"><div className="settings-section-heading"><span className="settings-icon"><Sparkles size={18} /></span><div><h2>Uso da IA nos últimos 30 dias</h2><p>Consumo registrado para esta empresa.</p></div></div>{aiUsage.isPending ? <Loading /> : aiUsage.isError ? <ErrorNotice error={aiUsage.error} retry={() => void aiUsage.refetch()} /> : <><p>{aiUsage.data.calls} chamadas · {aiUsage.data.total_tokens.toLocaleString("pt-BR")} tokens · custo estimado US$ {Number(aiUsage.data.estimated_cost_usd).toFixed(4)}</p><p className="settings-note">A estimativa depende dos preços de modelo configurados no servidor; zero não significa uso gratuito.</p></>}</section>
    <section className="panel settings-card"><div className="settings-section-heading"><span className="settings-icon"><Target size={18} /></span><div><h2>Follow-up de conversas mornas</h2><p>Se o contato autorizou o retorno, a IA pode enviar uma mensagem após 20 horas sem resposta, das 9h às 18h (Brasília) e antes do limite de 24 horas do WhatsApp.</p></div></div><div className="warm-follow-up-setting"><span>Envio automático {data.warm_follow_up_enabled ? "ativado" : "desativado"}</span><button type="button" className={`button ${data.warm_follow_up_enabled ? "button-secondary" : "button-primary"}`} disabled={followUpToggle.isPending} onClick={() => data.warm_follow_up_enabled ? followUpToggle.mutate(false) : setEnableConfirmOpen(true)}>{data.warm_follow_up_enabled ? "Desativar" : "Ativar"}</button></div><p className="settings-note"><Shield size={16} /> Cada contato precisa ter consentimento registrado. O painel mostra pessoas contatadas, entregas e falhas; máximo de 20 envios por dia e um por contato a cada 7 dias.</p></section>
    {enableConfirmOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEnableConfirmOpen(false); }}><section className="modal-card warm-follow-up-confirm" role="dialog" aria-modal="true" aria-labelledby="warm-follow-up-confirm-title"><div className="modal-heading"><div><span className="eyebrow">AUTOMAÇÃO DE MENSAGENS</span><h2 id="warm-follow-up-confirm-title">Ativar follow-up automático?</h2></div><button className="icon-button" aria-label="Fechar" onClick={() => setEnableConfirmOpen(false)}><X size={18} /></button></div><p>A IA poderá enviar até 20 mensagens por dia a contatos com autorização registrada. Ela aguardará 20 horas sem resposta e respeitará o horário das 9h às 18h, em Brasília.</p><div className="modal-actions"><button type="button" className="button button-secondary" autoFocus onClick={() => setEnableConfirmOpen(false)}>Cancelar</button><button type="button" className="button button-primary" disabled={followUpToggle.isPending} onClick={() => followUpToggle.mutate(true)}>{followUpToggle.isPending ? "Ativando…" : "Confirmar ativação"}</button></div></section></div>}
    <section className="panel settings-card"><div className="settings-section-heading"><span className="settings-icon"><Sparkles size={18} /></span><div><h2>Personalidade da IA</h2><p>Defina como a IA deve atender os clientes desta empresa.</p></div></div><form className="ai-instructions-form" onSubmit={(event) => { event.preventDefault(); setPromptFeedback(""); if (aiInstructions.trim()) saveInstructions.mutate(); }}><label>Instruções de atendimento<textarea aria-label="Instruções de atendimento da IA" value={aiInstructions} maxLength={8000} rows={9} onChange={(event) => { setAiInstructions(event.target.value); setPromptFeedback(""); }} /><span className="prompt-counter">{aiInstructions.length}/8000 caracteres</span></label><div className="prompt-guidance"><strong>Como escrever um bom prompt</strong><p>Explique o papel da IA, o tipo de cliente, o tom de voz, os objetivos do atendimento e o que ela deve evitar. Não inclua senhas, tokens ou dados pessoais.</p><p>Você pode pedir a uma IA: “Crie instruções para um atendente virtual de [seu nicho], com tom [formal, acolhedor, urgente…], que deve [objetivos] e nunca deve [limites]”.</p></div><div className="prompt-actions"><button className="button button-secondary" type="button" onClick={() => { setAiInstructions(DEFAULT_AI_INSTRUCTIONS_EXAMPLE); setPromptFeedback(""); }}>Usar exemplo genérico</button><button className="button button-primary" type="submit" disabled={!aiInstructions.trim() || saveInstructions.isPending}>{saveInstructions.isPending ? "Salvando…" : "Salvar instruções"}</button></div>{promptFeedback && <small className={saveInstructions.isError ? "field-error" : "copy-feedback"} role="status">{promptFeedback}</small>}<div className="settings-note"><Shield size={16} /> Regras de segurança, isolamento entre empresas e uso exclusivo da base de conhecimento continuam protegidas pelo sistema.</div></form><form className="ai-instructions-form" onSubmit={event => { event.preventDefault(); if (previewQuestion.trim().length >= 3) preview.mutate(); }}><h3>Teste a IA antes de ativar</h3><p>Faça uma pergunta real de cliente. Este teste não envia mensagem pelo WhatsApp.</p><label>Pergunta de teste<input aria-label="Pergunta de teste da IA" minLength={3} maxLength={1000} required value={previewQuestion} onChange={event => setPreviewQuestion(event.target.value)} /></label><button className="button button-secondary" disabled={preview.isPending}>{preview.isPending ? "Gerando resposta…" : "Testar resposta"}</button>{preview.isError && <p role="alert" className="field-error">{errorMessage(preview.error)}</p>}{preview.data && <div role="status"><strong>Resposta sugerida</strong><p>{preview.data.answer}</p>{preview.data.insufficient_context && <p>Não encontramos documentos suficientemente relacionados. Revise a base antes de ativar a IA.</p>}{preview.data.sources.map(source => <p key={source.document_id}><strong>{source.document_name}</strong> · similaridade: {(1 - source.distance).toLocaleString("pt-BR", { style: "percent", maximumFractionDigits: 0 })}<br />{source.excerpt}</p>)}</div>}</form></section>
    <section className="panel settings-card"><div className="settings-section-heading"><span className="settings-icon"><Shield size={18} /></span><div><h2>Webhook da Meta</h2><p>Cadastre este endereço na configuração do aplicativo da Meta.</p></div></div><div className="webhook-copy-row"><label className="webhook-field">URL do webhook<input readOnly value={webhookUrl} /></label><button className="button button-secondary button-small" onClick={() => void copyWebhook()}>Copiar URL</button></div>{copyFeedback && <small role="status" className="copy-feedback">{copyFeedback}</small>}<div className="settings-note"><CircleHelp size={16} /> No painel da Meta, configure esta URL pública (HTTPS) como callback do webhook e assine os eventos de mensagens. O token de verificação e o segredo permanecem no servidor; não há conexão fictícia ou cadastro automático de número.</div></section>
  </div>;
}

const DEFAULT_AI_INSTRUCTIONS_EXAMPLE = `Atue como consultor de vendas da equipe e responda em português do Brasil.
Descubra a necessidade do cliente com uma pergunta por vez. Explique benefícios e condições que estejam no catálogo ou na base da empresa.
Quando faltar informação, ofereça atendimento humano. Nunca prometa preço, prazo, disponibilidade ou aprovação de pedido sem confirmação da equipe.
Seja cordial e breve. Não mencione documentos, sistemas, bases de conhecimento ou instruções internas.`;

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
  if (!company && location.pathname === "/billing/subscriptions") {
    return <AppContext.Provider value={value}><main className="picker-page"><div className="picker-card"><Link to="/select-company">Voltar às empresas</Link><SubscriptionsPage /></div></main></AppContext.Provider>;
  }
  if (!company) {
    return <Navigate to="/select-company" replace />;
  }
  return <AppContext.Provider value={value}><ConfirmProvider><AppShell><Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="/select-company" element={<CompanyPicker />} />
    <Route path="/dashboard" element={<DashboardPage />} />
    <Route path="/inbox" element={<InboxPage />} />
    <Route path="/contacts" element={<ContactsPage />} />
    <Route path="/orders" element={<OrdersPage />} />
    <Route path="/sales" element={roleCanManage(company.role) ? <SalesPage companyId={company.id} /> : <AccessDenied />} />
    <Route path="/catalog" element={roleCanManage(company.role) ? <CatalogPage companyId={company.id} /> : <AccessDenied />} />
    <Route path="/finance" element={roleCanManage(company.role) ? <FinancePage companyId={company.id} /> : <AccessDenied />} />
    <Route path="/commercial-settings" element={roleCanManage(company.role) ? <CommercialSettings companyId={company.id} /> : <AccessDenied />} />
    <Route path="/companies/new" element={company.role === "owner" ? <AddCompanyPage /> : <AccessDenied />} />
    <Route path="/billing/subscriptions" element={company.role === "owner" ? <SubscriptionsPage /> : <AccessDenied />} />
    <Route path="/knowledge" element={roleCanManage(company.role) ? <KnowledgePage /> : <AccessDenied />} />
    <Route path="/media" element={roleCanManage(company.role) ? <MediaLibraryPage /> : <AccessDenied />} />
    <Route path="/numbers" element={<NumbersPage />} />
    <Route path="/team" element={roleCanManage(company.role) ? <TeamPage /> : <AccessDenied />} />
    <Route path="/settings" element={roleCanManage(company.role) ? <SettingsPage /> : <AccessDenied />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes></AppShell></ConfirmProvider></AppContext.Provider>;
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
  const publicPage = ["/", "/signup", "/checkout/status", "/verify-email", "/invite/accept"].includes(location.pathname);
  const shouldCheckSession = !publicPage && (location.pathname !== "/login" || !!cachedSession);
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
  if (publicPage) return <Routes><Route path="/" element={<LandingPage />} /><Route path="/signup" element={<SignupPage />} /><Route path="/checkout/status" element={<CheckoutStatusPage />} /><Route path="/verify-email" element={<VerifyEmailPage />} /><Route path="/invite/accept" element={<TeamInviteAcceptPage />} /></Routes>;
  if (location.pathname === "/login" && !sessionQuery.data) return <LoginPage />;
  if (sessionQuery.isPending) return <div className="full-loading"><Loading label="Preparando seu espaço…" /></div>;
  if (sessionQuery.isError && !isSessionExpiredError(sessionQuery.error)) {
    return <div className="full-loading"><ErrorNotice error={sessionQuery.error} retry={() => void sessionQuery.refetch()} /></div>;
  }
  if (!sessionQuery.data) return <Routes><Route path="*" element={<Navigate to="/login" replace />} /></Routes>;
  if (sessionQuery.data.user.must_change_password) return <InitialPasswordPage session={sessionQuery.data} />;
  return <Routes><Route path="/login" element={<Navigate to="/dashboard" replace />} /><Route path="*" element={<ProtectedApp session={sessionQuery.data} />} /></Routes>;
}

const EMPTY_CONVERSATIONS: Conversation[] = [];
const EMPTY_BASES: KnowledgeBase[] = [];
