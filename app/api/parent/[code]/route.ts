import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const { code } = params;
  if (!code) return NextResponse.json({ error: "No code" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("user_data")
    .select("exams, marks, focus, weakTopics, papersCount, parentName")
    .eq("parentCode", code)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(data);
}
