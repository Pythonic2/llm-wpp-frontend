export type Role = "owner" | "admin" | "agent";
export type ConversationStatus = "open" | "qualifying" | "qualified" | "closed";
export type LeadTemperature = "unknown" | "hot" | "warm" | "cold";
export type OpportunityStatus = "open" | "won" | "lost";
export type DocumentStatus = "pending" | "processing" | "ready" | "failed";

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  role: Role;
  integrations?: {
    whatsapp_configured: boolean;
    gemini_configured: boolean;
    webhook_path: string;
  };
}

export interface Session {
  user: User;
  companies: Company[];
}

export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Contact {
  id: number;
  name: string;
  phone: string;
  wa_id: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: number;
  contact: Contact;
  whatsapp_number: number;
  status: ConversationStatus;
  lead_stage: string;
  lead_data: Record<string, unknown>;
  lead_temperature?: LeadTemperature;
  purchase_intent_score?: number;
  analysis_summary?: string;
  buying_signals?: string[];
  objections?: string[];
  recommended_action?: string;
  analyzed_at?: string | null;
  opportunity_status?: OpportunityStatus;
  next_follow_up_at?: string | null;
  follow_up_completed_at?: string | null;
  ai_paused: boolean;
  ai_paused_at: string | null;
  assigned_to: User | null;
  last_message_at: string | null;
  created_at: string;
}

export interface Message {
  id: number;
  external_id: string;
  direction: "in" | "out";
  message_type: string;
  text: string;
  status: "received" | "pending" | "sent" | "delivered" | "read" | "failed";
  ai_status: "na" | "queued" | "processing" | "completed" | "skipped" | "failed";
  response_to: number | null;
  created_at: string;
}

export interface Dashboard {
  total_conversations: number;
  open_conversations: number;
  human_conversations: number;
  ai_conversations: number;
  inbound_messages: number;
  outbound_messages: number;
  documents_processing: number;
  documents_failed: number;
  hot_leads?: number;
  warm_leads?: number;
  follow_ups_due?: number;
  follow_up_conversations?: Conversation[];
  recent_conversations: Conversation[];
}

export interface KnowledgeBase {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface KnowledgeDocument {
  id: number;
  title: string;
  file_name: string;
  status: DocumentStatus;
  error: string;
  created_at: string;
}

export interface WhatsAppNumber {
  id: number;
  phone_number_id: string;
  display_phone_number: string;
  business_account_id: string;
  ai_enabled: boolean;
  is_active: boolean;
  created_at: string;
}

export interface WhatsAppNumberInput {
  phone_number_id: string;
  display_phone_number: string;
  business_account_id: string;
  ai_enabled: boolean;
  is_active: boolean;
}

export interface Membership {
  id: number;
  user: User;
  role: Role;
}
