import { afterEach, describe, expect, it } from "vitest";
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  saveSession,
  updateTokens,
} from "./tokenStorage";

const user = { userId: 1, username: "alice", displayName: "Alice" };

describe("tokenStorage", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("getAccessToken/getRefreshToken return null when nothing is stored", () => {
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("saveSession stores tokens and user, retrievable via getters", () => {
    saveSession({ accessToken: "access1", refreshToken: "refresh1", user });

    expect(getAccessToken()).toBe("access1");
    expect(getRefreshToken()).toBe("refresh1");
    expect(getStoredUser()).toEqual(user);
  });

  it("updateTokens overwrites only the tokens, leaving the stored user intact", () => {
    saveSession({ accessToken: "access1", refreshToken: "refresh1", user });

    updateTokens("access2", "refresh2");

    expect(getAccessToken()).toBe("access2");
    expect(getRefreshToken()).toBe("refresh2");
    expect(getStoredUser()).toEqual(user);
  });

  it("clearSession removes all stored session data", () => {
    saveSession({ accessToken: "access1", refreshToken: "refresh1", user });

    clearSession();

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
  });

  it("getStoredUser returns null and cleans up when the stored value is corrupt JSON", () => {
    localStorage.setItem("sns_user", "{not valid json");

    expect(getStoredUser()).toBeNull();
    expect(localStorage.getItem("sns_user")).toBeNull();
  });
});
