"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import TierGate from "@/components/tier-gate";

type RoomTask = { id: number; text: string; done: boolean };
type Room     = { id: string; name: string; duration: number; members: string[]; tasks: RoomTask[] };

function genId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

let taskIdSeq = 1;

function ActiveRoom({ room, onLeave }: { room: Room; onLeave: () => void }) {
  const [seconds,  setSeconds]  = useState(room.duration * 60);
  const [running,  setRunning]  = useState(false);
  const [tasks,    setTasks]    = useState<RoomTask[]>(room.tasks);
  const [newTask,  setNewTask]  = useState("");
  const [members,  setMembers]  = useState<string[]>(room.members);
  const [joining,  setJoining]  = useState(false);
  const [joinName, setJoinName] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tick = useCallback(() => setSeconds((s) => s <= 1 ? 0 : s - 1), []);

  useEffect(() => {
    if (running && seconds > 0) {
      intervalRef.current = setInterval(tick, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, seconds, tick]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const done = seconds === 0;
  const progress = 1 - seconds / (room.duration * 60);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 32 }}>
        <div>
          <div className="mono cin">Room · {room.id}</div>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 40, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.02em", margin: "6px 0 0" }}>{room.name}</h2>
        </div>
        <button onClick={onLeave} className="btn ghost">Leave room</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        {/* Timer */}
        <div style={{ border: "1px solid var(--ink)" }}>
          <div style={{ padding: "40px 28px 32px", textAlign: "center", background: "var(--paper-2)", borderBottom: "1px solid var(--ink)" }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 96, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.05em", lineHeight: 1, color: done ? "var(--cinnabar-ink)" : "var(--ink)" }}>
              {mm}:{ss}
            </div>
            {done && <div className="mono cin" style={{ marginTop: 8 }}>Session complete.</div>}
            <div style={{ margin: "20px 0 0", height: 4, background: "var(--paper)", border: "1px solid var(--rule)" }}>
              <div style={{ height: "100%", width: `${progress * 100}%`, background: done ? "var(--cinnabar)" : "var(--ink-2)", transition: "width 1s linear" }} />
            </div>
          </div>
          <div style={{ padding: "16px 20px", display: "flex", gap: 10, justifyContent: "center", borderBottom: "1px solid var(--ink)" }}>
            <button className="btn" onClick={() => { if (!done) setRunning((r) => !r); }} style={{ minWidth: 80 }}>
              {running ? "Pause" : "Start"}
            </button>
            <button className="btn ghost" onClick={() => { setRunning(false); setSeconds(room.duration * 60); }}>Reset</button>
          </div>
          {/* Members */}
          <div style={{ padding: "16px 20px" }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 10 }}>Members · {members.length}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {members.map((m, i) => (
                <span key={i} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "3px 8px", border: "1px solid var(--rule)", color: "var(--ink-2)", textTransform: "uppercase" }}>{m}</span>
              ))}
            </div>
            {joining ? (
              <div style={{ display: "flex", gap: 6 }}>
                <input value={joinName} onChange={(e) => setJoinName(e.target.value)} placeholder="Your name" autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter" && joinName.trim()) { setMembers((p) => [...p, joinName.trim()]); setJoinName(""); setJoining(false); } }}
                  style={{ flex: 1, fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "6px 8px", color: "var(--ink)" }} />
                <button className="btn" style={{ padding: "6px 12px", fontSize: 11 }} onClick={() => { if (joinName.trim()) { setMembers((p) => [...p, joinName.trim()]); setJoinName(""); setJoining(false); } }}>Join</button>
                <button className="btn ghost" style={{ padding: "6px 8px", fontSize: 11 }} onClick={() => setJoining(false)}>✕</button>
              </div>
            ) : (
              <button onClick={() => setJoining(true)} style={{ background: "none", border: "1px dashed var(--rule)", padding: "6px 12px", fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", color: "var(--ink-2)" }}>+ Join</button>
            )}
          </div>
        </div>

        {/* Tasks */}
        <div style={{ border: "1px solid var(--ink)" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--ink)" }}>
            <div className="mono cin">Shared tasks</div>
          </div>
          {tasks.map((t, i) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < tasks.length - 1 ? "1px solid var(--rule)" : "none", background: t.done ? "var(--paper-2)" : "var(--paper)" }}>
              <input type="checkbox" checked={t.done} onChange={() => setTasks((p) => p.map((x) => x.id === t.id ? { ...x, done: !x.done } : x))}
                style={{ accentColor: "var(--cinnabar-ink)", width: 14, height: 14, cursor: "pointer", flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--sans)", fontSize: 13, flex: 1, textDecoration: t.done ? "line-through" : "none", color: t.done ? "var(--ink-3)" : "var(--ink)" }}>{t.text}</span>
              <button onClick={() => setTasks((p) => p.filter((x) => x.id !== t.id))}
                style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)" }}>✕</button>
            </div>
          ))}
          <div style={{ borderTop: tasks.length ? "1px solid var(--rule)" : "none" }}>
            <input value={newTask} onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && newTask.trim()) { setTasks((p) => [...p, { id: taskIdSeq++, text: newTask.trim(), done: false }]); setNewTask(""); } }}
              placeholder="Add task and press Enter…"
              style={{ width: "100%", padding: "12px 16px", fontFamily: "var(--sans)", fontSize: 13, border: "none", background: "transparent", color: "var(--ink)", outline: "none" }} />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20, padding: "12px 16px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
        <span className="mono" style={{ color: "var(--ink-3)" }}>Share this room code: </span>
        <span className="mono" style={{ color: "var(--cinnabar-ink)", letterSpacing: "0.15em" }}>{room.id}</span>
        <span className="mono" style={{ color: "var(--ink-3)" }}> · Others can join by entering this code on the rooms page.</span>
      </div>
    </div>
  );
}

export default function RoomsPage() {
  const [room,     setRoom]     = useState<Room | null>(null);
  const [name,     setName]     = useState("");
  const [duration, setDuration] = useState(50);
  const [code,     setCode]     = useState("");
  const [myName,   setMyName]   = useState("");

  function create() {
    if (!name.trim() || !myName.trim()) return;
    setRoom({ id: genId(), name: name.trim(), duration, members: [myName.trim()], tasks: [] });
  }

  function joinByCode() {
    if (!code.trim() || !myName.trim()) return;
    setRoom({ id: code.toUpperCase(), name: `Room ${code.toUpperCase()}`, duration, members: [myName.trim()], tasks: [] });
  }

  if (room) return (
    <TierGate requires="pro-plus">
      <div>
        <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)" }}>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 10 · Study Rooms</div>
        </header>
        <main className="mob-p" style={{ padding: "0 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
          <ActiveRoom room={room} onLeave={() => setRoom(null)} />
        </main>
      </div>
    </TierGate>
  );

  return (
    <TierGate requires="pro-plus">
      <div>
        <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between" }}>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 10 · Study Rooms</div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Silent accountability</div>
        </header>

        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
          <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, maxWidth: 800 }}>
            {/* Create room */}
            <div>
              <div className="mono cin" style={{ marginBottom: 14 }}>Create a room</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="Your name"
                  style={{ fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)" }} />
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Room name"
                  style={{ fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)" }} />
                <div>
                  <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 8 }}>Session duration</div>
                  <div style={{ display: "flex", gap: 0, border: "1px solid var(--ink)" }}>
                    {[25, 50, 90].map((d, i) => (
                      <button key={d} onClick={() => setDuration(d)}
                        style={{ flex: 1, padding: "10px 0", background: duration === d ? "var(--ink)" : "var(--paper)", color: duration === d ? "var(--paper)" : "var(--ink)", border: "none", borderRight: i < 2 ? "1px solid var(--ink)" : "none", cursor: "pointer", fontFamily: "var(--sans)", fontWeight: 600, fontSize: 13 }}>
                        {d} min
                      </button>
                    ))}
                  </div>
                </div>
                <button className="btn" onClick={create} style={{ marginTop: 4 }}>Create room →</button>
              </div>
            </div>

            {/* Join room */}
            <div>
              <div className="mono cin" style={{ marginBottom: 14 }}>Join by code</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="Your name"
                  style={{ fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)" }} />
                <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="6-letter room code"
                  style={{ fontFamily: "var(--mono)", fontSize: 16, letterSpacing: "0.15em", border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", textTransform: "uppercase" }} />
                <button className="btn" onClick={joinByCode} style={{ marginTop: 4 }}>Join room →</button>
              </div>

              <div style={{ marginTop: 24, padding: "16px 18px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
                <div className="mono cin" style={{ marginBottom: 8 }}>How it works</div>
                <ul style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.7, color: "var(--ink-2)", margin: 0, paddingLeft: 16 }}>
                  <li>Create a room and share the 6-letter code</li>
                  <li>Everyone opens the same code in their browser</li>
                  <li>Set your session timer and work in silence</li>
                  <li>If your friend bails, both streaks reset</li>
                </ul>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
            <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 10 of 10.</div>
          </div>
        </main>
      </div>
    </TierGate>
  );
}
