import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RegisterPage } from "./RegisterPage";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/auth";

vi.mock("../auth/AuthContext");
const mockedUseAuth = vi.mocked(useAuth);

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

describe("RegisterPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("submitting the form registers (with displayName omitted when blank) and navigates to /timeline", async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    mockedUseAuth.mockReturnValue({ user: null, isLoggedIn: false, register, login: vi.fn(), logout: vi.fn() });
    const user = userEvent.setup();

    render(<RegisterPage />, { wrapper: MemoryRouter });
    await user.type(screen.getByLabelText("ユーザー名（@username）"), "alice");
    await user.type(screen.getByLabelText("メールアドレス"), "alice@example.com");
    await user.type(screen.getByLabelText("パスワード（8文字以上）"), "password123");
    await user.click(screen.getByRole("button", { name: "登録する" }));

    expect(register).toHaveBeenCalledWith({
      username: "alice",
      email: "alice@example.com",
      password: "password123",
      displayName: undefined,
    });
    expect(navigateMock).toHaveBeenCalledWith("/timeline");
  });

  it("shows the API error message when registration fails (e.g. duplicate email)", async () => {
    const register = vi.fn().mockRejectedValue(new ApiError(409, "このメールアドレスは既に使われています。"));
    mockedUseAuth.mockReturnValue({ user: null, isLoggedIn: false, register, login: vi.fn(), logout: vi.fn() });
    const user = userEvent.setup();

    render(<RegisterPage />, { wrapper: MemoryRouter });
    await user.type(screen.getByLabelText("ユーザー名（@username）"), "alice");
    await user.type(screen.getByLabelText("メールアドレス"), "alice@example.com");
    await user.type(screen.getByLabelText("パスワード（8文字以上）"), "password123");
    await user.click(screen.getByRole("button", { name: "登録する" }));

    expect(await screen.findByText("このメールアドレスは既に使われています。")).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
