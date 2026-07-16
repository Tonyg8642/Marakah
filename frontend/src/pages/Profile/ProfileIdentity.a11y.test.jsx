import { axe } from "jest-axe";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import Profile from "./Profile";
import { fetchIdentityPreference } from "../../services/identityPreferenceApi";
import { fetchProfileImage, fetchProfileStats } from "./profileApi";

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

vi.mock("../../services/identityPreferenceApi", () => ({
  fetchIdentityPreference: vi.fn().mockResolvedValue(null),
  saveIdentityPreference: vi.fn().mockResolvedValue(null),
}));

vi.mock("./profileApi", () => ({
  fetchProfileStats: vi.fn().mockResolvedValue(null),
  fetchProfileImage: vi.fn().mockResolvedValue(null),
  uploadProfileImage: vi.fn().mockResolvedValue(null),
  removeProfileImage: vi.fn().mockResolvedValue(true),
}));

vi.mock("./components/ActivityCard", () => ({
  default: () => <div />,
}));
vi.mock("./components/PhotoCard", () => ({
  default: () => <div />,
}));
vi.mock("./components/ProfileStatCard", () => ({
  default: () => <div />,
}));
vi.mock("./components/ReminderCard", () => ({
  default: () => <div />,
}));

function renderProfile() {
  localStorage.setItem("marakah_user_name", "Tester");
  return render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>,
  );
}

async function waitForProfileAsyncEffects() {
  await waitFor(() => {
    expect(fetchIdentityPreference).toHaveBeenCalledWith("Tester");
    expect(fetchProfileStats).toHaveBeenCalled();
    expect(fetchProfileImage).toHaveBeenCalledWith("Tester");
  });
}

function findIdentitySection() {
  const heading = screen.getByRole("heading", {
    name: /profile.identity.title/i,
  });
  return heading.closest("section");
}

describe("Profile identity editor accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("has no obvious axe violations and labels the profile identity search input", async () => {
    const { container } = renderProfile();

    expect(
      screen.getByRole("searchbox", { name: /search identities/i }),
    ).toBeInTheDocument();

    await waitForProfileAsyncEffects();

    const identitySection = container.querySelector(".profile-identity-grid");
    expect(identitySection).toBeTruthy();
    const results = await axe(identitySection);
    expect(results).toHaveNoViolations();
  });

  it("gives each identity option an accessible name and announces checked state", async () => {
    renderProfile();
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
    await user.click(nativeAmerican);
    expect(nativeAmerican).toBeChecked();
  });

  it("exposes a labeled custom identity input and clear save-state messaging", async () => {
    renderProfile();
    const user = userEvent.setup();

    const saveButton = screen.getByRole("button", {
      name: /profile.identity.actions.save/i,
    });
    expect(saveButton).toHaveAttribute(
      "aria-describedby",
      "profile-identity-save-help",
    );

    await user.click(screen.getByRole("checkbox", { name: /other identity/i }));

    const customInput = screen.getByRole("textbox", {
      name: /other identity/i,
    });
    expect(customInput).toBeInTheDocument();

    await user.type(customInput, "Dene Nation");
    const identitySection = findIdentitySection();
    expect(identitySection).toBeTruthy();
    await user.click(
      within(identitySection).getByRole("button", { name: /^add$/i }),
    );

    await waitFor(() => {
      expect(saveButton).toBeEnabled();
    });
  });

  it("returns focus to the list trigger when the expanded list closes", async () => {
    renderProfile();
    const user = userEvent.setup();

    const hideButton = screen.getByRole("button", {
      name: /hide identity list/i,
    });
    await user.click(hideButton);

    const showButton = screen.getByRole("button", {
      name: /show identity list/i,
    });
    await user.click(showButton);

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

  it("narrows identity options on each keystroke and expands when query is cleared", async () => {
    renderProfile();
    const user = userEvent.setup();

    const searchInput = screen.getByRole("searchbox", {
      name: /search identities/i,
    });

    await user.type(searchInput, "p");
    const pCount = Number(
      screen.getByText(/matching identities/i).textContent?.match(/\d+/)?.[0] ||
        0,
    );

    await user.type(searchInput, "u");
    const puCount = Number(
      screen.getByText(/matching identities/i).textContent?.match(/\d+/)?.[0] ||
        0,
    );

    expect(puCount).toBeLessThanOrEqual(pCount);
    expect(
      screen.getByRole("checkbox", { name: /puerto rican/i }),
    ).toBeInTheDocument();

    await user.keyboard("{Backspace}");
    expect(
      screen.getByRole("checkbox", { name: /pakistani/i }),
    ).toBeInTheDocument();

    await user.clear(searchInput);
    expect(
      screen.getByRole("checkbox", { name: /ethiopian/i }),
    ).toBeInTheDocument();
  });

  it("clears search input when escape is pressed while focused", async () => {
    renderProfile();
    const user = userEvent.setup();

    const searchInput = screen.getByRole("searchbox", {
      name: /search identities/i,
    });
    await user.type(searchInput, "euro");
    expect(searchInput).toHaveValue("euro");

    searchInput.focus();
    await user.keyboard("{Escape}");
    expect(searchInput).toHaveValue("");
  });
});
