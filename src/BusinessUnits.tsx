import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { companyPath, errorMessage, http, selectedBusinessUnit, setSelectedBusinessUnit } from "./api";
import { listBusinessUnits, unitsKey, unitsPath } from "./businessUnitsApi";

type Quota = { included_numbers: number; active_numbers: number; number_capacity: number | null; numbers_over_limit: boolean };

export function UnitSwitcher({ companyId }: { companyId: string }) {
  const cache = useQueryClient();
  const query = useQuery({ queryKey: unitsKey(companyId), queryFn: () => listBusinessUnits(companyId), enabled: !!companyId });
  const [selected, setSelected] = useState(() => selectedBusinessUnit(companyId) || "");
  useEffect(() => {
    const active = query.data?.results.filter(unit => unit.is_active) ?? [];
    if (!active.length) return;
    const next = active.some(unit => unit.id === selected) ? selected : (active.find(unit => unit.is_default)?.id || active[0].id);
    if (next !== selected || selectedBusinessUnit(companyId) !== next) {
      setSelected(next);
      setSelectedBusinessUnit(companyId, next);
      void cache.invalidateQueries({ predicate: item => item.queryKey[0] !== "business-units" });
    }
  }, [companyId, query.data, selected, cache]);
  if (!query.data || query.data.results.filter(unit => unit.is_active).length < 2) return null;
  return <label className="unit-switcher">Atividade <select aria-label="Atividade em uso" value={selected} onChange={event => {
    setSelected(event.target.value);
    setSelectedBusinessUnit(companyId, event.target.value);
    void cache.invalidateQueries({ predicate: item => item.queryKey[0] !== "business-units" });
  }}>{query.data.results.filter(unit => unit.is_active).map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>;
}

export function UnitManager({ companyId, canManage }: { companyId: string; canManage: boolean }) {
  const cache = useQueryClient();
  const query = useQuery({ queryKey: unitsKey(companyId), queryFn: () => listBusinessUnits(companyId), enabled: !!companyId });
  const quota = useQuery({ queryKey: ["unit-quota", companyId], queryFn: async () => (await http.get<Quota>(companyPath(companyId, "billing/quota/"))).data, enabled: !!companyId });
  const [name, setName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [instructions, setInstructions] = useState("");
  const refresh = () => { void cache.invalidateQueries({ queryKey: unitsKey(companyId) }); void cache.invalidateQueries({ queryKey: ["unit-quota", companyId] }); };
  const create = useMutation({
    mutationFn: () => http.post(unitsPath(companyId), { name: name.trim(), trade_name: tradeName.trim(), activity_description: description.trim() }),
    onSuccess: () => { setName(""); setTradeName(""); setDescription(""); setError(""); refresh(); },
    onError: (cause: unknown) => setError(errorMessage(cause)),
  });
  const update = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Record<string, unknown> }) => http.patch(companyPath(companyId, `units/${id}/`), values),
    onSuccess: () => { setEditing(null); setError(""); refresh(); },
    onError: (cause: unknown) => setError(errorMessage(cause)),
  });
  const moveNumber = useMutation({
    mutationFn: ({ id, unitId }: { id: number; unitId: string }) => http.patch(companyPath(companyId, `whatsapp-numbers/${id}/unit/`), { business_unit_id: unitId }),
    onSuccess: () => { setError(""); refresh(); void cache.invalidateQueries({ queryKey: ["numbers", companyId] }); },
    onError: (cause: unknown) => setError(errorMessage(cause)),
  });
  return <section className="panel unit-manager"><h2>Unidades de negócio</h2><p>Separe atividades, documentos e atendimento dentro da mesma empresa.</p>
    {query.isError && <p role="alert">{errorMessage(query.error)}</p>}{error && <p role="alert">{error}</p>}
    {query.data && <><p>{query.data.used} de {query.data.limit} unidades utilizadas · {quota.data?.active_numbers ?? 0} de {quota.data?.number_capacity ?? "∞"} números em uso ({quota.data?.included_numbers ?? 2} incluídos).</p>
      {(query.data.over_limit || quota.data?.numbers_over_limit) && <p role="alert">Uso acima do limite atual. Os registros foram preservados; novas inclusões ficam indisponíveis até regularização.</p>}
      <div className="unit-cards">{query.data.results.map(unit => <article className="unit-card" key={unit.id}><div><strong>{unit.name}</strong> {unit.is_default && <small>· Padrão</small>} <small>· {unit.is_active ? "Ativa" : "Inativa"}</small></div><p>{unit.trade_name || unit.activity_description || "Atividade da empresa"}</p>
        <div><small>WhatsApps: {unit.whatsapp_numbers.length ? unit.whatsapp_numbers.map(number => number.display_phone_number).join(", ") : "nenhum"}</small></div>
        {canManage && <><button type="button" className="button button-secondary button-small" onClick={() => { setEditing(unit.id); setInstructions(unit.ai_instructions); }}>Configurar IA</button> {!unit.is_default && <button type="button" className="button button-secondary button-small" disabled={update.isPending} onClick={() => update.mutate({ id: unit.id, values: { is_active: !unit.is_active } })}>{unit.is_active ? "Desativar" : "Reativar"}</button>}
          {unit.whatsapp_numbers.map(number => <label key={number.id} className="unit-number-move">{number.display_phone_number} · atividade <select aria-label={`Atividade do número ${number.display_phone_number}`} value={unit.id} disabled={moveNumber.isPending} onChange={event => moveNumber.mutate({ id: number.id, unitId: event.target.value })}>{query.data!.results.filter(target => target.is_active).map(target => <option key={target.id} value={target.id}>{target.name}</option>)}</select></label>)}
          {editing === unit.id && <div className="unit-prompt"><label>Instruções da IA para esta atividade<textarea value={instructions} maxLength={8000} rows={5} onChange={event => setInstructions(event.target.value)} placeholder="Deixe vazio para usar as instruções gerais da empresa." /></label><button className="button button-primary button-small" disabled={update.isPending} onClick={() => update.mutate({ id: unit.id, values: { ai_instructions: instructions } })}>Salvar instruções</button><button className="button button-secondary button-small" onClick={() => setEditing(null)}>Cancelar</button></div>}</>}
      </article>)}</div>
      {canManage && <form className="unit-create" onSubmit={event => { event.preventDefault(); create.mutate(); }}><h3>Nova atividade</h3><label>Nome da unidade<input required maxLength={160} value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: Eventos" /></label><label>Nome comercial (opcional)<input maxLength={160} value={tradeName} onChange={event => setTradeName(event.target.value)} /></label><label>Descrição da atividade (opcional)<textarea maxLength={1000} value={description} onChange={event => setDescription(event.target.value)} /></label><button className="button button-primary" disabled={create.isPending || query.data.used >= query.data.limit}>Criar unidade</button>{query.data.used >= query.data.limit && <small>O limite de unidades do plano foi atingido. Uma unidade inativa também ocupa uma vaga.</small>}</form>}</>}
  </section>;
}

export function DocumentShareControl({ companyId, documentId, sourceUnitId }: { companyId: string; documentId: number; sourceUnitId: string }) {
  const query = useQuery({ queryKey: unitsKey(companyId), queryFn: () => listBusinessUnits(companyId), enabled: !!companyId });
  const [target, setTarget] = useState("");
  const [feedback, setFeedback] = useState("");
  const options = query.data?.results.filter(unit => unit.is_active && unit.id !== sourceUnitId) ?? [];
  const mutation = useMutation({
    mutationFn: (share: boolean) => http.request({ method: share ? "post" : "delete", url: companyPath(companyId, `documents/${documentId}/share/`), data: { business_unit_id: target } }),
    onSuccess: (_, shared) => setFeedback(shared ? "Documento compartilhado." : "Compartilhamento removido."),
    onError: (cause: unknown) => setFeedback(errorMessage(cause)),
  });
  if (!options.length) return null;
  return <span className="document-share"><select aria-label="Compartilhar documento com" value={target} onChange={event => setTarget(event.target.value)}><option value="">Outra atividade</option>{options.map(unit => <option value={unit.id} key={unit.id}>{unit.name}</option>)}</select><button className="button button-secondary button-small" disabled={!target || mutation.isPending} onClick={() => mutation.mutate(true)}>Compartilhar</button><button className="button button-quiet button-small" disabled={!target || mutation.isPending} onClick={() => mutation.mutate(false)}>Remover</button>{feedback && <small role="status">{feedback}</small>}</span>;
}
