import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";
import * as authApi from "../api/auth";
import * as tokenStorage from "./tokenStorage";

vi.mock("../api/auth");

describe("useAuth", () => {
  it("throws when used outside an AuthProvider", () => {
    // console.errorへの出力を抑制する(Reactがエラー境界なしのthrowをログ出力するため)
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useAuth())).toThrow("useAuth must be used within an AuthProvider");

    spy.mockRestore();
  });
});

describe("AuthProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("initializes user state from tokenStorage", () => {
    tokenStorage.saveSession({
      accessToken: "a",
      refreshToken: "r",
      user: { userId: 1, username: "alice", displayName: "Alice" },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.user).toEqual({ userId: 1, username: "alice", displayName: "Alice" });
    expect(result.current.isLoggedIn).toBe(true);
  });

  it("login() calls the API, saves the session, and updates user state", async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      accessToken: "a",
      refreshToken: "r",
      userId: 1,
      username: "alice",
      displayName: "Alice",
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      await result.current.login({ email: "alice@example.com", password: "password123" });
    });

    expect(result.current.user).toEqual({ userId: 1, username: "alice", displayName: "Alice" });
    expect(tokenStorage.getAccessToken()).toBe("a");
  });

  it("register() calls the API, saves the session, and updates user state", async () => {
    vi.mocked(authApi.register).mockResolvedValue({
      accessToken: "a",
      refreshToken: "r",
      userId: 2,
      username: "bob",
      displayName: "Bob",
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      await result.current.register({ username: "bob", email: "bob@example.com", password: "password123" });
    });

    expect(result.current.user).toEqual({ userId: 2, username: "bob", displayName: "Bob" });
  });

  it("logout() revokes the refresh token, clears the session, and resets user state", async () => {
    tokenStorage.saveSession({
      accessToken: "a",
      refreshToken: "r",
      user: { userId: 1, username: "alice", displayName: "Alice" },
    });
    vi.mocked(authApi.logout).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      await result.current.logout();
    });

    expect(authApi.logout).toHaveBeenCalledWith({ refreshToken: "r" });
    expect(result.current.user).toBeNull();
    expect(tokenStorage.getAccessToken()).toBeNull();
  });

  it("logout() still clears local session even if the server call fails", async () => {
    tokenStorage.saveSession({
      accessToken: "a",
      refreshToken: "r",
      user: { userId: 1, username: "alice", displayName: "Alice" },
    });
    vi.mocked(authApi.logout).mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(tokenStorage.getAccessToken()).toBeNull();
  });
});
