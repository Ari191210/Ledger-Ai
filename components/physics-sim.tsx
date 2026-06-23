"use client";

import { useEffect, useRef, useState } from "react";
import ElasticSlider from "@/components/ui/elastic-slider";

export type SimType =
  | "projectile" | "pendulum" | "wave" | "spring" | "electric" | "orbital" | "optics" | "gas"
  | "titration" | "molecular" | "reaction_energy" | "equilibrium" | "atomic_model"
  | "osmosis" | "mitosis" | "enzyme" | "population" | "action_potential"
  | "none";
export interface SimConfig { type: SimType; label?: string; params?: Record<string, number> }

function simCategory(type: SimType) {
  if (["titration","molecular","reaction_energy","equilibrium","atomic_model"].includes(type)) return "CHEMISTRY LAB";
  if (["osmosis","mitosis","enzyme","population","action_potential"].includes(type)) return "BIOLOGY LAB";
  return "PHYSICS LAB";
}

const C = {
  bg: "#080808", grid: "#ffffff10", primary: "#ff6848", secondary: "#ffffff18",
  accent: "#d4a840", highlight: "#d4a840", white: "#f2f2ef", dim: "#686864", surface: "#111111",
  blue: "#5a9ed4", purple: "#a888d4", cyan: "#44aaaa", pink: "#ec4899",
};

// Probe element used to convert OKLCH CSS variables → canvas-compatible rgb() values.
// Canvas fillStyle/strokeStyle reject raw OKLCH strings; reading via getComputedStyle()
// forces the browser to serialise the color as rgb(r,g,b) regardless of source format.
let _cProbe: HTMLSpanElement | null = null;
let _cThemeKey = "";

function probeColor(cssVar: string, fallback: string): string {
  if (!_cProbe) {
    _cProbe = document.createElement("span");
    _cProbe.style.display = "none";
    document.body.appendChild(_cProbe);
  }
  _cProbe.style.color = `var(${cssVar})`;
  const rgb = getComputedStyle(_cProbe).color;
  return rgb && rgb !== "rgba(0, 0, 0, 0)" ? rgb : fallback;
}

function buildC() {
  if (typeof window === "undefined") return;
  const el = document.documentElement;
  // Cache key: rebuild only when mode or palette attributes change
  const themeKey = `${el.dataset.mode ?? ""}|${el.dataset.palette ?? ""}|${el.className}`;
  if (themeKey === _cThemeKey) return;
  _cThemeKey = themeKey;

  const isLight = el.dataset.mode === "light";
  C.bg        = probeColor("--paper",        C.bg);
  C.surface   = probeColor("--paper-2",      C.surface);
  C.primary   = probeColor("--cinnabar-ink", C.primary);
  C.accent    = probeColor("--ochre",        C.accent);
  C.highlight = C.accent;
  C.white     = probeColor("--ink",          C.white);
  C.dim       = probeColor("--ink-3",        C.dim);
  C.blue      = probeColor("--slate",        C.blue);
  C.purple    = probeColor("--plum",         C.purple);
  C.cyan      = probeColor("--teal",         C.cyan);
  C.secondary = isLight ? "#00000018" : "#ffffff18";
  C.grid      = isLight ? "#00000010" : "#ffffff0d";
}

const CONTROLS: Record<Exclude<SimType,"none">, { key: string; label: string; min: number; max: number; step: number; unit: string; default: number }[]> = {
  projectile: [
    { key:"angle",   label:"Launch angle",   min:5,   max:85,  step:1,    unit:"°",    default:45   },
    { key:"v0",      label:"Initial speed",  min:5,   max:50,  step:1,    unit:"m/s",  default:20   },
    { key:"h0",      label:"Launch height",  min:0,   max:100, step:1,    unit:"m",    default:0    },
    { key:"hf",      label:"Landing height", min:0,   max:100, step:1,    unit:"m",    default:0    },
    { key:"gravity", label:"Gravity",        min:1,   max:20,  step:0.5,  unit:"m/s²", default:9.8  },
  ],
  pendulum: [
    { key:"length",    label:"Length",     min:0.3, max:3,   step:0.1,  unit:"m",  default:1   },
    { key:"amplitude", label:"Max angle",  min:5,   max:75,  step:1,    unit:"°",  default:30  },
    { key:"gravity",   label:"Gravity",    min:1,   max:20,  step:0.5,  unit:"m/s²", default:9.8},
  ],
  wave: [
    { key:"amp1",  label:"Wave 1 amplitude",  min:0.1, max:1,   step:0.05, unit:"",   default:0.6 },
    { key:"freq1", label:"Wave 1 frequency",  min:0.5, max:4,   step:0.25, unit:"Hz", default:1   },
    { key:"amp2",  label:"Wave 2 amplitude",  min:0.1, max:1,   step:0.05, unit:"",   default:0.6 },
    { key:"freq2", label:"Wave 2 frequency",  min:0.5, max:4,   step:0.25, unit:"Hz", default:2   },
  ],
  spring: [
    { key:"k",    label:"Spring constant",  min:1,   max:30,  step:1,    unit:"N/m", default:10  },
    { key:"mass", label:"Mass",             min:0.1, max:5,   step:0.1,  unit:"kg",  default:1   },
    { key:"x0",   label:"Displacement",     min:0.1, max:1,   step:0.05, unit:"m",   default:0.4 },
  ],
  electric: [
    { key:"q1", label:"Charge 1", min:-5, max:5, step:0.5, unit:"μC", default:3  },
    { key:"q2", label:"Charge 2", min:-5, max:5, step:0.5, unit:"μC", default:-3 },
  ],
  orbital: [
    { key:"ecc",   label:"Eccentricity",      min:0,   max:0.9, step:0.05, unit:"",  default:0.4 },
    { key:"speed", label:"Speed multiplier",  min:0.3, max:2.5, step:0.1,  unit:"×", default:1   },
  ],
  optics: [
    { key:"angle", label:"Angle of incidence", min:5,  max:85,  step:1,    unit:"°", default:45  },
    { key:"n1",    label:"n₁ (medium 1)",       min:1,  max:2.5, step:0.1,  unit:"",  default:1.0 },
    { key:"n2",    label:"n₂ (medium 2)",       min:1,  max:2.5, step:0.1,  unit:"",  default:1.5 },
  ],
  gas: [
    { key:"temp",      label:"Temperature", min:100, max:1000, step:50, unit:"K",  default:300 },
    { key:"particles", label:"Particles",   min:10,  max:80,   step:5,  unit:"",   default:30  },
  ],
  titration: [
    { key:"pKa",      label:"pKa (weak acid)", min:2,    max:12,  step:0.1,  unit:"",  default:4.76 },
    { key:"conc_base",label:"[Base]",           min:0.01, max:2,   step:0.01, unit:"M", default:0.1  },
  ],
  molecular: [
    { key:"bond_pairs", label:"Bond pairs",  min:2, max:4, step:1, unit:"", default:4 },
    { key:"lone_pairs", label:"Lone pairs",  min:0, max:3, step:1, unit:"", default:0 },
  ],
  reaction_energy: [
    { key:"Ea", label:"Activation energy",  min:10,  max:200, step:5, unit:"kJ",  default:80  },
    { key:"dH", label:"ΔH (rxn enthalpy)", min:-150, max:150, step:5, unit:"kJ", default:-40 },
  ],
  equilibrium: [
    { key:"Kc",   label:"Kc",          min:0.01, max:100, step:0.5, unit:"",  default:1   },
    { key:"temp_eq",label:"Temperature", min:200,  max:1000,step:50,  unit:"K", default:500 },
  ],
  atomic_model: [
    { key:"protons", label:"Protons (Z)",   min:1, max:20, step:1, unit:"",  default:6 },
    { key:"excited", label:"Excited state", min:0, max:1,  step:1, unit:"",  default:0 },
  ],
  osmosis: [
    { key:"conc_left",  label:"Left [solute]",  min:0, max:10, step:0.5, unit:"M", default:1 },
    { key:"conc_right", label:"Right [solute]", min:0, max:10, step:0.5, unit:"M", default:5 },
  ],
  mitosis: [
    { key:"speed", label:"Speed", min:0.3, max:3, step:0.1, unit:"×", default:1 },
  ],
  enzyme: [
    { key:"Km",        label:"Km (Michaelis)",  min:0.1, max:10,  step:0.1, unit:"mM", default:2   },
    { key:"Vmax",      label:"Vmax",            min:10,  max:200, step:10,  unit:"",   default:100 },
    { key:"substrate", label:"[S] substrate",   min:0,   max:20,  step:0.5, unit:"mM", default:5   },
  ],
  population: [
    { key:"growth_rate",   label:"Growth rate (r)",    min:0.1, max:2,    step:0.05, unit:"",   default:0.5 },
    { key:"carrying_cap",  label:"Carrying capacity K", min:50,  max:1000, step:50,   unit:"",   default:500 },
    { key:"initial_pop",   label:"Initial population",  min:5,   max:100,  step:5,    unit:"",   default:20  },
  ],
  action_potential: [
    { key:"frequency",  label:"Frequency",  min:0.3, max:4,  step:0.1, unit:"Hz", default:1   },
    { key:"threshold",  label:"Threshold",  min:-70, max:-40,step:1,   unit:"mV", default:-55 },
  ],
};

const SIM_HINTS: Record<Exclude<SimType,"none">, string> = {
  projectile:       "Drag sliders to explore the trajectory. Launch/landing height model towers or cliffs. The apex and range update in real time.",
  pendulum:         "Period only depends on length and gravity — not amplitude (for small angles). Try it.",
  wave:             "When both frequencies are close, you see beats — a slow amplitude oscillation.",
  spring:           "The orange arrow shows the restoring force. Heavier mass → slower oscillation.",
  electric:         "Field lines go from + to −. Like charges repel; opposite attract. Set both + or both − to see.",
  orbital:          "Planet moves fastest at periapsis (closest). Kepler's second law — equal areas in equal times.",
  optics:           "When n₂ > n₁, light slows and bends toward the normal. Increase angle past critical → TIR.",
  gas:              "Higher temperature → faster particles → higher pressure. Maxwell-Boltzmann in action.",
  titration:        "The steep jump at the equivalence point is where indicator colour changes. pKa = pH at half-equivalence.",
  molecular:        "VSEPR: lone pairs repel more than bond pairs, compressing bond angles. Tetrahedral → pyramidal → bent.",
  reaction_energy:  "Catalysts lower Ea — they don't change ΔH. A negative ΔH means the reaction releases energy (exothermic).",
  equilibrium:      "Kc > 1 means products favoured. Kc < 1 means reactants favoured. Le Chatelier shifts with temperature.",
  atomic_model:     "Electrons fill shells: 2, 8, 8... In excited state, electrons jump to higher orbitals and emit photons when they fall back.",
  osmosis:          "Water moves from low solute → high solute (down the water potential gradient). Net flow continues until equilibrium.",
  mitosis:          "Watch the chromosomes condense, line up on the metaphase plate, then pull apart into two identical daughter cells.",
  enzyme:           "The curve shows Michaelis-Menten kinetics. At [S] = Km, velocity = Vmax/2. Km measures enzyme-substrate affinity.",
  population:       "Logistic growth: exponential at first, then slows as N approaches K. The S-curve is universal in nature.",
  action_potential: "Depolarization: Na⁺ rushes in. Repolarization: K⁺ flows out. The threshold is the critical voltage for an all-or-nothing spike.",
};

// Graph sims have their own axes — skip the background grid for these
const GRAPH_SIMS = new Set(["titration","reaction_energy","equilibrium","enzyme","population","action_potential"]);

function grid(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.strokeStyle = C.grid; ctx.lineWidth = 0.5;
  for (let x = 0; x <= W; x += 60) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y <= H; y += 60) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
}

function lbl(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, align: CanvasTextAlign = "left") {
  ctx.font = "11px 'Space Mono', monospace"; ctx.fillStyle = C.dim; ctx.textAlign = align; ctx.fillText(text, x, y);
}

// ── Projectile ─────────────────────────────────────────────────────────────────
function drawProjectile(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, s: Record<string,number>) {
  const ang = (s.angle??45)*Math.PI/180, v0 = s.v0??20, g = s.gravity??9.8;
  const h0 = s.h0??0, hf = s.hf??0;
  const vx = v0*Math.cos(ang), vy = v0*Math.sin(ang);

  // Time of flight accounting for launch/landing height difference
  const disc = vy*vy + 2*g*(h0-hf);
  const tFlight = disc >= 0 ? (vy + Math.sqrt(disc)) / g : 2*vy/g;
  const range = vx * tFlight;
  // Highest point reached above ground
  const apexY = h0 + vy*vy/(2*g);
  const yMax = Math.max(apexY, h0, hf) * 1.25 + 2;

  const pad = 44;
  const gW = W - pad*2, gH = H - pad*2;
  const cx = (x: number) => pad + (range > 0 ? x/range*gW : gW/2);
  const cy = (y: number) => H - pad - y/yMax*gH;
  const groundY = cy(0);

  // Ground line
  ctx.strokeStyle = C.secondary; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(pad, groundY); ctx.lineTo(W-pad, groundY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(pad, groundY); ctx.lineTo(pad, pad); ctx.stroke();

  // Draw towers if h0 or hf > 0
  const towerW = 14;
  if (h0 > 0) {
    ctx.fillStyle = C.secondary;
    ctx.fillRect(cx(0)-towerW/2, cy(h0), towerW, groundY-cy(h0));
    ctx.strokeStyle = C.dim; ctx.lineWidth = 1;
    ctx.strokeRect(cx(0)-towerW/2, cy(h0), towerW, groundY-cy(h0));
    lbl(ctx, `${h0}m`, cx(0), cy(h0)-6, "center");
  }
  if (hf > 0) {
    ctx.fillStyle = C.secondary;
    ctx.fillRect(cx(range)-towerW/2, cy(hf), towerW, groundY-cy(hf));
    ctx.strokeStyle = C.dim; ctx.lineWidth = 1;
    ctx.strokeRect(cx(range)-towerW/2, cy(hf), towerW, groundY-cy(hf));
    lbl(ctx, `${hf}m`, cx(range), cy(hf)-6, "center");
  }

  // Full trajectory (dashed guide)
  ctx.strokeStyle = C.dim; ctx.lineWidth = 1; ctx.setLineDash([4,4]);
  ctx.beginPath();
  for (let i=0;i<=120;i++) {
    const ti=(i/120)*tFlight, xi=vx*ti, yi=h0+vy*ti-0.5*g*ti*ti;
    i===0 ? ctx.moveTo(cx(xi),cy(yi)) : ctx.lineTo(cx(xi),cy(yi));
  }
  ctx.stroke(); ctx.setLineDash([]);

  // Animated ball
  const pause = 0.5;
  const tNow = t%(tFlight+pause), tc = Math.min(tNow, tFlight);
  const xc = vx*tc, yc = h0+vy*tc-0.5*g*tc*tc;
  const active = tNow <= tFlight;

  // Trail
  ctx.strokeStyle = C.primary+"55"; ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i=0;i<=60;i++) {
    const ti=(i/60)*tc, xi=vx*ti, yi=h0+vy*ti-0.5*g*ti*ti;
    i===0 ? ctx.moveTo(cx(xi),cy(yi)) : ctx.lineTo(cx(xi),cy(yi));
  }
  ctx.stroke();

  ctx.beginPath(); ctx.arc(cx(xc),cy(yc),7,0,Math.PI*2);
  ctx.fillStyle = active ? C.primary : C.accent; ctx.fill();

  // Launch angle arrow
  const al = 28;
  ctx.strokeStyle = C.accent; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx(0),cy(h0)); ctx.lineTo(cx(0)+al*Math.cos(ang),cy(h0)-al*Math.sin(ang)); ctx.stroke();

  // Height indicator while in flight
  if (active && yc > h0+0.5) {
    ctx.strokeStyle = C.highlight+"44"; ctx.lineWidth = 1; ctx.setLineDash([3,3]);
    ctx.beginPath(); ctx.moveTo(cx(xc),cy(yc)); ctx.lineTo(cx(xc),groundY); ctx.stroke();
    ctx.setLineDash([]);
    lbl(ctx, `h=${yc.toFixed(1)}m`, cx(xc)+6, cy(yc)-6);
  }

  lbl(ctx, `Range: ${range.toFixed(1)} m`, pad, H-pad+16);
  lbl(ctx, `H_apex: ${apexY.toFixed(1)} m`, pad, pad-10);
  lbl(ctx, `T: ${tFlight.toFixed(2)} s`, W-pad, pad-10, "right");
}

// ── Pendulum ──────────────────────────────────────────────────────────────────
function drawPendulum(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, s: Record<string,number>) {
  const L = s.length??1, th0 = (s.amplitude??30)*Math.PI/180, g = s.gravity??9.8;
  const omega = Math.sqrt(g/L), period = 2*Math.PI/omega;
  const theta = th0*Math.cos(omega*t);
  const px = W/2, py = H*0.15, sc = (H*0.68)/L;
  const bx = px+Math.sin(theta)*L*sc, by = py+Math.cos(theta)*L*sc;

  ctx.strokeStyle = C.dim; ctx.lineWidth = 1; ctx.setLineDash([4,4]);
  ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(px,py+L*sc*1.1); ctx.stroke(); ctx.setLineDash([]);

  ctx.strokeStyle = C.primary+"22"; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let i=60;i>=0;i--) {
    const tP = t-i*0.025, thP = th0*Math.cos(omega*tP);
    const bxP = px+Math.sin(thP)*L*sc, byP = py+Math.cos(thP)*L*sc;
    i===60?ctx.moveTo(bxP,byP):ctx.lineTo(bxP,byP);
  }
  ctx.stroke();

  ctx.strokeStyle = C.secondary; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(bx,by); ctx.stroke();

  ctx.beginPath(); ctx.arc(px,py,4,0,Math.PI*2); ctx.fillStyle=C.dim; ctx.fill();
  ctx.beginPath(); ctx.arc(bx,by,11,0,Math.PI*2); ctx.fillStyle=C.primary; ctx.fill();
  ctx.strokeStyle=C.white; ctx.lineWidth=1; ctx.stroke();

  lbl(ctx, `T = ${period.toFixed(2)} s`, 12, 20);
  lbl(ctx, `θ = ${(theta*180/Math.PI).toFixed(1)}°`, 12, 36);
  lbl(ctx, `ω = ${omega.toFixed(2)} rad/s`, 12, 52);
}

// ── Wave ──────────────────────────────────────────────────────────────────────
function drawWave(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, s: Record<string,number>) {
  const A1=s.amp1??0.6, f1=s.freq1??1, A2=s.amp2??0.6, f2=s.freq2??2;
  const k = 2*Math.PI/(W*0.72), aS = H*0.1;
  const lanes = [
    { cy: H*0.22, A:A1, f:f1, color:C.primary,   lab:`f=${f1}Hz A=${A1}` },
    { cy: H*0.5,  A:A2, f:f2, color:C.accent,    lab:`f=${f2}Hz A=${A2}` },
    { cy: H*0.78, A:0,  f:0,  color:C.highlight, lab:"Resultant" },
  ];
  const pad = 20;
  for (const [idx, ln] of lanes.entries()) {
    ctx.strokeStyle = C.secondary; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(pad,ln.cy); ctx.lineTo(W-pad,ln.cy); ctx.stroke();
    lbl(ctx, ln.lab, pad+2, ln.cy-aS*1.3);
    ctx.strokeStyle = ln.color; ctx.lineWidth = idx===2 ? 2.5 : 2;
    ctx.beginPath();
    for (let px=pad;px<=W-pad;px++) {
      let y: number;
      if (idx===2) {
        const y1=A1*aS*Math.sin(2*Math.PI*f1*t-k*(px-pad));
        const y2=A2*aS*Math.sin(2*Math.PI*f2*t-k*(px-pad));
        y = ln.cy-(y1+y2);
      } else {
        y = ln.cy-ln.A*aS*Math.sin(2*Math.PI*ln.f*t-k*(px-pad));
      }
      px===pad?ctx.moveTo(px,y):ctx.lineTo(px,y);
    }
    ctx.stroke();
  }
  const beatFreq = Math.abs(f1-f2);
  if (beatFreq < 1) lbl(ctx, `Beat: ${beatFreq.toFixed(2)} Hz`, W-pad, H-14, "right");
}

// ── Spring ────────────────────────────────────────────────────────────────────
function drawSpring(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, s: Record<string,number>) {
  const k=s.k??10, m=s.mass??1, x0=s.x0??0.4;
  const omega=Math.sqrt(k/m), period=2*Math.PI/omega, x=x0*Math.cos(omega*t);
  const wallX=W*0.1, cy2=H/2, eqX=W*0.55, sc=(W*0.28)/Math.max(x0,0.1);
  const massX = eqX+x*sc, mSz = 26+m*5;

  ctx.fillStyle=C.secondary; ctx.fillRect(wallX-10,cy2-55,10,110);
  ctx.strokeStyle=C.dim; ctx.lineWidth=1;
  for (let i=-50;i<55;i+=11) { ctx.beginPath(); ctx.moveTo(wallX-10,cy2+i); ctx.lineTo(wallX,cy2+i+8); ctx.stroke(); }

  ctx.strokeStyle=C.dim; ctx.lineWidth=1; ctx.setLineDash([4,4]);
  ctx.beginPath(); ctx.moveTo(eqX,cy2-38); ctx.lineTo(eqX,cy2+38); ctx.stroke(); ctx.setLineDash([]);
  lbl(ctx, "eq", eqX-8, cy2+50);

  const x1=wallX, x2=massX-mSz/2, coils=12, cH=14;
  ctx.strokeStyle=C.primary; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x1,cy2);
  const segW=(x2-x1)/coils;
  for (let i=0;i<coils;i++) {
    const sx=x1+i*segW;
    ctx.lineTo(sx+segW/4, cy2-cH); ctx.lineTo(sx+3*segW/4, cy2+cH);
  }
  ctx.lineTo(x2,cy2); ctx.stroke();

  ctx.fillStyle=C.surface; ctx.strokeStyle=C.primary; ctx.lineWidth=2;
  ctx.fillRect(massX-mSz/2, cy2-mSz/2, mSz, mSz);
  ctx.strokeRect(massX-mSz/2, cy2-mSz/2, mSz, mSz);
  ctx.font="bold 9px 'Space Mono',monospace"; ctx.fillStyle=C.white; ctx.textAlign="center";
  ctx.fillText(`${m}kg`, massX, cy2+4);

  if (Math.abs(x)>0.01) {
    const fd=-Math.sign(x)*28, ax=massX, ay=cy2-mSz/2-8;
    ctx.strokeStyle=C.accent; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(ax+fd,ay); ctx.stroke();
    const dir=fd>0?1:-1;
    ctx.beginPath(); ctx.moveTo(ax+fd,ay); ctx.lineTo(ax+fd-dir*6,ay-5); ctx.lineTo(ax+fd-dir*6,ay+5); ctx.closePath();
    ctx.fillStyle=C.accent; ctx.fill();
    lbl(ctx, `F=${(k*Math.abs(x)).toFixed(1)}N`, ax+fd+(dir*8), ay-4);
  }
  lbl(ctx, `k=${k} N/m`, 12, 20); lbl(ctx, `T=${period.toFixed(2)} s`, 12, 36); lbl(ctx, `x=${x.toFixed(3)} m`, 12, 52);
}

// ── Electric Field ────────────────────────────────────────────────────────────
function traceLine(ctx: CanvasRenderingContext2D, sx: number, sy: number, q1: number, q2: number, p1: {x:number;y:number}, p2: {x:number;y:number}, W: number, H: number) {
  const step=3; let x=sx, y=sy;
  ctx.strokeStyle=`rgba(82,217,104,0.35)`; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(x,y);
  for (let i=0;i<280;i++) {
    let ex=0,ey=0;
    const dx1=x-p1.x, dy1=y-p1.y, r1sq=dx1*dx1+dy1*dy1; if(r1sq<144)break;
    const r1=Math.sqrt(r1sq); ex+=q1*dx1/(r1sq*r1); ey+=q1*dy1/(r1sq*r1);
    const dx2=x-p2.x, dy2=y-p2.y, r2sq=dx2*dx2+dy2*dy2; if(r2sq<144)break;
    const r2=Math.sqrt(r2sq); ex+=q2*dx2/(r2sq*r2); ey+=q2*dy2/(r2sq*r2);
    const len=Math.sqrt(ex*ex+ey*ey); if(len<1e-10)break;
    x+=ex/len*step; y+=ey/len*step;
    if(x<0||x>W||y<0||y>H)break;
    ctx.lineTo(x,y);
  }
  ctx.stroke();
}

function drawElectric(ctx: CanvasRenderingContext2D, W: number, H: number, s: Record<string,number>) {
  const q1=s.q1??3, q2=s.q2??-3;
  const cx2=W/2, cy2=H/2, sep=W*0.28;
  const p1={x:cx2-sep/2,y:cy2}, p2={x:cx2+sep/2,y:cy2};

  const posCharges: {p:{x:number;y:number};q:number}[] = [];
  if (q1>0) posCharges.push({p:p1,q:q1});
  if (q2>0) posCharges.push({p:p2,q:q2});

  for (const {p,q} of posCharges) {
    const n = Math.round(Math.abs(q)*4)+4;
    for (let i=0;i<n;i++) {
      const ang=(i/n)*Math.PI*2;
      traceLine(ctx, p.x+Math.cos(ang)*18, p.y+Math.sin(ang)*18, q1, q2, p1, p2, W, H);
    }
  }

  const drawCharge = (p:{x:number;y:number}, q:number) => {
    const r=14+Math.abs(q)*1.5;
    ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2);
    ctx.fillStyle=q>0?"#c43030":q<0?"#3060c4":"#666"; ctx.fill();
    ctx.strokeStyle=q>0?"#ff8888":q<0?"#8888ff":"#aaa"; ctx.lineWidth=1.5; ctx.stroke();
    ctx.font="bold 14px monospace"; ctx.fillStyle="#fff"; ctx.textAlign="center";
    ctx.fillText(q>0?"+":"−", p.x, p.y+5);
    lbl(ctx, `${Math.abs(q).toFixed(1)}μC`, p.x, p.y+r+14, "center");
  };
  drawCharge(p1,q1); drawCharge(p2,q2);
  const force = q1*q2<0?"Attractive":q1*q2>0?"Repulsive":"No force";
  ctx.font="10px 'Space Mono',monospace"; ctx.fillStyle=C.dim; ctx.textAlign="center";
  ctx.fillText(force, cx2, H-12);
}

// ── Orbital ───────────────────────────────────────────────────────────────────
function drawOrbital(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, s: Record<string,number>) {
  const ecc=Math.min(0.92,s.ecc??0.4), spd=s.speed??1;
  const cx2=W/2, cy2=H/2, a=Math.min(W,H)*0.34, b=a*Math.sqrt(1-ecc*ecc), focus=a*ecc;
  const starX=cx2-focus;

  ctx.strokeStyle=C.dim; ctx.lineWidth=1; ctx.setLineDash([3,3]);
  ctx.beginPath(); ctx.ellipse(cx2-focus,cy2,a,b,0,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]);

  const starGrad=ctx.createRadialGradient(starX,cy2,2,starX,cy2,13);
  starGrad.addColorStop(0,C.highlight); starGrad.addColorStop(1,"#c85000");
  ctx.beginPath(); ctx.arc(starX,cy2,13,0,Math.PI*2); ctx.fillStyle=starGrad; ctx.fill();

  const M=(spd*0.5*t)%(Math.PI*2);
  let E=M; for(let i=0;i<8;i++) E=M+ecc*Math.sin(E);
  const nu=2*Math.atan2(Math.sqrt(1+ecc)*Math.sin(E/2), Math.sqrt(1-ecc)*Math.cos(E/2));
  const r=a*(1-ecc*Math.cos(E));
  const bpx=starX+r*Math.cos(nu), bpy=cy2+(b/a)*r*Math.sin(nu);

  ctx.strokeStyle=C.primary+"44"; ctx.lineWidth=1.5; ctx.beginPath();
  for(let i=40;i>=0;i--) {
    const MP=(spd*0.5*(t-i*0.04))%(Math.PI*2);
    let EP=MP; for(let j=0;j<5;j++) EP=MP+ecc*Math.sin(EP);
    const nuP=2*Math.atan2(Math.sqrt(1+ecc)*Math.sin(EP/2), Math.sqrt(1-ecc)*Math.cos(EP/2));
    const rP=a*(1-ecc*Math.cos(EP));
    const px2=starX+rP*Math.cos(nuP), py2=cy2+(b/a)*rP*Math.sin(nuP);
    i===40?ctx.moveTo(px2,py2):ctx.lineTo(px2,py2);
  }
  ctx.stroke();

  ctx.strokeStyle=C.grid+"aa"; ctx.lineWidth=0.8;
  ctx.beginPath(); ctx.moveTo(starX,cy2); ctx.lineTo(bpx,bpy); ctx.stroke();

  ctx.beginPath(); ctx.arc(bpx,bpy,7,0,Math.PI*2); ctx.fillStyle=C.primary; ctx.fill();
  ctx.strokeStyle=C.white; ctx.lineWidth=1; ctx.stroke();

  lbl(ctx, `e = ${ecc.toFixed(2)}`, 12, 20);
  lbl(ctx, `Periapsis: ${(a*(1-ecc)).toFixed(0)} px`, 12, 36);
  lbl(ctx, `Apoapsis:  ${(a*(1+ecc)).toFixed(0)} px`, 12, 52);
}

// ── Optics ────────────────────────────────────────────────────────────────────
function drawOptics(ctx: CanvasRenderingContext2D, W: number, H: number, s: Record<string,number>) {
  const ti=(s.angle??45)*Math.PI/180, n1=s.n1??1.0, n2=s.n2??1.5;
  const sinT=(n1/n2)*Math.sin(ti), tir=Math.abs(sinT)>1, tt=tir?null:Math.asin(sinT);
  const iY=H*0.5, hX=W/2, rLen=Math.min(W,H)*0.44;

  ctx.fillStyle=C.primary+"0a"; ctx.fillRect(0,0,W,iY);
  ctx.fillStyle="#3060c408"; ctx.fillRect(0,iY,W,H-iY);
  lbl(ctx, `n₁ = ${n1.toFixed(1)}  (medium 1)`, 12, 18);
  lbl(ctx, `n₂ = ${n2.toFixed(1)}  (medium 2)`, 12, iY+18);

  ctx.strokeStyle=C.secondary; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(0,iY); ctx.lineTo(W,iY); ctx.stroke();

  ctx.strokeStyle=C.dim; ctx.lineWidth=1; ctx.setLineDash([5,5]);
  ctx.beginPath(); ctx.moveTo(hX,iY-80); ctx.lineTo(hX,iY+80); ctx.stroke(); ctx.setLineDash([]);

  ctx.strokeStyle=C.highlight; ctx.lineWidth=2.5;
  ctx.beginPath(); ctx.moveTo(hX-rLen*Math.sin(ti), iY-rLen*Math.cos(ti)); ctx.lineTo(hX,iY); ctx.stroke();

  ctx.strokeStyle=C.accent; ctx.lineWidth=1.5; ctx.setLineDash([6,3]);
  ctx.beginPath(); ctx.moveTo(hX,iY); ctx.lineTo(hX+rLen*Math.sin(ti), iY-rLen*Math.cos(ti)); ctx.stroke(); ctx.setLineDash([]);

  if (tt!==null) {
    const tx=hX+rLen*Math.sin(tt), ty=iY+rLen*Math.cos(tt);
    ctx.strokeStyle="#4488ff"; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.moveTo(hX,iY); ctx.lineTo(tx,ty); ctx.stroke();
    lbl(ctx, `θ_t = ${(tt*180/Math.PI).toFixed(1)}°`, tx+6, ty-8);
    // Critical angle
    const tc=n1<n2?null:Math.asin(n2/n1);
    if (tc) lbl(ctx, `θ_c = ${(tc*180/Math.PI).toFixed(1)}°`, W-12, H-14, "right");
  } else {
    ctx.font="bold 11px monospace"; ctx.fillStyle=C.accent; ctx.textAlign="center";
    ctx.fillText("Total Internal Reflection", hX, iY+46);
    lbl(ctx, "(no transmitted ray)", hX, iY+62, "center");
  }
  lbl(ctx, `θ_i = ${(ti*180/Math.PI).toFixed(1)}°`, 12, H-14);
}

// ── Gas (Kinetic Theory) ──────────────────────────────────────────────────────
type GasParticle = { x:number; y:number; vx:number; vy:number; r:number };

function initGas(N: number, T: number, W: number, H: number): GasParticle[] {
  const baseSpeed=Math.sqrt(T/300)*2.4, pad=22;
  return Array.from({length:N}, () => {
    const ang=Math.random()*Math.PI*2;
    const spd=baseSpeed*(0.5+Math.random());
    return { x:pad+Math.random()*(W-pad*2), y:pad+Math.random()*(H-pad*2), vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd, r:3+Math.random()*1.5 };
  });
}

function updateGas(particles: GasParticle[], W: number, H: number) {
  const pad=22;
  for (const p of particles) {
    p.x+=p.vx; p.y+=p.vy;
    if(p.x-p.r<pad){ p.x=pad+p.r; p.vx=Math.abs(p.vx); }
    if(p.x+p.r>W-pad){ p.x=W-pad-p.r; p.vx=-Math.abs(p.vx); }
    if(p.y-p.r<pad){ p.y=pad+p.r; p.vy=Math.abs(p.vy); }
    if(p.y+p.r>H-pad){ p.y=H-pad-p.r; p.vy=-Math.abs(p.vy); }
  }
}

function drawGas(ctx: CanvasRenderingContext2D, W: number, H: number, particles: GasParticle[], s: Record<string,number>) {
  const T=s.temp??300, pad=22;
  ctx.strokeStyle=C.secondary; ctx.lineWidth=2; ctx.strokeRect(pad,pad,W-pad*2,H-pad*2);
  for (const p of particles) {
    const spd=Math.sqrt(p.vx*p.vx+p.vy*p.vy), heat=Math.min(1,spd/5.5);
    const r=Math.round(heat*240), g2=Math.round((1-heat)*180);
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle=`rgb(${r},${g2},60)`; ctx.fill();
  }
  const avgSpd=particles.reduce((a,p)=>a+Math.sqrt(p.vx*p.vx+p.vy*p.vy),0)/Math.max(1,particles.length);
  lbl(ctx, `T = ${T} K`, 12, 18);
  lbl(ctx, `N = ${particles.length}`, 12, 32);
  lbl(ctx, `⟨v⟩ = ${avgSpd.toFixed(2)} px/frame`, 12, 46);
}

// ── Titration ─────────────────────────────────────────────────────────────────
function drawTitration(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, s: Record<string,number>) {
  const pKa = s.pKa ?? 4.76;
  const pL = 52, pR = 20, pT = 24, pB = 38;
  const gW = W-pL-pR, gH = H-pT-pB;
  const xC = (v: number) => pL + (v/2)*gW;
  const yC = (pH: number) => pT + gH - (pH/14)*gH;

  // Shaded regions — acidic vs basic sides
  ctx.fillStyle = C.primary+"18"; ctx.fillRect(pL,pT,gW/2,gH);
  ctx.fillStyle = C.blue+"18";    ctx.fillRect(pL+gW/2,pT,gW/2,gH);

  // Axes
  ctx.strokeStyle = C.secondary; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(pL,pT); ctx.lineTo(pL,pT+gH); ctx.lineTo(pL+gW,pT+gH); ctx.stroke();

  // pH tick labels
  for (let pH=0; pH<=14; pH+=2) {
    lbl(ctx, String(pH), pL-6, yC(pH)+4, "right");
    ctx.strokeStyle=C.secondary+"44"; ctx.lineWidth=0.5;
    ctx.beginPath(); ctx.moveTo(pL-3,yC(pH)); ctx.lineTo(pL,yC(pH)); ctx.stroke();
  }
  lbl(ctx,"pH",pL-38,pT+gH/2,"right");
  lbl(ctx,"Volume base added →",pL+gW/2,pT+gH+28,"center");

  // pH curve
  ctx.strokeStyle = C.cyan; ctx.lineWidth = 3.5; ctx.beginPath();
  let first=true;
  for (let i=1; i<=500; i++) {
    const v=(i/500)*2;
    let pH: number;
    if (v<0.01) { pH=pKa-2; }
    else if (v<0.97) { pH=pKa+Math.log10(v/(1-v)); }
    else if (v<1.03) { pH=7+pKa*0.35; }
    else { const ex=(v-1)/Math.max(v,0.001); pH=14+Math.log10(Math.max(ex*0.1,1e-14)); }
    pH=Math.max(0,Math.min(14,pH));
    if(first){ctx.moveTo(xC(v),yC(pH));first=false;}else ctx.lineTo(xC(v),yC(pH));
  }
  ctx.stroke();

  // pKa reference line
  ctx.strokeStyle=C.highlight+"55"; ctx.lineWidth=1; ctx.setLineDash([4,4]);
  ctx.beginPath(); ctx.moveTo(pL,yC(pKa)); ctx.lineTo(pL+gW,yC(pKa)); ctx.stroke(); ctx.setLineDash([]);
  lbl(ctx,`pKa=${pKa.toFixed(1)}`,pL+4,yC(pKa)-5);

  // Equivalence point vertical
  ctx.strokeStyle=C.accent+"55"; ctx.lineWidth=1; ctx.setLineDash([4,4]);
  ctx.beginPath(); ctx.moveTo(xC(1),pT); ctx.lineTo(xC(1),pT+gH); ctx.stroke(); ctx.setLineDash([]);
  lbl(ctx,"eq",xC(1)+3,pT+10);

  // Animated marker cycling along curve
  const v=(t*0.1)%2;
  let pH_now: number;
  if (v<0.01) pH_now=pKa-2;
  else if (v<0.97) pH_now=pKa+Math.log10(v/(1-v));
  else if (v<1.03) pH_now=7+pKa*0.35;
  else { const ex=(v-1)/Math.max(v,0.001); pH_now=14+Math.log10(Math.max(ex*0.1,1e-14)); }
  pH_now=Math.max(0,Math.min(14,pH_now));

  // Pulsing marker
  const mPulse=(t*1.2)%1;
  ctx.beginPath(); ctx.arc(xC(v),yC(pH_now),8+mPulse*14,0,Math.PI*2);
  ctx.strokeStyle=`rgba(34,211,238,${(1-mPulse)*0.4})`; ctx.lineWidth=2; ctx.stroke();
  ctx.beginPath(); ctx.arc(xC(v),yC(pH_now),7,0,Math.PI*2);
  ctx.fillStyle=C.cyan; ctx.fill();
  ctx.strokeStyle=C.white; ctx.lineWidth=1.5; ctx.stroke();

  ctx.font="bold 11px 'Space Mono',monospace"; ctx.fillStyle=C.primary; ctx.textAlign="left";
  ctx.fillText(`pH = ${pH_now.toFixed(2)}`,pL+4,pT+16);
}

// ── Molecular (VSEPR) ─────────────────────────────────────────────────────────
function drawMolecular(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, s: Record<string,number>) {
  const bp = Math.round(s.bond_pairs??4), lp = Math.round(s.lone_pairs??0);
  const total = bp+lp;

  const shapes: Record<string,[number,string]> = {
    "2+0":  [180, "Linear"],
    "3+0":  [120, "Trigonal Planar"],
    "2+1":  [117, "Bent (~120°)"],
    "4+0":  [109.5,"Tetrahedral"],
    "3+1":  [107, "Trigonal Pyramidal"],
    "2+2":  [104.5,"Bent (~105°)"],
    "5+0":  [120, "Trigonal Bipyramidal"],
    "4+1":  [116, "See-saw"],
  };
  const key = `${bp}+${lp}`;
  const [bondAngleDeg, shapeName] = shapes[key] ?? [109.5,"Unknown"];

  const cx2=W/2, cy2=H/2, bondLen=Math.min(W,H)*0.28;
  const wobble = 0.04*Math.sin(t*0.8); // slow rotation wobble

  // Central atom
  ctx.beginPath(); ctx.arc(cx2,cy2,14,0,Math.PI*2);
  ctx.fillStyle=C.primary; ctx.fill();
  ctx.strokeStyle=C.white; ctx.lineWidth=1.5; ctx.stroke();
  ctx.font="bold 10px monospace"; ctx.fillStyle=C.bg; ctx.textAlign="center";
  ctx.fillText("X",cx2,cy2+4);

  // Draw bonds evenly spaced, starting from top, with wobble
  let angles: number[] = [];
  if (bp===2) angles=[Math.PI*1.5, Math.PI*0.5+(Math.PI-bondAngleDeg*Math.PI/180)];
  else if (bp===3) { const a=bondAngleDeg*Math.PI/180; angles=[-Math.PI/2, -Math.PI/2+a, -Math.PI/2+2*a]; }
  else if (bp===4) { angles=[-Math.PI/2-bondAngleDeg*Math.PI/360*2, -Math.PI/2, Math.PI/2, Math.PI/2+bondAngleDeg*Math.PI/360*2]; }
  else { for(let i=0;i<bp;i++) angles.push(-Math.PI/2+(2*Math.PI/Math.max(bp,1))*i); }

  for (let i=0;i<bp;i++) {
    const a=angles[i]+wobble;
    const ex=cx2+Math.cos(a)*bondLen, ey=cy2+Math.sin(a)*bondLen;
    ctx.strokeStyle=C.white; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.moveTo(cx2,cy2); ctx.lineTo(ex,ey); ctx.stroke();
    ctx.beginPath(); ctx.arc(ex,ey,10,0,Math.PI*2);
    ctx.fillStyle=C.accent; ctx.fill(); ctx.strokeStyle=C.white; ctx.lineWidth=1; ctx.stroke();
    ctx.font="bold 9px monospace"; ctx.fillStyle=C.bg; ctx.textAlign="center";
    ctx.fillText("A",ex,ey+3);
  }

  // Lone pairs as electron-cloud lobes
  const usedAngles=angles.length;
  for (let i=0;i<lp;i++) {
    const a = -Math.PI/2+(2*Math.PI/total)*(usedAngles+i)+wobble;
    const ex=cx2+Math.cos(a)*bondLen*0.75, ey=cy2+Math.sin(a)*bondLen*0.75;
    ctx.beginPath(); ctx.ellipse(ex,ey,14,9,a,0,Math.PI*2);
    ctx.fillStyle=C.purple+"55"; ctx.fill();
    ctx.strokeStyle=C.purple; ctx.lineWidth=1; ctx.stroke();
    ctx.font="8px monospace"; ctx.fillStyle=C.purple; ctx.textAlign="center";
    ctx.fillText("••",ex,ey+3);
  }

  // Bond angle arc
  if (bp>=2 && angles.length>=2) {
    ctx.strokeStyle=C.highlight+"99"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(cx2,cy2,30,angles[0]+wobble,angles[1]+wobble,angles[1]<angles[0]); ctx.stroke();
    lbl(ctx,`${bondAngleDeg.toFixed(1)}°`,cx2+35,cy2-10);
  }

  lbl(ctx,shapeName,W/2,H-14,"center");
  lbl(ctx,`BP=${bp}  LP=${lp}`,W/2,H-26,"center");
}

// ── Reaction Energy Profile ────────────────────────────────────────────────────
function drawReactionEnergy(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, s: Record<string,number>) {
  const Ea=s.Ea??80, dH=s.dH??-40;
  const pL=56, pR=20, pT=30, pB=44;
  const gW=W-pL-pR, gH=H-pT-pB;
  const maxE=Ea*1.2, minE=Math.min(0,dH)*1.3;
  const span=maxE-minE;
  const yC=(e: number)=>pT+gH-(( e-minE)/span)*gH;

  // Axes
  ctx.strokeStyle=C.secondary; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(pL,pT); ctx.lineTo(pL,pT+gH); ctx.lineTo(pL+gW,pT+gH); ctx.stroke();

  // Energy curve using a smooth Gaussian-like profile
  // Reactants at x=0, TS at x=0.5, Products at x=1
  // Energy(x) = cubic Bezier through (0,0), (0.5, Ea), (1, dH)
  const energyAt=(x: number)=>{
    if (x<=0.5) {
      const u=x/0.5;
      return Ea*(3*u*u-2*u*u*u);
    } else {
      const u=(x-0.5)/0.5;
      return Ea*(1-u*u) + dH*u*u;
    }
  };

  ctx.strokeStyle=C.cyan; ctx.lineWidth=3; ctx.beginPath();
  for (let i=0;i<=200;i++) {
    const x=i/200, e=energyAt(x);
    const px=pL+x*gW, py=yC(e);
    i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
  }
  ctx.stroke();

  // Reactant/product flat lines
  ctx.strokeStyle=C.primary+"66"; ctx.lineWidth=1.5; ctx.setLineDash([5,4]);
  ctx.beginPath(); ctx.moveTo(pL,yC(0)); ctx.lineTo(pL+gW*0.18,yC(0)); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(pL+gW*0.82,yC(dH)); ctx.lineTo(pL+gW,yC(dH)); ctx.stroke();
  ctx.setLineDash([]);

  // Ea annotation
  const tsX=pL+gW*0.5, tsY=yC(Ea);
  ctx.strokeStyle=C.accent+"88"; ctx.lineWidth=1; ctx.setLineDash([3,3]);
  ctx.beginPath(); ctx.moveTo(pL,yC(0)); ctx.lineTo(tsX,yC(0)); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(tsX,yC(0)); ctx.lineTo(tsX,tsY); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle=C.accent; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(tsX-8,yC(0)); ctx.lineTo(tsX-8,tsY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(tsX-12,yC(0)); ctx.lineTo(tsX-4,yC(0)); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(tsX-12,tsY); ctx.lineTo(tsX-4,tsY); ctx.stroke();
  lbl(ctx,`Ea=${Ea}kJ`,tsX-40,yC(0+(Ea/2)),"right");

  // ΔH annotation
  if (Math.abs(dH)>5) {
    ctx.strokeStyle=C.highlight+"88"; ctx.lineWidth=1; ctx.setLineDash([3,3]);
    ctx.beginPath(); ctx.moveTo(pL+gW*0.85,yC(0)); ctx.lineTo(pL+gW*0.92,yC(0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pL+gW*0.85,yC(dH)); ctx.lineTo(pL+gW*0.92,yC(dH)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle=C.highlight; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(pL+gW*0.9,yC(0)); ctx.lineTo(pL+gW*0.9,yC(dH)); ctx.stroke();
    lbl(ctx,`ΔH=${dH}kJ`,pL+gW+2,yC(dH/2));
  }

  // Animated ball
  const x=((t*0.25)%1.4);
  const xNorm=Math.min(x,1);
  const ballE=energyAt(xNorm);
  const bx=pL+xNorm*gW, by=yC(ballE)-7;
  ctx.beginPath(); ctx.arc(bx,by,7,0,Math.PI*2);
  ctx.fillStyle=C.highlight; ctx.fill();

  lbl(ctx,"Reactants",pL+4,yC(0)+14);
  lbl(ctx,"Products",pL+gW-4,yC(dH)+14,"right");
  lbl(ctx,"Reaction Progress →",pL+gW/2,pT+gH+28,"center");
  lbl(ctx,"Energy (kJ)",pL-44,pT+gH/2,"right");
  const rxnType=dH<0?"Exothermic":"Endothermic";
  ctx.font="10px 'Space Mono',monospace"; ctx.fillStyle=dH<0?C.primary:C.accent; ctx.textAlign="left";
  ctx.fillText(rxnType,pL+4,pT+14);
}

// ── Equilibrium ───────────────────────────────────────────────────────────────
function drawEquilibrium(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, s: Record<string,number>) {
  const Kc=s.Kc??1, Teq=s.temp_eq??500;
  // [P]eq/[R]eq = Kc  → [R]=1/(1+Kc), [P]=Kc/(1+Kc)
  const totalConc=1, R=totalConc/(1+Kc), P=Kc*totalConc/(1+Kc);
  const cx2=W/2, barW=W*0.22, barMaxH=H*0.55, barY=H*0.72;
  const rX=cx2-W*0.22, pX=cx2+W*0.22;

  // Equilibrium arrows
  const arrowY=H*0.44, arrowLen=W*0.14;
  ctx.strokeStyle=C.primary; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(cx2-arrowLen,arrowY-7); ctx.lineTo(cx2+arrowLen,arrowY-7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx2+arrowLen-10,arrowY-12); ctx.lineTo(cx2+arrowLen,arrowY-7); ctx.lineTo(cx2+arrowLen-10,arrowY-2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx2+arrowLen,arrowY+7); ctx.lineTo(cx2-arrowLen,arrowY+7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx2-arrowLen+10,arrowY+2); ctx.lineTo(cx2-arrowLen,arrowY+7); ctx.lineTo(cx2-arrowLen+10,arrowY+12); ctx.stroke();

  // Reactant bar
  const rH=Math.max(4,R*barMaxH);
  ctx.fillStyle=C.primary+"cc";
  ctx.fillRect(rX-barW/2, barY-rH, barW, rH);
  ctx.strokeStyle=C.primary; ctx.lineWidth=1; ctx.strokeRect(rX-barW/2,barY-rH,barW,rH);
  lbl(ctx,"[R]",rX,barY+14,"center");
  lbl(ctx,R.toFixed(3)+"M",rX,barY-rH-6,"center");

  // Product bar
  const pH2=Math.max(4,P*barMaxH);
  ctx.fillStyle=C.accent+"cc";
  ctx.fillRect(pX-barW/2,barY-pH2,barW,pH2);
  ctx.strokeStyle=C.accent; ctx.lineWidth=1; ctx.strokeRect(pX-barW/2,barY-pH2,barW,pH2);
  lbl(ctx,"[P]",pX,barY+14,"center");
  lbl(ctx,P.toFixed(3)+"M",pX,barY-pH2-6,"center");

  // Baseline
  ctx.strokeStyle=C.secondary; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(W*0.1,barY); ctx.lineTo(W*0.9,barY); ctx.stroke();

  // Kc label
  ctx.font="bold 12px 'Space Mono',monospace"; ctx.fillStyle=C.highlight; ctx.textAlign="center";
  ctx.fillText(`Kc = ${Kc.toFixed(2)}`,cx2,H*0.2);
  const favoured=Kc>=1?"Products favoured":"Reactants favoured";
  lbl(ctx,favoured,cx2,H*0.29,"center");
  lbl(ctx,`T = ${Teq} K`,cx2,H*0.36,"center");

  // Animate a small particle crossing
  const phase=(t*0.5)%1;
  const pxAnim=Kc>=1 ? rX+(pX-rX)*phase : pX+(rX-pX)*phase;
  ctx.beginPath(); ctx.arc(pxAnim,H*0.55,5,0,Math.PI*2);
  ctx.fillStyle=Kc>=1?C.accent:C.primary; ctx.fill();
}

// ── Atomic Model (Bohr) ───────────────────────────────────────────────────────
function drawAtomicModel(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, s: Record<string,number>) {
  const Z=Math.round(s.protons??6), excited=Math.round(s.excited??0);
  const cx2=W/2, cy2=H/2;
  const shellConfig=[2,8,8,2]; // electrons per shell for Z<=20
  const shellR=[0,52,88,118,142]; // shell radii in px (index 1-4)

  // Fill shells from inner out
  let remaining=Z;
  const shellElec: number[]=[];
  for (const cap of shellConfig) { const e=Math.min(remaining,cap); shellElec.push(e); remaining-=e; if(remaining<=0) break; }

  const numShells=shellElec.length;

  // Draw shells
  for (let i=0;i<numShells;i++) {
    const r=shellR[i+1];
    ctx.strokeStyle=C.secondary; ctx.lineWidth=0.8;
    ctx.beginPath(); ctx.arc(cx2,cy2,r,0,Math.PI*2); ctx.stroke();
  }

  // Nucleus
  const nucR=Math.min(16,8+Math.sqrt(Z)*1.8);
  const nucGrad=ctx.createRadialGradient(cx2,cy2,0,cx2,cy2,nucR);
  nucGrad.addColorStop(0,C.highlight); nucGrad.addColorStop(1,"#a83200");
  ctx.beginPath(); ctx.arc(cx2,cy2,nucR,0,Math.PI*2); ctx.fillStyle=nucGrad; ctx.fill();
  ctx.font="bold 9px monospace"; ctx.fillStyle=C.bg; ctx.textAlign="center";
  ctx.fillText(`${Z}p`,cx2,cy2+3);

  // Draw electrons on each shell
  for (let i=0;i<shellElec.length;i++) {
    const n=shellElec[i], r=shellR[i+1];
    // excited: outermost electron jumps to next shell
    const isOuter=(i===shellElec.length-1);
    const excitedBump=(excited && isOuter) ? shellR[Math.min(i+2,4)]-r : 0;
    const speed=0.6/(i+1);
    for (let j=0;j<n;j++) {
      const angle=t*speed+(2*Math.PI*j/n);
      const er=r+excitedBump;
      const ex=cx2+Math.cos(angle)*er, ey=cy2+Math.sin(angle)*er;
      ctx.beginPath(); ctx.arc(ex,ey,4,0,Math.PI*2);
      ctx.fillStyle=(excited && isOuter)?C.purple:C.primary; ctx.fill();
    }
    // photon emission flash for excited state
    if (excited && isOuter) {
      const phase=(t*2)%1;
      if (phase<0.5) {
        const fr=r+(shellR[Math.min(i+2,4)]-r)*phase*2;
        ctx.beginPath(); ctx.arc(cx2+fr,cy2,3,0,Math.PI*2);
        ctx.fillStyle=`rgba(168,85,247,${1-phase*2})`; ctx.fill();
      }
    }
    lbl(ctx,`n=${i+1}  (${n}e⁻)`,cx2+shellR[i+1]+4,cy2-4);
  }

  lbl(ctx,`Z = ${Z}`,12,20);
  lbl(ctx,`e⁻ = ${Z}`,12,34);
  lbl(ctx,excited?"Excited":"Ground state",12,48);
}

// ── Osmosis ───────────────────────────────────────────────────────────────────
type OsmosisParticle = { x:number; y:number; vx:number; vy:number; type:"solute"|"water" };

function initOsmosis(cL: number, cR: number, W: number, H: number): OsmosisParticle[] {
  const mid=W/2, pad=16, particles: OsmosisParticle[]=[];
  const nSoluteL=Math.max(2,Math.round(cL*6)), nSoluteR=Math.max(2,Math.round(cR*6));
  const nWaterL=Math.max(4,18-nSoluteL), nWaterR=Math.max(4,18-nSoluteR);
  const rng=()=>(Math.random()-0.5)*1.8;
  // Left side solute
  for(let i=0;i<nSoluteL;i++) particles.push({x:pad+Math.random()*(mid-pad*2),y:pad+Math.random()*(H-pad*2),vx:rng(),vy:rng(),type:"solute"});
  // Left water
  for(let i=0;i<nWaterL;i++) particles.push({x:pad+Math.random()*(mid-pad*2),y:pad+Math.random()*(H-pad*2),vx:rng()*1.6,vy:rng()*1.6,type:"water"});
  // Right side solute
  for(let i=0;i<nSoluteR;i++) particles.push({x:mid+pad+Math.random()*(mid-pad*2),y:pad+Math.random()*(H-pad*2),vx:rng(),vy:rng(),type:"solute"});
  // Right water
  for(let i=0;i<nWaterR;i++) particles.push({x:mid+pad+Math.random()*(mid-pad*2),y:pad+Math.random()*(H-pad*2),vx:rng()*1.6,vy:rng()*1.6,type:"water"});
  return particles;
}

function updateOsmosis(particles: OsmosisParticle[], W: number, H: number, cL: number, cR: number) {
  const mid=W/2, pad=14;
  for (const p of particles) {
    p.x+=p.vx; p.y+=p.vy;
    // Wall bounce
    if(p.y-5<pad){p.y=pad+5;p.vy=Math.abs(p.vy);}
    if(p.y+5>H-pad){p.y=H-pad-5;p.vy=-Math.abs(p.vy);}
    if(p.type==="solute") {
      // Solute can't cross membrane
      if(p.x-5<pad){p.x=pad+5;p.vx=Math.abs(p.vx);}
      if(p.x+5>W-pad){p.x=W-pad-5;p.vx=-Math.abs(p.vx);}
      if(Math.abs(p.x-mid)<6){p.vx=p.x<mid?-Math.abs(p.vx):Math.abs(p.vx);}
    } else {
      // Water crosses membrane toward high-solute side
      if(p.x-5<pad){p.x=pad+5;p.vx=Math.abs(p.vx);}
      if(p.x+5>W-pad){p.x=W-pad-5;p.vx=-Math.abs(p.vx);}
      // Net drift through membrane
      const nearMembrane=Math.abs(p.x-mid)<30;
      if(nearMembrane && cR>cL && p.x<mid+5) p.vx+=0.05;
      if(nearMembrane && cL>cR && p.x>mid-5) p.vx-=0.05;
      p.vx=Math.max(-3,Math.min(3,p.vx));
    }
  }
}

function drawOsmosis(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, particles: OsmosisParticle[], s: Record<string,number>) {
  const mid=W/2, cL=s.conc_left??1, cR=s.conc_right??5, pad=14;

  // Side concentration shading
  ctx.fillStyle=`rgba(68,136,255,${0.04+0.07*(cL/10)})`; ctx.fillRect(0,0,mid,H);
  ctx.fillStyle=`rgba(255,107,53,${0.04+0.07*(cR/10)})`; ctx.fillRect(mid,0,mid,H);

  // Membrane glow
  const mg=ctx.createLinearGradient(mid-10,0,mid+10,0);
  mg.addColorStop(0,"rgba(42,106,58,0)"); mg.addColorStop(0.35,"rgba(82,217,104,0.7)");
  mg.addColorStop(0.65,"rgba(82,217,104,0.7)"); mg.addColorStop(1,"rgba(42,106,58,0)");
  ctx.fillStyle=mg; ctx.fillRect(mid-10,pad,20,H-pad*2);

  // Animated pores — pulse open/closed
  for(let y=pad+10;y<H-pad;y+=16) {
    const open=0.5+0.5*Math.sin(t*2.2+y*0.25);
    ctx.beginPath(); ctx.arc(mid,y,2.5,0,Math.PI*2);
    ctx.fillStyle="rgba(11,26,14,0.9)"; ctx.fill();
    ctx.strokeStyle=`rgba(82,217,104,${0.3+open*0.7})`; ctx.lineWidth=1; ctx.stroke();
  }

  // Particles with depth ring
  for (const p of particles) {
    const r=p.type==="solute"?5:3.5, col=p.type==="solute"?C.accent:C.blue;
    ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2);
    ctx.fillStyle=col; ctx.fill();
    ctx.strokeStyle=col+"66"; ctx.lineWidth=1.5; ctx.stroke();
  }

  lbl(ctx,`[S] = ${cL.toFixed(1)} M`,mid*0.5,20,"center");
  lbl(ctx,`[S] = ${cR.toFixed(1)} M`,mid+mid*0.5,20,"center");
  lbl(ctx,cL<cR?"low conc":"high conc",mid*0.5,H-10,"center");
  lbl(ctx,cR>cL?"high conc":"low conc",mid+mid*0.5,H-10,"center");

  // Animated net flow arrow
  if (Math.abs(cL-cR)>0.3) {
    const dir=cR>cL?1:-1, pulse=0.5+0.5*Math.sin(t*3);
    ctx.strokeStyle=`rgba(68,136,255,${0.5+pulse*0.5})`; ctx.lineWidth=1.5+pulse;
    ctx.beginPath(); ctx.moveTo(mid-dir*30,H/2); ctx.lineTo(mid+dir*30,H/2); ctx.stroke();
    ctx.fillStyle=C.blue;
    ctx.beginPath(); ctx.moveTo(mid+dir*30,H/2-6); ctx.lineTo(mid+dir*40,H/2); ctx.lineTo(mid+dir*30,H/2+6); ctx.closePath(); ctx.fill();
    lbl(ctx,"H₂O",mid+dir*48,H/2+4,dir>0?"left":"right");
  }

  const leg:[string,string][]=[[C.accent,"● Solute"],[C.blue,"● H₂O"]];
  for(const [i,le] of leg.entries()) {
    ctx.fillStyle=le[0]; ctx.font="9px 'Space Mono',monospace"; ctx.textAlign="left";
    ctx.fillText(le[1],10,H-12-i*14);
  }
}

// ── Mitosis ───────────────────────────────────────────────────────────────────
function drawChromosome(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, color: string, scale=1) {
  ctx.save(); ctx.translate(x,y); ctx.rotate(angle); ctx.scale(scale,scale);
  // Sister chromatids
  ctx.fillStyle=color; ctx.strokeStyle=color+"88"; ctx.lineWidth=0.5;
  ctx.beginPath(); ctx.roundRect(-6,-13,5,26,3); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(1,-13,5,26,3); ctx.fill(); ctx.stroke();
  // Centromere constriction
  ctx.fillStyle=color+"66";
  ctx.beginPath(); ctx.arc(0,0,5,0,Math.PI*2); ctx.fill();
  // Kinetochore highlight
  ctx.fillStyle=C.highlight+"ee";
  ctx.beginPath(); ctx.arc(0,0,2,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawMitosis(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, s: Record<string,number>) {
  const spd=s.speed??1;
  const phaseDur=4; // seconds per phase
  const totalT=phaseDur*5;
  const cycleT=(t*spd)%totalT;
  const phaseIdx=Math.floor(cycleT/phaseDur);
  const phaseP=( cycleT%phaseDur)/phaseDur; // 0-1 progress within phase
  const cx2=W/2, cy2=H/2;

  const phases=["Interphase","Prophase","Metaphase","Anaphase","Telophase"];
  const phaseName=phases[phaseIdx]??"Interphase";

  // Cell outline
  const cellR=Math.min(W,H)*0.35;

  if (phaseIdx===0) {
    // Interphase: round nucleus inside cell
    ctx.beginPath(); ctx.arc(cx2,cy2,cellR,0,Math.PI*2);
    ctx.strokeStyle=C.primary; ctx.lineWidth=2; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx2,cy2,cellR*0.45,0,Math.PI*2);
    ctx.strokeStyle=C.blue; ctx.lineWidth=1.5; ctx.stroke();
    ctx.fillStyle=C.blue+"22"; ctx.fill();
    lbl(ctx,"Nucleus",cx2,cy2+4,"center");
  } else if (phaseIdx===1) {
    // Prophase: chromosomes appear
    ctx.beginPath(); ctx.arc(cx2,cy2,cellR,0,Math.PI*2);
    ctx.strokeStyle=C.primary; ctx.lineWidth=2; ctx.stroke();
    const nChr=4, opacity=Math.min(1,phaseP*3);
    ctx.globalAlpha=opacity;
    for(let i=0;i<nChr;i++) {
      const a=(2*Math.PI*i/nChr); const r=cellR*0.35;
      drawChromosome(ctx,cx2+Math.cos(a)*r,cy2+Math.sin(a)*r,a+Math.PI/4,C.accent);
      drawChromosome(ctx,cx2+Math.cos(a)*r*0.7,cy2+Math.sin(a)*r*0.7,a,C.pink);
    }
    ctx.globalAlpha=1;
  } else if (phaseIdx===2) {
    // Metaphase: chromosomes lined up on equatorial plate
    ctx.beginPath(); ctx.arc(cx2,cy2,cellR,0,Math.PI*2);
    ctx.strokeStyle=C.primary; ctx.lineWidth=2; ctx.stroke();
    // Metaphase plate
    ctx.strokeStyle=C.dim; ctx.lineWidth=1; ctx.setLineDash([3,3]);
    ctx.beginPath(); ctx.moveTo(cx2,cy2-cellR*0.85); ctx.lineTo(cx2,cy2+cellR*0.85); ctx.stroke(); ctx.setLineDash([]);
    const offsets=[-1.2,-0.4,0.4,1.2];
    for(const [i,dy] of offsets.entries()) {
      drawChromosome(ctx,cx2,cy2+dy*22,Math.PI/2,i%2===0?C.accent:C.pink);
    }
    // Spindle fibers
    const poleL=cx2-cellR*0.85, poleR=cx2+cellR*0.85;
    ctx.strokeStyle=C.highlight+"55"; ctx.lineWidth=1;
    for(const dy of offsets) {
      ctx.beginPath(); ctx.moveTo(poleL,cy2); ctx.lineTo(cx2,cy2+dy*22); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(poleR,cy2); ctx.lineTo(cx2,cy2+dy*22); ctx.stroke();
    }
    // Centrosomes at poles
    for(const px of [poleL,poleR]) {
      ctx.beginPath(); ctx.arc(px,cy2,5,0,Math.PI*2);
      ctx.fillStyle=C.highlight; ctx.fill();
      ctx.strokeStyle=C.bg; ctx.lineWidth=1; ctx.stroke();
    }
  } else if (phaseIdx===3) {
    // Anaphase: chromosomes pulling apart
    ctx.beginPath(); ctx.arc(cx2,cy2,cellR,0,Math.PI*2);
    ctx.strokeStyle=C.primary; ctx.lineWidth=2; ctx.stroke();
    const pull=phaseP*cellR*0.55;
    const offsets=[[-1.2,-0.4],[0.4,1.2]];
    for(const [grpIdx,grp] of offsets.entries()) {
      const dir=grpIdx===0?-1:1;
      for(const dy of grp) {
        drawChromosome(ctx,cx2+dir*pull,cy2+dy*18,Math.PI/2,grpIdx===0?C.accent:C.pink,0.85);
      }
    }
  } else {
    // Telophase: two daughter cells forming
    const sep=phaseP*cellR*0.55+cellR*0.45;
    const r2=cellR*0.7;
    ctx.strokeStyle=C.primary; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(cx2-sep,cy2,r2,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx2+sep,cy2,r2,0,Math.PI*2); ctx.stroke();
    // Nuclei inside daughter cells
    ctx.strokeStyle=C.blue; ctx.lineWidth=1.5;
    ctx.fillStyle=C.blue+"18";
    ctx.beginPath(); ctx.arc(cx2-sep,cy2,r2*0.38,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx2+sep,cy2,r2*0.38,0,Math.PI*2); ctx.fill(); ctx.stroke();
    // Cleavage furrow (pinch line between cells)
    const furrowDepth=phaseP*r2*0.5;
    ctx.strokeStyle=C.primary+"88"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(cx2,cy2-furrowDepth); ctx.lineTo(cx2,cy2+furrowDepth); ctx.stroke();
  }

  // Phase label + progress bar
  ctx.font="bold 11px 'Space Mono',monospace"; ctx.fillStyle=C.primary; ctx.textAlign="center";
  ctx.fillText(phaseName,cx2,H-28);
  // Progress bar across bottom
  const barW=W*0.65, barH=4, barX=(W-barW)/2, barY=H-16;
  ctx.fillStyle=C.surface; ctx.fillRect(barX,barY,barW,barH);
  ctx.fillStyle=C.primary; ctx.fillRect(barX,barY,(cycleT/totalT)*barW,barH);
}

// ── Enzyme Kinetics (Michaelis-Menten) ────────────────────────────────────────
function drawEnzyme(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, s: Record<string,number>) {
  const Km=s.Km??2, Vmax=s.Vmax??100, subst=s.substrate??5;
  const pL=60, pR=20, pT=28, pB=48;
  const gW=W-pL-pR, gH=H-pT-pB;
  const maxS=Math.max(subst*2.2, Km*4, 5);
  const xC=(sv: number)=>pL+(sv/maxS)*gW;
  const yC=(v: number)=>pT+gH-(v/Vmax)*gH;

  // Fill under MM curve
  ctx.beginPath();
  for(let i=0;i<=200;i++) { const sv=(i/200)*maxS, v=Vmax*sv/(Km+sv); i===0?ctx.moveTo(xC(sv),yC(v)):ctx.lineTo(xC(sv),yC(v)); }
  ctx.lineTo(pL+gW,pT+gH); ctx.lineTo(pL,pT+gH); ctx.closePath();
  ctx.fillStyle=C.cyan+"18"; ctx.fill();

  // Axes
  ctx.strokeStyle=C.secondary; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(pL,pT); ctx.lineTo(pL,pT+gH); ctx.lineTo(pL+gW,pT+gH); ctx.stroke();

  // Vmax line
  ctx.strokeStyle=C.primary+"66"; ctx.lineWidth=1.5; ctx.setLineDash([6,4]);
  ctx.beginPath(); ctx.moveTo(pL,yC(Vmax)); ctx.lineTo(pL+gW,yC(Vmax)); ctx.stroke(); ctx.setLineDash([]);
  ctx.font="bold 11px 'Space Mono',monospace"; ctx.fillStyle=C.primary; ctx.textAlign="left";
  ctx.fillText(`Vmax = ${Vmax}`,pL+4,yC(Vmax)-6);

  // Vmax/2 horizontal
  ctx.strokeStyle=C.dim+"88"; ctx.lineWidth=1; ctx.setLineDash([3,5]);
  ctx.beginPath(); ctx.moveTo(pL,yC(Vmax/2)); ctx.lineTo(xC(Km),yC(Vmax/2)); ctx.stroke(); ctx.setLineDash([]);
  lbl(ctx,"½Vmax",pL-4,yC(Vmax/2)+4,"right");

  // Km vertical
  ctx.strokeStyle=C.accent+"66"; ctx.lineWidth=1.5; ctx.setLineDash([6,4]);
  ctx.beginPath(); ctx.moveTo(xC(Km),yC(Vmax/2)); ctx.lineTo(xC(Km),pT+gH); ctx.stroke(); ctx.setLineDash([]);
  lbl(ctx,`Km=${Km}`,xC(Km)+4,pT+gH+16);

  // MM curve
  ctx.strokeStyle=C.cyan; ctx.lineWidth=3; ctx.beginPath();
  for(let i=0;i<=200;i++) {
    const sv=(i/200)*maxS, v=Vmax*sv/(Km+sv);
    i===0?ctx.moveTo(xC(sv),yC(v)):ctx.lineTo(xC(sv),yC(v));
  }
  ctx.stroke();

  // Animated crosshair guides to current [S] point
  const vNow=Vmax*subst/(Km+subst);
  const px=xC(subst), py=yC(vNow);
  ctx.strokeStyle=C.accent+"55"; ctx.lineWidth=1; ctx.setLineDash([4,4]);
  ctx.beginPath(); ctx.moveTo(pL,py); ctx.lineTo(px,py); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(px,pT+gH); ctx.lineTo(px,py); ctx.stroke();
  ctx.setLineDash([]);

  // Pulsing ring
  const pulse=(t*1.5)%1;
  ctx.beginPath(); ctx.arc(px,py,8+pulse*18,0,Math.PI*2);
  ctx.strokeStyle=`rgba(255,107,53,${(1-pulse)*0.5})`; ctx.lineWidth=2; ctx.stroke();

  // Operating point dot
  ctx.beginPath(); ctx.arc(px,py,7,0,Math.PI*2);
  ctx.fillStyle=C.accent; ctx.fill(); ctx.strokeStyle=C.white; ctx.lineWidth=2; ctx.stroke();

  // Live readout
  ctx.font="bold 13px 'Space Mono',monospace"; ctx.fillStyle=C.accent; ctx.textAlign="left";
  ctx.fillText(`v = ${vNow.toFixed(1)}`,pL+4,pT+18);
  lbl(ctx,`[S] = ${subst} mM`,pL+4,pT+34);

  lbl(ctx,"[S] substrate →",pL+gW/2,pT+gH+32,"center");
  lbl(ctx,"Reaction velocity",pL-48,pT+gH/2,"right");

  // y-axis ticks
  for(const v of [0,Vmax*0.25,Vmax*0.5,Vmax*0.75,Vmax]) {
    lbl(ctx,String(Math.round(v)),pL-4,yC(v)+4,"right");
  }
}

// ── Population (Logistic Growth) ───────────────────────────────────────────────
function drawPopulation(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, s: Record<string,number>) {
  const r=s.growth_rate??0.5, K=s.carrying_cap??500, N0=s.initial_pop??20;
  const pL=56, pR=20, pT=24, pB=44;
  const gW=W-pL-pR, gH=H-pT-pB;
  const tMax=20; // show 20 time units
  const xC=(time: number)=>pL+(time/tMax)*gW;
  const yC=(n: number)=>pT+gH-(n/( K*1.1))*gH;
  const N=(time: number)=>K/(1+((K-N0)/Math.max(N0,0.01))*Math.exp(-r*time));

  // Axes
  ctx.strokeStyle=C.secondary; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(pL,pT); ctx.lineTo(pL,pT+gH); ctx.lineTo(pL+gW,pT+gH); ctx.stroke();

  // K line
  ctx.strokeStyle=C.highlight+"55"; ctx.lineWidth=1; ctx.setLineDash([4,4]);
  ctx.beginPath(); ctx.moveTo(pL,yC(K)); ctx.lineTo(pL+gW,yC(K)); ctx.stroke(); ctx.setLineDash([]);
  lbl(ctx,`K=${K}`,pL+4,yC(K)-5);

  // Fill under curve
  ctx.beginPath();
  for(let i=0;i<=200;i++) { const ti=(i/200)*tMax, ni=N(ti); i===0?ctx.moveTo(xC(ti),yC(ni)):ctx.lineTo(xC(ti),yC(ni)); }
  ctx.lineTo(pL+gW,pT+gH); ctx.lineTo(pL,pT+gH); ctx.closePath();
  const fillGrad=ctx.createLinearGradient(0,pT,0,pT+gH);
  fillGrad.addColorStop(0,C.cyan+"30"); fillGrad.addColorStop(1,C.cyan+"06");
  ctx.fillStyle=fillGrad; ctx.fill();

  // Full logistic curve
  ctx.strokeStyle=C.cyan; ctx.lineWidth=2.5; ctx.beginPath();
  for(let i=0;i<=200;i++) { const ti=(i/200)*tMax, ni=N(ti); i===0?ctx.moveTo(xC(ti),yC(ni)):ctx.lineTo(xC(ti),yC(ni)); }
  ctx.stroke();

  // Inflection point (max growth rate at N = K/2)
  if (N0<K/2) {
    const tInfl=Math.log((K-N0)/Math.max(N0,0.01))/Math.max(r,0.001);
    if (tInfl>0 && tInfl<tMax) {
      ctx.strokeStyle=C.highlight+"55"; ctx.lineWidth=1; ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(xC(tInfl),pT); ctx.lineTo(xC(tInfl),pT+gH); ctx.stroke(); ctx.setLineDash([]);
      lbl(ctx,"K/2",xC(tInfl)+3,yC(K/2)-6);
    }
  }

  // Animated marker
  const tNow=(t*0.8)%tMax;
  const nNow=N(tNow);
  ctx.beginPath(); ctx.arc(xC(tNow),yC(nNow),6,0,Math.PI*2);
  ctx.fillStyle=C.primary; ctx.fill(); ctx.strokeStyle=C.white; ctx.lineWidth=1.5; ctx.stroke();

  // Current N
  ctx.font="bold 11px 'Space Mono',monospace"; ctx.fillStyle=C.primary; ctx.textAlign="left";
  ctx.fillText(`N = ${nNow.toFixed(0)}`,pL+4,pT+14);
  const dNdt=r*nNow*(1-nNow/K);
  lbl(ctx,`dN/dt = ${dNdt.toFixed(1)}`,pL+4,pT+28);

  // Axis labels
  lbl(ctx,"Time →",pL+gW/2,pT+gH+28,"center");
  lbl(ctx,"Population (N)",pL-44,pT+gH/2,"right");

  // y ticks
  for(let n=0;n<=K;n+=K/4) {
    lbl(ctx,String(Math.round(n)),pL-6,yC(n)+4,"right");
  }
}

// ── Action Potential ─────────────────────────────────────────────────────────
function drawActionPotential(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, s: Record<string,number>) {
  const freq=s.frequency??1, threshold=s.threshold??-55;
  const pL=56, pR=20, pT=20, pB=44;
  const gW=W-pL-pR, gH=H-pT-pB;
  // y: -80mV to +50mV
  const vMin=-80, vMax=50, vSpan=vMax-vMin;
  const xC=(time: number)=>pL+(time/(4/freq))*gW;
  const yC=(v: number)=>pT+gH-((v-vMin)/vSpan)*gH;
  const period=1/freq;

  // AP template: returns voltage at phase 0-1
  const apV=(phase: number)=>{
    if(phase<0.02) return -70+(threshold+70)*phase/0.02; // depol to threshold
    if(phase<0.08) return threshold+(40-threshold)*(phase-0.02)/0.06; // upstroke
    if(phase<0.15) return 40; // peak
    if(phase<0.35) return 40+(-70-40)*(phase-0.15)/0.20; // repol
    if(phase<0.5)  return -70+(-80+70)*(phase-0.35)/0.15; // hyperpol
    if(phase<0.7)  return -80+(-70+80)*(phase-0.5)/0.20; // return
    return -70; // resting
  };

  // Phase background shading
  const depol_frac=0.15, repol_frac=0.35;
  ctx.fillStyle="rgba(255,107,53,0.08)"; ctx.fillRect(pL,pT,gW*depol_frac,gH);
  ctx.fillStyle="rgba(68,136,255,0.08)"; ctx.fillRect(pL+gW*depol_frac,pT,gW*(repol_frac-depol_frac),gH);

  // Axes
  ctx.strokeStyle=C.secondary; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(pL,pT); ctx.lineTo(pL,pT+gH); ctx.lineTo(pL+gW,pT+gH); ctx.stroke();

  // Resting potential line
  ctx.strokeStyle=C.dim; ctx.lineWidth=1; ctx.setLineDash([4,4]);
  ctx.beginPath(); ctx.moveTo(pL,yC(-70)); ctx.lineTo(pL+gW,yC(-70)); ctx.stroke(); ctx.setLineDash([]);
  lbl(ctx,"-70mV",pL-4,yC(-70)+4,"right");

  // Threshold line
  ctx.strokeStyle=C.accent+"66"; ctx.lineWidth=1; ctx.setLineDash([3,3]);
  ctx.beginPath(); ctx.moveTo(pL,yC(threshold)); ctx.lineTo(pL+gW,yC(threshold)); ctx.stroke(); ctx.setLineDash([]);
  lbl(ctx,`threshold ${threshold}mV`,pL+4,yC(threshold)-5);

  // Draw the AP curve for visible time window (last 4 seconds)
  const windowSec=4/freq;
  ctx.strokeStyle=C.cyan; ctx.lineWidth=2.5; ctx.beginPath();
  let firstPt=true;
  for(let i=0;i<=300;i++) {
    const timeOffset=(i/300)*windowSec;
    const absoluteT=t-windowSec+timeOffset;
    const phase=((absoluteT%period)+period)%period/period;
    const v=apV(phase);
    const px=pL+(timeOffset/windowSec)*gW, py=yC(v);
    if(firstPt){ctx.moveTo(px,py);firstPt=false;}else ctx.lineTo(px,py);
  }
  ctx.stroke();

  // Ion labels during spike
  const curPhase=(t%period)/period;
  let ionLabel="";
  if(curPhase<0.08) ionLabel="Na⁺ rushing IN →";
  else if(curPhase<0.35) ionLabel="K⁺ flowing OUT →";
  else if(curPhase<0.7) ionLabel="Hyperpolarization";
  else ionLabel="Resting state";
  ctx.font="10px 'Space Mono',monospace"; ctx.fillStyle=C.primary; ctx.textAlign="left";
  ctx.fillText(ionLabel,pL+4,pT+14);

  const vNow=apV(curPhase);
  lbl(ctx,`V = ${vNow.toFixed(0)} mV`,pL+4,pT+28);

  // Channel state bars
  const naOpen=curPhase<0.08?curPhase/0.08:curPhase<0.12?(0.12-curPhase)/0.04:0;
  const kOpen=curPhase>0.12&&curPhase<0.45?Math.min(1,(curPhase-0.12)/0.08):curPhase>0.45&&curPhase<0.7?(0.7-curPhase)/0.25:0;
  const barY=pT+gH-12, bW=60, bH=5;
  ctx.fillStyle=`rgba(255,107,53,${0.2+naOpen*0.7})`; ctx.fillRect(pL+4,barY,bW*naOpen,bH);
  ctx.strokeStyle=C.accent+"66"; ctx.lineWidth=1; ctx.strokeRect(pL+4,barY,bW,bH);
  ctx.font="8px 'Space Mono',monospace"; ctx.fillStyle=C.accent; ctx.textAlign="left";
  ctx.fillText("Na⁺",pL+bW+8,barY+5);
  ctx.fillStyle=`rgba(68,136,255,${0.2+kOpen*0.7})`; ctx.fillRect(pL+4,barY+8,bW*kOpen,bH);
  ctx.strokeStyle=C.blue+"66"; ctx.lineWidth=1; ctx.strokeRect(pL+4,barY+8,bW,bH);
  ctx.fillStyle=C.blue; ctx.fillText("K⁺",pL+bW+8,barY+13);

  lbl(ctx,"Membrane Voltage (mV)",pL-44,pT+gH/2,"right");
  lbl(ctx,"Time →",pL+gW/2,pT+gH+28,"center");

  // mV ticks
  for(const mv of [-80,-70,-40,0,40]) {
    lbl(ctx,`${mv}`,pL-4,yC(mv)+4,"right");
    ctx.strokeStyle=C.secondary+"44"; ctx.lineWidth=0.5;
    ctx.beginPath(); ctx.moveTo(pL-3,yC(mv)); ctx.lineTo(pL,yC(mv)); ctx.stroke();
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export function PhysicsSim({ sim }: { sim: SimConfig }) {
  if (sim.type === "none") return null;
  const controls = CONTROLS[sim.type as Exclude<SimType,"none">];

  const [sliders, setSliders] = useState<Record<string,number>>(() => {
    const init: Record<string,number> = {};
    for (const c of controls) init[c.key] = sim.params?.[c.key] ?? c.default;
    return init;
  });
  const [paused, setPaused] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const tRef = useRef<number>(0);
  const lastRef = useRef<number>(0);
  const pausedRef = useRef(false);
  const slidersRef = useRef(sliders);
  const sizeRef = useRef({ w: 600, h: 280 });
  const particlesRef = useRef<(GasParticle | OsmosisParticle)[]>([]);
  pausedRef.current = paused;
  slidersRef.current = sliders;

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.floor(e.contentRect.width);
      const h = Math.floor(w * 0.52);
      sizeRef.current = { w, h };
    });
    ro.observe(el);
    const w = el.clientWidth || 600;
    sizeRef.current = { w, h: Math.floor(w * 0.44) };
    return () => ro.disconnect();
  }, []);

  // Gas init
  useEffect(() => {
    if (sim.type !== "gas") return;
    const { w, h } = sizeRef.current;
    particlesRef.current = initGas(Math.round(sliders.particles??30), sliders.temp??300, w, h);
  }, [sim.type, sliders.particles]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Temp change: rescale gas velocities
  useEffect(() => {
    if (sim.type !== "gas" || particlesRef.current.length === 0) return;
    const T = sliders.temp ?? 300;
    const baseSpeed = Math.sqrt(T/300)*2.4;
    for (const p of particlesRef.current as GasParticle[]) {
      const spd = Math.sqrt(p.vx*p.vx+p.vy*p.vy);
      if (spd > 0.01) { const ns=baseSpeed*(0.6+Math.random()*0.8); p.vx=p.vx/spd*ns; p.vy=p.vy/spd*ns; }
    }
  }, [sim.type, sliders.temp]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Osmosis init
  useEffect(() => {
    if (sim.type !== "osmosis") return;
    const { w, h } = sizeRef.current;
    particlesRef.current = initOsmosis(sliders.conc_left??1, sliders.conc_right??5, w, h);
  }, [sim.type, sliders.conc_left, sliders.conc_right]);  // eslint-disable-line react-hooks/exhaustive-deps

  // RAF loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    lastRef.current = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - lastRef.current) / 1000, 0.05);
      lastRef.current = now;
      if (!pausedRef.current) {
        tRef.current += dt;
        if (sim.type === "gas") updateGas(particlesRef.current as GasParticle[], sizeRef.current.w, sizeRef.current.h);
        if (sim.type === "osmosis") updateOsmosis(particlesRef.current as OsmosisParticle[], sizeRef.current.w, sizeRef.current.h, slidersRef.current.conc_left??1, slidersRef.current.conc_right??5);
      }
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        const { w: W, h: H } = sizeRef.current;
        if (canvas.width !== Math.round(W*dpr) || canvas.height !== Math.round(H*dpr)) {
          canvas.width = Math.round(W*dpr);
          canvas.height = Math.round(H*dpr);
          canvas.style.width = `${W}px`;
          canvas.style.height = `${H}px`;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        buildC();
        ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
        if (!GRAPH_SIMS.has(sim.type)) grid(ctx, W, H);
        const s = slidersRef.current, t = tRef.current;
        switch (sim.type) {
          case "projectile":      drawProjectile(ctx,W,H,t,s); break;
          case "pendulum":        drawPendulum(ctx,W,H,t,s);   break;
          case "wave":            drawWave(ctx,W,H,t,s);        break;
          case "spring":          drawSpring(ctx,W,H,t,s);      break;
          case "electric":        drawElectric(ctx,W,H,s);      break;
          case "orbital":         drawOrbital(ctx,W,H,t,s);     break;
          case "optics":          drawOptics(ctx,W,H,s);        break;
          case "gas":             drawGas(ctx,W,H,particlesRef.current as GasParticle[],s); break;
          case "titration":       drawTitration(ctx,W,H,t,s);   break;
          case "molecular":       drawMolecular(ctx,W,H,t,s);   break;
          case "reaction_energy": drawReactionEnergy(ctx,W,H,t,s); break;
          case "equilibrium":     drawEquilibrium(ctx,W,H,t,s); break;
          case "atomic_model":    drawAtomicModel(ctx,W,H,t,s); break;
          case "osmosis":         drawOsmosis(ctx,W,H,t,particlesRef.current as OsmosisParticle[],s); break;
          case "mitosis":         drawMitosis(ctx,W,H,t,s);     break;
          case "enzyme":          drawEnzyme(ctx,W,H,t,s);        break;
          case "population":      drawPopulation(ctx,W,H,t,s);  break;
          case "action_potential":drawActionPotential(ctx,W,H,t,s); break;
        }
      }
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [sim.type]);

  function handleSlider(key: string, value: number) {
    setSliders(p => ({ ...p, [key]: value }));
    if (["projectile","spring","pendulum"].includes(sim.type)) tRef.current = 0;
  }

  const hint = SIM_HINTS[sim.type as Exclude<SimType,"none">];
  const cat = simCategory(sim.type);
  const labelText = sim.label && sim.label !== "" ? sim.label : `Interactive · ${sim.type.replace(/_/g," ")}`;

  return (
    <div style={{ background: C.bg, border: `1px solid ${C.secondary}` }}>
      {/* Header — dark-themed to match canvas */}
      <div style={{ padding: "12px 18px", borderBottom: `1px solid ${C.secondary}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" as const }}>
        <div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: C.primary, letterSpacing: "0.12em", textTransform: "uppercase" }}>{cat}</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: C.white, marginTop: 3, fontWeight: 500 }}>
            {labelText}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setPaused(p => !p)}
            style={{ background: "transparent", border: `1px solid ${C.dim}`, color: C.white, padding: "5px 14px", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.06em" }}>
            {paused ? "▶ RESUME" : "⏸ PAUSE"}
          </button>
          <button
            onClick={() => { tRef.current = 0; }}
            style={{ background: "transparent", border: `1px solid ${C.dim}`, color: C.dim, padding: "5px 14px", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.06em" }}>
            ↺ RESET
          </button>
        </div>
      </div>

      {/* Canvas — no gap, bleeds edge to edge */}
      <div ref={containerRef} style={{ width: "100%", lineHeight: 0 }}>
        <canvas ref={canvasRef} style={{ display: "block", width: "100%" }} />
      </div>

      {/* Controls — dark-themed */}
      <div style={{ padding: "16px 18px 18px", borderTop: `1px solid ${C.secondary}` }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: C.dim, marginBottom: 14, letterSpacing: "0.1em", textTransform: "uppercase" }}>Parameters — drag to explore</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: "14px 24px" }}>
          {controls.map(ctrl => (
            <div key={ctrl.key}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: C.dim }}>{ctrl.label}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: C.primary, fontWeight: 600 }}>
                  {(sliders[ctrl.key] ?? ctrl.default).toFixed(ctrl.step < 0.1 ? 2 : ctrl.step < 1 ? 1 : 0)}{ctrl.unit}
                </span>
              </div>
              <ElasticSlider defaultValue={sliders[ctrl.key] ?? ctrl.default} startingValue={ctrl.min} maxValue={ctrl.max} isStepped stepSize={ctrl.step} onChange={v => handleSlider(ctrl.key, v)} />
            </div>
          ))}
        </div>
        {hint && (
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: C.dim, marginTop: 14, lineHeight: 1.7, borderTop: `1px solid ${C.secondary}`, paddingTop: 12 }}>
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}
