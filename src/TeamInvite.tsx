import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { errorMessage, http } from "./api";
import "./billing.css";

export function TeamInviteAcceptPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [formError, setFormError] = useState("");
  const accept = useMutation({
    mutationFn: async () => {
      await http.post("/public/team-invites/accept/", { token, password });
    },
    onError: (error: unknown) => setFormError(errorMessage(error)),
  });
  return <main className="billing-status-page"><div className="billing-status-card team-accept-card">
    <Link to="/" className="billing-brand">gest<span>tech</span></Link>
    {accept.isSuccess ? <><h1>Acesso ativado</h1><p>Sua senha foi definida. Entre para começar a atender sua equipe.</p><Link className="button button-primary" to="/login">Entrar no CRM</Link></> : !token ? <><h1>Convite inválido</h1><p>Abra o link completo recebido no e-mail ou peça um novo convite ao administrador.</p></> : <><h1>Faça parte da equipe</h1><p>Defina uma senha para acessar o Gest Tech. O link é válido por 48 horas.</p>
      <form onSubmit={(event: FormEvent) => { event.preventDefault(); setFormError(""); if (password !== confirmation) { setFormError("As senhas não coincidem."); return; } accept.mutate(); }}>
        <label>Nova senha<input type="password" minLength={8} maxLength={128} autoComplete="new-password" required value={password} onChange={event => setPassword(event.target.value)} /></label>
        <label>Confirme a senha<input type="password" minLength={8} maxLength={128} autoComplete="new-password" required value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>
        {formError && <p role="alert" className="billing-error">{formError}</p>}
        <button className="button button-primary" disabled={accept.isPending}>{accept.isPending ? "Ativando…" : "Ativar meu acesso"}</button>
      </form>
    </>}
  </div></main>;
}
