import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "./LoginPage";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/auth";

vi.mock("../auth/AuthContext");
const mockedUseAuth = vi.mocked(useAuth);

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

describe("LoginPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("submitting valid credentials logs in and navigates to /timeline", async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    mockedUseAuth.mockReturnValue({ user: null, isLoggedIn: false, register: vi.fn(), login, logout: vi.fn() });
    const user = userEvent.setup();

    render(<LoginPage />, { wrapper: MemoryRouter });
    await user.type(screen.getByLabelText("メールアドレス"), "alice@example.com");
    await user.type(screen.getByLabelText("パスワード"), "password123");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    expect(login).toHaveBeenCalledWith({ email: "alice@example.com", password: "password123" });
    expect(navigateMock).toHaveBeenCalledWith("/timeline");
  });

  it("shows the API error message when login fails", async () => {
    const login = vi.fn().mockRejectedValue(new ApiError(401, "メールアドレスまたはパスワードが違います。"));
    mockedUseAuth.mockReturnValue({ user: null, isLoggedIn: false, register: vi.fn(), login, logout: vi.fn() });
    const user = userEvent.setup();

    render(<LoginPage />, { wrapper: MemoryRouter });
    await user.type(screen.getByLabelText("メールアドレス"), "alice@example.com");
    await user.type(screen.getByLabelText("パスワード"), "wrongpass");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    expect(await screen.findByText("メールアドレスまたはパスワードが違います。")).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
