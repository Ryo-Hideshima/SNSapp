import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, parseJsonResponse, rawRequest, requestJson } from "./httpClient";

describe("httpClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("rawRequest", () => {
    it("prefixes the path with the configured base URL", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

      await rawRequest("/api/hello");

      expect(fetch).toHaveBeenCalledWith("http://localhost:8080/api/hello", expect.anything());
    });

    it("sets the Authorization header when an access token is given", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

      await rawRequest("/api/hello", {}, "token123");

      const [, init] = vi.mocked(fetch).mock.calls[0];
      const headers = init?.headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer token123");
    });

    it("does not set an Authorization header when no access token is passed", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

      await rawRequest("/api/hello");

      const [, init] = vi.mocked(fetch).mock.calls[0];
      const headers = init?.headers as Headers;
      expect(headers.has("Authorization")).toBe(false);
    });

    it("sets an empty-token Authorization header when accessToken is explicitly null", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

      await rawRequest("/api/hello", {}, null);

      const [, init] = vi.mocked(fetch).mock.calls[0];
      const headers = init?.headers as Headers;
      // Headers実装はヘッダ値の末尾空白をトリムするため"Bearer"になる(トークンが空文字であることの確認)
      expect(headers.get("Authorization")).toBe("Bearer");
    });
  });

  describe("parseJsonResponse", () => {
    it("returns the parsed JSON body when the response is ok", async () => {
      const response = new Response(JSON.stringify({ hello: "world" }), { status: 200 });

      const result = await parseJsonResponse<{ hello: string }>(response);

      expect(result).toEqual({ hello: "world" });
    });

    it("returns undefined for a 204 No Content response", async () => {
      const response = new Response(null, { status: 204 });

      const result = await parseJsonResponse(response);

      expect(result).toBeUndefined();
    });

    it("throws an ApiError with the backend message when the response is not ok", async () => {
      const response = new Response(JSON.stringify({ message: "壊れています" }), { status: 400 });

      await expect(parseJsonResponse(response)).rejects.toMatchObject({
        status: 400,
        message: "壊れています",
      });
    });

    it("falls back to a generic message when the error body is not valid JSON", async () => {
      const response = new Response("not json", { status: 500 });

      await expect(parseJsonResponse(response)).rejects.toMatchObject({
        status: 500,
        message: "予期しないエラーが発生しました。",
      });
    });

    it("ApiError instances carry their HTTP status", async () => {
      const response = new Response(JSON.stringify({ message: "x" }), { status: 403 });

      try {
        await parseJsonResponse(response);
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).status).toBe(403);
      }
    });
  });

  describe("requestJson", () => {
    it("performs a rawRequest without credentials and parses the JSON result", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

      const result = await requestJson<{ ok: boolean }>("/api/auth/login", { method: "POST" });

      expect(result).toEqual({ ok: true });
      const [, init] = vi.mocked(fetch).mock.calls[0];
      const headers = init?.headers as Headers;
      expect(headers.has("Authorization")).toBe(false);
    });
  });
});
