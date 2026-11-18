import { companyPath, http } from "./api";

export type BusinessUnit = {
  id: string; name: string; slug: string; trade_name: string; activity_description: string;
  is_default: boolean; is_active: boolean; ai_instructions: string;
  whatsapp_numbers: Array<{ id: number; display_phone_number: string }>;
};

export type UnitList = { results: BusinessUnit[]; used: number; limit: number; over_limit: boolean };
export const unitsKey = (companyId: string) => ["business-units", companyId] as const;
export const unitsPath = (companyId: string) => companyPath(companyId, "units/");
export async function listBusinessUnits(companyId: string): Promise<UnitList> {
  return (await http.get<UnitList>(unitsPath(companyId))).data;
}
