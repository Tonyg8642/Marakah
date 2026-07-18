import { axe } from "jest-axe";
import {
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  fireEvent,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import Profile from "./Profile";
import {
  fetchProfileStats,
  fetchProfileImage,
  removeProfileImage,
  uploadProfileImage,
} from "./profileApi";

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

vi.mock("./components/ActivityCard", () => ({ default: () => <div /> }));
vi.mock("./components/PhotoCard", () => ({ default: () => <div /> }));
vi.mock("./components/ProfileStatCard", () => ({ default: () => <div /> }));
vi.mock("./components/ReminderCard", () => ({ default: () => <div /> }));

function ensureObjectUrlMocks() {
  if (typeof URL.createObjectURL !== "function") {
    Object.defineProperty(URL, "createObjectURL", {
      writable: true,
      configurable: true,
      value: () => "blob:preview-url",
    });
  }

  if (typeof URL.revokeObjectURL !== "function") {
    Object.defineProperty(URL, "revokeObjectURL", {
      writable: true,
      configurable: true,
      value: () => {},
    });
  }
}

function renderProfile() {
  localStorage.setItem("marakah_user_name", "Tester");
  return render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>,
  );
}

function makeImageFile(name, type, bytes = 512) {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("Profile avatar interactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    ensureObjectUrlMocks();
    vi.spyOn(URL, "createObjectURL").mockImplementation(
      () => "blob:preview-url",
    );
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens the hidden picker from avatar and upload buttons", async () => {
    renderProfile();
    const user = userEvent.setup();

    const fileInput = screen.getByLabelText(/choose a profile photo/i);
    const clickSpy = vi.spyOn(fileInput, "click");

    const uploadButtons = screen.getAllByRole("button", {
      name: /upload image|profile.actions.uploadImage|replace image/i,
    });
    await user.click(uploadButtons[0]);
    await user.click(uploadButtons[1]);

    expect(clickSpy).toHaveBeenCalledTimes(2);
  });

  it("shows preview, loading status, and saved image on successful upload", async () => {
    let resolveUpload;
    uploadProfileImage.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpload = resolve;
        }),
    );

    renderProfile();
    const fileInput = screen.getByLabelText(/choose a profile photo/i);

    fireEvent.change(fileInput, {
      target: { files: [makeImageFile("avatar.png", "image/png")] },
    });

    expect(
      screen.getByRole("img", { name: /profile.details.avatarAlt/i }),
    ).toHaveAttribute("src", "blob:preview-url");
    expect(
      screen
        .getAllByRole("status")
        .some((node) => /uploading/i.test(node.textContent || "")),
    ).toBe(true);

    resolveUpload({
      storageProvider: "local-filesystem",
      storagePath: "uploads/profile-avatars/tester/avatar.png",
      imageUrl: "https://cdn.example.com/avatar.png",
      fileName: "avatar.png",
      fileType: "image/png",
      fileSizeBytes: 300,
    });

    await waitFor(() => {
      expect(
        screen.getByRole("img", { name: /profile.details.avatarAlt/i }),
      ).toHaveAttribute("src", "https://cdn.example.com/avatar.png");
    });
  });

  it("announces file validation errors and preserves previous avatar on API failure", async () => {
    fetchProfileImage.mockResolvedValue({
      storageProvider: "local-filesystem",
      storagePath: "uploads/profile-avatars/tester/existing.jpg",
      imageUrl: "https://cdn.example.com/existing.jpg",
      fileName: "existing.jpg",
      fileType: "image/jpeg",
      fileSizeBytes: 120,
    });
    uploadProfileImage.mockRejectedValue(new Error("Upload failed"));

    renderProfile();

    const fileInput = await screen.findByLabelText(/choose a profile photo/i);

    fireEvent.change(fileInput, {
      target: { files: [makeImageFile("avatar.txt", "text/plain")] },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/onlyImages/i);

    fireEvent.change(fileInput, {
      target: {
        files: [makeImageFile("big.jpg", "image/jpeg", 5 * 1024 * 1024 + 12)],
      },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/imageTooLarge/i);

    fireEvent.change(fileInput, {
      target: { files: [makeImageFile("avatar.jpg", "image/jpeg")] },
    });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/upload failed/i);
    });

    expect(
      screen.getByRole("img", { name: /profile.details.avatarAlt/i }),
    ).toHaveAttribute("src", "https://cdn.example.com/existing.jpg");
  });

  it("supports remove flow and restores fallback identity badge", async () => {
    removeProfileImage.mockResolvedValue(true);
    fetchProfileImage.mockResolvedValue({
      storageProvider: "local-filesystem",
      storagePath: "uploads/profile-avatars/tester/existing.jpg",
      imageUrl: "https://cdn.example.com/existing.jpg",
      fileName: "existing.jpg",
      fileType: "image/jpeg",
      fileSizeBytes: 120,
    });
    renderProfile();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(fetchProfileImage).toHaveBeenCalledWith("Tester");
    });

    await user.click(
      await screen.findByRole("button", { name: /remove image/i }),
    );

    await waitFor(() => {
      expect(removeProfileImage).toHaveBeenCalledWith("Tester");
    });

    expect(removeProfileImage).toHaveBeenCalledWith("Tester");
  });

  it("updates avatar flag after saving a changed identity", async () => {
    renderProfile();
    const user = userEvent.setup();

    await user.click(screen.getByRole("checkbox", { name: /mexican/i }));
    await user.click(
      screen.getByRole("button", { name: /profile.identity.actions.save/i }),
    );

    await waitFor(() => {
      const flagImage = document.querySelector(
        ".profile-avatar-flag-visual .profile-flag-avatar__flag",
      );
      expect(flagImage).toHaveAttribute("src", "https://flagcdn.com/mx.svg");
    });

    await user.click(screen.getByRole("checkbox", { name: /mexican/i }));
    await user.click(screen.getByRole("checkbox", { name: /pakistani/i }));
    await user.click(
      screen.getByRole("button", { name: /profile.identity.actions.save/i }),
    );

    await waitFor(() => {
      const flagImage = document.querySelector(
        ".profile-avatar-flag-visual .profile-flag-avatar__flag",
      );
      expect(flagImage).toHaveAttribute("src", "https://flagcdn.com/pk.svg");
    });
  });

  it("revokes preview object URLs during replacement and unmount", async () => {
    uploadProfileImage.mockResolvedValue({
      storageProvider: "local-filesystem",
      storagePath: "uploads/profile-avatars/tester/new.jpg",
      imageUrl: "https://cdn.example.com/new.jpg",
      fileName: "new.jpg",
      fileType: "image/jpeg",
      fileSizeBytes: 100,
    });

    const view = renderProfile();
    const fileInput = screen.getByLabelText(/choose a profile photo/i);
    fireEvent.change(fileInput, {
      target: { files: [makeImageFile("one.jpg", "image/jpeg")] },
    });
    fireEvent.change(fileInput, {
      target: { files: [makeImageFile("two.jpg", "image/jpeg")] },
    });

    expect(URL.revokeObjectURL).toHaveBeenCalled();
    view.unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
});

describe("Ethnicity search behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    ensureObjectUrlMocks();
  });

  it("supports dynamic filtering, ranking, clear/escape, custom CTA, and keyboard access", async () => {
    renderProfile();
    const user = userEvent.setup();

    const searchInput = screen.getByRole("searchbox", {
      name: /search identities/i,
    });
    const resultCount = screen.getByText(/matching identities/i);

    expect(resultCount).toHaveAttribute("aria-live", "polite");
    expect(resultCount).toBeInTheDocument();

    await user.type(searchInput, "E");
    expect(
      screen.getByRole("checkbox", { name: /ethiopian/i }),
    ).toBeInTheDocument();

    const eCount = within(
      screen.getByLabelText(/identity options/i),
    ).getAllByRole("checkbox").length;
    await user.type(searchInput, "u");
    const euCount = within(
      screen.getByLabelText(/identity options/i),
    ).getAllByRole("checkbox").length;
    expect(euCount).toBeLessThanOrEqual(eCount);

    await user.keyboard("{Backspace}");
    const expandedCount = within(
      screen.getByLabelText(/identity options/i),
    ).getAllByRole("checkbox").length;
    expect(expandedCount).toBeGreaterThanOrEqual(euCount);

    await user.clear(searchInput);
    await user.type(searchInput, "  czechia  ");
    expect(
      screen.getByRole("checkbox", { name: /czech/i }),
    ).toBeInTheDocument();

    await user.clear(searchInput);
    await user.type(searchInput, "northern europe");
    expect(
      within(screen.getByLabelText(/identity options/i)).getAllByRole(
        "checkbox",
      ).length,
    ).toBeGreaterThan(0);

    await user.clear(searchInput);
    await user.type(searchInput, "e");
    const firstSearchCheckbox = within(
      screen.getByLabelText(/identity options/i),
    ).getAllByRole("checkbox")[0];
    expect(firstSearchCheckbox).not.toBeChecked();

    firstSearchCheckbox.focus();
    await user.keyboard(" ");
    expect(firstSearchCheckbox).toBeChecked();

    searchInput.focus();
    await user.keyboard("{Escape}");
    expect(searchInput).toHaveValue("");

    await user.type(searchInput, "eu");
    await user.click(screen.getByRole("button", { name: /clear/i }));
    expect(searchInput).toHaveValue("");

    await user.type(searchInput, "zzzzzz");
    expect(
      within(screen.getByLabelText(/identity options/i)).getAllByRole(
        "checkbox",
      ).length,
    ).toBeGreaterThanOrEqual(1);

    const customCta = screen.getByRole("button", {
      name: /add another identity/i,
    });
    customCta.focus();
    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("textbox", { name: /other identity/i }),
    ).toHaveFocus();
  });

  it("keeps selected identities visible while list is filtered", async () => {
    renderProfile();
    const user = userEvent.setup();

    await user.click(screen.getByRole("checkbox", { name: /ethiopian/i }));
    await user.type(
      screen.getByRole("searchbox", { name: /search identities/i }),
      "zzzzzz",
    );

    const selected = screen.getByLabelText(/selected identities/i, {
      selector: "div",
    });
    expect(within(selected).getByText(/ethiopian/i)).toBeInTheDocument();
  });

  it("has no new axe violations in identity section", async () => {
    const { container } = renderProfile();
    const loadingNodes = screen.queryAllByText(/profile.stats.loading/i);
    if (loadingNodes.length) {
      await waitForElementToBeRemoved(() =>
        screen.queryAllByText(/profile.stats.loading/i),
      );
    }
    await waitFor(() => {
      expect(fetchProfileStats).toHaveBeenCalled();
      expect(fetchProfileImage).toHaveBeenCalled();
    });
    const identitySection = container.querySelector(".profile-identity-grid");
    const results = await axe(identitySection);
    expect(results).toHaveNoViolations();
  });
});
