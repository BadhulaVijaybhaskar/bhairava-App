import { describe, expect, it } from "vitest";
import { downloadCsv } from "@/lib/csv";

describe("downloadCsv", () => {
  it("creates a downloadable blob via DOM APIs when available", () => {
    if (typeof document === "undefined") {
      expect(typeof downloadCsv).toBe("function");
      return;
    }
    const clicks: string[] = [];
    const orig = URL.createObjectURL;
    URL.createObjectURL = () => "blob:test";
    const a = document.createElement("a");
    const origCreate = document.createElement.bind(document);
    document.createElement = ((tag: string) => {
      if (tag === "a") {
        a.click = () => clicks.push(a.download);
        return a;
      }
      return origCreate(tag);
    }) as typeof document.createElement;

    downloadCsv("audit.csv", ["A", "B"], [["1", "2"]]);
    expect(clicks[0]).toBe("audit.csv");

    URL.createObjectURL = orig;
    document.createElement = origCreate;
  });
});
