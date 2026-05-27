"use client";

import { useEffect, useRef, useState } from "react";

export type SimType = "projectile" | "pendulum" | "wave" | "spring" | "electric" | "orbital" | "optics" | "gas" | "none";
export interface SimConfig { type: SimType; label?: string; params?: Record<string, number> }

const C = {
  bg: "#0b1a0e", grid: "#13221a", primary: "#52d968", secondary: "#2a6a3a",
  accent: "#ff6b35", highlight: "#ffe066", white: "#dff5e3", dim: "#3d6b47", surface: "#0e2014",
};

const CONTROLS: Record<Exclude<SimType,"none">, { key: string; label: string; min: number; max: number; step: number; unit: string; default: number }[]> = {
  projectile: [
    { key:"angle",   label:"Launch angle",   min:5,   max:85,  step:1,    unit:"°",    default:45   },
    { key:"v0",      label:"Initial speed",  min:5,   max:50,  step:1,    unit:"m/s",  default:20   },
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
};

const SIM_HINTS: Record<Exclude<SimType,"none">, string> = {
  projectile: "Drag sliders to adjust launch — see how angle and speed change the range and max height.",
  pendulum:   "Period only depends on length and gravity — not amplitude (for small angles). Try it.",
  wave:       "When both frequencies are close, you see beats — a slow amplitude oscillation.",
  spring:     "The orange arrow shows the restoring force. Heavier mass → slower oscillation.",
  electric:   "Field lines go from + to −. Like charges repel; opposite attract. Set both + or both − to see.",
  orbital:    "Planet moves fastest at periapsis (closest). Kepler's second law — equal areas in equal times.",
  optics:     "When n₂ > n₁, light slows and bends toward the normal. Increase angle past critical → TIR.",
  gas:        "Higher temperature → faster particles → higher pressure. Maxwell-Boltzmann in action.",
};

function grid(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.strokeStyle = C.grid; ctx.lineWidth = 0.5;
  for (let x = 0; x <= W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y <= H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
}

function lbl(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, align: CanvasTextAlign = "left") {
  ctx.font = "10px 'Space Mono', monospace"; ctx.fillStyle = C.dim; ctx.textAlign = align; ctx.fillText(text, x, y);
}

// ── Projectile ─────────────────────────────────────────────────────────────────
function drawProjectile(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, s: Record<string,number>) {
  const ang = (s.angle??45)*Math.PI/180, v0 = s.v0??20, g = s.gravity??9.8;
  const vx = v0*Math.cos(ang), vy = v0*Math.sin(ang);
  const tFlight = 2*vy/g, range = vx*tFlight, maxH = vy*vy/(2*g);
  const pad = 44;
  const sx = (W-pad*2)/range, sy = (H-pad*2)/(maxH*1.3);
  const cx = (x: number) => pad+x*sx, cy = (y: number) => H-pad-y*sy;

  ctx.strokeStyle = C.secondary; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(pad,H-pad); ctx.lineTo(W-pad,H-pad); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(pad,H-pad); ctx.lineTo(pad,pad); ctx.stroke();

  ctx.strokeStyle = C.dim; ctx.lineWidth = 1; ctx.setLineDash([4,4]);
  ctx.beginPath();
  for (let i=0;i<=100;i++) { const ti=(i/100)*tFlight, xi=vx*ti, yi=vy*ti-0.5*g*ti*ti; i===0?ctx.moveTo(cx(xi),cy(yi)):ctx.lineTo(cx(xi),cy(yi)); }
  ctx.stroke(); ctx.setLineDash([]);

  const tNow = t%(tFlight+0.6), tc = Math.min(tNow, tFlight);
  const xc = vx*tc, yc = Math.max(0, vy*tc-0.5*g*tc*tc);
  const active = tNow <= tFlight;

  ctx.strokeStyle = C.primary+"66"; ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i=0;i<=60;i++) { const ti=(i/60)*tc, xi=vx*ti, yi=Math.max(0,vy*ti-0.5*g*ti*ti); i===0?ctx.moveTo(cx(xi),cy(yi)):ctx.lineTo(cx(xi),cy(yi)); }
  ctx.stroke();

  ctx.beginPath(); ctx.arc(cx(xc),cy(yc),7,0,Math.PI*2);
  ctx.fillStyle = active ? C.primary : C.accent; ctx.fill();

  const al = 30;
  ctx.strokeStyle = C.accent; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx(0),cy(0)); ctx.lineTo(cx(0)+al*Math.cos(ang),cy(0)-al*Math.sin(ang)); ctx.stroke();

  if (active && yc > 0.5) {
    ctx.strokeStyle = C.highlight+"44"; ctx.lineWidth = 1; ctx.setLineDash([3,3]);
    ctx.beginPath(); ctx.moveTo(cx(xc),cy(yc)); ctx.lineTo(cx(xc),cy(0)); ctx.stroke();
    ctx.setLineDash([]);
    lbl(ctx, `h=${yc.toFixed(1)}m`, cx(xc)+6, cy(yc)-6);
  }

  lbl(ctx, `Range: ${range.toFixed(1)} m`, pad, H-pad+16);
  lbl(ctx, `H_max: ${maxH.toFixed(1)} m`, pad, pad-10);
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
  const particlesRef = useRef<GasParticle[]>([]);
  pausedRef.current = paused;
  slidersRef.current = sliders;

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.floor(e.contentRect.width);
      const h = Math.floor(w * 0.44);
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

  // Temp change: rescale velocities
  useEffect(() => {
    if (sim.type !== "gas" || particlesRef.current.length === 0) return;
    const T = sliders.temp ?? 300;
    const baseSpeed = Math.sqrt(T/300)*2.4;
    for (const p of particlesRef.current) {
      const spd = Math.sqrt(p.vx*p.vx+p.vy*p.vy);
      if (spd > 0.01) { const ns=baseSpeed*(0.6+Math.random()*0.8); p.vx=p.vx/spd*ns; p.vy=p.vy/spd*ns; }
    }
  }, [sim.type, sliders.temp]);  // eslint-disable-line react-hooks/exhaustive-deps

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
        if (sim.type === "gas") updateGas(particlesRef.current, sizeRef.current.w, sizeRef.current.h);
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
        ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
        grid(ctx, W, H);
        const s = slidersRef.current, t = tRef.current;
        switch (sim.type) {
          case "projectile": drawProjectile(ctx,W,H,t,s); break;
          case "pendulum":   drawPendulum(ctx,W,H,t,s);   break;
          case "wave":       drawWave(ctx,W,H,t,s);        break;
          case "spring":     drawSpring(ctx,W,H,t,s);      break;
          case "electric":   drawElectric(ctx,W,H,s);      break;
          case "orbital":    drawOrbital(ctx,W,H,t,s);     break;
          case "optics":     drawOptics(ctx,W,H,s);        break;
          case "gas":        drawGas(ctx,W,H,particlesRef.current,s); break;
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

  return (
    <div style={{ border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
      {/* Header */}
      <div style={{ padding: "11px 16px", borderBottom: "1px solid var(--rule)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" as const }}>
        <div>
          <div className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", letterSpacing: "0.1em" }}>PHYSICS LAB</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink)", marginTop: 2 }}>
            {sim.label || `Interactive · ${sim.type}`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost" onClick={() => setPaused(p => !p)} style={{ fontSize: 10, padding: "5px 12px" }}>
            {paused ? "▶ Resume" : "⏸ Pause"}
          </button>
          <button className="btn ghost" onClick={() => { tRef.current = 0; }} style={{ fontSize: 10, padding: "5px 12px" }}>
            ↺ Reset
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} style={{ width: "100%", background: C.bg, lineHeight: 0 }}>
        <canvas ref={canvasRef} style={{ display: "block", width: "100%" }} />
      </div>

      {/* Controls */}
      <div style={{ padding: "14px 16px 16px", borderTop: "1px solid var(--rule)" }}>
        <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 12, letterSpacing: "0.06em" }}>PARAMETERS — drag to explore the physics</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: "12px 20px" }}>
          {controls.map(ctrl => (
            <div key={ctrl.key}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>{ctrl.label}</span>
                <span className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)" }}>
                  {(sliders[ctrl.key] ?? ctrl.default).toFixed(ctrl.step < 0.1 ? 2 : ctrl.step < 1 ? 1 : 0)}{ctrl.unit}
                </span>
              </div>
              <input type="range" min={ctrl.min} max={ctrl.max} step={ctrl.step}
                value={sliders[ctrl.key] ?? ctrl.default}
                onChange={e => handleSlider(ctrl.key, parseFloat(e.target.value))}
                style={{ width: "100%", cursor: "pointer", accentColor: "var(--cinnabar-ink)" }}
              />
            </div>
          ))}
        </div>
        {hint && (
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 12, lineHeight: 1.6, borderTop: "1px solid var(--rule)", paddingTop: 10 }}>
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}
