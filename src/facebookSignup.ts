import type { EmbeddedSignupConfig } from "./types";

declare global {
  interface Window {
    FB?: {
      init: (options: Record<string, unknown>) => void;
      login: (callback: (response: { authResponse?: { code?: string } }) => void, options: Record<string, unknown>) => void;
    };
  }
}

let facebookSdkPromise: Promise<void> | null = null;

export async function loadFacebookSdk(appId: string, apiVersion: string) {
  if (!window.FB) {
    facebookSdkPromise ??= new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/pt_BR/sdk.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Não foi possível carregar a autenticação da Meta."));
      document.body.appendChild(script);
    });
    try {
      await facebookSdkPromise;
    } catch (error) {
      facebookSdkPromise = null;
      document.getElementById("facebook-jssdk")?.remove();
      throw error;
    }
  }
  if (!window.FB) throw new Error("A autenticação da Meta não ficou disponível.");
  window.FB.init({ appId, autoLogAppEvents: false, xfbml: false, version: apiVersion });
}

export function launchEmbeddedSignup(config: EmbeddedSignupConfig) {
  // FB.login precisa ocorrer diretamente no clique para o navegador permitir o popup.
  return new Promise<{ code: string; waba_id: string; phone_number_id?: string; event: string; state: string; standard_migration_consent: boolean }>((resolve, reject) => {
    let session: { waba_id: string; phone_number_id?: string; event: string } | null = null;
    let code = "";
    let done = false;
    const cleanup = () => { window.removeEventListener("message", listener); window.clearTimeout(timeout); };
    const fail = (message: string) => { if (!done) { done = true; cleanup(); reject(new Error(message)); } };
    const finish = () => {
      if (!done && session && code) { done = true; cleanup(); resolve({ code, ...session, state: config.state, standard_migration_consent: true }); }
    };
    const listener = (event: MessageEvent) => {
      if (!/^https:\/\/([a-z0-9-]+\.)*facebook\.com$/i.test(event.origin)) return;
      try {
        const payload = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (payload?.type !== "WA_EMBEDDED_SIGNUP") return;
        if (payload.event === "CANCEL") fail("A conexão foi cancelada na Meta.");
        else if (payload.event === "ERROR") fail("A Meta não concluiu a autorização. Confira a elegibilidade do número e tente novamente.");
        else if (payload.event === "FINISH" || payload.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING") {
          if (!payload.data?.waba_id || (payload.event === "FINISH" && !payload.data?.phone_number_id)) {
            fail("A Meta não retornou os dados necessários para conectar o número.");
            return;
          }
          session = { event: payload.event, waba_id: String(payload.data.waba_id), phone_number_id: payload.data.phone_number_id ? String(payload.data.phone_number_id) : undefined };
          finish();
        }
      } catch { /* Mensagem sem relação com o Embedded Signup. */ }
    };
    const timeout = window.setTimeout(() => fail("A sessão da Meta expirou. Inicie a conexão novamente."), 1_800_000);
    window.addEventListener("message", listener);
    try {
      if (!window.FB) { fail("A autenticação da Meta não está disponível."); return; }
      window.FB.login((response) => {
        code = response.authResponse?.code ?? "";
        if (!code) { fail("A Meta não autorizou a conexão ou o popup foi fechado."); return; }
        finish();
      }, {
        config_id: config.config_id,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {}, featureType: config.feature_type, sessionInfoVersion: config.session_info_version, version: config.signup_version },
      });
    } catch { fail("O popup da Meta foi bloqueado. Permita popups para este site e tente novamente."); }
  });
}

