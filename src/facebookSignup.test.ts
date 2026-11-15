import { afterEach, describe, expect, it, vi } from "vitest";
import { launchEmbeddedSignup } from "./facebookSignup";
import type { EmbeddedSignupConfig } from "./types";

const config: EmbeddedSignupConfig = {
  app_id: "test-app", config_id: "test-config", api_version: "v26.0",
  feature_type: "whatsapp_business_app_onboarding", session_info_version: "3",
  signup_version: "v4", state: "single-use-state",
};

type FacebookResponse = { authResponse?: { code?: string } };
let loginCallback: (response: FacebookResponse) => void = () => {};

function installSdk() {
  window.FB = {
    init: vi.fn(),
    login: vi.fn((callback) => { loginCallback = callback; }),
  };
}

function session(event: string, data: Record<string, string>) {
  window.dispatchEvent(new MessageEvent("message", {
    origin: "https://www.facebook.com",
    data: JSON.stringify({ type: "WA_EMBEDDED_SIGNUP", event, data }),
  }));
}

afterEach(() => { delete window.FB; vi.restoreAllMocks(); });

describe("Embedded Signup V4", () => {
  it("calls FB.login synchronously and accepts a coexistence event with only WABA ID", async () => {
    installSdk();
    const result = launchEmbeddedSignup(config);
    expect(window.FB?.login).toHaveBeenCalledOnce();
    expect(window.FB?.login).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({
      config_id: "test-config", response_type: "code", override_default_response_type: true,
      extras: { setup: {}, featureType: "whatsapp_business_app_onboarding", sessionInfoVersion: "3", version: "v4" },
    }));
    session("FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING", { waba_id: "123" });
    loginCallback({ authResponse: { code: "single-use-code" } });
    await expect(result).resolves.toEqual({
      code: "single-use-code", waba_id: "123", phone_number_id: undefined,
      event: "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING", state: "single-use-state",
      standard_migration_consent: true,
    });
  });

  it("requires the number ID in the normal flow", async () => {
    installSdk();
    const result = launchEmbeddedSignup(config);
    session("FINISH", { waba_id: "123" });
    await expect(result).rejects.toThrow("dados necessários");
  });

  it("reports cancellation and blocked popups", async () => {
    installSdk();
    const cancelled = launchEmbeddedSignup(config);
    session("CANCEL", {});
    await expect(cancelled).rejects.toThrow("cancelada");
    window.FB!.login = vi.fn(() => { throw new Error("blocked"); });
    await expect(launchEmbeddedSignup(config)).rejects.toThrow("popup da Meta foi bloqueado");
  });
});
