import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProfileFlagAvatar from "./ProfileFlagAvatar";

function getFlagImage() {
  return document.querySelector(".profile-flag-avatar__flag");
}

function getFlagImages() {
  return document.querySelectorAll(".profile-flag-avatar__flag");
}

describe("ProfileFlagAvatar", () => {
  it("uses country mapping to render the correct flag", () => {
    render(
      <ProfileFlagAvatar
        avatarUrl="https://cdn.example.com/a.jpg"
        userName="Amina"
        country="Mexico"
      />,
    );

    expect(getFlagImage()).toHaveAttribute("src", "https://flagcdn.com/mx.svg");
  });

  it("uses ethnicity mapping when country is missing", () => {
    render(
      <ProfileFlagAvatar
        avatarUrl="https://cdn.example.com/a.jpg"
        userName="Amina"
        ethnicity="Ethiopian"
      />,
    );

    expect(getFlagImage()).toHaveAttribute("src", "https://flagcdn.com/et.svg");
  });

  it("keeps avatar image layered above the flag", () => {
    render(
      <ProfileFlagAvatar
        avatarUrl="https://cdn.example.com/a.jpg"
        userName="Amina"
        country="Mexico"
      />,
    );

    const flag = getFlagImage();
    const photo = screen.getByRole("img", { name: "Amina's profile" });
    expect(flag).not.toBeNull();
    expect(
      (flag.compareDocumentPosition(photo) &
        Node.DOCUMENT_POSITION_FOLLOWING) !==
        0,
    ).toBe(true);
  });

  it("shows initial fallback when avatar is missing", () => {
    render(
      <ProfileFlagAvatar userName="Yusuf" country="Mexico" variant="compact" />,
    );

    expect(screen.queryByRole("img", { name: "Yusuf's profile" })).toBeNull();
    expect(screen.getByText("Y")).toBeInTheDocument();
  });

  it("hides broken flag image and uses fallback background", () => {
    render(
      <ProfileFlagAvatar
        avatarUrl="https://cdn.example.com/a.jpg"
        userName="Amina"
        country="Mexico"
      />,
    );

    const flag = getFlagImage();
    expect(flag).not.toBeNull();
    fireEvent.error(flag);
    expect(getFlagImage()).toBeNull();
    expect(
      document.querySelector(".profile-flag-avatar__flag-fallback"),
    ).toBeInTheDocument();
  });

  it("applies waving animation class structure", () => {
    render(
      <ProfileFlagAvatar
        avatarUrl="https://cdn.example.com/a.jpg"
        userName="Amina"
        country="Mexico"
        variant="card"
      />,
    );

    expect(
      document.querySelector(".profile-flag-avatar__flag-wrapper"),
    ).toBeInTheDocument();
    expect(
      document.querySelector(".profile-flag-avatar--card"),
    ).toBeInTheDocument();
  });

  it("updates the flag when identity props change", () => {
    const { rerender } = render(
      <ProfileFlagAvatar
        avatarUrl="https://cdn.example.com/a.jpg"
        userName="Amina"
        country="Mexico"
      />,
    );

    expect(getFlagImage()).toHaveAttribute("src", "https://flagcdn.com/mx.svg");

    rerender(
      <ProfileFlagAvatar
        avatarUrl="https://cdn.example.com/a.jpg"
        userName="Amina"
        country="Pakistan"
      />,
    );

    expect(getFlagImage()).toHaveAttribute("src", "https://flagcdn.com/pk.svg");
  });

  it("renders a true two-flag split with left and right halves", () => {
    render(
      <ProfileFlagAvatar
        avatarUrl="https://cdn.example.com/a.jpg"
        userName="Amina"
        flagUrls={["https://flagcdn.com/mx.svg", "https://flagcdn.com/pk.svg"]}
      />,
    );

    expect(
      document.querySelector(".profile-flag-avatar__slot--split-left"),
    ).toBeInTheDocument();
    expect(
      document.querySelector(".profile-flag-avatar__slot--split-right"),
    ).toBeInTheDocument();
    expect(getFlagImages()).toHaveLength(2);
  });

  it("renders all selected flags in blended mode when 3+ flags are present", () => {
    render(
      <ProfileFlagAvatar
        avatarUrl="https://cdn.example.com/a.jpg"
        userName="Amina"
        flagUrls={[
          "https://flagcdn.com/mx.svg",
          "https://flagcdn.com/pk.svg",
          "https://flagcdn.com/et.svg",
          "https://flagcdn.com/ma.svg",
        ]}
      />,
    );

    expect(
      document.querySelector(".profile-flag-avatar--blend"),
    ).toBeInTheDocument();
    expect(getFlagImages()).toHaveLength(4);
  });

  it("contains reduced-motion CSS rules", () => {
    const currentFile = fileURLToPath(import.meta.url);
    const cssPath = path.join(
      path.dirname(currentFile),
      "ProfileFlagAvatar.css",
    );
    const css = fs.readFileSync(cssPath, "utf8");

    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("animation: none");
  });
});
