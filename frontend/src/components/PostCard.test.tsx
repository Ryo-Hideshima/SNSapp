import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PostCard } from "./PostCard";
import { useAuth } from "../auth/AuthContext";
import type { Post } from "../api/posts";

vi.mock("../auth/AuthContext");
const mockedUseAuth = vi.mocked(useAuth);

const post: Post = {
  id: 10,
  content: "hello world",
  createdAt: "2026-01-01T12:00:00",
  updatedAt: "2026-01-01T12:00:00",
  authorId: 1,
  authorUsername: "alice",
  authorDisplayName: "Alice",
  likeCount: 3,
  commentCount: 2,
  likedByCurrentUser: false,
};

describe("PostCard", () => {
  beforeEach(() => {
    vi.spyOn(window, "confirm");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not show owner actions when the current user is not the author", () => {
    mockedUseAuth.mockReturnValue({
      user: { userId: 2, username: "bob", displayName: "Bob" },
      isLoggedIn: true,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<PostCard post={post} onDelete={vi.fn()} onToggleLike={vi.fn()} />, { wrapper: MemoryRouter });

    expect(screen.queryByRole("button", { name: "削除" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "編集" })).not.toBeInTheDocument();
  });

  it("shows owner actions when the current user is the author", () => {
    mockedUseAuth.mockReturnValue({
      user: { userId: 1, username: "alice", displayName: "Alice" },
      isLoggedIn: true,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<PostCard post={post} onDelete={vi.fn()} onToggleLike={vi.fn()} />, { wrapper: MemoryRouter });

    expect(screen.getByRole("button", { name: "削除" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "編集" })).toHaveAttribute("href", "/posts/10/edit");
  });

  it("clicking the like button calls onToggleLike with the post id", async () => {
    mockedUseAuth.mockReturnValue({
      user: { userId: 2, username: "bob", displayName: "Bob" },
      isLoggedIn: true,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });
    const onToggleLike = vi.fn();
    const user = userEvent.setup();

    render(<PostCard post={post} onDelete={vi.fn()} onToggleLike={onToggleLike} />, { wrapper: MemoryRouter });
    await user.click(screen.getByRole("button", { name: /3/ }));

    expect(onToggleLike).toHaveBeenCalledWith(10);
  });

  it("shows a filled heart and liked style when likedByCurrentUser is true", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoggedIn: false,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <PostCard post={{ ...post, likedByCurrentUser: true }} onDelete={vi.fn()} onToggleLike={vi.fn()} />,
      { wrapper: MemoryRouter }
    );

    expect(screen.getByRole("button", { name: /❤/ })).toHaveClass("post-card__like-btn--liked");
  });

  it("deleting confirms first: cancel does not call onDelete", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    mockedUseAuth.mockReturnValue({
      user: { userId: 1, username: "alice", displayName: "Alice" },
      isLoggedIn: true,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });
    const onDelete = vi.fn();
    const user = userEvent.setup();

    render(<PostCard post={post} onDelete={onDelete} onToggleLike={vi.fn()} />, { wrapper: MemoryRouter });
    await user.click(screen.getByRole("button", { name: "削除" }));

    expect(onDelete).not.toHaveBeenCalled();
  });

  it("deleting confirms first: OK calls onDelete with the post id", async () => {
    vi.mocked(window.confirm).mockReturnValue(true);
    mockedUseAuth.mockReturnValue({
      user: { userId: 1, username: "alice", displayName: "Alice" },
      isLoggedIn: true,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });
    const onDelete = vi.fn();
    const user = userEvent.setup();

    render(<PostCard post={post} onDelete={onDelete} onToggleLike={vi.fn()} />, { wrapper: MemoryRouter });
    await user.click(screen.getByRole("button", { name: "削除" }));

    expect(onDelete).toHaveBeenCalledWith(10);
  });
});
