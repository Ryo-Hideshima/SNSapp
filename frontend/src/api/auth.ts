import { requestJson } from "./httpClient";

export { ApiError } from "./httpClient";

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  userId: number;
  username: string;
  displayName: string;
}

export interface HelloResponse {
  message: string;
}

function postJson<TResponse>(path: string, body: unknown): Promise<TResponse> {
  return requestJson<TResponse>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function register(request: RegisterRequest): Promise<AuthResponse> {
  return postJson<AuthResponse>("/api/auth/register", request);
}

export function login(request: LoginRequest): Promise<AuthResponse> {
  return postJson<AuthResponse>("/api/auth/login", request);
}

export function refresh(request: RefreshRequest): Promise<AuthResponse> {
  return postJson<AuthResponse>("/api/auth/refresh", request);
}

export function logout(request: RefreshRequest): Promise<void> {
  return postJson<void>("/api/auth/logout", request);
}
