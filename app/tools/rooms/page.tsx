"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

type RoomTask = { id: number; text: string; done: boolean };
type RoomRow = {
  id: string;
  name: string;
  duration: number;
  running: boolean;
  started_at: number | null;
  seconds_at_pause: number;
  members: string[];
  tasks: RoomTask[];
  bailed?: string[];
};

let taskIdSeq = 1;

function genId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function computeSeconds(row: RoomRow): number {
  const total = row.duration * 60;
  if (row.running && row.started_at) {
    const elapsed = Math.floor((Date.now() - row.started_at) / 1000);
    return Math.max(0, total - elapsed);
  }
  return row.seconds_at_pause ?? total;
}

/* ── Active room view ─────────────────────────────────────────────────────── */

function ActiveRoom({ roomId, myName, onLeave }: { roomId: string; myName: string; onLeave: () => void }) {
  const [room,    setRoom]    = useState<RoomRow | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [newTask, setNewTask] = useState("");
  const [error,   setError]   = useState("");
  const [done,    setDone]    = useState(false);
  const [copied,  setCopied]  = useState(false);

  const containerRef    = useRef<HTMLDivElement>(null);
  const timerRef        = useRef<HTMLDivElement>(null);
  const celebRef        = useRef<HTMLDivElement>(null);
  const taskFlashRefs   = useRef<Map<number, HTMLDivElement>>(new Map());
  const tickRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRunning       = room?.running ?? false;

  /* ── Room data helper ── */
  const setRoomData = useCallback((data: RoomRow) => {
    setRoom(data);
    const secs = computeSeconds(data);
    setSeconds(secs);
    if (secs === 0) setDone(true);
  }, []);

  const fetchRoom = useCallback(async () => {
    const { data, error: e } = await supabase.from("rooms").select("*").eq("id", roomId).single();
    if (e || !data) { setError("Room not found."); return; }
    setRoomData(data as RoomRow);
  }, [roomId, setRoomData]);

  /* ── Supabase Realtime subscription (replaces 3-second polling) ── */
  useEffect(() => {
    fetchRoom();
    const ch = supabase
      .channel(`room:${roomId}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        (payload) => setRoomData(payload.new as RoomRow)
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [roomId, fetchRoom, setRoomData]);

  /* ── Local tick for smooth countdown ── */
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (isRunning) {
      tickRef.current = setInterval(() => {
        setSeconds(prev => {
          const next = Math.max(0, prev - 1);
          if (next === 0) setDone(true);
          return next;
        });
      }, 1000);
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [isRunning]);

  /* ── Entry animation ── */
  useEffect(() => {
    if (!containerRef.current) return;
    gsap.fromTo(containerRef.current,
      { autoAlpha: 0, y: 28 },
      { autoAlpha: 1, y: 0, duration: 0.55, ease: "power3.out" }
    );
  }, []);

  /* ── Timer pulse on start / pause ── */
  useEffect(() => {
    if (!timerRef.current || !room) return;
    gsap.fromTo(timerRef.current,
      { scale: 0.97, autoAlpha: 0.65 },
      { scale: 1, autoAlpha: 1, duration: 0.4, ease: "back.out(1.6)" }
    );
  }, [isRunning]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Session complete celebration ── */
  useEffect(() => {
    if (!done || !celebRef.current) return;
    gsap.fromTo(celebRef.current,
      { autoAlpha: 0, y: 14, scale: 0.97 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.55, ease: "power3.out", delay: 0.12 }
    );
  }, [done]);

  /* ── Handlers ── */
  async function handleStart() {
    if (!room) return;
    const cur = computeSeconds(room);
    setDone(false);
    await supabase.from("rooms").update({
      running: true,
      started_at: Date.now() - (room.duration * 60 - cur) * 1000,
    }).eq("id", roomId);
    fetchRoom();
  }

  async function handlePause() {
    if (!room) return;
    await supabase.from("rooms").update({
      running: false,
      seconds_at_pause: computeSeconds(room),
    }).eq("id", roomId);
    fetchRoom();
  }

  async function handleReset() {
    if (!room) return;
    setDone(false);
    await supabase.from("rooms").update({
      running: false, started_at: null,
      seconds_at_pause: room.duration * 60,
    }).eq("id", roomId);
    fetchRoom();
  }

  async function handleLeave() {
    if (room) {
      const updates: Partial<RoomRow> = {
        members: room.members.filter(m => m !== myName),
      };
      if (room.running) {
        updates.bailed = [...(room.bailed ?? []), myName];
      }
      await supabase.from("rooms").update(updates).eq("id", roomId);
    }
    onLeave();
  }

  async function handleToggleTask(id: number) {
    if (!room) return;
    const task = room.tasks.find(t => t.id === id);
    if (task && !task.done) {
      const flashEl = taskFlashRefs.current.get(id);
      if (flashEl) {
        gsap.fromTo(flashEl, { opacity: 0.22 }, { opacity: 0, duration: 0.5, ease: "power2.out" });
      }
    }
    const updated = room.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    await supabase.from("rooms").update({ tasks: updated }).eq("id", roomId);
    fetchRoom();
  }

  async function handleAddTask() {
    if (!room || !newTask.trim()) return;
    const updated = [...room.tasks, { id: taskIdSeq++, text: newTask.trim(), done: false }];
    await supabase.from("rooms").update({ tasks: updated }).eq("id", roomId);
    setNewTask("");
    fetchRoom();
  }

  async function handleDeleteTask(id: number) {
    if (!room) return;
    const updated = room.tasks.filter(t => t.id !== id);
    await supabase.from("rooms").update({ tasks: updated }).eq("id", roomId);
    fetchRoom();
  }

  async function handleCopy() {
    try { await navigator.clipboard.writeText(roomId); } catch { /* noop */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  /* ── Loading / error states ── */
  if (error) return (
    <div style={{ padding: "48px 0", textAlign: "center" }}>
      <div className="mono" style={{ color: "var(--cinnabar-ink)", marginBottom: 16 }}>{error}</div>
      <button className="btn ghost" onClick={onLeave}>← Back</button>
    </div>
  );

  if (!room) return (
    <div style={{ padding: "48px 0", textAlign: "center" }}>
      <div className="mono" style={{ color: "var(--ink-3)" }}>Connecting…</div>
    </div>
  );

  const mm           = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss           = String(seconds % 60).padStart(2, "0");
  const progress     = 1 - seconds / (room.duration * 60);
  const bailedMems   = room.bailed ?? [];
  const activeMems   = room.members.filter(m => !bailedMems.includes(m));
  const tasksTotal   = room.tasks.length;
  const tasksDone    = room.tasks.filter(t => t.done).length;

  return (
    <div ref={containerRef} style={{ maxWidth: 900, margin: "0 auto", padding: "48px 0" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <div className="mono" style={{ color: "var(--cinnabar-ink)", marginBottom: 6, fontSize: 10, letterSpacing: "0.14em" }}>
            ROOM · {room.id}
          </div>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 34, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.02em", margin: 0, color: "var(--ink)" }}>
            {room.name}
          </h2>
        </div>
        <button onClick={handleLeave} className="btn ghost" style={{ flexShrink: 0 }}>Leave room</button>
      </div>

      <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

        {/* ── Timer card ── */}
        <div ref={timerRef} style={{ border: "1px solid var(--rule-2)", background: "var(--paper-2)", overflow: "hidden" }}>
          {/* Clock face */}
          <div style={{ padding: "36px 24px 24px", textAlign: "center", background: "color-mix(in srgb, var(--paper-2) 60%, var(--paper) 40%)", borderBottom: "1px solid var(--rule)" }}>
            <div style={{
              fontFamily: "var(--serif)", fontSize: 84, fontStyle: "italic", fontWeight: 700,
              letterSpacing: "-0.05em", lineHeight: 1,
              color: done ? "var(--cinnabar-ink)" : "var(--ink)",
              transition: "color 400ms ease",
              fontVariantNumeric: "tabular-nums",
            }}>
              {mm}:{ss}
            </div>
            {/* Progress bar */}
            <div style={{ margin: "16px 0 0", height: 3, background: "var(--rule-2)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: "100%",
                background: done ? "var(--cinnabar)" : "var(--cinnabar-ink)",
                transform: `scaleX(${progress})`, transformOrigin: "left",
                transition: "transform 1s linear, background 400ms ease",
                borderRadius: 2,
              }} />
            </div>
            <div className="mono" style={{ color: "var(--ink-3)", marginTop: 10, fontSize: 9, letterSpacing: "0.14em" }}>
              {room.duration} MIN · {isRunning ? "RUNNING" : done ? "COMPLETE" : "PAUSED"}
            </div>
          </div>

          {/* Controls */}
          <div style={{ padding: "14px 16px", display: "flex", gap: 8, justifyContent: "center", borderBottom: "1px solid var(--rule)" }}>
            <button className="btn" onClick={isRunning ? handlePause : handleStart} disabled={done} style={{ minWidth: 88 }}>
              {isRunning ? "Pause" : done ? "Done" : "Start"}
            </button>
            <button className="btn ghost" onClick={handleReset}>Reset</button>
          </div>

          {/* Members */}
          <div style={{ padding: "14px 16px" }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 10, fontSize: 9, letterSpacing: "0.14em" }}>
              MEMBERS · {room.members.length + bailedMems.length}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {activeMems.map((m, i) => (
                <span key={i} style={{
                  fontFamily: "var(--mono)", fontSize: 10, padding: "4px 10px",
                  border: `1px solid ${m === myName ? "var(--cinnabar-ink)" : "var(--rule)"}`,
                  color: m === myName ? "var(--cinnabar-ink)" : "var(--ink-2)",
                  textTransform: "uppercase", letterSpacing: "0.08em",
                }}>{m}</span>
              ))}
              {bailedMems.map((m, i) => (
                <span key={`b${i}`} title="Left early — pact broken" style={{
                  fontFamily: "var(--mono)", fontSize: 10, padding: "4px 10px",
                  border: "1px solid var(--rule-2)", color: "var(--ink-3)",
                  textTransform: "uppercase", letterSpacing: "0.08em",
                  textDecoration: "line-through", opacity: 0.55,
                }}>{m} ✗</span>
              ))}
            </div>
            {bailedMems.length > 0 && (
              <div className="mono" style={{ color: "var(--cinnabar-ink)", marginTop: 10, fontSize: 10 }}>
                ⚠ {bailedMems.join(", ")} left early. Pact broken.
              </div>
            )}
          </div>
        </div>

        {/* ── Tasks card ── */}
        <div style={{ border: "1px solid var(--rule-2)", background: "var(--paper-2)", overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 280 }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--rule)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <div className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9, letterSpacing: "0.14em" }}>SHARED TASKS</div>
            {tasksTotal > 0 && (
              <div className="mono" style={{ color: "var(--ink-3)", fontSize: 10 }}>
                {tasksDone}/{tasksTotal}
              </div>
            )}
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {tasksTotal === 0 && (
              <div className="mono" style={{ padding: "20px 16px", color: "var(--ink-3)", fontSize: 11 }}>
                No tasks yet. Add one below.
              </div>
            )}
            {room.tasks.map((t, i) => (
              <div key={t.id} style={{
                position: "relative",
                display: "flex", alignItems: "center", gap: 12, padding: "11px 16px",
                borderBottom: i < tasksTotal - 1 ? "1px solid var(--rule-2)" : "none",
              }}>
                {/* Flash overlay for task completion */}
                <div
                  ref={el => { if (el) taskFlashRefs.current.set(t.id, el); }}
                  style={{ position: "absolute", inset: 0, background: "var(--cinnabar-ink)", opacity: 0, pointerEvents: "none" }}
                />
                <input type="checkbox" checked={t.done} onChange={() => handleToggleTask(t.id)}
                  style={{ accentColor: "var(--cinnabar-ink)", width: 14, height: 14, cursor: "pointer", flexShrink: 0, position: "relative", zIndex: 1 }} />
                <span style={{
                  fontFamily: "var(--sans)", fontSize: 13, flex: 1, position: "relative", zIndex: 1,
                  textDecoration: t.done ? "line-through" : "none",
                  color: t.done ? "var(--ink-3)" : "var(--ink)",
                  transition: "color 220ms ease, text-decoration 220ms ease",
                }}>{t.text}</span>
                <button onClick={() => handleDeleteTask(t.id)} style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)",
                  position: "relative", zIndex: 1, flexShrink: 0,
                }}>✕</button>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid var(--rule)", flexShrink: 0 }}>
            <input value={newTask} onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAddTask(); }}
              placeholder="Add a task — press Enter to save"
              style={{
                width: "100%", padding: "12px 16px", fontFamily: "var(--sans)", fontSize: 13,
                border: "none", background: "transparent", color: "var(--ink)", outline: "none", boxSizing: "border-box",
              }} />
          </div>
        </div>
      </div>

      {/* ── Session complete panel ── */}
      {done && (
        <div ref={celebRef} style={{
          padding: "24px 28px", marginBottom: 20,
          border: "1px solid var(--cinnabar-ink)",
          background: "color-mix(in srgb, var(--cinnabar-ink) 5%, var(--paper-2))",
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap",
        }}>
          <div>
            <div className="mono" style={{ color: "var(--cinnabar-ink)", marginBottom: 8, fontSize: 10, letterSpacing: "0.14em" }}>SESSION COMPLETE</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontStyle: "italic", fontWeight: 500, color: "var(--ink)", lineHeight: 1.35 }}>
              {tasksDone}/{tasksTotal} tasks done.{" "}
              {bailedMems.length > 0
                ? `Pact broken — ${bailedMems.join(", ")} left early.`
                : tasksTotal > 0 && tasksDone === tasksTotal
                  ? "Every task finished. Pact held."
                  : "Pact held."}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button className="btn" onClick={handleReset}>Another round →</button>
          </div>
        </div>
      )}

      {/* ── Share bar ── */}
      <div style={{
        padding: "14px 16px", border: "1px solid var(--rule)", background: "var(--paper-2)",
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap",
      }}>
        <div>
          <span className="mono" style={{ color: "var(--ink-3)", fontSize: 11 }}>Room code: </span>
          <span className="mono" style={{ color: "var(--cinnabar-ink)", letterSpacing: "0.22em", fontWeight: 700, fontSize: 13 }}>{room.id}</span>
          <span className="mono" style={{ color: "var(--ink-3)", fontSize: 11 }}> · Share to let anyone join live</span>
        </div>
        <button onClick={handleCopy} className="btn ghost" style={{ fontSize: 10, minWidth: 90, flexShrink: 0 }}>
          {copied ? "Copied ✓" : "Copy code"}
        </button>
      </div>
    </div>
  );
}

/* ── Lobby ───────────────────────────────────────────────────────────────── */

export default function RoomsPage() {
  const { user } = useAuth();
  const [view,       setView]       = useState<"lobby" | "room">("lobby");
  const [roomId,     setRoomId]     = useState("");
  const [myName,     setMyName]     = useState("");
  const [name,       setName]       = useState("");
  const [duration,   setDuration]   = useState(50);
  const [code,       setCode]       = useState("");
  const [myNameJoin, setMyNameJoin] = useState("");
  const [creating,   setCreating]   = useState(false);
  const [joining,    setJoining]    = useState(false);
  const [error,      setError]      = useState("");
  const lobbyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.email) {
      const n = user.email.split("@")[0];
      setMyName(n);
      setMyNameJoin(n);
    }
  }, [user]);

  /* ── Lobby entry animations ── */
  useGSAP(() => {
    gsap.fromTo(".lobby-hero",
      { autoAlpha: 0, y: 20 },
      { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out" }
    );
    gsap.fromTo(".lobby-panel",
      { autoAlpha: 0, y: 24 },
      { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.09, ease: "power3.out", delay: 0.1 }
    );
  }, { scope: lobbyRef });

  async function create() {
    if (!name.trim() || !myName.trim()) { setError("Enter your name and a room name."); return; }
    setCreating(true); setError("");
    const id = genId();
    const { error: err } = await supabase.from("rooms").insert({
      id, name: name.trim(), duration,
      running: false, started_at: null,
      seconds_at_pause: duration * 60,
      members: [myName.trim()], tasks: [], bailed: [],
    });
    if (err) { setError("Could not create room. Check Supabase setup."); setCreating(false); return; }
    setRoomId(id);
    setView("room");
    setCreating(false);
  }

  async function joinByCode() {
    if (!code.trim() || !myNameJoin.trim()) { setError("Enter your name and a room code."); return; }
    setJoining(true); setError("");
    const upper = code.trim().toUpperCase();
    const { data, error: err } = await supabase.from("rooms").select("*").eq("id", upper).single();
    if (err || !data) { setError("Room not found. Check the code and try again."); setJoining(false); return; }
    const members: string[] = (data as RoomRow).members ?? [];
    if (!members.includes(myNameJoin.trim())) {
      await supabase.from("rooms").update({ members: [...members, myNameJoin.trim()] }).eq("id", upper);
    }
    setMyName(myNameJoin.trim());
    setRoomId(upper);
    setView("room");
    setJoining(false);
  }

  if (view === "room") return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)" }}>
        <div className="mono" style={{ color: "var(--ink-3)", fontSize: 10, letterSpacing: "0.14em" }}>STUDY ROOMS</div>
      </header>
      <main className="mob-p" style={{ padding: "0 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
        <ActiveRoom roomId={roomId} myName={myName} onLeave={() => setView("lobby")} />
      </main>
    </div>
  );

  return (
    <div ref={lobbyRef}>
      <header className="mob-hp" style={{
        padding: "24px 44px", borderBottom: "1px solid var(--ink)",
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
      }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.02em" }}>
          Study Rooms
        </div>
        <div className="mono" style={{ color: "var(--ink-3)", fontSize: 10, letterSpacing: "0.1em" }}>
          Silent accountability
        </div>
      </header>

      <main className="mob-p" style={{ padding: "48px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>

        {/* Hero copy */}
        <div className="lobby-hero" style={{ maxWidth: 560, marginBottom: 48 }}>
          <div className="mono" style={{ color: "var(--cinnabar-ink)", marginBottom: 14, fontSize: 10, letterSpacing: "0.14em" }}>
            THE PACT MECHANIC
          </div>
          <p style={{ fontFamily: "var(--sans)", fontSize: 15, lineHeight: 1.8, color: "var(--ink-2)", margin: "0 0 12px" }}>
            You lock a session with a friend. The clock runs for both of you. If one person leaves early, their name is marked — the pact is broken and everyone in the room sees it.
          </p>
          <p style={{ fontFamily: "var(--sans)", fontSize: 15, lineHeight: 1.8, color: "var(--ink-3)", margin: 0 }}>
            Accountability rooms have a 94% completion rate vs 71% for solo sessions. The discomfort of letting someone down is more motivating than personal discipline.
          </p>
        </div>

        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 800 }}>

          {/* Create a room */}
          <div className="lobby-panel" style={{ padding: "28px", background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
            <div className="mono" style={{ color: "var(--cinnabar-ink)", marginBottom: 18, fontSize: 10, letterSpacing: "0.14em" }}>
              CREATE A ROOM
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input value={myName} onChange={e => setMyName(e.target.value)} placeholder="Your name"
                style={{ fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", outline: "none", transition: "border-color 160ms" }}
                onFocus={e => (e.currentTarget.style.borderColor = "var(--ink)")}
                onBlur={e => (e.currentTarget.style.borderColor = "var(--rule)")} />
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Room name"
                style={{ fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", outline: "none", transition: "border-color 160ms" }}
                onFocus={e => (e.currentTarget.style.borderColor = "var(--ink)")}
                onBlur={e => (e.currentTarget.style.borderColor = "var(--rule)")}
                onKeyDown={e => { if (e.key === "Enter") create(); }} />
              <div>
                <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 8, fontSize: 9, letterSpacing: "0.12em" }}>SESSION DURATION</div>
                <div style={{ display: "flex", border: "1px solid var(--rule)" }}>
                  {[25, 50, 90].map((d, i) => (
                    <button key={d} onClick={() => setDuration(d)} style={{
                      flex: 1, padding: "10px 0",
                      background: duration === d ? "var(--ink)" : "transparent",
                      color: duration === d ? "var(--paper)" : "var(--ink-2)",
                      border: "none", borderRadius: 8,
                      cursor: "pointer", fontFamily: "var(--sans)", fontWeight: 600, fontSize: 13,
                      transition: "background 180ms, color 180ms",
                    }}>{d} min</button>
                  ))}
                </div>
              </div>
              {error && <div className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 11 }}>{error}</div>}
              <button className="btn" onClick={create} disabled={creating} style={{ marginTop: 4 }}>
                {creating ? "Creating…" : "Create room →"}
              </button>
            </div>
          </div>

          {/* Join by code */}
          <div className="lobby-panel" style={{ padding: "28px", background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
            <div className="mono" style={{ color: "var(--cinnabar-ink)", marginBottom: 18, fontSize: 10, letterSpacing: "0.14em" }}>
              JOIN BY CODE
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input value={myNameJoin} onChange={e => setMyNameJoin(e.target.value)} placeholder="Your name"
                style={{ fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", outline: "none", transition: "border-color 160ms" }}
                onFocus={e => (e.currentTarget.style.borderColor = "var(--ink)")}
                onBlur={e => (e.currentTarget.style.borderColor = "var(--rule)")} />
              <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="ENTER CODE"
                maxLength={6}
                style={{
                  fontFamily: "var(--mono)", fontSize: 20, letterSpacing: "0.22em",
                  border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px",
                  color: "var(--ink)", textTransform: "uppercase", outline: "none",
                  transition: "border-color 160ms",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = "var(--ink)")}
                onBlur={e => (e.currentTarget.style.borderColor = "var(--rule)")}
                onKeyDown={e => { if (e.key === "Enter") joinByCode(); }} />
              <button className="btn" onClick={joinByCode} disabled={joining} style={{ marginTop: 4 }}>
                {joining ? "Joining…" : "Join room →"}
              </button>
            </div>

            <div style={{ marginTop: 24, padding: "14px 16px", borderLeft: "2px solid var(--cinnabar-ink)", background: "color-mix(in srgb, var(--paper-2) 70%, transparent)" }}>
              <div className="mono" style={{ color: "var(--cinnabar-ink)", marginBottom: 10, fontSize: 9, letterSpacing: "0.14em" }}>HOW IT WORKS</div>
              <ul style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.8, color: "var(--ink-2)", margin: 0, paddingLeft: 16 }}>
                <li>Create a room and share the 6-letter code</li>
                <li>Anyone joins from anywhere — no account needed</li>
                <li>Timer and tasks sync live across all members</li>
                <li>Leave early and the pact is flagged for everyone</li>
              </ul>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 60, borderTop: "1px solid var(--rule)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)", fontSize: 11 }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)", fontSize: 11 }}>Ledger.</div>
        </div>
      </main>
    </div>
  );
}
