import { render, screen, fireEvent } from "@testing-library/react";
import CombinedIdentityBadge from "./CombinedIdentityBadge";

describe("CombinedIdentityBadge accessibility", () => {
  it("describes a 50/50 badge accurately", () => {
    render(
      <CombinedIdentityBadge
        selectedOptions={[
          {
            id: "indigenous-cherokee",
            displayName: "Cherokee",
            visualType: "badge",
            badgeText: "CHK",
          },
          {
            id: "indigenous-maori",
            displayName: "Maori",
            visualType: "badge",
            badgeText: "MAO",
          },
        ]}
      />,
    );

    expect(
      screen.getByLabelText(/50\/50 combined identity badge/i),
    ).toBeInTheDocument();
  });

  it("adds meaningful labels to +count indicators", () => {
    render(
      <CombinedIdentityBadge
        selectedOptions={[
          { id: "a", displayName: "A", visualType: "badge", badgeText: "A" },
          { id: "b", displayName: "B", visualType: "badge", badgeText: "B" },
          { id: "c", displayName: "C", visualType: "badge", badgeText: "C" },
          { id: "d", displayName: "D", visualType: "badge", badgeText: "D" },
        ]}
      />,
    );

    expect(screen.getByText("+2")).toHaveAttribute(
      "aria-label",
      "2 additional selected identities",
    );
  });

  it("falls back to a labeled badge when a flag image fails", () => {
    render(
      <CombinedIdentityBadge
        selectedOptions={[
          {
            id: "native-american",
            displayName: "Native American",
            visualType: "flag",
            assetPath: "https://example.invalid/native-american.svg",
            accessibilityLabel: "Native American identity",
          },
        ]}
      />,
    );

    const image = screen.getByRole("img", {
      name: /native american identity/i,
    });
    fireEvent.error(image);

    expect(
      screen.queryByRole("img", { name: /native american identity/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("NA")).toBeInTheDocument();
  });
});
