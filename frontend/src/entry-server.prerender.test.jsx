// @vitest-environment node

import { render } from "./entry-server";

describe("entry-server prerender", () => {
  it("renders translated signup content instead of translation keys", async () => {
    const result = await render("/signup", "https://marakah.vercel.app");

    expect(result.appHtml).toContain("Create Account");
    expect(result.appHtml).not.toContain("auth.createAccount");
    expect(result.appHtml).not.toContain("Switched to client rendering");
  });
});
