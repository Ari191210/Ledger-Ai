import { describe, expect, it } from "vitest";
import { scrubBreadcrumb, scrubEvent } from "../sentry.shared";

/**
 * The privacy page tells students that Anthropic is the only third party their
 * study data reaches. Turning Sentry on puts a second processor in the picture,
 * and these two functions are what keep the sentence true rather than merely
 * well-intentioned: a crash report is not supposed to carry study data, but it
 * picks some up by accident unless something takes it back out.
 *
 * Most of this product's users are legally children. That is the reason the bar
 * here is "prove it", not "we would not do that".
 */

describe("what a crash report is allowed to carry", () => {
  it("drops console breadcrumbs entirely", () => {
    // console.error in this codebase quotes real rows, including one line added
    // the same week about a student's mistake_reviews.
    expect(scrubBreadcrumb({ category: "console", data: { arguments: ["topic: mole concept"] } })).toBeNull();
  });

  it("keeps the breadcrumbs that are only about navigation", () => {
    const crumb = scrubBreadcrumb({ category: "navigation", data: { from: "/dashboard", to: "/score" } });
    expect(crumb).not.toBeNull();
  });

  it("takes the query string off a breadcrumb url", () => {
    // A topic or a search term rides in a query string and is study data.
    const crumb = scrubBreadcrumb({ category: "fetch", data: { url: "https://studyledger.in/tools/doubt?topic=mole+concept" } });
    expect(crumb?.data?.url).toBe("https://studyledger.in/tools/doubt");
  });

  it("never sends a request body", () => {
    // On this product a request body is an essay, a doubt, or a logged mistake.
    // `type: undefined` is what marks an ErrorEvent apart from a transaction in
    // the SDK's types, so it has to be written out rather than left off.
    const event = scrubEvent({
      type: undefined,
      request: {
        url: "https://studyledger.in/api/ai?tool=doubt",
        data: { question: "why is the sky blue" },
        query_string: "tool=doubt",
      },
    });
    expect(event.request?.data).toBeUndefined();
    expect(event.request?.query_string).toBeUndefined();
    expect(event.request?.url).toBe("https://studyledger.in/api/ai");
  });

  it("leaves an event with no request alone", () => {
    expect(() => scrubEvent({ type: undefined })).not.toThrow();
  });
});
