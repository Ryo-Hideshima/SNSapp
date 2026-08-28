import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FollowListPage } from "./FollowListPage";
import { useAuth } from "../auth/AuthContext";
import * as usersApi from "../api/users";

vi.mock("../api/users", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/users")>();
  return { ...actual, listFollowing: vi.fn(), listFollowers: vi.fn(), toggleFollow: vi.fn() };
});
vi.mock("../auth/AuthContext");

let paramsMock: { username?: string } = { username: "alice" };
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useParams: () => paramsMock };
});

describe("FollowListPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
    paramsMock = { username: "alice" };
  });

  it("type='following' calls listFollowing and shows the results", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 1, username: "alice", displayName: "Alice" },
      isLoggedIn: true,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(usersApi.listFollowing).mockResolvedValue([
      { id: 2, username: "bob", displayName: "Bob", avatarUrl: null, followedByCurrentUser: true },
    ]);

    render(<FollowListPage type="following" />, { wrapper: MemoryRouter });

    expect(await screen.findByText("@bob")).toBeInTheDocument();
    expect(usersApi.listFollowing).toHaveBeenCalledWith("alice");
  });

  it("type='followers' calls listFollowers and shows an empty-state message when there are none", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 1, username: "alice", displayName: "Alice" },
      isLoggedIn: true,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(usersApi.listFollowers).mockResolvedValue([]);

    render(<FollowListPage type="followers" />, { wrapper: MemoryRouter });

    expect(await screen.findByText("フォロワーはいません。")).toBeInTheDocument();
    expect(usersApi.listFollowers).toHaveBeenCalledWith("alice");
  });

  it("does not show a follow button next to the current user's own row", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 1, username: "alice", displayName: "Alice" },
      isLoggedIn: true,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(usersApi.listFollowing).mockResolvedValue([
      { id: 1, username: "alice", displayName: "Alice", avatarUrl: null, followedByCurrentUser: false },
    ]);

    render(<FollowListPage type="following" />, { wrapper: MemoryRouter });

    await screen.findByText("@alice");
    expect(screen.queryByRole("button", { name: /フォロー/ })).not.toBeInTheDocument();
  });
});
