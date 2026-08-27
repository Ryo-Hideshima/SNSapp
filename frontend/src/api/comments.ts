import { authFetch } from "./client";
import { parseJsonResponse } from "./httpClient";

export interface Comment {
  id: number;
  content: string;
  createdAt: string;
  authorId: number;
  authorUsername: string;
  authorDisplayName: string;
}

async function authRequestJson<TResponse>(path: string, init: RequestInit = {}): Promise<TResponse> {
  const response = await authFetch(path, init);
  return parseJsonResponse<TResponse>(response);
}

export function listComments(postId: number): Promise<Comment[]> {
  return authRequestJson<Comment[]>(`/api/posts/${postId}/comments`);
}

export function createComment(postId: number, content: string): Promise<Comment> {
  return authRequestJson<Comment>(`/api/posts/${postId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

export function deleteComment(postId: number, commentId: number): Promise<void> {
  return authRequestJson<void>(`/api/posts/${postId}/comments/${commentId}`, { method: "DELETE" });
}
