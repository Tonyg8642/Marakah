import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import Home from "./Home";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, opts) => {
      if (key === "home.welcome") {
        return `Welcome ${opts?.name || "Guest"}`;
      }
      return key;
    },
  }),
}));

describe("Home welcome greeting", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows Welcome with the signed-in user name", () => {
    localStorage.setItem("marakah_user_name", "Amina Noor");

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Welcome Amina Noor" })).toBeInTheDocument();
  });
});
