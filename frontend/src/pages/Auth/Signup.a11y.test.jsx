import { axe } from "jest-axe";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import Signup from "./Signup";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, opts) => opts?.defaultValue ?? key,
    i18n: { language: "en" },
  }),
}));

vi.mock("../../contexts/LanguageContext", () => ({
  useLanguagePreference: () => ({
    language: "en",
    changeLanguage: vi.fn().mockResolvedValue(undefined),
    isSaving: false,
  }),
}));

vi.mock("../../auth/session", () => ({
  saveSession: vi.fn(),
}));

vi.mock("../../services/identityPreferenceApi", () => ({
  saveIdentityPreference: vi.fn().mockResolvedValue(null),
}));

function renderSignup() {
  return render(
    <MemoryRouter>
      <Signup />
    </MemoryRouter>,
  );
}

describe("Signup identity selector accessibility", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("has no obvious axe violations and labels the search input", async () => {
    const { container } = renderSignup();

    expect(
      screen.getByRole("searchbox", { name: /search identities/i }),
    ).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("provides accessible names and keyboard-accessible selection controls", async () => {
    renderSignup();
    const user = userEvent.setup();

    const list = screen.getByLabelText(/identity options/i);
    const checkboxes = within(list).getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThan(10);
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toHaveAccessibleName();
    });

    const nativeAmerican = screen.getByRole("checkbox", {
      name: /native american/i,
    });
    nativeAmerican.focus();
    await user.keyboard("[Space]");
    expect(nativeAmerican).toBeChecked();

    const indigenous = screen.getByRole("checkbox", { name: /^indigenous$/i });
    indigenous.focus();
    await user.keyboard("[Space]");
    expect(indigenous).toBeChecked();
  });

  it("announces selected state and keeps prefer-not-to-say behavior accessible", async () => {
    renderSignup();
    const user = userEvent.setup();

    const nativeAmerican = screen.getByRole("checkbox", {
      name: /native american/i,
    });
    await user.click(nativeAmerican);
    expect(nativeAmerican).toBeChecked();

    const preferNotToSay = screen.getByRole("checkbox", {
      name: /prefer not to say/i,
    });
    await user.click(preferNotToSay);

    expect(preferNotToSay).toBeChecked();
    expect(nativeAmerican).not.toBeChecked();
    expect(screen.getByRole("status")).toHaveTextContent(/selected/i);
  });

  it("requires a labeled custom identity when other identity is selected", async () => {
    renderSignup();
    const user = userEvent.setup();

    await user.click(screen.getByRole("checkbox", { name: /other identity/i }));

    const customInput = screen.getByRole("textbox", {
      name: /add your tribe, nation, or community/i,
    });
    expect(customInput).toBeInTheDocument();

    const submit = screen.getByRole("button", { name: /auth.signup/i });
    expect(submit).toBeDisabled();

    await user.type(customInput, "Nuxalk Nation");
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    await waitFor(() => {
      expect(submit).toBeEnabled();
    });
  });

  it("supports focus movement for expanded identity list and returns focus to trigger", async () => {
    renderSignup();
    const user = userEvent.setup();

    const hideButton = screen.getByRole("button", {
      name: /hide identity list/i,
    });
    await user.click(hideButton);

    const showButton = screen.getByRole("button", {
      name: /show identity list/i,
    });
    await user.click(showButton);

    const firstCheckbox = within(
      screen.getByLabelText(/identity options/i),
    ).getAllByRole("checkbox")[0];
    await waitFor(() => {
      expect(
        screen
          .getByLabelText(/identity options/i)
          .contains(document.activeElement),
      ).toBe(true);
    });

    await user.keyboard("{Escape}");
    expect(showButton).toHaveFocus();
  });
});
