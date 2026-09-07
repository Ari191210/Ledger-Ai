import { describe, it, expect } from "vitest";
import { escapeControlCharsInStrings, parseModelJson } from "./json";

describe("model JSON repair", () => {
  it("leaves valid JSON exactly as it is", () => {
    const good = '{"text":"one\\ntwo","n":3,"ok":true,"list":[1,2]}';
    expect(escapeControlCharsInStrings(good)).toBe(good);
    expect(parseModelJson<{ text: string }>(good)!.text).toBe("one\ntwo");
  });

  it("recovers a real newline sitting inside a string", () => {
    const raw = '{"text":"first para\n\nsecond para"}';
    expect(JSON.parse.bind(null, raw)).toThrow();
    const parsed = parseModelJson<{ text: string }>(raw);
    expect(parsed!.text).toBe("first para\n\nsecond para");
  });

  it("keeps the structure when newlines sit between keys", () => {
    const raw = '{\n  "a": "x\ny",\n  "b": 2\n}';
    const parsed = parseModelJson<{ a: string; b: number }>(raw);
    expect(parsed).toEqual({ a: "x\ny", b: 2 });
  });

  it("does not treat an escaped quote as the end of a string", () => {
    const raw = '{"text":"he said \\"go\\" then\nleft"}';
    expect(parseModelJson<{ text: string }>(raw)!.text).toBe('he said "go" then\nleft');
  });

  it("handles a trailing backslash without escaping the closing quote", () => {
    const raw = '{"text":"path C:\\\\dir","n":1}';
    expect(parseModelJson<{ text: string; n: number }>(raw)).toEqual({ text: "path C:\\dir", n: 1 });
  });

  it("drops unprintable characters rather than escaping them", () => {
    const raw = '{"text":"a\u0007b"}';
    expect(parseModelJson<{ text: string }>(raw)!.text).toBe("ab");
  });

  it("repairs tabs and carriage returns too", () => {
    const raw = '{"text":"col1\tcol2\r\nrow"}';
    expect(parseModelJson<{ text: string }>(raw)!.text).toBe("col1\tcol2\r\nrow");
  });

  it("refuses genuinely broken JSON instead of guessing at it", () => {
    // Truncated: the repair must not close the object for it.
    expect(parseModelJson('{"text":"half an answer')).toBeNull();
    expect(parseModelJson('{"a":1,}')).toBeNull();
    expect(parseModelJson("not json at all")).toBeNull();
    expect(parseModelJson('{"a": undefined}')).toBeNull();
    expect(parseModelJson("")).toBeNull();
  });

  it("survives a long answer with many paragraph breaks", () => {
    const body = Array.from({ length: 40 }, (_, i) => `paragraph ${i}`).join("\n\n");
    const parsed = parseModelJson<{ scene: { name: string }; text: string }>(
      `{"scene":{"name":"projectile"},"text":"${body}"}`,
    );
    expect(parsed!.scene.name).toBe("projectile");
    expect(parsed!.text.split("\n\n")).toHaveLength(40);
  });
});
