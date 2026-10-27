import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
