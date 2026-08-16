import { describe, expect, it } from "vitest";

import { DEFAULT_TEXT_FORMAT, nextTextFormat } from "./TextFormat.js";

describe("nextTextFormat — o toggle que Alt+clique num nó de texto alterna", () => {
  it("alterna plain → code → plain", () => {
    expect(DEFAULT_TEXT_FORMAT).toBe("plain");
    expect(nextTextFormat("plain")).toBe("code");
    expect(nextTextFormat("code")).toBe("plain");
  });

  it("dois Alt+clique seguidos voltam exatamente ao formato original", () => {
    expect(nextTextFormat(nextTextFormat("plain"))).toBe("plain");
    expect(nextTextFormat(nextTextFormat("code"))).toBe("code");
  });
});
