import { companyPath, http } from "./api";
import type { Page } from "./types";

export type CatalogKind = "product" | "service";
export interface CatalogCategory { id: number; name: string; is_active: boolean }
export interface CatalogItem {
  id: string; name: string; kind: CatalogKind; category: number | null; description: string;
  price_mode: "fixed" | "from" | "quote"; sale_price: string | null; promotional_price: string | null;
  unit_cost?: string | null; unit: string; billing_unit: string; sku: string; availability: string;
  duration_minutes: number | null; variants: unknown[]; internal_notes?: string; media_assets: string[]; is_active: boolean;
}
export interface PaymentMethod {
  id: string; name: string; kind: string; condition_label: string; percent_fee: string | null;
  fixed_fee: string | null; is_active: boolean;
}
export interface SaleLine { id: number; catalog_item: string | null; name: string; kind: CatalogKind; quantity: string; unit: string; unit_price: string; discount_amount: string; line_total: string; unit_cost: string | null }
export interface SalePayment { id: string; kind: "receipt" | "refund"; amount: string; occurred_at: string; method: string | null; method_name: string; fee_amount: string | null }
export interface Sale {
  id: string; contact: number; conversation: number | null; order: string | null; responsible: number | null;
  responsible_name: string; sold_at: string; total: string; subtotal: string; discount_amount: string;
  status: "confirmed" | "cancelled"; attribution: "ai_assisted" | "human" | "external" | "unknown";
  ai_evidence_message: number | null; lines: SaleLine[]; payments: SalePayment[];
  financials: { received_net: string; outstanding: string; item_cost: string | null; extra_cost: string | null;
    payment_fees: string | null; estimated_tax: string | null; known_costs: string | null;
    estimated_result: string | null; cost_data: "absent" | "partial" | "complete" };
}
export interface Breakdown { label: string; sales: number; amount: string; quantity: string }
export interface FinanceDashboard {
  period: { from: string; to: string; interval: string }; confirmed_sales: number; registered_revenue: string;
  average_ticket: string; received_net: string; ai_assisted_sales: number; ai_assisted_revenue: string;
  cancelled_sales: number; cancelled_value: string; refunds: string;
  conversion: { rate_percent: string | null; converted: number; eligible: number; window_days: number; cohort_complete: boolean };
  opportunity_funnel: { eligible_conversations: number; currently_won: number; currently_lost: number; confirmed_within_30_days: number };
  financial_coverage: { complete: number; partial: number; absent: number }; known_costs: string | null;
  payment_fees: string | null; estimated_taxes: string | null;
  gross_margin_estimate: string | null; estimated_result: string | null; previous_period_revenue: string;
  revenue_change_percent: string | null; timeline: Breakdown[]; by_kind: Breakdown[]; by_category: Breakdown[];
  by_item: Breakdown[]; by_attendant: Breakdown[]; by_payment_method: Breakdown[];
}
const path = (companyId: string, suffix: string) => companyPath(companyId, suffix);
export async function listCategories(id: string) { return (await http.get<CatalogCategory[]>(path(id, "catalog/categories/"))).data; }
export async function createCategory(id: string, name: string) { return (await http.post<CatalogCategory>(path(id, "catalog/categories/"), { name })).data; }
export async function listCatalog(id: string, params: Record<string, string | number> = {}) { return (await http.get<Page<CatalogItem>>(path(id, "catalog/items/"), { params })).data; }
export async function saveCatalogItem(id: string, values: Record<string, unknown>, itemId?: string) {
  return (itemId ? await http.patch<CatalogItem>(path(id, `catalog/items/${itemId}/`), values) : await http.post<CatalogItem>(path(id, "catalog/items/"), values)).data;
}
export async function listPaymentMethods(id: string) { return (await http.get<PaymentMethod[]>(path(id, "payment-methods/"))).data; }
export async function savePaymentMethod(id: string, values: Record<string, unknown>, methodId?: string) {
  return (methodId ? await http.patch<PaymentMethod>(path(id, `payment-methods/${methodId}/`), values) : await http.post<PaymentMethod>(path(id, "payment-methods/"), values)).data;
}
export async function listSales(id: string, params: Record<string, string | number> = {}) { return (await http.get<Page<Sale>>(path(id, "sales/"), { params })).data; }
export async function createSale(id: string, values: Record<string, unknown>, key: string) {
  return (await http.post<Sale>(path(id, "sales/"), values, { headers: { "Idempotency-Key": key } })).data;
}
export async function cancelSale(id: string, saleId: string, reason: string) {
  return (await http.post<Sale>(path(id, `sales/${saleId}/cancel/`), { reason })).data;
}
export async function correctSaleAttribution(id: string, saleId: string, values: Record<string, unknown>) {
  return (await http.post<Sale>(path(id, `sales/${saleId}/attribution/`), values)).data;
}
export async function recordSalePayment(id: string, saleId: string, values: Record<string, unknown>, key: string) {
  return (await http.post<SalePayment>(path(id, `sales/${saleId}/payments/`), values, { headers: { "Idempotency-Key": key } })).data;
}
export async function getFinanceDashboard(id: string, params: Record<string, string>) {
  return (await http.get<FinanceDashboard>(path(id, "finance/dashboard/"), { params })).data;
}
export async function downloadReport(id: string, params: Record<string, string>) {
  const response = await http.get<Blob>(path(id, "sales/report.csv"), { params, responseType: "blob" });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a"); link.href = url; link.download = `gesttech-${params.group_by || "sales"}.csv`;
  link.click(); URL.revokeObjectURL(url);
}
