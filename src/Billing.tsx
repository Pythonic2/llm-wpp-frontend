import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { companyPath, errorMessage, getSession, http } from "./api";
import "./billing.css";

type BillingProfile = { full_name: string; cpf_cnpj: string; mobile_phone: string; postal_code: string; address: string; address_number: string; complement: string; province: string; city_name: string; state: string };
type Checkout = { id: string; status_token: string; status: string; kind: string; amount: string; checkout_url: string };
type CheckoutStatus = { status: string; kind: string; amount: string; checkout_url: string; can_login: boolean; email_verified: boolean };
type Quota = { company_status: string; included_numbers: number; paid_extra_numbers: number; number_capacity: number | null; active_numbers: number; extra_number_price: string; can_purchase: boolean };
type PublicPrices = { first_company_price: string; extra_company_price: string; extra_number_price: string; included_numbers: number; included_business_units: number };
type Subscription = { id: string; company_id: string; company_name: string; kind: string; status: string; amount: string; cancel_requested_at: string | null; cancel_confirmed_at: string | null; access_until: string | null; cancel_error: string; can_cancel: boolean };
const blankProfile: BillingProfile = { full_name: "", cpf_cnpj: "", mobile_phone: "", postal_code: "", address: "", address_number: "", complement: "", province: "", city_name: "", state: "" };
const billingSandbox = import.meta.env.VITE_BILLING_SANDBOX === "true";
function SandboxBanner() {
  return billingSandbox ? <div className="billing-sandbox-banner" role="status">Ambiente de testes: pagamentos simulados no Asaas. Nenhuma cobrança real será feita.</div> : null;
}
function PriceUnavailable({ retry }: { retry: () => void }) {
  return <main className="billing-status-page"><div className="billing-status-card"><h1>Preço indisponível</h1><p role="alert">Não foi possível consultar o preço atual. Tente novamente antes de iniciar uma contratação.</p><button className="button button-primary" onClick={retry}>Tentar novamente</button></div></main>;
}
const price = (value: string | number) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const key = () => crypto.randomUUID();
const goCheckout = (checkout: Checkout, navigate: ReturnType<typeof useNavigate>) => {
  sessionStorage.setItem("gesttech-pending-checkout", checkout.status_token);
  if (checkout.checkout_url) window.location.assign(checkout.checkout_url);
  else navigate(`/checkout/status?token=${checkout.status_token}`);
};
const profileFields: Array<{ name: keyof BillingProfile; label: string; placeholder?: string; autoComplete?: string }> = [
  { name: "full_name", label: "Nome completo ou razão social", autoComplete: "name" },
  { name: "cpf_cnpj", label: "CPF ou CNPJ", placeholder: "Somente seus dados de cobrança" },
  { name: "mobile_phone", label: "Celular com DDD", autoComplete: "tel" },
  { name: "postal_code", label: "CEP", autoComplete: "postal-code" },
  { name: "address", label: "Rua ou avenida", autoComplete: "street-address" },
  { name: "address_number", label: "Número" },
  { name: "complement", label: "Complemento (opcional)" },
  { name: "province", label: "Bairro" },
  { name: "city_name", label: "Cidade" },
  { name: "state", label: "UF", placeholder: "SP" },
];
function ProfileFields({ value, onChange }: { value: BillingProfile; onChange: (value: BillingProfile) => void }) {
  return <div className="billing-form-grid">{profileFields.map(field => <label key={field.name}>{field.label}<input required={field.name !== "complement"} maxLength={field.name === "state" ? 2 : undefined} placeholder={field.placeholder} autoComplete={field.autoComplete} value={value[field.name]} onChange={e => onChange({ ...value, [field.name]: e.target.value })} /></label>)}</div>;
}

async function registerSignup(values: BillingProfile & { company_name: string; email: string; password: string }) {
  return (await http.post<Checkout>("/public/signup/", values)).data;
}
async function getCheckoutStatus(token: string) { return (await http.get<CheckoutStatus>(`/public/checkouts/${encodeURIComponent(token)}/`)).data; }
async function confirmEmail(token: string) { return (await http.post("/public/verify-email/", { token })).data; }
async function resendEmail(email: string) { return (await http.post("/public/resend-email/", { email })).data; }
async function getBillingProfileStatus() { return (await http.get<{ configured: boolean; email_required: boolean }>("/billing/profile/status/")).data; }
async function getPublicPrices() { return (await http.get<PublicPrices>("/public/prices/")).data; }
async function listSubscriptions() { return (await http.get<Subscription[]>("/billing/subscriptions/")).data; }
async function cancelSubscription(id: string) { return (await http.post(`/billing/subscriptions/${id}/cancel/`)).data; }

export function SubscriptionsPage() {
  const cache = useQueryClient();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const subscriptions = useQuery({ queryKey: ["billing-subscriptions"], queryFn: listSubscriptions });
  const cancel = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: async () => { setConfirmId(null); setFeedback("Renovação encerrada. O acesso continua até o fim do período pago exibido abaixo."); await cache.invalidateQueries({ queryKey: ["billing-subscriptions"] }); },
    onError: error => setFeedback(errorMessage(error)),
  });
  return <div className="page-stack"><div className="commercial-heading"><div><small>COBRANÇA</small><h1>Minhas assinaturas</h1><p>Confira suas recorrências e encerre a renovação ao fim do período pago.</p></div></div>{feedback && <p role="status" className="settings-note">{feedback}</p>}{subscriptions.isPending ? <p>Carregando assinaturas…</p> : subscriptions.isError ? <p role="alert">{errorMessage(subscriptions.error)}</p> : subscriptions.data.length ? subscriptions.data.map(item => <section className="panel settings-card" key={item.id}><h2>{item.company_name}</h2><p>{item.kind === "extra_number" ? "Vaga adicional de WhatsApp" : "Assinatura da empresa"} · {price(item.amount)}/mês</p><p>Estado: {item.cancel_confirmed_at ? "Renovação encerrada" : item.cancel_requested_at ? "Cancelamento em conciliação" : item.status === "paid" ? "Ativa" : "Encerrada"}</p>{item.access_until && <p>Acesso pago até {new Date(item.access_until).toLocaleString("pt-BR")}</p>}{item.cancel_error && <p role="alert">{item.cancel_error}</p>}{item.can_cancel && (confirmId === item.id ? <div><p>Confirma encerrar as próximas cobranças desta assinatura? O acesso pago permanece até a data informada pelo Asaas.</p><button className="button button-secondary" onClick={() => setConfirmId(null)} disabled={cancel.isPending}>Voltar</button><button className="button button-danger" onClick={() => cancel.mutate(item.id)} disabled={cancel.isPending}>{cancel.isPending ? "Cancelando…" : "Confirmar cancelamento"}</button></div> : <button className="button button-secondary" onClick={() => { setFeedback(""); setConfirmId(item.id); }}>Encerrar renovação</button>)}</section>) : <p>Nenhuma assinatura encontrada para este proprietário.</p>}</div>;
}
async function createExtraCompany(companyName: string, profile?: BillingProfile, billingEmail?: string, requestKey = key()) {
  return (await http.post<Checkout>("/billing/extra-company/", { company_name: companyName, ...(profile && { billing_profile: profile }), ...(billingEmail && { billing_email: billingEmail }) }, { headers: { "Idempotency-Key": requestKey } })).data;
}
async function getBillingQuota(companyId: string) { return (await http.get<Quota>(companyPath(companyId, "billing/quota/"))).data; }
async function buyExtraNumber(companyId: string, profile?: BillingProfile, billingEmail?: string, requestKey = key()) {
  return (await http.post<Checkout>(companyPath(companyId, "billing/extra-number/"), { ...(profile && { billing_profile: profile }), ...(billingEmail && { billing_email: billingEmail }) }, { headers: { "Idempotency-Key": requestKey } })).data;
}

export function LandingPage() {
  const prices = useQuery({ queryKey: ["public-prices"], queryFn: getPublicPrices, staleTime: 60_000 });
  if (prices.isError) return <PriceUnavailable retry={() => void prices.refetch()} />;
  return <main className="billing-landing"><SandboxBanner /><header className="billing-header"><Link to="/" className="billing-brand">gest<span>tech</span></Link><nav><a href="#como-funciona">Como funciona</a><Link to="/login">Já tenho conta</Link><Link className="button button-primary" to="/signup">Começar agora</Link></nav></header><div className="billing-hero"><div><span className="billing-kicker">VENDAS CONSULTIVAS PELO WHATSAPP</span><h1>Atenda melhor. <em>Venda com clareza.</em></h1><p>Converse com cada cliente no WhatsApp, entenda sua necessidade com apoio da IA e acompanhe pedidos e vendas em um só lugar. Sua equipe mantém a decisão comercial.</p><div className="billing-hero-actions"><Link className="button button-primary" to="/signup">Criar minha conta</Link><Link className="button button-secondary" to="/login">Entrar no CRM</Link></div><small>Cadastro online · pagamento seguro pelo Asaas · dois números incluídos</small></div><aside className="billing-price-card"><span>PLANO MENSAL</span><strong>{prices.data ? price(prices.data.first_company_price) : "Consultando preço"}<small>/mês</small></strong><p>Uma empresa com até {prices.data?.included_business_units ?? 2} unidades de negócio e {prices.data?.included_numbers ?? 2} números de WhatsApp.</p><ul><li>IA para qualificação e atendimento humano</li><li>Catálogo de produtos e serviços</li><li>Pedidos, vendas e alertas operacionais</li><li>Checkout recorrente no cartão</li></ul><Link className="button button-primary" to="/signup">Começar minha assinatura</Link></aside></div><section id="como-funciona" className="billing-steps"><h2>Comece em três passos</h2><div><article><b>1</b><h3>Crie sua conta</h3><p>Informe seus dados, endereço e o nome do negócio.</p></article><article><b>2</b><h3>Assine com segurança</h3><p>Conclua o pagamento na página hospedada pelo Asaas.</p></article><article><b>3</b><h3>Ative seu espaço</h3><p>Depois da confirmação, acesse o CRM e conecte seu WhatsApp.</p></article></div></section><footer>Gest Tech · Vendas consultivas pelo WhatsApp com controle da sua equipe.</footer></main>;
}

export function SignupPage() {
  const navigate = useNavigate();
  const prices = useQuery({ queryKey: ["public-prices"], queryFn: getPublicPrices, staleTime: 60_000 });
  const [profile, setProfile] = useState<BillingProfile>(blankProfile);
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const signup = useMutation({ mutationFn: () => registerSignup({ ...profile, company_name: companyName, email, password }), onSuccess: checkout => goCheckout(checkout, navigate), onError: e => setError(errorMessage(e)) });
  if (prices.isError) return <PriceUnavailable retry={() => void prices.refetch()} />;
  return <main className="billing-form-page"><SandboxBanner /><div className="billing-form-wrap"><div className="billing-form-heading"><Link to="/" className="billing-brand">gest<span>tech</span></Link><span>CADASTRO DE EMPRESA</span><h1>Crie seu espaço no Gest Tech</h1><p>Assinatura de {prices.data ? price(prices.data.first_company_price) : "valor em consulta"}/mês, com dois números de WhatsApp. Sua conta é liberada após a confirmação do pagamento e do e-mail.</p></div><form onSubmit={(e: FormEvent) => { e.preventDefault(); setError(""); signup.mutate(); }}><section><h2>Seu acesso</h2><div className="billing-form-grid"><label>E-mail<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label><label>Senha<input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label><label className="billing-span">Nome da empresa ou negócio<input required maxLength={160} value={companyName} onChange={e => setCompanyName(e.target.value)} /></label></div></section><section><h2>Dados de cobrança</h2><p>Usados para criar seu cliente no Asaas. O pagamento acontece no ambiente seguro do Asaas.</p><ProfileFields value={profile} onChange={setProfile} /></section>{error && <p className="billing-error" role="alert">{error}</p>}<div className="billing-form-actions"><Link to="/login">Já tenho conta</Link><button className="button button-primary" disabled={signup.isPending || !prices.data}>{signup.isPending ? "Preparando pagamento…" : "Continuar para pagamento"}</button></div></form></div></main>;
}

export function CheckoutStatusPage() {
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const token = params.get("token") || sessionStorage.getItem("gesttech-pending-checkout") || "";
  const checkout = useQuery({ queryKey: ["billing-checkout-status", token], queryFn: () => getCheckoutStatus(token), enabled: !!token, refetchInterval: query => query.state.data?.status === "pending" ? 5000 : false });
  const data = checkout.data;
  const refreshSession = async () => { await queryClient.invalidateQueries({ queryKey: ["session"] }); await getSession().then(session => queryClient.setQueryData(["session"], session)).catch(() => undefined); };
  return <main className="billing-status-page"><SandboxBanner /><div className="billing-status-card"><Link to="/" className="billing-brand">gest<span>tech</span></Link>{!token ? <><h1>Compra não encontrada</h1><p>Abra o link recebido ao iniciar sua assinatura.</p><Link className="button button-secondary" to="/">Voltar ao início</Link></> : checkout.isError ? <><h1>Não foi possível consultar</h1><p>{errorMessage(checkout.error)}</p><button className="button button-secondary" onClick={() => void checkout.refetch()}>Tentar novamente</button></> : !data ? <p>Consultando o pagamento…</p> : data.status === "paid" ? <><span className="billing-success-icon">✓</span><h1>Pagamento confirmado</h1>{data.kind === "first_company" && !data.email_verified ? <><p>Pagamento confirmado. Para liberar a conta, confirme o link enviado ao seu e-mail.</p><Link className="button button-secondary" to="/verify-email">Reenviar confirmação</Link></> : <><p>Seu acesso foi liberado. Entre com o e-mail e a senha cadastrados.</p><Link className="button button-primary" to={data.can_login ? "/login" : "/dashboard"} onClick={() => { void refreshSession(); }}>Acessar o Gest Tech</Link></>}</> : data.status === "pending" ? <><h1>Aguardando pagamento</h1><p>O acesso será liberado assim que o Asaas confirmar o pagamento. Esta página atualiza automaticamente.</p><strong>{price(data.amount)}/mês</strong>{data.checkout_url && <a className="button button-primary" href={data.checkout_url}>Ir para o pagamento seguro</a>}<button className="button button-secondary" onClick={() => void checkout.refetch()}>Atualizar situação</button></> : <><h1>Compra em análise</h1><p>{data.status === "review" ? "Precisamos conciliar esta tentativa antes de iniciar outra cobrança. Contate o suporte." : "Este checkout foi cancelado ou expirou. Inicie uma nova compra para continuar."}</p><Link className="button button-secondary" to="/">Voltar ao início</Link></>}</div></main>;
}

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [email, setEmail] = useState("");
  const confirm = useMutation({ mutationFn: () => confirmEmail(token) });
  const resend = useMutation({ mutationFn: () => resendEmail(email) });
  return <main className="billing-status-page"><SandboxBanner /><div className="billing-status-card"><Link to="/" className="billing-brand">gest<span>tech</span></Link><h1>Confirme seu e-mail</h1><p>Precisamos confirmar que este endereço pertence a você antes de liberar o acesso ao CRM.</p>{token && !confirm.isSuccess && <><button className="button button-primary" disabled={confirm.isPending} onClick={() => confirm.mutate()}>{confirm.isPending ? "Confirmando…" : "Confirmar meu e-mail"}</button>{confirm.isError && <p className="billing-error" role="alert">{errorMessage(confirm.error)}</p>}</>}{confirm.isSuccess && <><p>E-mail confirmado. Se o pagamento já foi aprovado, sua conta está disponível.</p><Link className="button button-primary" to="/checkout/status">Consultar pagamento</Link></>}<form onSubmit={e => { e.preventDefault(); resend.mutate(); }}><label>E-mail do cadastro<input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label><button className="button button-secondary" disabled={resend.isPending}>Reenviar link</button></form>{resend.isSuccess && <p>Se houver um cadastro pendente, enviaremos um novo link.</p>}{resend.isError && <p className="billing-error" role="alert">{errorMessage(resend.error)}</p>}</div></main>;
}

export function AddCompanyPage() {
  const navigate = useNavigate();
  const prices = useQuery({ queryKey: ["public-prices"], queryFn: getPublicPrices, staleTime: 60_000 });
  const profileStatus = useQuery({ queryKey: ["billing-profile-status"], queryFn: getBillingProfileStatus });
  const [profile, setProfile] = useState<BillingProfile>(blankProfile);
  const [companyName, setCompanyName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [requestKey, setRequestKey] = useState(key);
  const [error, setError] = useState("");
  const purchase = useMutation({ mutationFn: () => createExtraCompany(companyName, profileStatus.data?.configured ? undefined : profile, billingEmail, requestKey), onSuccess: checkout => goCheckout(checkout, navigate), onError: e => setError(errorMessage(e)) });
  if (prices.isError) return <PriceUnavailable retry={() => void prices.refetch()} />;
  return <div className="page-stack billing-add-company"><SandboxBanner /><div className="commercial-heading"><div><small>MAIS UM ESPAÇO</small><h1>Adicionar empresa</h1><p>Uma nova empresa terá contatos, arquivos, IA e números próprios.</p></div></div><div className="panel billing-add-panel"><strong>{prices.data ? price(prices.data.extra_company_price) : "valor em consulta"}/mês por empresa adicional</strong><p>O novo espaço aparece na sua lista depois da confirmação do pagamento.</p><form onSubmit={e => { e.preventDefault(); setError(""); purchase.mutate(); }}><label>Nome da nova empresa<input required value={companyName} onChange={e => { setCompanyName(e.target.value); setRequestKey(key()); }} /></label>{profileStatus.data && !profileStatus.data.configured && <><h2>Dados de cobrança</h2><ProfileFields value={profile} onChange={value => { setProfile(value); setRequestKey(key()); }} /></>}{profileStatus.data?.email_required && <label>E-mail de cobrança<input required type="email" autoComplete="email" value={billingEmail} onChange={e => { setBillingEmail(e.target.value); setRequestKey(key()); }} /></label>}{error && <p className="billing-error" role="alert">{error}</p>}<div className="billing-form-actions"><Link className="button button-secondary" to="/dashboard">Voltar</Link><button className="button button-primary" disabled={purchase.isPending || profileStatus.isLoading || !prices.data}>{purchase.isPending ? "Preparando…" : "Continuar para pagamento"}</button></div></form></div></div>;
}

export function ExtraNumberPurchase({ companyId }: { companyId: string }) {
  const navigate = useNavigate();
  const quota = useQuery({ queryKey: ["billing-quota", companyId], queryFn: () => getBillingQuota(companyId) });
  const profileStatus = useQuery({ queryKey: ["billing-profile-status"], queryFn: getBillingProfileStatus });
  const [profile, setProfile] = useState<BillingProfile>(blankProfile);
  const [billingEmail, setBillingEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [requestKey, setRequestKey] = useState(key);
  const purchase = useMutation({ mutationFn: () => buyExtraNumber(companyId, profileStatus.data?.configured ? undefined : profile, billingEmail, requestKey), onSuccess: checkout => goCheckout(checkout, navigate), onError: e => setError(errorMessage(e)) });
  if (!quota.data || quota.data.number_capacity === null) return null;
  return <section className="panel billing-quota"><SandboxBanner /><div><strong>Números de WhatsApp</strong><p>{quota.data.active_numbers} de {quota.data.number_capacity} vagas em uso · 2 incluídas no plano</p></div>{quota.data.can_purchase && <button className="button button-secondary" onClick={() => { setOpen(true); setRequestKey(key()); }}>Adicionar vaga · {price(quota.data.extra_number_price)}/mês</button>}{open && <div className="commercial-overlay"><form className="commercial-dialog billing-number-dialog" onSubmit={e => { e.preventDefault(); setError(""); purchase.mutate(); }}><h2>Contratar número adicional</h2><p>Cada vaga extra custa {price(quota.data.extra_number_price)}/mês na assinatura desta empresa. A conexão do número será permitida após o pagamento.</p>{profileStatus.data && !profileStatus.data.configured && <ProfileFields value={profile} onChange={value => { setProfile(value); setRequestKey(key()); }} />}{profileStatus.data?.email_required && <label>E-mail de cobrança<input required type="email" autoComplete="email" value={billingEmail} onChange={e => { setBillingEmail(e.target.value); setRequestKey(key()); }} /></label>}{error && <p className="billing-error" role="alert">{error}</p>}<div className="billing-form-actions"><button type="button" className="button button-secondary" onClick={() => setOpen(false)}>Voltar</button><button className="button button-primary" disabled={purchase.isPending || profileStatus.isLoading}>Ir para pagamento</button></div></form></div>}</section>;
}
