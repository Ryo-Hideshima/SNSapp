import { authFetch } from "./client";
import { parseJsonResponse } from "./httpClient";

export { ApiError } from "./httpClient";

export interface Post {
  id: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  authorId: number;
  authorUsername: string;
  authorDisplayName: string;
  likeCount: number;
  commentCount: number;
  likedByCurrentUser: boolean;
}

export interface LikeResponse {
  liked: boolean;
  likeCount: number;
}

export interface PostListResponse {
  posts: Post[];
  page: number;
  size: number;
  hasMore: boolean;
}

async function authRequestJson<TResponse>(path: string, init: RequestInit = {}): Promise<TResponse> {
  const response = await authFetch(path, init);
  return parseJsonResponse<TResponse>(response);
}

/** 通常のページング一覧。authorUsernameを指定すると、そのユーザーの投稿だけに絞り込める。 */
export function listPosts(
  params: { page?: number; size?: number; authorUsername?: string } = {}
): Promise<PostListResponse> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.size !== undefined) query.set("size", String(params.size));
  if (params.authorUsername !== undefined) query.set("authorUsername", params.authorUsername);
  return authRequestJson<PostListResponse>(`/api/posts?${query.toString()}`);
}

/** sinceIdより新しい投稿だけを取得する(新着チェック・手動更新用)。 */
export function listNewPosts(sinceId: number, size = 20): Promise<PostListResponse> {
  const query = new URLSearchParams({ sinceId: String(sinceId), size: String(size) });
  return authRequestJson<PostListResponse>(`/api/posts?${query.toString()}`);
}

export function getPost(id: number): Promise<Post> {
  return authRequestJson<Post>(`/api/posts/${id}`);
}

export function createPost(content: string): Promise<Post> {
  return authRequestJson<Post>("/api/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

export function updatePost(id: number, content: string): Promise<Post> {
  return authRequestJson<Post>(`/api/posts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

export function deletePost(id: number): Promise<void> {
  return authRequestJson<void>(`/api/posts/${id}`, { method: "DELETE" });
}

export function toggleLike(postId: number): Promise<LikeResponse> {
  return authRequestJson<LikeResponse>(`/api/posts/${postId}/likes`, { method: "POST" });
}
