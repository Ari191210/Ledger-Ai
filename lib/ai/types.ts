import type { Scene } from "@/lib/scenes/registry";

export type AiResult =
  /** `scene` is present only when the answer is about a situation the scene
   *  library can actually draw. It is validated against that library before
   *  it reaches here, so the renderer never sees a name it does not own. */
  | { kind: "text"; text: string; scene?: Scene }
  | { kind: "list"; items: { title: string; body: string }[] }
  | { kind: "qa"; items: { question: string; answer: string; explanation?: string }[] }
  | {
      kind: "score";
      overall: number;
      max: number;
      summary: string;
      criteria: { label: string; score: number; max: number; feedback: string }[];
    };
