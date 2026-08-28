import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchPage } from "./SearchPage";
import { useAuth } from "../auth/AuthContext";
import * as usersApi from "../api/users";

vi.mock("../api/users", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/users")>();
  return { ...actual, searchUsers: vi.fn(), toggleFollow: vi.fn() };
});
vi.mock("../auth/AuthContext");

describe("SearchPage", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 1, username: "me", displayName: "Me" },
      isLoggedIn: true,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("searching shows matching users", async () => {
    vi.mocked(usersApi.searchUsers).mockResolvedValue([
      { id: 2, username: "bob", displayName: "Bob", avatarUrl: null, followedByCurrentUser: false },
    ]);
    const user = userEvent.setup();

    render(<SearchPage />, { wrapper: MemoryRouter });
    await user.type(screen.getByPlaceholderText("ユーザー名または表示名で検索"), "bob");
    await user.click(screen.getByRole("button", { name: "検索" }));

    expect(usersApi.searchUsers).toHaveBeenCalledWith("bob");
    expect(await screen.findByText("@bob")).toBeInTheDocument();
  });

  it("shows a no-results message when the search returns nothing", async () => {
    vi.mocked(usersApi.searchUsers).mockResolvedValue([]);
    const user = userEvent.setup();

    render(<SearchPage />, { wrapper: MemoryRouter });
    await user.type(screen.getByPlaceholderText("ユーザー名または表示名で検索"), "zzz");
    await user.click(screen.getByRole("button", { name: "検索" }));

    expect(await screen.findByText("該当するユーザーが見つかりませんでした。")).toBeInTheDocument();
  });

  it("does not search when the keyword is blank (button stays disabled)", () => {
    render(<SearchPage />, { wrapper: MemoryRouter });

    expect(screen.getByRole("button", { name: "検索" })).toBeDisabled();
  });

  it("clicking a result's follow button toggles follow", async () => {
    vi.mocked(usersApi.searchUsers).mockResolvedValue([
      { id: 2, username: "bob", displayName: "Bob", avatarUrl: null, followedByCurrentUser: false },
    ]);
    vi.mocked(usersApi.toggleFollow).mockResolvedValue({ followed: true, followerCount: 1 });
    const user = userEvent.setup();

    render(<SearchPage />, { wrapper: MemoryRouter });
    await user.type(screen.getByPlaceholderText("ユーザー名または表示名で検索"), "bob");
    await user.click(screen.getByRole("button", { name: "検索" }));
    await user.click(await screen.findByRole("button", { name: "フォローする" }));

    expect(usersApi.toggleFollow).toHaveBeenCalledWith("bob");
    expect(await screen.findByRole("button", { name: "フォロー中" })).toBeInTheDocument();
  });
});
