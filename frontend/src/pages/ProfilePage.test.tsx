import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProfilePage } from "./ProfilePage";
import { useAuth } from "../auth/AuthContext";
import * as usersApi from "../api/users";
import * as postsApi from "../api/posts";

vi.mock("../api/users", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/users")>();
  return { ...actual, getProfile: vi.fn(), toggleFollow: vi.fn(), updateProfile: vi.fn(), uploadAvatar: vi.fn() };
});
vi.mock("../api/posts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/posts")>();
  return { ...actual, listPosts: vi.fn(), deletePost: vi.fn(), toggleLike: vi.fn() };
});
vi.mock("../auth/AuthContext");

let paramsMock: { username?: string } = {};
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useParams: () => paramsMock };
});

const profile: usersApi.UserProfile = {
  id: 1,
  username: "alice",
  displayName: "Alice",
  bio: "hello",
  avatarUrl: null,
  followingCount: 3,
  followerCount: 5,
  followedByCurrentUser: false,
};

describe("ProfilePage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows an edit button (not a follow button) when viewing your own profile", async () => {
    paramsMock = { username: "alice" };
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 1, username: "alice", displayName: "Alice" },
      isLoggedIn: true,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(usersApi.getProfile).mockResolvedValue(profile);
    vi.mocked(postsApi.listPosts).mockResolvedValue({ posts: [], hasMore: false, page: 1, size: 20 } as never);

    render(<ProfilePage />, { wrapper: MemoryRouter });

    expect(await screen.findByRole("button", { name: "プロフィールを編集" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "フォローする" })).not.toBeInTheDocument();
  });

  it("shows a follow button when viewing another user's profile, and clicking it toggles follow", async () => {
    paramsMock = { username: "alice" };
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 2, username: "bob", displayName: "Bob" },
      isLoggedIn: true,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(usersApi.getProfile).mockResolvedValue(profile);
    vi.mocked(postsApi.listPosts).mockResolvedValue({ posts: [], hasMore: false, page: 1, size: 20 } as never);
    vi.mocked(usersApi.toggleFollow).mockResolvedValue({ followed: true, followerCount: 6 });
    const user = userEvent.setup();

    render(<ProfilePage />, { wrapper: MemoryRouter });
    await user.click(await screen.findByRole("button", { name: "フォローする" }));

    expect(usersApi.toggleFollow).toHaveBeenCalledWith("alice");
    expect(await screen.findByRole("button", { name: "フォロー中" })).toBeInTheDocument();
  });

  it("shows an error message when the profile fetch fails", async () => {
    paramsMock = { username: "alice" };
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isLoggedIn: false,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(usersApi.getProfile).mockRejectedValue(new usersApi.ApiError(404, "ユーザーが見つかりません。"));
    vi.mocked(postsApi.listPosts).mockResolvedValue({ posts: [], hasMore: false, page: 1, size: 20 } as never);

    render(<ProfilePage />, { wrapper: MemoryRouter });

    expect(await screen.findByText("ユーザーが見つかりません。")).toBeInTheDocument();
  });
});
