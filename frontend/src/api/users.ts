import { authFetch } from "./client";
import { parseJsonResponse } from "./httpClient";

export { ApiError } from "./httpClient";

export interface UserProfile {
  id: number;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  followingCount: number;
  followerCount: number;
  followedByCurrentUser: boolean;
}

export interface UserSummary {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  followedByCurrentUser: boolean;
}

export interface FollowResponse {
  followed: boolean;
  followerCount: number;
}

export interface UpdateProfileRequest {
  displayName: string;
  bio: string;
  avatarUrl: string | null;
}

async function authRequestJson<TResponse>(path: string, init: RequestInit = {}): Promise<TResponse> {
  const response = await authFetch(path, init);
  return parseJsonResponse<TResponse>(response);
}

export function getProfile(username: string): Promise<UserProfile> {
  return authRequestJson<UserProfile>(`/api/users/${username}`);
}

export function updateProfile(request: UpdateProfileRequest): Promise<UserProfile> {
  return authRequestJson<UserProfile>("/api/users/me", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
}

export function toggleFollow(username: string): Promise<FollowResponse> {
  return authRequestJson<FollowResponse>(`/api/users/${username}/follow`, { method: "POST" });
}

export function listFollowing(username: string): Promise<UserSummary[]> {
  return authRequestJson<UserSummary[]>(`/api/users/${username}/following`);
}

export function listFollowers(username: string): Promise<UserSummary[]> {
  return authRequestJson<UserSummary[]>(`/api/users/${username}/followers`);
}
