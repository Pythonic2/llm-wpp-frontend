import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { createContact, errorMessage, getCompany, http, listContacts, listConversations, listMediaAssets, listMembers, listOrders, companyPath } from "./api";
import type { Membership } from "./types";
import {
  cancelSale, correctSaleAttribution, createCategory, createSale, downloadReport, getFinanceDashboard,
  listCatalog, listCategories, listPaymentMethods, listSales, recordSalePayment,
  saveCatalogItem, savePaymentMethod, type CatalogItem, type Breakdown, type Sale,
} from "./commercialApi";
import "./commercial.css";

type Props = { companyId: string };
const money = (value: string | number | null | undefined) => value == null ? "—" : Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const day = (value: string) => new Date(value).toLocaleDateString("pt-BR");
const nowInput = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
const iso = (value: string) => new Date(value).toISOString();
const key = () => crypto.randomUUID();
const kindLabel = { product: "Produto", service: "Serviço" };
const attributionLabel = { ai_assisted: "Assistida pela IA", human: "Atendimento humano", external: "Externa", unknown: "Não identificada" };
const statusLabel = { confirmed: "Confirmada", cancelled: "Cancelada" };
const wrap = (error: unknown) => <p className="commercial-error" role="alert">{errorMessage(error)}</p>;

function Section({ title, children }: { title: string; children: ReactNode }) { return <section className="panel commercial-section"><h2>{title}</h2>{children}</section>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="commercial-field"><span>{label}</span>{children}</label>; }

export function CatalogPage({ companyId }: Props) {
  const cache = useQueryClient();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<Partial<CatalogItem> | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [feedback, setFeedback] = useState("");
  const items = useQuery({ queryKey: ["commercial-catalog", companyId, search], queryFn: () => listCatalog(companyId, { search, page_size: 100 }) });
  const categories = useQuery({ queryKey: ["commercial-categories", companyId], queryFn: () => listCategories(companyId) });
  const media = useQuery({ queryKey: ["commercial-media", companyId], queryFn: () => listMediaAssets(companyId, { page_size: 100 }) });
  const company = useQuery({ queryKey: ["company", companyId], queryFn: () => getCompany(companyId) });
  const save = useMutation({ mutationFn: () => saveCatalogItem(companyId, {
    name: form?.name?.trim(), kind: form?.kind || "service", category: form?.category || null,
    description: form?.description || "", price_mode: form?.price_mode || "quote",
    sale_price: form?.price_mode === "quote" || !form?.sale_price ? null : form.sale_price,
    promotional_price: form?.promotional_price || null, unit_cost: form?.unit_cost || null,
    unit: form?.unit || "unidade", billing_unit: form?.billing_unit || "", sku: form?.sku || "",
    availability: form?.availability || "", duration_minutes: form?.duration_minutes || null,
    internal_notes: form?.internal_notes || "", is_active: form?.is_active ?? true,
    variants: form?.variants || [], media_assets: form?.media_assets || [],
  }, form?.id), onSuccess: async () => { setForm(null); setFeedback("Item salvo."); await cache.invalidateQueries({ queryKey: ["commercial-catalog", companyId] }); }, onError: e => setFeedback(errorMessage(e)) });
  const addCategory = useMutation({ mutationFn: () => createCategory(companyId, categoryName.trim()), onSuccess: async () => { setCategoryName(""); await cache.invalidateQueries({ queryKey: ["commercial-categories", companyId] }); }, onError: e => setFeedback(errorMessage(e)) });
  return <div className="page-stack commercial-page">
    <div className="commercial-heading"><div><small>GESTÃO COMERCIAL</small><h1>Catálogo</h1><p>Cadastre produtos e serviços sem exigir estoque ou custos.</p></div><button className="button button-primary" onClick={() => { setFeedback(""); setForm({ kind: company.data?.business_profile === "products" ? "product" : "service", price_mode: "quote", is_active: true, unit: "unidade" }); }}>Novo item</button></div>
    <Section title="Categorias"><div className="commercial-inline"><input aria-label="Nova categoria" placeholder="Nome da categoria" value={categoryName} onChange={e => setCategoryName(e.target.value)} /><button className="button button-secondary" disabled={!categoryName.trim() || addCategory.isPending} onClick={() => addCategory.mutate()}>Adicionar</button></div><div className="commercial-tags">{categories.data?.map(c => <span key={c.id}>{c.name}</span>)}</div></Section>
    <Section title="Itens"><div className="commercial-inline"><input aria-label="Buscar catálogo" placeholder="Buscar produto ou serviço" value={search} onChange={e => setSearch(e.target.value)} /></div>{items.isError && wrap(items.error)}{items.isLoading && <p>Carregando catálogo…</p>}{items.data && <div className="commercial-table-wrap"><table className="commercial-table"><thead><tr><th>Item</th><th>Tipo</th><th>Preço público</th><th>Status</th><th></th></tr></thead><tbody>{items.data.results.map(item => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.description}</small></td><td>{kindLabel[item.kind]}</td><td>{item.price_mode === "quote" ? "Sob orçamento" : `${item.price_mode === "from" ? "A partir de " : ""}${money(item.promotional_price || item.sale_price)}`}</td><td>{item.is_active ? "Ativo" : "Inativo"}</td><td><button className="button button-secondary button-small" onClick={() => { setFeedback(""); setForm(item); }}>Editar</button></td></tr>)}</tbody></table>{!items.data.results.length && <p className="commercial-empty">Nenhum item encontrado. Cadastre o primeiro para apresentar sua oferta à IA.</p>}</div>}</Section>
    {form && <div className="commercial-overlay" role="presentation"><form className="commercial-dialog" onSubmit={e => { e.preventDefault(); setFeedback(""); save.mutate(); }}><div className="commercial-dialog-head"><h2>{form.id ? "Editar item" : "Novo item"}</h2><button type="button" aria-label="Fechar" onClick={() => setForm(null)}>×</button></div><div className="commercial-form-grid">
      <Field label="Nome"><input required value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
      <Field label="Tipo"><select value={form.kind || "service"} onChange={e => setForm({ ...form, kind: e.target.value as CatalogItem["kind"] })}><option value="product">Produto</option><option value="service">Serviço</option></select></Field>
      <Field label="Categoria (opcional)"><select value={form.category || ""} onChange={e => setForm({ ...form, category: e.target.value ? Number(e.target.value) : null })}><option value="">Sem categoria</option>{categories.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <Field label="Modo de preço"><select value={form.price_mode || "quote"} onChange={e => setForm({ ...form, price_mode: e.target.value as CatalogItem["price_mode"] })}><option value="quote">Sob orçamento</option><option value="fixed">Fixo</option><option value="from">A partir de</option></select></Field>
      {form.price_mode !== "quote" && <Field label="Preço de venda"><input type="number" min="0" step="0.01" required value={form.sale_price || ""} onChange={e => setForm({ ...form, sale_price: e.target.value })} /></Field>}
      <Field label="Preço promocional (opcional)"><input type="number" min="0" step="0.01" disabled={form.price_mode === "quote"} value={form.promotional_price || ""} onChange={e => setForm({ ...form, promotional_price: e.target.value })} /></Field>
      <Field label="Custo unitário (opcional, privado)"><input type="number" min="0" step="0.01" value={form.unit_cost || ""} onChange={e => setForm({ ...form, unit_cost: e.target.value })} /></Field>
      <Field label="Unidade"><input value={form.unit || ""} onChange={e => setForm({ ...form, unit: e.target.value })} /></Field>
      <Field label="Unidade de cobrança (opcional)"><input placeholder="hora, sessão, pacote…" value={form.billing_unit || ""} onChange={e => setForm({ ...form, billing_unit: e.target.value })} /></Field>
      <Field label="SKU (opcional)"><input value={form.sku || ""} onChange={e => setForm({ ...form, sku: e.target.value })} /></Field>
      <Field label="Disponibilidade (opcional)"><input value={form.availability || ""} onChange={e => setForm({ ...form, availability: e.target.value })} /></Field>
      {form.kind === "service" && <Field label="Duração em minutos (opcional)"><input type="number" min="0" value={form.duration_minutes || ""} onChange={e => setForm({ ...form, duration_minutes: e.target.value ? Number(e.target.value) : null })} /></Field>}
      <Field label="Descrição pública"><textarea value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
      <Field label="Variações (opcional, uma por linha)"><textarea value={(form.variants || []).join("\n")} onChange={e => setForm({ ...form, variants: e.target.value.split("\n").map(x => x.trim()).filter(Boolean) })} /></Field>
      <Field label="Mídias vinculadas (opcional)"><select multiple value={form.media_assets || []} onChange={e => setForm({ ...form, media_assets: Array.from(e.target.selectedOptions, x => x.value) })}>{media.data?.results.map(asset => <option key={asset.id} value={asset.id}>{asset.name} · {asset.file_type}</option>)}</select><small>Use Ctrl ou Cmd para selecionar várias.</small></Field>
      <Field label="Observações internas"><textarea value={form.internal_notes || ""} onChange={e => setForm({ ...form, internal_notes: e.target.value })} /></Field>
      <Field label="Situação"><select value={form.is_active === false ? "inactive" : "active"} onChange={e => setForm({ ...form, is_active: e.target.value === "active" })}><option value="active">Ativo</option><option value="inactive">Inativo</option></select></Field>
    </div>{feedback && <p role="status" className="commercial-error">{feedback}</p>}<div className="commercial-dialog-actions"><button type="button" className="button button-secondary" onClick={() => setForm(null)}>Voltar</button><button className="button button-primary" disabled={save.isPending}>Salvar item</button></div></form></div>}
    {!form && feedback && <p role="status">{feedback}</p>}
  </div>;
}

type DraftLine = { catalog_item_id: string; name: string; kind: "product" | "service"; quantity: string; unit_price: string; unit_cost: string; discount_amount: string };
const emptyLine = (): DraftLine => ({ catalog_item_id: "", name: "", kind: "service", quantity: "1", unit_price: "", unit_cost: "", discount_amount: "0" });
export function SalesPage({ companyId }: Props) {
  const cache = useQueryClient();
  const [params] = useSearchParams();
  const [newSale, setNewSale] = useState(false);
  const [contactId, setContactId] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [conversationId, setConversationId] = useState(params.get("conversation") || "");
  const [orderId, setOrderId] = useState("");
  const [responsibleId, setResponsibleId] = useState("");
  const [soldAt, setSoldAt] = useState(nowInput);
  const [discount, setDiscount] = useState("0");
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [expenses, setExpenses] = useState<{ name: string; amount: string }[]>([]);
  const [expensesComplete, setExpensesComplete] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [selected, setSelected] = useState<Sale | null>(null);
  const [paymentKind, setPaymentKind] = useState<"receipt" | "refund">("receipt");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [receiptId, setReceiptId] = useState("");
  const [paymentAt, setPaymentAt] = useState(nowInput);
  const [status, setStatus] = useState("");
  const sales = useQuery({ queryKey: ["commercial-sales", companyId, status], queryFn: () => listSales(companyId, { ...(status ? { status } : {}), page_size: 100 }) });
  const contacts = useQuery({ queryKey: ["commercial-contacts", companyId], queryFn: () => listContacts(companyId, { page_size: 100 }) });
  const conversations = useQuery({ queryKey: ["commercial-conversations", companyId], queryFn: () => listConversations(companyId, { page_size: 100 }) });
  const orders = useQuery({ queryKey: ["commercial-orders", companyId], queryFn: () => listOrders(companyId, "approved") });
  const members = useQuery({ queryKey: ["commercial-members", companyId], queryFn: () => listMembers(companyId) });
  const catalog = useQuery({ queryKey: ["commercial-catalog", companyId, ""], queryFn: () => listCatalog(companyId, { page_size: 100 }) });
  const methods = useQuery({ queryKey: ["commercial-methods", companyId], queryFn: () => listPaymentMethods(companyId) });
  const selectedContact = useMemo(() => contacts.data?.results.find(c => String(c.id) === contactId), [contacts.data, contactId]);
  const relatedConversations = conversations.data?.results.filter(c => c.contact.id === Number(contactId)) || [];
  const relatedOrders = orders.data?.results.filter(o => o.conversation === Number(conversationId)) || [];
  const total = Math.max(0, lines.reduce((sum, line) => sum + (Number(line.quantity) * Number(line.unit_price) - Number(line.discount_amount)), 0) - Number(discount));
  useEffect(() => {
    const requested = params.get("conversation");
    const found = conversations.data?.results.find(c => String(c.id) === requested);
    if (found && !contactId) { setContactId(String(found.contact.id)); setConversationId(String(found.id)); }
  }, [params, conversations.data, contactId]);
  const invalidate = async () => { await cache.invalidateQueries({ queryKey: ["commercial-sales", companyId] }); await cache.invalidateQueries({ queryKey: ["commercial-finance", companyId] }); };
  const submit = useMutation({ mutationFn: async () => {
    let id = Number(contactId);
    if (!id && contactName.trim() && contactPhone.trim()) {
      const contact = await createContact(companyId, { name: contactName.trim(), phone: contactPhone.trim(), wa_id: "" }); id = contact.id;
    }
    if (!id) throw new Error("Selecione ou cadastre um contato.");
    return createSale(companyId, {
      contact_id: id, conversation_id: conversationId ? Number(conversationId) : null, order_id: orderId || null,
      responsible_id: responsibleId ? Number(responsibleId) : null, sold_at: iso(soldAt), discount_amount: discount,
      lines: lines.map(line => ({ ...(line.catalog_item_id ? { catalog_item_id: line.catalog_item_id } : { name: line.name.trim(), kind: line.kind }), quantity: line.quantity, unit_price: line.unit_price, discount_amount: line.discount_amount, ...(line.unit_cost ? { unit_cost: line.unit_cost } : {}) })),
      expenses: expenses.filter(x => x.name.trim() && x.amount).map(x => ({ name: x.name.trim(), amount: x.amount })), expenses_complete: expensesComplete,
    }, saleKey);
  }, onSuccess: async sale => { setNewSale(false); setSelected(sale); setFeedback("Venda confirmada. Pagamento é registrado separadamente."); setSaleKey(key()); await invalidate(); await cache.invalidateQueries({ queryKey: ["commercial-contacts", companyId] }); }, onError: e => setFeedback(errorMessage(e)) });
  const [saleKey, setSaleKey] = useState(key);
  const pay = useMutation({ mutationFn: () => recordSalePayment(companyId, selected!.id, { kind: paymentKind, amount: paymentAmount, occurred_at: iso(paymentAt), ...(paymentKind === "receipt" ? { method_id: paymentMethod || null } : { related_receipt_id: receiptId || null }) }, paymentKey), onSuccess: async () => { setFeedback("Lançamento registrado."); setPaymentAmount(""); setPaymentKey(key()); await invalidate(); const page = await listSales(companyId, { page_size: 100 }); setSelected(page.results.find(s => s.id === selected?.id) || null); }, onError: e => setFeedback(errorMessage(e)) });
  const [paymentKey, setPaymentKey] = useState(key);
  const cancel = useMutation({ mutationFn: () => cancelSale(companyId, selected!.id, cancelReason), onSuccess: async sale => { setSelected(sale); setFeedback("Venda cancelada. Recebimentos e reembolsos continuam visíveis."); await invalidate(); }, onError: e => setFeedback(errorMessage(e)) });
  const [cancelReason, setCancelReason] = useState("");
  const [attribution, setAttribution] = useState("unknown");
  const [attributionReason, setAttributionReason] = useState("");
  const [evidenceId, setEvidenceId] = useState("");
  const correction = useMutation({ mutationFn: () => correctSaleAttribution(companyId, selected!.id, { attribution, reason: attributionReason, evidence_message_id: evidenceId || null }), onSuccess: async sale => { setSelected(sale); setFeedback("Classificação corrigida com registro de auditoria."); await invalidate(); }, onError: e => setFeedback(errorMessage(e)) });
  const editLine = (index: number, update: Partial<DraftLine>) => setLines(lines.map((line, i) => i === index ? { ...line, ...update } : line));
  const chooseCatalog = (index: number, itemId: string) => { const item = catalog.data?.results.find(i => i.id === itemId); editLine(index, item ? { catalog_item_id: item.id, name: item.name, kind: item.kind, unit_price: item.promotional_price || item.sale_price || "", unit_cost: item.unit_cost || "" } : { catalog_item_id: "", name: "", unit_price: "", unit_cost: "" }); };
  return <div className="page-stack commercial-page">
    <div className="commercial-heading"><div><small>GESTÃO COMERCIAL</small><h1>Vendas</h1><p>Confirme vendas, acompanhe recebimentos e preserve o histórico.</p></div><button className="button button-primary" onClick={() => { setNewSale(true); setFeedback(""); }}>Registrar venda</button></div>
    <Section title="Vendas registradas"><div className="commercial-inline"><select aria-label="Filtrar situação" value={status} onChange={e => setStatus(e.target.value)}><option value="">Todas as situações</option><option value="confirmed">Confirmadas</option><option value="cancelled">Canceladas</option></select><Link className="button button-secondary" to="/finance">Ver indicadores</Link></div>{sales.isError && wrap(sales.error)}{sales.isLoading && <p>Carregando vendas…</p>}<div className="commercial-table-wrap"><table className="commercial-table"><thead><tr><th>Data</th><th>Contato</th><th>Itens</th><th>Valor</th><th>Origem</th><th>Situação</th><th></th></tr></thead><tbody>{sales.data?.results.map(s => <tr key={s.id}><td>{day(s.sold_at)}</td><td>{contacts.data?.results.find(c => c.id === s.contact)?.name || `Contato #${s.contact}`}</td><td>{s.lines.map(l => l.name).join(", ")}</td><td>{money(s.total)}</td><td>{attributionLabel[s.attribution]}</td><td>{statusLabel[s.status]}</td><td><button className="button button-secondary button-small" onClick={() => { setSelected(s); setFeedback(""); }}>Detalhes</button></td></tr>)}</tbody></table>{!sales.data?.results.length && <p className="commercial-empty">Ainda não há vendas registradas.</p>}</div></Section>
    {newSale && <div className="commercial-overlay" role="presentation"><form className="commercial-dialog commercial-dialog-wide" onSubmit={e => { e.preventDefault(); setFeedback(""); submit.mutate(); }}><div className="commercial-dialog-head"><h2>Confirmar venda</h2><button type="button" aria-label="Fechar" onClick={() => setNewSale(false)}>×</button></div><p>Oportunidade ganha e pedido aprovado não confirmam venda nem pagamento. Registre o fechamento aqui.</p><div className="commercial-form-grid">
      <Field label="Contato"><select value={contactId} onChange={e => { setContactId(e.target.value); setConversationId(""); setOrderId(""); }}><option value="">Novo contato manual</option>{contacts.data?.results.map(c => <option key={c.id} value={c.id}>{c.name || c.phone} · {c.phone}</option>)}</select></Field>
      {!contactId && <><Field label="Nome do novo contato"><input required value={contactName} onChange={e => setContactName(e.target.value)} /></Field><Field label="Telefone do novo contato"><input required value={contactPhone} onChange={e => setContactPhone(e.target.value)} /></Field></>}
      {selectedContact && <Field label="Conversa (opcional)"><select value={conversationId} onChange={e => { setConversationId(e.target.value); setOrderId(""); }}><option value="">Sem conversa</option>{relatedConversations.map(c => <option key={c.id} value={c.id}>Conversa #{c.id} · {c.opportunity_status || c.status}</option>)}</select></Field>}
      {conversationId && <Field label="Pedido aprovado (opcional)"><select value={orderId} onChange={e => setOrderId(e.target.value)}><option value="">Sem pedido</option>{relatedOrders.map(o => <option key={o.id} value={o.id}>{o.customer_name || o.id} · {money(o.total)}</option>)}</select></Field>}
      <Field label="Responsável (opcional)"><select value={responsibleId} onChange={e => setResponsibleId(e.target.value)}><option value="">Usar responsável da conversa ou meu usuário</option>{members.data?.map((m: Membership) => <option key={m.user.id} value={m.user.id}>{m.user.first_name || m.user.username}</option>)}</select></Field>
      <Field label="Data da venda"><input type="datetime-local" required value={soldAt} onChange={e => setSoldAt(e.target.value)} /></Field>
    </div><h3>Produtos e serviços vendidos</h3>{lines.map((line, i) => <div className="commercial-line" key={i}><Field label="Item"><select value={line.catalog_item_id} onChange={e => chooseCatalog(i, e.target.value)}><option value="">Item avulso</option>{catalog.data?.results.filter(x => x.is_active).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>{!line.catalog_item_id && <><Field label="Nome"><input required value={line.name} onChange={e => editLine(i, { name: e.target.value })} /></Field><Field label="Tipo"><select value={line.kind} onChange={e => editLine(i, { kind: e.target.value as DraftLine["kind"] })}><option value="service">Serviço</option><option value="product">Produto</option></select></Field></>}<Field label="Qtd."><input type="number" required min="0.001" step="0.001" value={line.quantity} onChange={e => editLine(i, { quantity: e.target.value })} /></Field><Field label="Preço negociado"><input type="number" required min="0" step="0.01" value={line.unit_price} onChange={e => editLine(i, { unit_price: e.target.value })} /></Field><Field label="Desconto"><input type="number" min="0" step="0.01" value={line.discount_amount} onChange={e => editLine(i, { discount_amount: e.target.value })} /></Field><Field label="Custo (opcional)"><input type="number" min="0" step="0.01" value={line.unit_cost} onChange={e => editLine(i, { unit_cost: e.target.value })} /></Field><button type="button" className="button button-quiet button-small" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, j) => j !== i))}>Remover</button></div>)}<button type="button" className="button button-secondary button-small" onClick={() => setLines([...lines, emptyLine()])}>Adicionar linha</button>
    <div className="commercial-form-grid commercial-end"><Field label="Desconto geral"><input type="number" min="0" step="0.01" value={discount} onChange={e => setDiscount(e.target.value)} /></Field><strong>Total previsto: {money(total)}</strong></div>
    <h3>Despesas adicionais (opcionais)</h3>{expenses.map((x, i) => <div className="commercial-inline" key={i}><input aria-label="Nome da despesa" placeholder="Material, deslocamento…" value={x.name} onChange={e => setExpenses(expenses.map((v, j) => j === i ? { ...v, name: e.target.value } : v))} /><input aria-label="Valor da despesa" type="number" min="0" step="0.01" value={x.amount} onChange={e => setExpenses(expenses.map((v, j) => j === i ? { ...v, amount: e.target.value } : v))} /><button type="button" className="button button-quiet" onClick={() => setExpenses(expenses.filter((_, j) => j !== i))}>Remover</button></div>)}<button type="button" className="button button-secondary button-small" onClick={() => setExpenses([...expenses, { name: "", amount: "" }])}>Adicionar despesa</button><label className="commercial-check"><input type="checkbox" checked={expensesComplete} onChange={e => setExpensesComplete(e.target.checked)} /> Confirmei que todas as despesas adicionais desta venda foram registradas, inclusive quando zero.</label>
    {feedback && <p role="alert" className="commercial-error">{feedback}</p>}<div className="commercial-dialog-actions"><button type="button" className="button button-secondary" onClick={() => setNewSale(false)}>Voltar</button><button className="button button-primary" disabled={submit.isPending}>{submit.isPending ? "Salvando…" : "Confirmar venda"}</button></div></form></div>}
    {selected && <div className="commercial-overlay" role="presentation"><div className="commercial-dialog commercial-dialog-wide"><div className="commercial-dialog-head"><div><h2>Venda {selected.id.slice(0, 8)}</h2><p>{day(selected.sold_at)} · {statusLabel[selected.status]} · {attributionLabel[selected.attribution]}</p></div><button aria-label="Fechar" onClick={() => setSelected(null)}>×</button></div><div className="commercial-metrics"><span>Valor da venda<strong>{money(selected.total)}</strong></span><span>Recebido líquido<strong>{money(selected.financials.received_net)}</strong></span><span>Em aberto<strong>{money(selected.financials.outstanding)}</strong></span></div><p>{selected.financials.cost_data === "complete" ? `Resultado estimado: ${money(selected.financials.estimated_result)}. Não substitui demonstrativo contábil.` : selected.financials.cost_data === "partial" ? "Custos parciais informados. Resultado total indisponível." : "Sem custos cadastrados. Resultado total indisponível."}</p><div className="commercial-table-wrap"><table className="commercial-table"><thead><tr><th>Item</th><th>Qtd.</th><th>Preço</th><th>Desconto</th><th>Total</th></tr></thead><tbody>{selected.lines.map(l => <tr key={l.id}><td>{l.name}</td><td>{l.quantity}</td><td>{money(l.unit_price)}</td><td>{money(l.discount_amount)}</td><td>{money(l.line_total)}</td></tr>)}</tbody></table></div>
    <h3>Recebimentos e reembolsos</h3><div className="commercial-tags">{selected.payments.map(p => <span key={p.id}>{p.kind === "receipt" ? "Recebido" : "Reembolsado"} {money(p.amount)} · {p.method_name || "Sem meio informado"}</span>)}</div>{!selected.payments.length && <p>Nenhum lançamento registrado.</p>}
    <form className="commercial-form-grid" onSubmit={e => { e.preventDefault(); setFeedback(""); pay.mutate(); }}><Field label="Lançamento"><select value={paymentKind} onChange={e => setPaymentKind(e.target.value as "receipt" | "refund")}><option value="receipt">Recebimento</option><option value="refund">Reembolso</option></select></Field><Field label="Valor"><input type="number" min="0.01" step="0.01" required value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} /></Field><Field label="Data"><input type="datetime-local" required value={paymentAt} onChange={e => setPaymentAt(e.target.value)} /></Field>{paymentKind === "receipt" ? <Field label="Meio (opcional)"><select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}><option value="">Não informado</option>{methods.data?.filter(m => m.is_active).map(m => <option key={m.id} value={m.id}>{m.name} {m.condition_label}</option>)}</select></Field> : <Field label="Recebimento de origem"><select required value={receiptId} onChange={e => setReceiptId(e.target.value)}><option value="">Selecione</option>{selected.payments.filter(p => p.kind === "receipt").map(p => <option key={p.id} value={p.id}>{day(p.occurred_at)} · {money(p.amount)}</option>)}</select></Field>}<button className="button button-primary" disabled={pay.isPending}>Registrar lançamento</button></form>
    <h3>Corrigir atribuição</h3><form className="commercial-form-grid" onSubmit={e => { e.preventDefault(); correction.mutate(); }}><Field label="Origem"><select value={attribution} onChange={e => setAttribution(e.target.value)}>{Object.entries(attributionLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></Field>{attribution === "ai_assisted" && <Field label="ID da resposta da IA"><input required type="number" min="1" value={evidenceId} onChange={e => setEvidenceId(e.target.value)} /></Field>}<Field label="Motivo da correção"><input required value={attributionReason} onChange={e => setAttributionReason(e.target.value)} /></Field><button className="button button-secondary" disabled={correction.isPending}>Salvar correção</button></form>
    {selected.status === "confirmed" && <form className="commercial-inline commercial-cancel" onSubmit={e => { e.preventDefault(); cancel.mutate(); }}><input aria-label="Motivo do cancelamento" required placeholder="Motivo do cancelamento" value={cancelReason} onChange={e => setCancelReason(e.target.value)} /><button className="button button-secondary" disabled={cancel.isPending}>Cancelar venda</button></form>}
    {selected.conversation && <Link to={`/inbox?conversation=${selected.conversation}`}>Ver conversa relacionada</Link>}{feedback && <p role="status" className="commercial-error">{feedback}</p>}</div></div>}
  </div>;
}

function Bars({ title, rows }: { title: string; rows: Breakdown[] }) { const max = Math.max(1, ...rows.map(x => Math.abs(Number(x.amount)))); return <div className="commercial-chart"><h3>{title}</h3>{rows.length ? rows.map(row => <div className="commercial-bar-row" key={row.label}><span>{row.label}</span><div><i style={{ width: `${Math.max(2, Math.abs(Number(row.amount)) / max * 100)}%` }} /></div><strong>{money(row.amount)}</strong></div>) : <p className="commercial-empty">Sem dados no período.</p>}</div>; }
export function FinancePage({ companyId }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [interval, setInterval] = useState("daily");
  const [report, setReport] = useState("sales");
  const [responsibleId, setResponsibleId] = useState("");
  const [kind, setKind] = useState("");
  const [itemId, setItemId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const members = useQuery({ queryKey: ["commercial-members", companyId], queryFn: () => listMembers(companyId) });
  const catalog = useQuery({ queryKey: ["commercial-catalog", companyId, ""], queryFn: () => listCatalog(companyId, { page_size: 100 }) });
  const methods = useQuery({ queryKey: ["commercial-methods", companyId], queryFn: () => listPaymentMethods(companyId) });
  const params = { from, to, interval, ...(responsibleId && { responsible_id: responsibleId }), ...(kind && { kind }),
    ...(itemId && { item_id: itemId }), ...(paymentMethodId && { payment_method_id: paymentMethodId }), ...(status && { status }) };
  const dashboard = useQuery({ queryKey: ["commercial-finance", companyId, params], queryFn: () => getFinanceDashboard(companyId, params) });
  const data = dashboard.data;
  const cards = data ? [
    ["Vendas confirmadas", String(data.confirmed_sales)], ["Faturamento registrado", money(data.registered_revenue)],
    ["Ticket médio", money(data.average_ticket)], ["Recebido líquido", money(data.received_net)],
    ["Vendas assistidas pela IA", String(data.ai_assisted_sales)], ["Receita associada à IA", money(data.ai_assisted_revenue)],
    ["Taxa de conversão", data.conversion.rate_percent == null ? "—" : `${data.conversion.rate_percent}%`],
    ["Vendas canceladas", String(data.cancelled_sales)],
  ] : [];
  return <div className="page-stack commercial-page"><div className="commercial-heading"><div><small>RESULTADOS COMERCIAIS</small><h1>Indicadores financeiros</h1><p>Vendas confirmadas e pagamentos registrados; valores não substituem contabilidade.</p></div></div>
    <div className="panel commercial-filters"><Field label="De"><input aria-label="Data inicial" type="date" value={from} onChange={e => setFrom(e.target.value)} /></Field><Field label="Até"><input aria-label="Data final" type="date" value={to} onChange={e => setTo(e.target.value)} /></Field><Field label="Agrupar"><select value={interval} onChange={e => setInterval(e.target.value)}><option value="daily">Dia</option><option value="weekly">Semana</option><option value="monthly">Mês</option></select></Field><Field label="Responsável"><select value={responsibleId} onChange={e => setResponsibleId(e.target.value)}><option value="">Todos</option>{members.data?.map(m => <option key={m.user.id} value={m.user.id}>{m.user.first_name || m.user.username}</option>)}</select></Field><Field label="Tipo"><select value={kind} onChange={e => setKind(e.target.value)}><option value="">Produtos e serviços</option><option value="product">Produtos</option><option value="service">Serviços</option></select></Field><Field label="Item"><select value={itemId} onChange={e => setItemId(e.target.value)}><option value="">Todos</option>{catalog.data?.results.map(i => <option value={i.id} key={i.id}>{i.name}</option>)}</select></Field><Field label="Meio"><select value={paymentMethodId} onChange={e => setPaymentMethodId(e.target.value)}><option value="">Todos</option>{methods.data?.map(m => <option value={m.id} key={m.id}>{m.name}</option>)}</select></Field><Field label="Situação"><select value={status} onChange={e => setStatus(e.target.value)}><option value="">Todas</option><option value="confirmed">Confirmadas</option><option value="cancelled">Canceladas</option></select></Field><Field label="Exportar CSV"><select value={report} onChange={e => setReport(e.target.value)}><option value="sales">Vendas</option><option value="items">Itens</option><option value="category">Categorias</option><option value="attendant">Atendentes</option><option value="attribution">Origem</option><option value="payments">Pagamentos</option></select></Field><button className="button button-secondary" onClick={() => { setError(""); void downloadReport(companyId, { ...params, group_by: report }).catch(e => setError(errorMessage(e))); }}>Baixar</button></div>{error && <p role="alert" className="commercial-error">{error}</p>}
    {dashboard.isError && wrap(dashboard.error)}{dashboard.isLoading && <p>Carregando indicadores…</p>}{data && <><div className="commercial-kpis">{cards.map(([label, value]) => <article className="panel" key={label}><span>{label}</span><strong>{value}</strong></article>)}</div><p className="commercial-note">Conversão da empresa: {data.conversion.converted} de {data.conversion.eligible} conversas iniciadas no período fecharam venda em até 30 dias. Os filtros comerciais não alteram esta coorte. {data.conversion.cohort_complete ? "Coorte completa." : "Parte da coorte ainda pode converter."}</p><div className="commercial-charts"><Section title="Evolução e comparação"><Bars title="Vendas por período" rows={data.timeline} /><p>Período anterior: {money(data.previous_period_revenue)}{data.revenue_change_percent != null && ` · Variação: ${data.revenue_change_percent}%`}</p></Section><Section title="Origem e mix"><Bars title="Produtos e serviços" rows={data.by_kind} /><div className="commercial-metrics"><span>Assistidas pela IA<strong>{data.ai_assisted_sales}</strong></span><span>Demais vendas<strong>{data.confirmed_sales - data.ai_assisted_sales}</strong></span></div></Section><Section title="Itens mais vendidos"><Bars title="Por item" rows={data.by_item} /></Section><Section title="Categorias"><Bars title="Receita por categoria" rows={data.by_category} /></Section><Section title="Atendentes"><Bars title="Vendas por responsável" rows={data.by_attendant} /></Section><Section title="Meios de pagamento"><Bars title="Recebido líquido por meio" rows={data.by_payment_method} /></Section></div><Section title="Funil de oportunidades"><div className="commercial-metrics"><span>Conversas elegíveis<strong>{data.opportunity_funnel.eligible_conversations}</strong></span><span>Marcadas como ganhas agora<strong>{data.opportunity_funnel.currently_won}</strong></span><span>Marcadas como perdidas agora<strong>{data.opportunity_funnel.currently_lost}</strong></span><span>Com venda em até 30 dias<strong>{data.opportunity_funnel.confirmed_within_30_days}</strong></span></div><p>Estados de oportunidade são atuais; a venda confirmada é um evento separado.</p></Section><Section title="Custos e estimativas"><div className="commercial-metrics"><span>Vendas com dados completos<strong>{data.financial_coverage.complete}</strong></span><span>Dados parciais<strong>{data.financial_coverage.partial}</strong></span><span>Sem dados de custo<strong>{data.financial_coverage.absent}</strong></span><span>Custos conhecidos<strong>{money(data.known_costs)}</strong></span><span>Taxas estimadas<strong>{money(data.payment_fees)}</strong></span><span>Impostos estimados<strong>{money(data.estimated_taxes)}</strong></span><span>Margem bruta estimada<strong>{money(data.gross_margin_estimate)}</strong></span><span>Resultado estimado<strong>{money(data.estimated_result)}</strong></span></div><p>Estimativas consideram apenas dados informados. Campos vazios não são tratados como zero. Resultado completo exige custos, despesas, taxas e imposto conhecidos.</p></Section></>}
  </div>;
}

export function CommercialSettings({ companyId }: Props) {
  const cache = useQueryClient();
  const company = useQuery({ queryKey: ["company", companyId], queryFn: () => getCompany(companyId) });
  const methods = useQuery({ queryKey: ["commercial-methods", companyId], queryFn: () => listPaymentMethods(companyId) });
  const [profile, setProfile] = useState(""); const [tax, setTax] = useState(""); const [margin, setMargin] = useState("");
  const [methodName, setMethodName] = useState(""); const [methodKind, setMethodKind] = useState("pix");
  const [condition, setCondition] = useState(""); const [percentFee, setPercentFee] = useState(""); const [fixedFee, setFixedFee] = useState(""); const [feedback, setFeedback] = useState("");
  const [loadedId, setLoadedId] = useState("");
  useEffect(() => {
    if (company.data && loadedId !== companyId) {
      setProfile(company.data.business_profile || ""); setTax(company.data.estimated_tax_percent || "");
      setMargin(company.data.desired_margin_percent || ""); setLoadedId(companyId);
    }
  }, [company.data, companyId, loadedId]);
  const saveCompany = useMutation({ mutationFn: () => http.patch(companyPath(companyId), { business_profile: profile, estimated_tax_percent: tax || null, desired_margin_percent: margin || null }), onSuccess: async () => { setFeedback("Configurações comerciais salvas."); await cache.invalidateQueries({ queryKey: ["company", companyId] }); }, onError: e => setFeedback(errorMessage(e)) });
  const saveMethod = useMutation({ mutationFn: () => savePaymentMethod(companyId, { name: methodName.trim(), kind: methodKind, condition_label: condition, percent_fee: percentFee || null, fixed_fee: fixedFee || null }), onSuccess: async () => { setFeedback("Meio de pagamento salvo."); setMethodName(""); setCondition(""); setPercentFee(""); setFixedFee(""); await cache.invalidateQueries({ queryKey: ["commercial-methods", companyId] }); }, onError: e => setFeedback(errorMessage(e)) });
  return <div className="page-stack commercial-page"><div className="commercial-heading"><div><small>CONFIGURAÇÕES OPCIONAIS</small><h1>Perfil comercial</h1><p>O cadastro de vendas funciona mesmo sem preencher esta página.</p></div></div><Section title="Modelo de negócio"><form className="commercial-form-grid" onSubmit={(e: FormEvent) => { e.preventDefault(); saveCompany.mutate(); }}><Field label="Atividade principal"><select value={profile} onChange={e => setProfile(e.target.value)}><option value="">Não definido</option><option value="products">Produtos</option><option value="services">Serviços</option><option value="both">Produtos e serviços</option></select></Field><Field label="Imposto estimado % (opcional)"><input type="number" min="0" max="100" step="0.001" value={tax} onChange={e => setTax(e.target.value)} /></Field><Field label="Margem desejada % (opcional)"><input type="number" min="0" max="100" step="0.001" value={margin} onChange={e => setMargin(e.target.value)} /></Field><button className="button button-primary" disabled={saveCompany.isPending}>Salvar</button></form><p>Perfil orienta os formulários; produtos e serviços continuam disponíveis para todos. Impostos são apenas estimativas informadas por você.</p></Section><Section title="Meios de pagamento e taxas"><div className="commercial-tags">{methods.data?.map(m => <span key={m.id}>{m.name}{m.condition_label && ` · ${m.condition_label}`} · {m.percent_fee == null && m.fixed_fee == null ? "Taxa não informada" : `${m.percent_fee || "0"}% + ${money(m.fixed_fee || "0")}`}</span>)}</div><form className="commercial-form-grid" onSubmit={(e: FormEvent) => { e.preventDefault(); saveMethod.mutate(); }}><Field label="Nome"><input required value={methodName} onChange={e => setMethodName(e.target.value)} /></Field><Field label="Tipo"><select value={methodKind} onChange={e => setMethodKind(e.target.value)}><option value="pix">Pix</option><option value="credit">Crédito</option><option value="debit">Débito</option><option value="boleto">Boleto</option><option value="transfer">Transferência</option><option value="cash">Dinheiro</option><option value="other">Outro</option></select></Field><Field label="Condição (opcional)"><input placeholder="À vista, 3x…" value={condition} onChange={e => setCondition(e.target.value)} /></Field><Field label="Taxa percentual (opcional)"><input type="number" min="0" max="100" step="0.001" value={percentFee} onChange={e => setPercentFee(e.target.value)} /></Field><Field label="Taxa fixa (opcional)"><input type="number" min="0" step="0.01" value={fixedFee} onChange={e => setFixedFee(e.target.value)} /></Field><button className="button button-primary" disabled={saveMethod.isPending}>Adicionar meio</button></form><p>Não há taxas padrão. Cadastre as condições que realmente usa.</p></Section>{feedback && <p role="status" className="commercial-error">{feedback}</p>}</div>;
}

export function CommercialSummary({ companyId }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const from = `${today.slice(0, 7)}-01`;
  const query = useQuery({ queryKey: ["commercial-finance", companyId, "summary", from, today], queryFn: () => getFinanceDashboard(companyId, { from, to: today, interval: "daily" }) });
  return <section className="panel commercial-section"><div className="commercial-heading"><div><h2>Vendas deste mês</h2><p>Valores confirmados manualmente no módulo comercial.</p></div><Link className="button button-secondary" to="/finance">Ver painel financeiro</Link></div>{query.isError ? wrap(query.error) : query.data ? <div className="commercial-metrics"><span>Vendas confirmadas<strong>{query.data.confirmed_sales}</strong></span><span>Faturamento<strong>{money(query.data.registered_revenue)}</strong></span><span>Assistidas pela IA<strong>{query.data.ai_assisted_sales}</strong></span><span>Recebido líquido<strong>{money(query.data.received_net)}</strong></span></div> : <p>Carregando indicadores…</p>}</section>;
}
