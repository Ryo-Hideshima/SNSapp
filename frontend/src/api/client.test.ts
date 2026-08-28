import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authFetch, registerSessionExpiredHandler } from "./client";
import * as tokenStorage from "../auth/tokenStorage";
import * as authApi from "./auth";

vi.mock("./auth");

describe("authFetch", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    registerSessionExpiredHandler(() => {});
  });

  it("returns the response directly when the request succeeds (non-401)", async () => {
    tokenStorage.saveSession({
      accessToken: "access1",
      refreshToken: "refresh1",
      user: { userId: 1, username: "alice", displayName: "Alice" },
    });
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const response = await authFetch("/api/hello");

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("on 401, refreshes the token once and retries the original request", async () => {
    tokenStorage.saveSession({
      accessToken: "expired",
      refreshToken: "refresh1",
      user: { userId: 1, username: "alice", displayName: "Alice" },
    });
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.mocked(authApi.refresh).mockResolvedValue({
      accessToken: "new-access",
      refreshToken: "new-refresh",
      userId: 1,
      username: "alice",
      displayName: "Alice",
    });

    const response = await authFetch("/api/hello");

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(tokenStorage.getAccessToken()).toBe("new-access");
    expect(tokenStorage.getRefreshToken()).toBe("new-refresh");
    // 2回目のリクエストは更新後のアクセストークンで呼ばれる
    const [, secondInit] = vi.mocked(fetch).mock.calls[1];
    const headers = secondInit?.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer new-access");
  });

  it("on 401 with no refresh token stored, clears the session and calls the session-expired handler", async () => {
    tokenStorage.saveSession({
      accessToken: "expired",
      refreshToken: "",
      user: { userId: 1, username: "alice", displayName: "Alice" },
    });
    // getRefreshTokenが空文字を返す=リフレッシュトークンが無い扱いになる
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }));
    const onExpired = vi.fn();
    registerSessionExpiredHandler(onExpired);

    const response = await authFetch("/api/hello");

    expect(response.status).toBe(401);
    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it("on 401 when the refresh call itself fails, clears the session and calls the session-expired handler", async () => {
    tokenStorage.saveSession({
      accessToken: "expired",
      refreshToken: "refresh1",
      user: { userId: 1, username: "alice", displayName: "Alice" },
    });
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }));
    vi.mocked(authApi.refresh).mockRejectedValue(new Error("invalid refresh token"));
    const onExpired = vi.fn();
    registerSessionExpiredHandler(onExpired);

    const response = await authFetch("/api/hello");

    expect(response.status).toBe(401);
    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it("dedupes concurrent refresh attempts into a single refresh() call", async () => {
    tokenStorage.saveSession({
      accessToken: "expired",
      refreshToken: "refresh1",
      user: { userId: 1, username: "alice", displayName: "Alice" },
    });
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }));
    vi.mocked(authApi.refresh).mockResolvedValue({
      accessToken: "new-access",
      refreshToken: "new-refresh",
      userId: 1,
      username: "alice",
      displayName: "Alice",
    });

    await Promise.all([authFetch("/api/hello"), authFetch("/api/posts")]);

    expect(authApi.refresh).toHaveBeenCalledTimes(1);
  });
});
