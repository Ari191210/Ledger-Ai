import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Per-user data isolation in StudyLedger rests entirely on Postgres Row Level
 * Security. There is no application-layer ownership check between the browser
 * and the data: the client holds an anon key and talks to PostgREST directly,
 * so a table whose RLS is off is readable by every signed-in student, and a
 * policy whose predicate stops naming the owner is the same thing with extra
 * steps. It is the highest-consequence surface in the product and nothing
 * else tests it.
 *
 * A live two-user test is the real answer and is not available here: there is
 * no local Supabase stack, and pointing a test at production would mean
 * putting production credentials in CI. So this is a static audit. It reads
 * supabase/migrations/*.sql in applied order, replays the statements that
 * change the security posture, and asserts the invariants on the FINAL state
 * rather than on any one file. That ordering matters: 0015 and 0016 rewrite
 * policy predicates that 0001-0013 created, and 0018 drops one before
 * recreating it, so grepping for `create policy` would audit a schema that no
 * longer exists.
 *
 * What it cannot do: prove Postgres enforces what the SQL says, or catch a
 * policy changed by hand in the dashboard instead of by migration. It proves
 * the migrations, which are the only thing we review.
 */

const root = path.join(__dirname, "..");
const migrationsDir = path.join(root, "supabase", "migrations");

// ── the allowlists ──────────────────────────────────────────────────────────
//
// Exemptions live here rather than in the parser so that adding one is a
// visible decision in a diff, with a reason attached, instead of a table that
// quietly stops being checked.

/**
 * User-scoped tables permitted to run WITHOUT row level security.
 *
 * Empty, and it should stay that way. The entry point for a public lookup
 * table would be here, with a note saying why its rows are not user data.
 */
const RLS_EXEMPT: ReadonlySet<string> = new Set<string>();

/**
 * Operations a table deliberately does NOT give its owner a policy for.
 * Absence of a policy is a denial in Postgres, so each of these is a lock,
 * not an oversight, and each is load-bearing.
 */
const MISSING_POLICY_IS_DELIBERATE: Readonly<Record<string, readonly string[]>> = {
  // Rows are created by handle_new_user(), a SECURITY DEFINER trigger on
  // auth.users, and deleted by the cascade when the auth user goes. A student
  // never inserts or deletes their own profile row from the browser.
  profiles: ["insert", "delete"],
  // 0012 is explicit that this table exists precisely so a plan cannot be
  // self-granted. Any write policy here would let a student upgrade themselves
  // to pro with the anon key; only the service role may write.
  subscriptions: ["insert", "update", "delete"],
  // The AI rate-limit ledger. Append-only on purpose: a student who could
  // delete or rewrite these rows could erase their own rate limit and spend
  // the Anthropic budget without bound.
  ai_invocations: ["update", "delete"],
  // A record of what the AI actually advised, used later to check whether the
  // student acted on it. Deletable (it is their data) but not editable, since
  // an editable record would make the follow-up check meaningless.
  ai_advice: ["update"],
};

/**
 * User-scoped tables deliberately absent from the export route's TABLES list.
 */
const EXPORT_LIST_EXEMPT: Readonly<Record<string, string>> = {
  // Its owner column is `id`, not `user_id`, so it cannot ride the
  // `TABLES.map(t => ...eq("user_id", ...))` loop. The route fetches it
  // separately with select("*"); the test below checks that it still does.
  profiles: "owner column is id; the route exports it separately",
};

// ── a deliberately small SQL reader ─────────────────────────────────────────
//
// This understands only the handful of statement shapes these migrations use.
// Anything else is ignored, EXCEPT the shapes that change security posture: an
// `alter table ... row level security`, `create/alter/drop policy` or
// `create table` it cannot parse throws, because a silently skipped statement
// is a false pass and a false pass here is the whole failure mode.

type PolicyState = {
  table: string;
  name: string;
  /** all | select | insert | update | delete */
  command: string;
  /** roles from a TO clause; empty means the statement had none */
  roles: string[];
  using: string | null;
  check: string | null;
};

type Schema = {
  /** table name -> the column holding the owner's auth.users id */
  ownerColumn: Map<string, string>;
  /** table name -> RLS on/off after the last statement that touched it */
  rlsEnabled: Map<string, boolean>;
  /** "table:policy name" -> final policy state */
  policies: Map<string, PolicyState>;
};

/** Strips line comments and dollar-quoted function bodies, then splits on `;`.
 *  Function bodies have to go first or their internal semicolons split the
 *  statement stream into nonsense. */
function statementsOf(sql: string): string[] {
  const withoutBodies = sql.replace(/\$\$[\s\S]*?\$\$/g, " $BODY$ ");
  const withoutComments = withoutBodies.replace(/--[^\n]*/g, " ");
  return withoutComments
    .split(";")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** Reads a balanced parenthesised expression that starts at `from`, which must
 *  index the opening paren. Returns the inner text. Needed because policy
 *  predicates nest parens: `((select auth.uid()) = user_id)`. */
function balanced(text: string, from: number): string {
  let depth = 0;
  for (let i = from; i < text.length; i += 1) {
    if (text[i] === "(") depth += 1;
    else if (text[i] === ")") {
      depth -= 1;
      if (depth === 0) return text.slice(from + 1, i);
    }
  }
  throw new Error(`unbalanced parentheses in: ${text}`);
}

/** Pulls the expression after a `using` / `with check` keyword, or null. */
function clause(stmt: string, keyword: "using" | "with check"): string | null {
  const re = new RegExp(`\\b${keyword}\\s*\\(`, "i");
  const m = re.exec(stmt);
  if (!m) return null;
  return balanced(stmt, m.index + m[0].length - 1).replace(/\s+/g, " ").trim();
}

function parseMigrations(files: { name: string; sql: string }[]): Schema {
  const schema: Schema = {
    ownerColumn: new Map(),
    rlsEnabled: new Map(),
    policies: new Map(),
  };

  for (const file of files) {
    for (const stmt of statementsOf(file.sql)) {
      const where = `${file.name}: ${stmt.slice(0, 90)}`;

      // create table public.x (...)
      const createTable = /^create table (?:if not exists )?public\.(\w+) \(/i.exec(stmt);
      if (createTable) {
        const body = balanced(stmt, stmt.indexOf("("));
        // A user-scoped table is one with a column pointing at auth.users.
        // Keying on that rather than on the name `user_id` is what keeps
        // profiles (id) and subscriptions (user_id primary key) in scope, and
        // what keeps habit_logs.habit_id -> public.habits out of it.
        const owners = [...body.matchAll(/(\w+)\s+uuid[^,]*?references\s+auth\.users/gi)].map(
          (m) => m[1],
        );
        if (owners.length > 1) {
          throw new Error(
            `${createTable[1]} has more than one column referencing auth.users ` +
              `(${owners.join(", ")}). Owner-column detection cannot pick one; ` +
              `teach this parser the new shape rather than letting it guess.`,
          );
        }
        if (owners.length === 1) schema.ownerColumn.set(createTable[1], owners[0]);
        continue;
      }

      // alter table public.x enable|disable row level security
      const rls = /^alter table (?:public\.)?(\w+) (enable|disable) row level security$/i.exec(
        stmt,
      );
      if (rls) {
        schema.rlsEnabled.set(rls[1], rls[2].toLowerCase() === "enable");
        continue;
      }
      if (/row level security/i.test(stmt)) {
        throw new Error(`unparsed row-level-security statement in ${where}`);
      }

      // drop policy [if exists] "name" on public.x
      const dropPolicy = /^drop policy (?:if exists )?"([^"]+)" on (?:public\.)?(\w+)$/i.exec(stmt);
      if (dropPolicy) {
        schema.policies.delete(`${dropPolicy[2]}:${dropPolicy[1]}`);
        continue;
      }

      // create policy "name" on public.x [for cmd] [to roles] [using (..)] [with check (..)]
      const createPolicy = /^create policy "([^"]+)" on (?:public\.)?(\w+)\b/i.exec(stmt);
      if (createPolicy) {
        const [, name, table] = createPolicy;
        const command = /\bfor (all|select|insert|update|delete)\b/i.exec(stmt)?.[1].toLowerCase();
        const roles = /\bto ([a-z_, ]+?)(?=\s+(?:using|with check)\b|$)/i.exec(stmt)?.[1];
        schema.policies.set(`${table}:${name}`, {
          table,
          name,
          command: command ?? "all",
          roles: roles ? roles.split(",").map((r) => r.trim().toLowerCase()) : [],
          using: clause(stmt, "using"),
          check: clause(stmt, "with check"),
        });
        continue;
      }

      // alter policy "name" on public.x [using (..)] [with check (..)]
      // Only the clauses present are replaced, which is what Postgres does and
      // is exactly the trap 0015 fell into: it rewrote USING on
      // "profiles: update own" and left the stale WITH CHECK behind until 0016.
      const alterPolicy = /^alter policy "([^"]+)" on (?:public\.)?(\w+)\b/i.exec(stmt);
      if (alterPolicy) {
        const [, name, table] = alterPolicy;
        const key = `${table}:${name}`;
        const existing = schema.policies.get(key);
        if (!existing) throw new Error(`alter policy on a policy never created, in ${where}`);
        const nextUsing = clause(stmt, "using");
        const nextCheck = clause(stmt, "with check");
        if (nextUsing !== null) existing.using = nextUsing;
        if (nextCheck !== null) existing.check = nextCheck;
        continue;
      }

      if (/\bpolicy\b/i.test(stmt)) throw new Error(`unparsed policy statement in ${where}`);
    }
  }

  return schema;
}

const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  // Lexical order is applied order: the files are zero-padded and numbered.
  .sort()
  .map((name) => ({ name, sql: fs.readFileSync(path.join(migrationsDir, name), "utf8") }));

const schema = parseMigrations(migrationFiles);
const userScopedTables = [...schema.ownerColumn.keys()].sort();

/** Does this predicate tie the row to the caller and nothing else?
 *  Both spellings are live: policies were created as `auth.uid() = col` and
 *  0015 rewrote most of them to `(select auth.uid()) = col` so the planner can
 *  hoist the call into an InitPlan. Same rule, different shape. */
function tiesRowToCaller(expr: string | null, column: string): boolean {
  if (!expr) return false;
  const normalised = expr.toLowerCase().replace(/\s+/g, " ").trim();
  const uid = String.raw`(?:auth\.uid\(\)|\(\s*select auth\.uid\(\)\s*\))`;
  const col = String.raw`(?:\w+\.)?${column}`;
  return new RegExp(`^\\(?\\s*(?:${uid} = ${col}|${col} = ${uid})\\s*\\)?$`).test(normalised);
}

const ALL_COMMANDS = ["select", "insert", "update", "delete"] as const;

/** Which clause actually gates each command. INSERT is checked on the new row
 *  (WITH CHECK) and has no USING at all; UPDATE needs both, or a student could
 *  edit their own row into someone else's. */
function gatingClauses(command: string): ("using" | "check")[] {
  if (command === "insert") return ["check"];
  if (command === "update" || command === "all") return ["using", "check"];
  return ["using"];
}

describe("RLS policy audit of supabase/migrations", () => {
  it("found the migrations and the tables they define", () => {
    // A tripwire. If the parser goes blind, every invariant below passes
    // vacuously over an empty set, so the expected table list is written out
    // once, here, and a new user-scoped table has to be acknowledged.
    expect(migrationFiles.length).toBeGreaterThan(0);
    expect(userScopedTables).toEqual([
      "activity_days",
      "ai_advice",
      "ai_invocations",
      "deadlines",
      "focus_sessions",
      "habit_logs",
      "habits",
      "mistake_reviews",
      "mistakes",
      "parental_consents",
      "profiles",
      "pyq_attempts",
      "subscriptions",
      "syllabus_topics",
    ]);
  });

  it("enables row level security on every user-scoped table", () => {
    // The failure this test exists for. A table with owner policies but RLS
    // switched off is wide open to every holder of the anon key, and the
    // policies sitting on it make it look guarded in a code review.
    const unprotected = userScopedTables.filter(
      (t) => !RLS_EXEMPT.has(t) && schema.rlsEnabled.get(t) !== true,
    );
    expect(
      unprotected,
      `these tables reference auth.users but never end up with RLS enabled: ${unprotected.join(", ")}. ` +
        `Add "alter table public.<t> enable row level security" to the migration that creates it.`,
    ).toEqual([]);
  });

  it("gives every table an owner-only policy for each operation it needs", () => {
    const gaps: string[] = [];

    for (const table of userScopedTables) {
      const ownerColumn = schema.ownerColumn.get(table)!;
      const policies = [...schema.policies.values()].filter((p) => p.table === table);
      const deliberatelyMissing = MISSING_POLICY_IS_DELIBERATE[table] ?? [];

      for (const command of ALL_COMMANDS) {
        if (deliberatelyMissing.includes(command)) {
          // Assert the lock is real: an exemption that has quietly grown a
          // policy is a stale comment, and this one guards self-upgrade.
          const granted = policies.some(
            (p) => p.command === command || p.command === "all",
          );
          if (granted) {
            gaps.push(
              `${table}.${command} is listed in MISSING_POLICY_IS_DELIBERATE but a policy now grants it`,
            );
          }
          continue;
        }

        const covering = policies.filter((p) => p.command === command || p.command === "all");
        if (covering.length === 0) {
          gaps.push(`${table} has no policy covering ${command}`);
          continue;
        }
        // Every covering policy must carry the owner check on every clause
        // that actually gates the command, not just one of them.
        for (const policy of covering) {
          for (const which of gatingClauses(policy.command)) {
            const expr = which === "using" ? policy.using : policy.check;
            if (!tiesRowToCaller(expr, ownerColumn)) {
              gaps.push(
                `"${policy.name}" on ${table} (${command}): ${which} is ${expr ?? "absent"}, ` +
                  `which does not tie the row to auth.uid() = ${ownerColumn}`,
              );
            }
          }
        }
      }
    }

    expect(gaps, gaps.join("\n")).toEqual([]);
  });

  it("grants no policy to anon, and none that escapes the owner check", () => {
    // Every policy in these migrations is written without a TO clause, which
    // in Postgres means PUBLIC. That is not the leak it looks like: PUBLIC
    // here is "any role that also satisfies the predicate", and the predicate
    // is auth.uid() = owner, which anon can never satisfy because auth.uid()
    // is null for it. So a bare policy is fine and a permissive predicate is
    // not. What is never fine is naming anon explicitly, which would be a
    // deliberate grant to unauthenticated traffic.
    const permissive: string[] = [];

    for (const policy of schema.policies.values()) {
      if (!schema.ownerColumn.has(policy.table)) continue;
      const ownerColumn = schema.ownerColumn.get(policy.table)!;

      if (policy.roles.includes("anon")) {
        permissive.push(`"${policy.name}" on ${policy.table} names the anon role`);
      }
      for (const which of gatingClauses(policy.command)) {
        const expr = which === "using" ? policy.using : policy.check;
        const normalised = (expr ?? "").toLowerCase().replace(/\s+/g, " ").trim();
        if (normalised === "true" || normalised === "(true)") {
          permissive.push(`"${policy.name}" on ${policy.table} has ${which} (true)`);
        } else if (!tiesRowToCaller(expr, ownerColumn)) {
          permissive.push(
            `"${policy.name}" on ${policy.table} has a ${which} clause that is neither ` +
              `absent-and-unneeded nor an owner check: ${expr ?? "absent"}`,
          );
        }
      }
    }

    expect(permissive, permissive.join("\n")).toEqual([]);
  });
});

describe("the user data export covers every user-scoped table", () => {
  // Not a tautology: the TABLES list in the export route is hand-maintained
  // and the route's own comment records it having drifted behind
  // focus_sessions and subscriptions once already. The privacy page promises
  // the export is everything StudyLedger stores, so a migration that adds a
  // table and forgets this list turns a legal claim false with no code change
  // to review. This is the check that makes that a red test instead.
  const routePath = path.join(root, "app", "api", "export", "route.ts");
  const route = fs.readFileSync(routePath, "utf8");

  const listSource = /const TABLES = \[([\s\S]*?)\] as const;/.exec(route);
  if (!listSource) {
    throw new Error(
      `Could not find the TABLES array in ${routePath}. If the export route was ` +
        `restructured, this cross-check has to be rewritten, not deleted.`,
    );
  }
  const exported = [...listSource[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);

  it("exports every user-scoped table found in the migrations", () => {
    const missing = userScopedTables.filter(
      (t) => !(t in EXPORT_LIST_EXEMPT) && !exported.includes(t),
    );
    expect(
      missing,
      `these tables hold user data but are not in the export route's TABLES list: ` +
        `${missing.join(", ")}. Add them, or the export silently stops being complete.`,
    ).toEqual([]);
  });

  it("exports nothing that is not a user-scoped table", () => {
    // The other direction: a renamed or dropped table left behind in the list
    // is a query against something that no longer exists.
    const unknown = exported.filter((t) => !schema.ownerColumn.has(t));
    expect(unknown, `not user-scoped tables in the migrations: ${unknown.join(", ")}`).toEqual([]);
  });

  it("still exports profiles separately, which is why it is exempt", () => {
    // The exemption above is only honest while the route really does fetch
    // profiles by its own owner column and take every column.
    expect(route).toMatch(/from\("profiles"\)/);
    expect(route).toMatch(/\.select\("\*"\)/);
    expect(route).toMatch(/\.eq\("id", user\.id\)/);
  });
});
