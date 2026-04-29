"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";

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

function ActiveRoom({ roomId, myName, onLeave }: { roomId: string; myName: string; onLeave: () => void }) {
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [newTask, setNewTask] = useState("");
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRoom = useCallback(async () => {
    const { data, error: e } = await supabase.from("rooms").select("*").eq("id", roomId).single();
    if (e || !data) { setError("Room not found."); return; }
    setRoom(data as RoomRow);
    setSeconds(computeSeconds(data as RoomRow));
  }, [roomId]);

  useEffect(() => {
    fetchRoom();
    pollRef.current = setInterval(fetchRoom, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [roomId, fetchRoom]);

  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (room?.running) {
      tickRef.current = setInterval(() => {
        setSeconds(computeSeconds(room));
      }, 500);
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [room]);

  async function handleStart() {
    if (!room) return;
    const cur = computeSeconds(room);
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
    await supabase.from("rooms").update({
      running: false,
      started_at: null,
      seconds_at_pause: room.duration * 60,
    }).eq("id", roomId);
    fetchRoom();
  }

  async function handleToggleTask(id: number) {
    if (!room) return;
    const updated = room.tasks.map((t) => t.id === id ? { ...t, done: !t.done } : t);
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
    const updated = room.tasks.filter((t) => t.id !== id);
    await supabase.from("rooms").update({ tasks: updated }).eq("id", roomId);
    fetchRoom();
  }

  if (error) return (
    <div style={{ padding: "48px 0", textAlign: "center" }}>
      <div className="mono cin" style={{ marginBottom: 16, color: "var(--cinnabar-ink)" }}>{error}</div>
      <button className="btn ghost" onClick={onLeave}>← Back</button>
    </div>
  );

  if (!room) return (
    <div style={{ padding: "48px 0", textAlign: "center" }}>
      <div className="mono" style={{ color: "var(--ink-3)" }}>Connecting…</div>
    </div>
  );

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

      <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
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
            <button className="btn" onClick={room.running ? handlePause : handleStart} disabled={done} style={{ minWidth: 80 }}>
              {room.running ? "Pause" : "Start"}
            </button>
            <button className="btn ghost" onClick={handleReset}>Reset</button>
          </div>
          <div style={{ padding: "16px 20px" }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 10 }}>Members · {room.members.length}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {room.members.map((m, i) => (
                <span key={i} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "3px 8px", border: "1px solid var(--rule)", color: m === myName ? "var(--cinnabar-ink)" : "var(--ink-2)", textTransform: "uppercase" }}>{m}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Tasks */}
        <div style={{ border: "1px solid var(--ink)" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--ink)" }}>
            <div className="mono cin">Shared tasks</div>
          </div>
          {room.tasks.map((t, i) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < room.tasks.length - 1 ? "1px solid var(--rule)" : "none", background: t.done ? "var(--paper-2)" : "var(--paper)" }}>
              <input type="checkbox" checked={t.done} onChange={() => handleToggleTask(t.id)}
                style={{ accentColor: "var(--cinnabar-ink)", width: 14, height: 14, cursor: "pointer", flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--sans)", fontSize: 13, flex: 1, textDecoration: t.done ? "line-through" : "none", color: t.done ? "var(--ink-3)" : "var(--ink)" }}>{t.text}</span>
              <button onClick={() => handleDeleteTask(t.id)}
                style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)" }}>✕</button>
            </div>
          ))}
          <div style={{ borderTop: room.tasks.length ? "1px solid var(--rule)" : "none" }}>
            <input value={newTask} onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddTask(); }}
              placeholder="Add task and press Enter…"
              style={{ width: "100%", padding: "12px 16px", fontFamily: "var(--sans)", fontSize: 13, border: "none", background: "transparent", color: "var(--ink)", outline: "none", boxSizing: "border-box" }} />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20, padding: "12px 16px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
        <span className="mono" style={{ color: "var(--ink-3)" }}>Share this room code: </span>
        <span className="mono" style={{ color: "var(--cinnabar-ink)", letterSpacing: "0.15em" }}>{room.id}</span>
        <span className="mono" style={{ color: "var(--ink-3)" }}> · Anyone with this code can join and see the timer live.</span>
      </div>
    </div>
  );
}

export default function RoomsPage() {
  const { user } = useAuth();
  const [view, setView] = useState<"lobby" | "room">("lobby");
  const [roomId, setRoomId] = useState("");
  const [myName, setMyName] = useState("");
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(50);
  const [code, setCode] = useState("");
  const [myNameJoin, setMyNameJoin] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.email) {
      const n = user.email.split("@")[0];
      setMyName(n);
      setMyNameJoin(n);
    }
  }, [user]);

  async function create() {
    if (!name.trim() || !myName.trim()) { setError("Enter your name and a room name."); return; }
    setCreating(true);
    setError("");
    const id = genId();
    const { error: err } = await supabase.from("rooms").insert({
      id,
      name: name.trim(),
      duration,
      running: false,
      started_at: null,
      seconds_at_pause: duration * 60,
      members: [myName.trim()],
      tasks: [],
    });
    if (err) { setError("Could not create room. Make sure the rooms table is set up in Supabase."); setCreating(false); return; }
    setRoomId(id);
    setView("room");
    setCreating(false);
  }

  async function joinByCode() {
    if (!code.trim() || !myNameJoin.trim()) { setError("Enter your name and a room code."); return; }
    setJoining(true);
    setError("");
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
        <div className="mono" style={{ color: "var(--ink-3)" }}>Study Rooms</div>
      </header>
      <main className="mob-p" style={{ padding: "0 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
        <ActiveRoom roomId={roomId} myName={myName} onLeave={() => setView("lobby")} />
      </main>
    </div>
  );

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Study Rooms</div>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Silent accountability</div>
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, maxWidth: 800 }}>
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
              {error && <div className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 11 }}>{error}</div>}
              <button className="btn" onClick={create} disabled={creating} style={{ marginTop: 4 }}>
                {creating ? "Creating…" : "Create room →"}
              </button>
            </div>
          </div>

          <div>
            <div className="mono cin" style={{ marginBottom: 14 }}>Join by code</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input value={myNameJoin} onChange={(e) => setMyNameJoin(e.target.value)} placeholder="Your name"
                style={{ fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)" }} />
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="6-letter room code"
                style={{ fontFamily: "var(--mono)", fontSize: 16, letterSpacing: "0.15em", border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", textTransform: "uppercase" }} />
              <button className="btn" onClick={joinByCode} disabled={joining} style={{ marginTop: 4 }}>
                {joining ? "Joining…" : "Join room →"}
              </button>
            </div>

            <div style={{ marginTop: 24, padding: "16px 18px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
              <div className="mono cin" style={{ marginBottom: 8 }}>How it works</div>
              <ul style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.7, color: "var(--ink-2)", margin: 0, paddingLeft: 16 }}>
                <li>Create a room and share the 6-letter code</li>
                <li>Friends open the site and enter the code to join</li>
                <li>Timer and tasks stay in sync across all members</li>
                <li>Anyone can start, pause, or add tasks</li>
              </ul>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
        </div>
      </main>
    </div>
  );
}
