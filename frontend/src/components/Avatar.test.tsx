import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar } from "./Avatar";

describe("Avatar", () => {
  it("renders an img element when avatarUrl is given", () => {
    render(<Avatar userId={1} displayName="Alice" avatarUrl="https://example.com/a.png" />);

    const img = screen.getByRole("img", { name: "Alice" });
    expect(img).toHaveAttribute("src", "https://example.com/a.png");
  });

  it("renders the uppercased first letter of displayName when avatarUrl is absent", () => {
    render(<Avatar userId={1} displayName="alice" avatarUrl={null} />);

    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("falls back to '?' when displayName is empty", () => {
    render(<Avatar userId={1} displayName="" avatarUrl={null} />);

    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("applies the size modifier class", () => {
    render(<Avatar userId={1} displayName="Alice" avatarUrl="https://example.com/a.png" size="lg" />);

    expect(screen.getByRole("img")).toHaveClass("avatar", "avatar--lg");
  });

  it("picks a deterministic background color based on userId", () => {
    const { container: c1 } = render(<Avatar userId={2} displayName="Bob" avatarUrl={null} />);
    const { container: c2 } = render(<Avatar userId={2} displayName="Bob" avatarUrl={null} />);

    const style1 = (c1.firstChild as HTMLElement).style.background;
    const style2 = (c2.firstChild as HTMLElement).style.background;
    expect(style1).toBe(style2);
  });
});
