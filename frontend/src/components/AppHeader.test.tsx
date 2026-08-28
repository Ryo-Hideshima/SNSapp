import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppHeader } from "./AppHeader";
import { useAuth } from "../auth/AuthContext";

vi.mock("../auth/AuthContext");

const mockedUseAuth = vi.mocked(useAuth);

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

describe("AppHeader", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does not show the refresh button when onRefresh is not given", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoggedIn: false,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<AppHeader />, { wrapper: MemoryRouter });

    expect(screen.queryByRole("button", { name: "更新" })).not.toBeInTheDocument();
  });

  it("shows the refresh button and reflects the refreshing state when onRefresh is given", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoggedIn: false,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });
    const onRefresh = vi.fn();

    render(<AppHeader onRefresh={onRefresh} refreshing />, { wrapper: MemoryRouter });

    const button = screen.getByRole("button", { name: "更新中..." });
    expect(button).toBeDisabled();
  });

  it("calls onRefresh when the refresh button is clicked", async () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoggedIn: false,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });
    const onRefresh = vi.fn();
    const user = userEvent.setup();

    render(<AppHeader onRefresh={onRefresh} />, { wrapper: MemoryRouter });
    await user.click(screen.getByRole("button", { name: "更新" }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("shows the logged-in user's username link when a user is present", () => {
    mockedUseAuth.mockReturnValue({
      user: { userId: 1, username: "alice", displayName: "Alice" },
      isLoggedIn: true,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<AppHeader />, { wrapper: MemoryRouter });

    expect(screen.getByRole("link", { name: "@alice" })).toHaveAttribute("href", "/users/alice");
  });

  it("does not show a username link when no user is logged in", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoggedIn: false,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<AppHeader />, { wrapper: MemoryRouter });

    expect(screen.queryByRole("link", { name: /^@/ })).not.toBeInTheDocument();
  });

  it("logging out calls logout() then navigates to /login", async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    mockedUseAuth.mockReturnValue({
      user: { userId: 1, username: "alice", displayName: "Alice" },
      isLoggedIn: true,
      register: vi.fn(),
      login: vi.fn(),
      logout,
    });
    const user = userEvent.setup();

    render(<AppHeader />, { wrapper: MemoryRouter });
    await user.click(screen.getByRole("button", { name: "ログアウト" }));

    expect(logout).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith("/login");
  });
});
