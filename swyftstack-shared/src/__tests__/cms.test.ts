import { describe, it, expect } from "vitest";
import { slugifyCms, CMS_STATUSES, CMS_TYPES } from "../services/cms.js";
import { platformAssetKey } from "../services/platform-bucket.js";

describe("slugifyCms", () => {
  it("lower-cases and replaces non-alnum", () => {
    expect(slugifyCms("How We Ship Swyftstack!")).toBe("how-we-ship-swyftstack");
  });

  it("trims hyphens and caps length", () => {
    expect(slugifyCms("   --multi-word--   ")).toBe("multi-word");
    expect(slugifyCms("a".repeat(200)).length).toBeLessThanOrEqual(80);
  });

  it("handles already-clean slugs", () => {
    expect(slugifyCms("clean-slug")).toBe("clean-slug");
  });
});

describe("CMS constants", () => {
  it("exposes the documented types", () => {
    expect(CMS_TYPES).toEqual([
      "landing_page",
      "page",
      "blog",
      "testimonial",
      "comparison",
      "announcement",
      "news",
      "changelog",
      "docs",
      "faq",
    ]);
  });

  it("exposes the documented statuses", () => {
    expect(CMS_STATUSES).toEqual(["draft", "published", "archived"]);
  });
});

describe("platformAssetKey", () => {
  it("uses the /platform/marketing_data path prefix", () => {
    const key = platformAssetKey("hero.png", "marketing_data");
    // Path is relative to the bucket prefix (which itself is /platform).
    expect(key).toMatch(/^marketing_data\/\d{4}\/\d{2}\/[0-9a-f-]+-hero\.png$/);
  });

  it("sanitises hostile filenames", () => {
    const key = platformAssetKey("../../../etc/passwd", "marketing_data");
    expect(key).not.toContain("..");
    expect(key).not.toContain("/etc/");
  });

  it("supports a different kind", () => {
    const key = platformAssetKey("welcome.html", "email_assets");
    expect(key.startsWith("email_assets/")).toBe(true);
  });
});
