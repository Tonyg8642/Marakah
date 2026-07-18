import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import HeritageAvatar from "./HeritageAvatar";

function getFlagImages() {
  return document.querySelectorAll(".profile-flag-avatar__flag");
}

describe("HeritageAvatar", () => {
  it("renders one flag from one identity", () => {
    render(
      <HeritageAvatar
        userName="Amina"
        profileImageUrl="https://cdn.example.com/a.jpg"
        identities={["Mexican"]}
      />,
    );

    expect(getFlagImages()).toHaveLength(1);
    expect(getFlagImages()[0]).toHaveAttribute(
      "src",
      "https://flagcdn.com/mx.svg",
    );
  });

  it("renders a 50/50 split for two identities", () => {
    render(
      <HeritageAvatar
        userName="Amina"
        profileImageUrl="https://cdn.example.com/a.jpg"
        identities={["Mexican", "Pakistani"]}
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

  it("renders blended layout for three or more identities", () => {
    render(
      <HeritageAvatar
        userName="Amina"
        profileImageUrl="https://cdn.example.com/a.jpg"
        identities={["Mexican", "Pakistani", "Ethiopian", "Moroccan"]}
      />,
    );

    expect(
      document.querySelector(".profile-flag-avatar--blend"),
    ).toBeInTheDocument();
    expect(getFlagImages().length).toBeGreaterThanOrEqual(3);
  });

  it("supports flag plus neutral identity combination", () => {
    render(
      <HeritageAvatar
        userName="Amina"
        profileImageUrl="https://cdn.example.com/a.jpg"
        identities={[
          {
            id: "mex",
            displayName: "Mexican",
            flagUrl: "https://flagcdn.com/mx.svg",
            visualType: "flag",
          },
          {
            id: "aa",
            displayName: "African American",
            visualType: "neutral",
            badgeText: "AA",
          },
        ]}
      />,
    );

    expect(getFlagImages()).toHaveLength(1);
    expect(screen.getByText("AA")).toBeInTheDocument();
  });

  it("shows fallback when no identity is selected", () => {
    render(
      <HeritageAvatar
        userName="Amina"
        profileImageUrl="https://cdn.example.com/a.jpg"
      />,
    );

    expect(getFlagImages()).toHaveLength(0);
    expect(
      document.querySelector(".profile-flag-avatar__flag-fallback"),
    ).toBeInTheDocument();
  });

  it("falls back cleanly when a flag fails to load", () => {
    render(
      <HeritageAvatar
        userName="Amina"
        profileImageUrl="https://cdn.example.com/a.jpg"
        identities={["Mexican"]}
      />,
    );

    const flag = getFlagImages()[0];
    fireEvent.error(flag);
    expect(getFlagImages()).toHaveLength(0);
    expect(
      document.querySelector(".profile-flag-avatar__flag-fallback"),
    ).toBeInTheDocument();
  });

  it("keeps profile image layered above flags", () => {
    render(
      <HeritageAvatar
        userName="Amina"
        profileImageUrl="https://cdn.example.com/a.jpg"
        identities={["Mexican"]}
      />,
    );

    const flag = getFlagImages()[0];
    const photo = screen.getByRole("img", { name: "Amina's profile" });
    expect(
      (flag.compareDocumentPosition(photo) &
        Node.DOCUMENT_POSITION_FOLLOWING) !==
        0,
    ).toBe(true);
  });

  it("supports animated and non-animated variants", () => {
    const { rerender } = render(
      <HeritageAvatar
        userName="Amina"
        profileImageUrl="https://cdn.example.com/a.jpg"
        identities={["Mexican"]}
        animated
      />,
    );

    expect(document.querySelector(".profile-flag-avatar--static")).toBeNull();

    rerender(
      <HeritageAvatar
        userName="Amina"
        profileImageUrl="https://cdn.example.com/a.jpg"
        identities={["Mexican"]}
        animated={false}
      />,
    );

    expect(
      document.querySelector(".profile-flag-avatar--static"),
    ).toBeInTheDocument();
  });

  it("renders editable controls and handles upload/remove", async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn();
    const onRemove = vi.fn();

    render(
      <HeritageAvatar
        userName="Amina"
        profileImageUrl="https://cdn.example.com/a.jpg"
        identities={["Mexican"]}
        editable
        onUpload={onUpload}
        onRemove={onRemove}
      />,
    );

    const uploadButton = screen.getByRole("button", { name: /upload image/i });
    await user.click(uploadButton);

    const fileInput = screen.getByLabelText(/choose a profile photo/i);
    const file = new File([new Uint8Array([1, 2, 3])], "avatar.png", {
      type: "image/png",
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(onUpload.mock.calls[0][0]).toBe(file);

    await user.click(screen.getByRole("button", { name: /remove image/i }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("renders non-editable display variant without controls", () => {
    render(
      <HeritageAvatar
        userName="Amina"
        profileImageUrl="https://cdn.example.com/a.jpg"
        identities={["Mexican"]}
        editable={false}
      />,
    );

    expect(screen.queryByRole("button", { name: /upload image/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /remove image/i })).toBeNull();
  });

  it("provides an accessible combined-identity label", () => {
    render(
      <HeritageAvatar
        userName="Amina"
        profileImageUrl="https://cdn.example.com/a.jpg"
        identities={["Mexican", "Pakistani"]}
      />,
    );

    expect(
      screen.getByRole("group", {
        name: /Amina heritage avatar: Mexican, Pakistani/i,
      }),
    ).toBeInTheDocument();
  });

  it("shows initial fallback when profile image is missing", () => {
    render(<HeritageAvatar userName="Yusuf" identities={["Mexican"]} />);

    expect(screen.queryByRole("img", { name: "Yusuf's profile" })).toBeNull();
    expect(screen.getByText("Y")).toBeInTheDocument();
  });
});
