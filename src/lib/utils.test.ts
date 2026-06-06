import { describe, it, expect } from "vitest";
import { cn, createQueryString, formatDate } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
    expect(cn("px-4", "px-2")).toBe("px-2");
    expect(cn("", false, null, undefined, "baz")).toBe("baz");
  });
});

describe("createQueryString", () => {
  it("builds query string from params", () => {
    const result = createQueryString({ page: "1", search: "hello" }, new URLSearchParams());
    expect(result).toContain("page=1");
    expect(result).toContain("search=hello");
  });

  it("removes null params", () => {
    const result = createQueryString({ page: null }, new URLSearchParams("page=1"));
    expect(result).toBe("");
  });

  it("merges with existing search params", () => {
    const result = createQueryString({ sort: "desc" }, new URLSearchParams("page=1"));
    expect(result).toContain("page=1");
    expect(result).toContain("sort=desc");
  });
});

describe("formatDate", () => {
  it("formats a date string", () => {
    const result = formatDate("2026-06-06");
    expect(result).toContain("2026");
  });

  it("accepts custom options", () => {
    const result = formatDate("2026-06-06", { year: "2-digit", month: "short" });
    expect(result.length).toBeGreaterThan(0);
  });
});
