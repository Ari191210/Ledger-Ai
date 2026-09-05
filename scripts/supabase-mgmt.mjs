import fs from "node:fs";

const envText = fs.readFileSync(".env.local", "utf8");
function envVar(name) {
  const m = envText.match(new RegExp(`^${name}=(.+)$`, "m"));
  return m ? m[1].trim() : null;
}

const token = envVar("SUPABASE_ACCESS_TOKEN");
const supabaseUrl = envVar("NEXT_PUBLIC_SUPABASE_URL");
if (!token) throw new Error("SUPABASE_ACCESS_TOKEN missing");
if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL missing");

const ref = new URL(supabaseUrl).hostname.split(".")[0];
console.log("project ref:", ref);

const action = process.argv[2];

async function mgmt(path, opts = {}) {
  const res = await fetch(`https://api.supabase.com/v1${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

if (action === "get-auth-config") {
  const { status, body } = await mgmt(`/projects/${ref}/config/auth`);
  console.log("status:", status);
  console.log("raw keys:", Object.keys(body).length);
  console.log(JSON.stringify(body, null, 2));
} else if (action === "set-redirect-urls") {
  const { status, body } = await mgmt(`/projects/${ref}/config/auth`, {
    method: "PATCH",
    body: JSON.stringify({
      site_url: "https://studyledger.in",
      uri_allow_list:
        // www still needs to be allowed: it 308s to the apex, but a magic link
        // already sent to a www URL must keep working.
        "http://localhost:3000/**,https://studyledger.in/**,https://www.studyledger.in/**",
    }),
  });
  console.log("status:", status);
  console.log(JSON.stringify({ site_url: body.site_url, uri_allow_list: body.uri_allow_list }, null, 2));
} else if (action === "set-smtp") {
  const host = envVar("RESEND_SMTP_HOST") ?? "smtp.resend.com";
  const user = envVar("RESEND_SMTP_USER") ?? "resend";
  const pass = envVar("RESEND_API_KEY");
  const { status, body } = await mgmt(`/projects/${ref}/config/auth`, {
    method: "PATCH",
    body: JSON.stringify({
      smtp_host: host,
      smtp_port: 465,
      smtp_user: user,
      smtp_pass: pass,
      smtp_sender_name: "StudyLedger",
      smtp_admin_email: "noreply@studyledger.in",
    }),
  });
  console.log("status:", status);
  console.log(JSON.stringify({
    smtp_host: body.smtp_host,
    smtp_port: body.smtp_port,
    smtp_user: body.smtp_user,
    smtp_sender_name: body.smtp_sender_name,
    smtp_admin_email: body.smtp_admin_email,
  }, null, 2));
} else {
  console.log("usage: node scripts/supabase-mgmt.mjs get-auth-config");
}
