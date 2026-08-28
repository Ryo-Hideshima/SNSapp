import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TimelinePage } from "./TimelinePage";
import { ApiError, listNewPosts, listPosts, toggleLike, type Post } from "../api/posts";
import { useAuth } from "../auth/AuthContext";

// ApiErrorは実クラスのまま残し、通信を行う関数だけをモックする
// (vi.mock()の丸ごと自動モックだとApiErrorのコンストラクタも壊れ、
//  テスト内でnew ApiError(...)してもmessage/statusが正しく載らないため)
vi.mock("../api/posts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/posts")>();
  return {
    ...actual,
    listPosts: vi.fn(),
    listNewPosts: vi.fn(),
    deletePost: vi.fn(),
    toggleLike: vi.fn(),
  };
});
vi.mock("../auth/AuthContext");

const mockedUseAuth = vi.mocked(useAuth);

const post: Post = {
  id: 1,
  content: "hello world",
  createdAt: "2026-01-01T12:00:00",
  updatedAt: "2026-01-01T12:00:00",
  authorId: 1,
  authorUsername: "alice",
  authorDisplayName: "Alice",
  likeCount: 0,
  commentCount: 0,
  likedByCurrentUser: false,
};

describe("TimelinePage", () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      user: { userId: 1, username: "alice", displayName: "Alice" },
      isLoggedIn: true,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("shows a loading state, then the fetched posts", async () => {
    vi.mocked(listPosts).mockResolvedValue({ posts: [post], hasMore: false, page: 1, size: 20 } as never);

    render(<TimelinePage />, { wrapper: MemoryRouter });

    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
    expect(await screen.findByText("hello world")).toBeInTheDocument();
  });

  it("shows an empty-state message when there are no posts", async () => {
    vi.mocked(listPosts).mockResolvedValue({ posts: [], hasMore: false, page: 1, size: 20 } as never);

    render(<TimelinePage />, { wrapper: MemoryRouter });

    expect(await screen.findByText("まだ投稿がありません。最初の投稿をしてみましょう。")).toBeInTheDocument();
  });

  it("shows an error message when the initial fetch fails", async () => {
    vi.mocked(listPosts).mockRejectedValue(new ApiError(500, "タイムラインの取得に失敗しました。"));

    render(<TimelinePage />, { wrapper: MemoryRouter });

    expect(await screen.findByText("タイムラインの取得に失敗しました。")).toBeInTheDocument();
  });

  it("toggling like on a post calls the API and updates the like count shown", async () => {
    vi.mocked(listPosts).mockResolvedValue({ posts: [post], hasMore: false, page: 1, size: 20 } as never);
    vi.mocked(toggleLike).mockResolvedValue({ liked: true, likeCount: 1 });
    const user = userEvent.setup();

    render(<TimelinePage />, { wrapper: MemoryRouter });
    await screen.findByText("hello world");
    await user.click(screen.getByRole("button", { name: /♡ 0/ }));

    expect(toggleLike).toHaveBeenCalledWith(1);
    await waitFor(() => expect(screen.getByRole("button", { name: /❤ 1/ })).toBeInTheDocument());
  });

  it("clicking manual refresh merges new posts to the top and scrolls to top", async () => {
    vi.mocked(listPosts).mockResolvedValue({ posts: [post], hasMore: false, page: 1, size: 20 } as never);
    const newPost: Post = { ...post, id: 2, content: "brand new post" };
    vi.mocked(listNewPosts).mockResolvedValue({ posts: [newPost], hasMore: false, page: 1, size: 20 } as never);
    const user = userEvent.setup();

    render(<TimelinePage />, { wrapper: MemoryRouter });
    await screen.findByText("hello world");
    await user.click(screen.getByRole("button", { name: "更新" }));

    expect(await screen.findByText("brand new post")).toBeInTheDocument();
    expect(listNewPosts).toHaveBeenCalledWith(1);
    expect(window.scrollTo).toHaveBeenCalled();
  });
});
