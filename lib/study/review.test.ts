import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { reviewMistake } from "./queries";

/**
 * A Supabase stand-in that records what was written. Enough of the builder to
 * cover this one query shape, and no more: the point is to pin who decides the
 * review count, not to reimplement PostgREST.
 */
function fakeClient(storedCount: number | null) {
  const writes: Record<string, unknown>[] = [];
  const client = {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () =>
                  storedCount === null
                    ? { data: null, error: null }
                    : { data: { review_count: storedCount }, error: null },
              };
            },
          };
        },
        update(patch: Record<string, unknown>) {
          writes.push(patch);
          return { eq: async () => ({ error: null }) };
        },
      };
    },
  } as unknown as SupabaseClient;
  return { client, writes };
}

describe("reviewMistake", () => {
  it("ignores the count the caller supplies and uses the stored one", async () => {
    const { client, writes } = fakeClient(0);
    // A caller claiming the topic has already been reviewed four times.
    await reviewMistake(client, "m1", 4, true);
    expect(writes).toHaveLength(1);
    expect(writes[0].review_count).toBe(1);
    // And it must not have been marked mastered on its first review.
    expect(writes[0].resolved_at).toBeUndefined();
  });

  it("still advances normally from the real stored count", async () => {
    const { client, writes } = fakeClient(2);
    await reviewMistake(client, "m1", 0, true);
    expect(writes[0].review_count).toBe(3);
  });

  it("does not resolve one review short of the threshold", async () => {
    // Five intervals, so the fifth successful review is the one that masters it.
    const { client, writes } = fakeClient(3);
    await reviewMistake(client, "m1", 0, true);
    expect(writes[0].review_count).toBe(4);
    expect(writes[0].resolved_at).toBeUndefined();
  });

  it("resolves on the review that reaches the threshold", async () => {
    const { client, writes } = fakeClient(4);
    await reviewMistake(client, "m1", 0, true);
    expect(writes[0].review_count).toBe(5);
    expect(typeof writes[0].resolved_at).toBe("string");
  });

  it("cannot be talked into mastering a topic early", async () => {
    // The caller claims the threshold has been reached; the row says otherwise.
    const { client, writes } = fakeClient(0);
    await reviewMistake(client, "m1", 4, true);
    expect(writes[0].resolved_at).toBeUndefined();
  });

  it("resets to zero when the topic was forgotten, whatever was claimed", async () => {
    const { client, writes } = fakeClient(3);
    await reviewMistake(client, "m1", 99, false);
    expect(writes[0].review_count).toBe(0);
    expect(typeof writes[0].next_review_at).toBe("string");
  });

  it("writes nothing for a row it cannot see", async () => {
    const { client, writes } = fakeClient(null);
    const res = await reviewMistake(client, "someone-elses-id", 3, true);
    expect(writes).toHaveLength(0);
    expect(res.error).toBeNull();
  });

  it("treats a corrupt stored count as zero rather than writing NaN", async () => {
    const { client, writes } = fakeClient(NaN);
    await reviewMistake(client, "m1", 0, true);
    expect(writes[0].review_count).toBe(1);
  });
});
