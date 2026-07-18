import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import Restaurants from "./Restaurants";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, opts) => opts?.defaultValue ?? key,
    i18n: { language: "en" },
  }),
}));

const mockCuisines = [
  {
    id: "all-halal",
    name: "All Halal",
    category: "top",
    isTopLevel: true,
    countryCode: "hl",
  },
  {
    id: "arab",
    name: "All Arab ethnicities",
    category: "top",
    isTopLevel: true,
    countryCode: "sa",
  },
  {
    id: "desi",
    name: "Desi",
    category: "top",
    isTopLevel: true,
    countryCode: "pk",
  },
  {
    id: "indonesian",
    name: "Indonesian",
    category: "top",
    isTopLevel: true,
    countryCode: "id",
  },
  {
    id: "other-halal-cuisines",
    name: "Other halal spots",
    category: "top",
    isTopLevel: true,
    countryCode: "hl",
  },
  {
    id: "halal-mexican",
    name: "Halal Mexican",
    category: "fusion",
    isTopLevel: false,
    countryCode: "mx",
  },
];

const mockSearchRows = [
  {
    placeId: "p1",
    name: "Al Noor Grill",
    halalStatus: "verified-halal",
    halalEvidence: [{ source: "official-website" }],
    cuisine: "All Arab ethnicities",
    address: "10 Main St",
    rating: 4.7,
    reviewCount: 121,
    distance: 1.2,
    drivingDistanceText: "2.1 mi",
    drivingTimeText: "8 min",
    location: { lat: 40.1, lng: -73.9 },
    menuUrl: "https://example.com/menu",
    menuSource: "official-website",
    websiteUrl: "https://example.com",
  },
  {
    placeId: "p2",
    name: "Zabiha Corner",
    halalStatus: "halal-claimed",
    halalEvidence: [{ source: "listing-name-address" }],
    cuisine: "Desi",
    address: "22 Pine Ave",
    rating: 4.1,
    reviewCount: 52,
    distance: 3.8,
    drivingDistanceText: "4.4 mi",
    drivingTimeText: "13 min",
    location: { lat: 40.2, lng: -73.8 },
    menuUrl: null,
    menuSource: null,
    websiteUrl: null,
  },
];

function makeSearchPayload(restaurants = mockSearchRows) {
  return {
    success: true,
    restaurants,
    pagination: {
      page: 1,
      pageSize: 8,
      totalCount: restaurants.length,
      totalPages: 1,
    },
    disclaimer: "Always confirm halal status with each restaurant.",
  };
}

function setupFetch() {
  const fetchMock = vi.fn(async (url) => {
    const value = String(url);
    if (value.includes("/api/restaurants/cuisines")) {
      return {
        ok: true,
        json: async () => ({ success: true, cuisines: mockCuisines }),
      };
    }

    if (value.includes("/api/restaurants/search")) {
      return {
        ok: true,
        json: async () => makeSearchPayload(),
      };
    }

    throw new Error(`Unexpected fetch url: ${value}`);
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function setupGeolocation() {
  const geolocation = {
    getCurrentPosition: vi.fn((onSuccess) => {
      onSuccess({
        coords: {
          latitude: 40.12,
          longitude: -73.95,
        },
      });
    }),
  };

  Object.defineProperty(global.navigator, "geolocation", {
    value: geolocation,
    configurable: true,
    writable: true,
  });

  return geolocation;
}

function renderRestaurants() {
  return render(
    <MemoryRouter>
      <Restaurants />
    </MemoryRouter>,
  );
}

describe("Restaurants halal-first UI", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    setupFetch();
    setupGeolocation();
  });

  it("renders halal-first intro text and badge", async () => {
    renderRestaurants();

    expect(
      screen.getByRole("heading", {
        name: "What do we feel like eating right now?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Explore halal food from around the world."),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Only halal and Muslim cuisine results are shown."),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /all halal/i }),
      ).toBeInTheDocument();
    });
  });

  it("uses halal-only statuses by default and includes unverified when toggled", async () => {
    const fetchMock = setupFetch();
    renderRestaurants();
    const user = userEvent.setup();

    const searchButton = await screen.findByRole("button", { name: "Search" });
    await user.click(searchButton);

    await waitFor(() => {
      const searchCall = fetchMock.mock.calls
        .map((args) => String(args[0]))
        .find((url) => url.includes("/api/restaurants/search"));
      expect(searchCall).toContain("halalOnly=true");
      expect(searchCall).toContain(
        "halalStatus=verified-halal%2Chalal-listed%2Chalal-claimed",
      );
    });

    await user.click(
      screen.getByRole("checkbox", { name: /show unverified/i }),
    );

    await waitFor(() => {
      const allSearchCalls = fetchMock.mock.calls
        .map((args) => String(args[0]))
        .filter((url) => url.includes("/api/restaurants/search"));
      const lastCall = allSearchCalls[allSearchCalls.length - 1] || "";
      expect(lastCall).toContain("halalOnly=false");
      expect(lastCall).toContain(
        "halalStatus=verified-halal%2Chalal-listed%2Chalal-claimed%2Chalal-not-verified",
      );
    });
  });

  it("shows halal status labels and evidence lines on cards", async () => {
    renderRestaurants();

    await waitFor(() => {
      expect(screen.getByText("Verified Halal")).toBeInTheDocument();
    });

    expect(screen.getByText("Halal Claimed")).toBeInTheDocument();
    expect(screen.getAllByText(/Evidence source:/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Confirm halal status directly with the restaurant.")
        .length,
    ).toBeGreaterThan(0);
  });

  it("prioritizes starts-with name matches in client-side name filtering", async () => {
    const fetchMock = vi.fn(async (url) => {
      const value = String(url);
      if (value.includes("/api/restaurants/cuisines")) {
        return {
          ok: true,
          json: async () => ({ success: true, cuisines: mockCuisines }),
        };
      }

      return {
        ok: true,
        json: async () =>
          makeSearchPayload([
            { ...mockSearchRows[1], name: "Corner Halal Bistro" },
            { ...mockSearchRows[0], name: "Halal Corner House" },
          ]),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    renderRestaurants();
    const user = userEvent.setup();

    await user.type(
      await screen.findByRole("searchbox", {
        name: /search halal restaurants by name/i,
      }),
      "halal",
    );

    await waitFor(() => {
      const headings = screen.getAllByRole("heading", { level: 3 });
      const names = headings.map((item) => item.textContent);
      expect(names[0]).toBe("Halal Corner House");
    });
  });
});
