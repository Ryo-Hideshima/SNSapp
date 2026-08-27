const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

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

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body?.message === "string") {
      return body.message;
    }
  } catch {
    // ignore JSON parse failure and fall back below
  }
  return "予期しないエラーが発生しました。";
}

async function postJson<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new ApiError(response.status, await parseErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
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
