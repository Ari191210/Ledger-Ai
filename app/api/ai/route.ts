import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

type ToolName = "notes" | "doubt" | "career" | "assignment";

function buildPrompt(tool: ToolName, params: Record<string, unknown>): { system: string; user: string } {
  switch (tool) {
    case "notes":
      return {
        system: "You are a concise study assistant. You help students understand complex material quickly. Always respond with valid JSON only — no markdown fences, no prose outside the JSON.",
        user: `Analyse this study content and respond with exactly this JSON shape:
{"explanation":"2-3 paragraph plain-English explanation","summary":["bullet 1","bullet 2","...up to 10"],"flashcards":[{"q":"question","a":"answer"}],"quiz":[{"q":"question","opts":["A","B","C","D"],"ans":0}]}

flashcards: exactly 5 items. quiz: exactly 5 items, ans is the 0-based index of the correct option.

Content:
${params.content}`,
      };

    case "doubt":
      return {
        system: "You are a patient tutor. Always respond with valid JSON only — no markdown fences.",
        user: `Solve this problem and respond with exactly this JSON shape:
{"solution":"step-by-step worked solution with each step on a new line","principle":"the underlying theorem or concept in 1-2 sentences","practice":["similar problem 1","similar problem 2","similar problem 3"]}

Problem:
${params.question}`,
      };

    case "career":
      return {
        system: "You are a career counsellor specialising in Indian and international high-school students (ages 14-18). Always respond with valid JSON only — no markdown fences.",
        user: `Based on these quiz answers from a student, generate a personalised career profile. Respond with exactly this JSON shape:
{"streams":[{"name":"stream name","why":"1-2 sentence reason","roles":["role1","role2","role3"]}],"colleges":[{"name":"college","country":"India or country","why":"1 sentence"}],"exams":[{"name":"exam name","desc":"1 sentence"}],"roadmap":[{"period":"Year 11-12","milestones":["milestone1","milestone2"]}]}

streams: top 3. colleges: 5 (mix of Indian and international). exams: 3-4 relevant entrance exams. roadmap: 4 periods covering years 11 through undergraduate.

Quiz answers:
${JSON.stringify(params.answers, null, 2)}`,
      };

    case "assignment":
      return {
        system: "You are an academic writing coach. Always respond with valid JSON only — no markdown fences.",
        user: `Create an assignment plan. Respond with exactly this JSON shape:
{"title":"suggested essay title","outline":[{"section":"Introduction","points":["point1","point2"]}],"arguments":["argument angle 1","argument angle 2","argument angle 3"],"research":["search term or resource direction 1","...up to 5"]}

outline: Introduction + 3-4 body sections + Conclusion. arguments: 3-4 distinct angles. research: 5 search directions (no made-up citations).

Subject: ${params.subject}
Word limit: ${params.wordLimit}
Brief: ${params.brief}`,
      };
  }
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set. Add it to .env.local." },
      { status: 500 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { tool, ...params } = body as { tool: ToolName } & Record<string, unknown>;
  const validTools: ToolName[] = ["notes", "doubt", "career", "assignment"];
  if (!validTools.includes(tool)) {
    return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 400 });
  }

  const { system, user } = buildPrompt(tool, params);

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system,
    messages: [{ role: "user", content: user }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return NextResponse.json(JSON.parse(jsonMatch[0]));
    return NextResponse.json({ raw: text });
  } catch {
    return NextResponse.json({ raw: text });
  }
}
