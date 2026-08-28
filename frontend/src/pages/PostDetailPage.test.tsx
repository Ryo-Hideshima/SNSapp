import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PostDetailPage } from "./PostDetailPage";
import { useAuth } from "../auth/AuthContext";
import * as postsApi from "../api/posts";
import * as commentsApi from "../api/comments";

vi.mock("../api/posts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/posts")>();
  return { ...actual, getPost: vi.fn(), toggleLike: vi.fn(), deletePost: vi.fn() };
});
vi.mock("../api/comments", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/comments")>();
  return { ...actual, listComments: vi.fn(), createComment: vi.fn(), deleteComment: vi.fn() };
});
vi.mock("../auth/AuthContext");

let paramsMock: { id?: string } = { id: "10" };
const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useParams: () => paramsMock, useNavigate: () => navigateMock };
});

const post: postsApi.Post = {
  id: 10,
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

describe("PostDetailPage", () => {
  beforeEach(() => {
    paramsMock = { id: "10" };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows the post content and its comments once loaded", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 2, username: "bob", displayName: "Bob" },
      isLoggedIn: true,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(postsApi.getPost).mockResolvedValue(post);
    vi.mocked(commentsApi.listComments).mockResolvedValue([
      { id: 1, content: "nice post", createdAt: "2026-01-01T13:00:00", authorId: 2, authorUsername: "bob", authorDisplayName: "Bob" },
    ]);

    render(<PostDetailPage />, { wrapper: MemoryRouter });

    expect(await screen.findByText("hello world")).toBeInTheDocument();
    expect(await screen.findByText("nice post")).toBeInTheDocument();
  });

  it("submitting a comment calls createComment and appends it to the list", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 2, username: "bob", displayName: "Bob" },
      isLoggedIn: true,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(postsApi.getPost).mockResolvedValue(post);
    vi.mocked(commentsApi.listComments).mockResolvedValue([]);
    vi.mocked(commentsApi.createComment).mockResolvedValue({
      id: 2,
      content: "great!",
      createdAt: "2026-01-01T14:00:00",
      authorId: 2,
      authorUsername: "bob",
      authorDisplayName: "Bob",
    });
    const user = userEvent.setup();

    render(<PostDetailPage />, { wrapper: MemoryRouter });
    await screen.findByText("hello world");
    await user.type(screen.getByLabelText("コメントする"), "great!");
    await user.click(screen.getByRole("button", { name: "コメントする" }));

    expect(commentsApi.createComment).toHaveBeenCalledWith(10, "great!");
    expect(await screen.findByText("great!")).toBeInTheDocument();
  });

  it("clicking the like button toggles like state and count", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 2, username: "bob", displayName: "Bob" },
      isLoggedIn: true,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(postsApi.getPost).mockResolvedValue(post);
    vi.mocked(commentsApi.listComments).mockResolvedValue([]);
    vi.mocked(postsApi.toggleLike).mockResolvedValue({ liked: true, likeCount: 1 });
    const user = userEvent.setup();

    render(<PostDetailPage />, { wrapper: MemoryRouter });
    await user.click(await screen.findByRole("button", { name: /♡ 0/ }));

    expect(postsApi.toggleLike).toHaveBeenCalledWith(10);
    expect(await screen.findByRole("button", { name: /❤ 1/ })).toBeInTheDocument();
  });

  it("deleting the post confirms first, then navigates to /timeline on success", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 1, username: "alice", displayName: "Alice" },
      isLoggedIn: true,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(postsApi.getPost).mockResolvedValue(post);
    vi.mocked(commentsApi.listComments).mockResolvedValue([]);
    vi.mocked(postsApi.deletePost).mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();

    render(<PostDetailPage />, { wrapper: MemoryRouter });
    await user.click(await screen.findByRole("button", { name: "削除" }));

    expect(postsApi.deletePost).toHaveBeenCalledWith(10);
    expect(navigateMock).toHaveBeenCalledWith("/timeline");
  });

  it("shows an error message when the post fails to load", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isLoggedIn: false,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(postsApi.getPost).mockRejectedValue(new postsApi.ApiError(404, "投稿が見つかりません。"));
    vi.mocked(commentsApi.listComments).mockResolvedValue([]);

    render(<PostDetailPage />, { wrapper: MemoryRouter });

    expect(await screen.findByText("投稿が見つかりません。")).toBeInTheDocument();
  });
});
