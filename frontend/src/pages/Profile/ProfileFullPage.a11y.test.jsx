import { axe } from "jest-axe";
import { render, waitFor } from "@testing-library/react";
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

describe("Profile full-page accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("marakah_user_name", "Tester");
  });

  it("has no obvious axe violations on the full profile page", async () => {
    const { container } = render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(fetchIdentityPreference).toHaveBeenCalledWith("Tester");
      expect(fetchProfileStats).toHaveBeenCalled();
      expect(fetchProfileImage).toHaveBeenCalledWith("Tester");
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
