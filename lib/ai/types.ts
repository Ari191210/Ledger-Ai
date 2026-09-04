export type AiResult =
  | { kind: "text"; text: string }
  | { kind: "list"; items: { title: string; body: string }[] }
  | { kind: "qa"; items: { question: string; answer: string; explanation?: string }[] }
  | {
      kind: "score";
      overall: number;
      max: number;
      summary: string;
      criteria: { label: string; score: number; max: number; feedback: string }[];
    };
