import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import Login from "./Login";
import { saveSession } from "../../auth/session";
import { fetchPreferredLanguage } from "../../services/languagePreferenceApi";

const mockNavigate = vi.fn();
const mockChangeLanguage = vi.fn().mockResolvedValue(undefined);

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, opts) => opts?.defaultValue ?? key,
    i18n: { language: "en" },
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../contexts/LanguageContext", () => ({
  useLanguagePreference: () => ({
    language: "en",
    changeLanguage: mockChangeLanguage,
    isSaving: false,
  }),
}));

vi.mock("../../auth/session", () => ({
  NAME_KEY: "marakah_user_name",
  saveSession: vi.fn(),
}));

vi.mock("../../services/languagePreferenceApi", () => ({
  fetchPreferredLanguage: vi.fn().mockResolvedValue(null),
}));

function setMatchMedia(matches) {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches,
    media: "(max-width: 900px)",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
}

describe("Login authentication options", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setMatchMedia(false);
    fetchPreferredLanguage.mockResolvedValue(null);
  });

  it("does not render ping controls on mobile", () => {
    setMatchMedia(true);
    renderLogin();

    expect(screen.getByText("auth.mobileFlow")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "auth.sendPing" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "auth.approvePing" }),
    ).not.toBeInTheDocument();
  });

  it("allows name and password login on mobile", async () => {
    setMatchMedia(true);
    fetchPreferredLanguage.mockResolvedValue("ar");
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText("auth.username"), "john-doe");
    await user.type(screen.getByLabelText("auth.password"), "secret123");
    await user.click(screen.getByRole("button", { name: "auth.login" }));

    await waitFor(() => {
      expect(saveSession).toHaveBeenCalledWith("John Doe");
      expect(fetchPreferredLanguage).toHaveBeenCalledWith("John Doe");
      expect(mockChangeLanguage).toHaveBeenCalledWith("ar");
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("completes biometric login without ping", async () => {
    setMatchMedia(false);
    const user = userEvent.setup();

    const createCredential = vi.fn().mockResolvedValue({
      rawId: new Uint8Array([1, 2, 3, 4]).buffer,
    });

    navigator.credentials = {
      create: createCredential,
      get: vi.fn(),
    };

    globalThis.PublicKeyCredential = {
      isUserVerifyingPlatformAuthenticatorAvailable: vi
        .fn()
        .mockResolvedValue(true),
    };

    renderLogin();

    await user.click(screen.getByRole("button", { name: "auth.useBiometric" }));

    await waitFor(() => {
      expect(createCredential).toHaveBeenCalled();
      expect(saveSession).toHaveBeenCalledWith("Tony Glass");
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
    expect(localStorage.getItem("marakah_webauthn_credential_id")).toBeTruthy();
  });
});
