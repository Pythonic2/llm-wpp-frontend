import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "./api";
import type { Session, User } from "./types";

const originalAdapter = api.http.defaults.adapter;

describe("session API contract", () => {
  beforeEach(() => {
    document.cookie = "csrftoken=; Max-Age=0; path=/";
  });

  afterEach(() => {
    api.http.defaults.adapter = originalAdapter;
    document.cookie = "csrftoken=; Max-Age=0; path=/";
  });

  it("fetches CSRF before login and sends session credentials and CSRF on mutations", async () => {
    const user: User = {
      id: 1,
      username: "ana",
      email: "ana@example.com",
      first_name: "Ana",
      last_name: "Costa",
    };
    const session: Session = {
      user,
      companies: [{
        id: "company-id",
        name: "Gest Tech",
        slug: "gest-tech",
        created_at: "2026-01-01T12:00:00Z",
        role: "admin",
      }],
    };
    const calls: Array<{
      url: string | undefined;
      method: string | undefined;
      csrf: string | undefined;
      credentials: boolean | undefined;
    }> = [];

    api.http.defaults.adapter = async (config) => {
      const headers = config.headers;
      const csrfHeader = headers.get("X-CSRFToken");
      calls.push({
        url: config.url,
        method: config.method,
        csrf: typeof csrfHeader === "string" ? csrfHeader : undefined,
        credentials: config.withCredentials,
      });
      if (config.url === "/auth/csrf/") {
        document.cookie = "csrftoken=csrf-token; path=/";
        return { config, data: { csrfToken: "csrf-token" }, status: 200, statusText: "OK", headers: {} };
      }
      if (config.url === "/auth/login/") {
        return { config, data: session, status: 200, statusText: "OK", headers: {} };
      }
      if (config.url === "/auth/refresh/") {
        return { config, data: { user }, status: 200, statusText: "OK", headers: {} };
      }
      return { config, data: null, status: 204, statusText: "No Content", headers: {} };
    };

    await expect(api.login("ana@example.com", "password")).resolves.toEqual(session);
    await expect(api.refreshSession()).resolves.toEqual(user);
    await expect(api.logout()).resolves.toBeUndefined();

    expect(calls.map(({ url, method }) => [url, method])).toEqual([
      ["/auth/csrf/", "get"],
      ["/auth/login/", "post"],
      ["/auth/refresh/", "post"],
      ["/auth/logout/", "post"],
    ]);
    expect(calls[1]).toMatchObject({ csrf: "csrf-token", credentials: true });
    expect(calls[2]).toMatchObject({ csrf: "csrf-token", credentials: true });
    expect(calls[3]).toMatchObject({ csrf: "csrf-token", credentials: true });
  });

  it("sends manual messages with a fresh idempotency key", async () => {
    document.cookie = "csrftoken=csrf-token; path=/";
    const keys: string[] = [];
    api.http.defaults.adapter = async (config) => {
      const value = config.headers.get("Idempotency-Key");
      if (typeof value === "string") keys.push(value);
      return {
        config,
        data: {
          id: keys.length,
          external_id: `pending-${keys.length}`,
          direction: "out",
          message_type: "text",
          text: "Olá",
          status: "pending",
          ai_status: "na",
          response_to: null,
          created_at: "2026-01-01T12:00:00Z",
        },
        status: 201,
        statusText: "Created",
        headers: {},
      };
    };

    await api.sendMessage("company-id", 7, "Olá");
    await api.sendMessage("company-id", 7, "Olá");

    expect(keys).toHaveLength(2);
    expect(new Set(keys).size).toBe(2);
    for (const key of keys) {
      expect(key).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    }
  });
});

describe("business unit API scope", () => {
  const companyId = "11111111-1111-4111-8111-111111111111";
  const unitId = "22222222-2222-4222-8222-222222222222";

  afterEach(() => {
    api.http.defaults.adapter = originalAdapter;
    localStorage.removeItem(`gest-tech-unit:${companyId}`);
  });

  it("scopes lists and creation while allowing an explicit consolidated finance view", async () => {
    document.cookie = "csrftoken=csrf-token; path=/";
    api.setSelectedBusinessUnit(companyId, unitId);
    const calls: Array<{ url?: string; params?: Record<string, unknown>; data?: unknown }> = [];
    api.http.defaults.adapter = async (config) => {
      calls.push({ url: config.url, params: config.params, data: config.data });
      return { config, data: {}, status: 200, statusText: "OK", headers: {} };
    };

    await api.http.get(api.companyPath(companyId, "conversations/"));
    await api.http.post(api.companyPath(companyId, "knowledge-bases/"), { name: "Eventos" });
    await api.http.get(api.companyPath(companyId, "finance/dashboard/"), { params: { business_unit_id: "" } });

    expect(calls[0].params).toMatchObject({ business_unit_id: unitId });
    expect(JSON.parse(String(calls[1].data))).toMatchObject({ business_unit_id: unitId });
    expect(calls[2].params).toMatchObject({ business_unit_id: "" });
  });
});

describe("media API contract", () => {
  afterEach(() => {
    api.http.defaults.adapter = originalAdapter;
  });

  it("resolves root-relative media URLs against the API origin", async () => {
    let requestedUrl = "";
    const mediaBlob = new Blob(["image"], { type: "image/png" });
    api.http.defaults.adapter = async (config) => {
      requestedUrl = config.url ?? "";
      return { config, data: mediaBlob, status: 200, statusText: "OK", headers: {} };
    };

    await expect(api.getMediaAssetBlob("/media/company/photo.png")).resolves.toBe(mediaBlob);
    expect(requestedUrl).toBe(`${api.apiOrigin}/media/company/photo.png`);
  });

  it("downloads a message attachment from a root-relative API route", async () => {
    let requestedUrl = "";
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:message-test");
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    api.http.defaults.adapter = async (config) => {
      requestedUrl = config.url ?? "";
      return { config, data: new Blob(["video"]), status: 200, statusText: "OK", headers: {} };
    };
    try {
      await api.downloadMessageAttachment("/api/v1/companies/one/conversations/2/messages/3/attachment/", "video.mp4");
      expect(requestedUrl).toBe(`${api.apiOrigin}/api/v1/companies/one/conversations/2/messages/3/attachment/`);
      expect(click).toHaveBeenCalledOnce();
    } finally {
      createObjectURL.mockRestore();
      click.mockRestore();
    }
  });

  it("replaces an internal backend origin with the configured API origin", async () => {
    let requestedUrl = "";
    api.http.defaults.adapter = async (config) => {
      requestedUrl = config.url ?? "";
      return { config, data: new Blob(["image"]), status: 200, statusText: "OK", headers: {} };
    };

    await api.getMediaAssetBlob(
      "http://192.168.0.6/api/v1/companies/company-id/media-assets/asset-id/download/",
    );

    expect(requestedUrl).toBe(
      `${api.apiOrigin}/api/v1/companies/company-id/media-assets/asset-id/download/`,
    );
  });
});
