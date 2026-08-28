import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "./ProtectedRoute";
import { useAuth } from "./AuthContext";

vi.mock("./AuthContext");
const mockedUseAuth = vi.mocked(useAuth);

function renderWithRoutes() {
  return render(
    <MemoryRouter initialEntries={["/protected"]}>
      <Routes>
        <Route path="/login" element={<div>ログイン画面</div>} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <div>保護されたコンテンツ</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  it("redirects to /login when not logged in", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoggedIn: false,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRoutes();

    expect(screen.getByText("ログイン画面")).toBeInTheDocument();
    expect(screen.queryByText("保護されたコンテンツ")).not.toBeInTheDocument();
  });

  it("renders children when logged in", () => {
    mockedUseAuth.mockReturnValue({
      user: { userId: 1, username: "alice", displayName: "Alice" },
      isLoggedIn: true,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRoutes();

    expect(screen.getByText("保護されたコンテンツ")).toBeInTheDocument();
  });
});
