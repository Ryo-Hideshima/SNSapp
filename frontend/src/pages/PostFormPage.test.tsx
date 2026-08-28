import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PostFormPage } from "./PostFormPage";
import { useAuth } from "../auth/AuthContext";
import * as postsApi from "../api/posts";

vi.mock("../api/posts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/posts")>();
  return { ...actual, createPost: vi.fn(), updatePost: vi.fn(), getPost: vi.fn() };
});
vi.mock("../auth/AuthContext");

const navigateMock = vi.fn();
let paramsMock: { id?: string } = {};
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock, useParams: () => paramsMock };
});

describe("PostFormPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
    paramsMock = {};
  });

  it("in create mode (no id param), submitting calls createPost and navigates to /timeline", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 1, username: "alice", displayName: "Alice" },
      isLoggedIn: true,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(postsApi.createPost).mockResolvedValue({} as never);
    const user = userEvent.setup();

    render(<PostFormPage />, { wrapper: MemoryRouter });
    await user.type(screen.getByLabelText("本文"), "hello world");
    await user.click(screen.getByRole("button", { name: "投稿する" }));

    expect(postsApi.createPost).toHaveBeenCalledWith("hello world");
    expect(navigateMock).toHaveBeenCalledWith("/timeline");
  });

  it("in edit mode (id param present), loads the existing content then submitting calls updatePost", async () => {
    paramsMock = { id: "42" };
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 1, username: "alice", displayName: "Alice" },
      isLoggedIn: true,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(postsApi.getPost).mockResolvedValue({ content: "original content" } as never);
    vi.mocked(postsApi.updatePost).mockResolvedValue({} as never);
    const user = userEvent.setup();

    render(<PostFormPage />, { wrapper: MemoryRouter });
    const textarea = await screen.findByDisplayValue("original content");
    await user.clear(textarea);
    await user.type(textarea, "edited content");
    await user.click(screen.getByRole("button", { name: "更新する" }));

    expect(postsApi.updatePost).toHaveBeenCalledWith(42, "edited content");
    expect(navigateMock).toHaveBeenCalledWith("/timeline");
  });
});
