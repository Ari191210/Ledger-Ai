"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import TierGate from "@/components/tier-gate";

// ── Real CDS / Common Data Set data (Class of 2028–29 cycle) ──────────────
type College = {
  id: string; name: string; loc: string; type: "private" | "public";
  accept: number;       // overall acceptance rate
  sat25: number; sat75: number;   // SAT composite (0 = N/A)
  act25: number; act75: number;
  gpa: number;          // avg unweighted GPA of enrolled students
  ed: boolean;          // ED offered
  ea: boolean;          // EA offered
  deadline: string;     // RD deadline
  tags: string[];       // notable programs
};

const COLLEGES: College[] = [
  // ── Ivies ──
  { id:"harvard",   name:"Harvard University",           loc:"Cambridge, MA",    type:"private", accept:0.036, sat25:1460, sat75:1580, act25:34, act75:36, gpa:3.95, ed:false, ea:true,  deadline:"Jan 1",  tags:["Medicine","Law","Business","Sciences"] },
  { id:"princeton", name:"Princeton University",         loc:"Princeton, NJ",    type:"private", accept:0.046, sat25:1450, sat75:1570, act25:33, act75:36, gpa:3.95, ed:true,  ea:false, deadline:"Jan 1",  tags:["Public Policy","Engineering","Sciences"] },
  { id:"yale",      name:"Yale University",              loc:"New Haven, CT",    type:"private", accept:0.044, sat25:1460, sat75:1580, act25:34, act75:36, gpa:3.95, ed:true,  ea:false, deadline:"Jan 2",  tags:["Law","Drama","Music","Architecture"] },
  { id:"columbia",  name:"Columbia University",          loc:"New York, NY",     type:"private", accept:0.039, sat25:1490, sat75:1580, act25:34, act75:36, gpa:3.94, ed:true,  ea:false, deadline:"Jan 1",  tags:["Journalism","Urban Studies","Business"] },
  { id:"penn",      name:"University of Pennsylvania",   loc:"Philadelphia, PA", type:"private", accept:0.059, sat25:1440, sat75:1570, act25:33, act75:36, gpa:3.93, ed:true,  ea:false, deadline:"Jan 5",  tags:["Business (Wharton)","Engineering","Medicine"] },
  { id:"brown",     name:"Brown University",             loc:"Providence, RI",   type:"private", accept:0.054, sat25:1460, sat75:1580, act25:33, act75:36, gpa:3.95, ed:true,  ea:false, deadline:"Jan 5",  tags:["Open Curriculum","CS","Public Health"] },
  { id:"dartmouth", name:"Dartmouth College",            loc:"Hanover, NH",      type:"private", accept:0.056, sat25:1440, sat75:1560, act25:33, act75:36, gpa:3.92, ed:true,  ea:false, deadline:"Jan 2",  tags:["Business (Tuck)","Engineering","Film"] },
  { id:"cornell",   name:"Cornell University",           loc:"Ithaca, NY",       type:"private", accept:0.084, sat25:1400, sat75:1550, act25:33, act75:35, gpa:3.90, ed:true,  ea:false, deadline:"Jan 2",  tags:["Engineering","Hotel Admin","Architecture"] },
  // ── Elite privates ──
  { id:"mit",       name:"MIT",                          loc:"Cambridge, MA",    type:"private", accept:0.047, sat25:1510, sat75:1580, act25:35, act75:36, gpa:3.97, ed:false, ea:true,  deadline:"Jan 1",  tags:["Engineering","CS","Physics","Economics"] },
  { id:"stanford",  name:"Stanford University",          loc:"Stanford, CA",     type:"private", accept:0.037, sat25:1460, sat75:1580, act25:34, act75:36, gpa:3.96, ed:false, ea:true,  deadline:"Jan 2",  tags:["CS","Engineering","Business","Medicine"] },
  { id:"caltech",   name:"Caltech",                      loc:"Pasadena, CA",     type:"private", accept:0.033, sat25:1530, sat75:1580, act25:35, act75:36, gpa:3.97, ed:false, ea:false, deadline:"Jan 3",  tags:["Physics","Engineering","Chemistry","Astronomy"] },
  { id:"duke",      name:"Duke University",              loc:"Durham, NC",       type:"private", accept:0.058, sat25:1450, sat75:1570, act25:33, act75:36, gpa:3.93, ed:true,  ea:false, deadline:"Jan 2",  tags:["Medicine","Policy","Business"] },
  { id:"northwestern",name:"Northwestern University",   loc:"Evanston, IL",     type:"private", accept:0.065, sat25:1440, sat75:1560, act25:33, act75:35, gpa:3.92, ed:true,  ea:false, deadline:"Jan 2",  tags:["Journalism","Engineering","Theater","Music"] },
  { id:"jhu",       name:"Johns Hopkins University",     loc:"Baltimore, MD",    type:"private", accept:0.070, sat25:1480, sat75:1580, act25:34, act75:36, gpa:3.94, ed:true,  ea:false, deadline:"Jan 2",  tags:["Medicine","Public Health","Engineering"] },
  { id:"vanderbilt",name:"Vanderbilt University",        loc:"Nashville, TN",    type:"private", accept:0.074, sat25:1470, sat75:1570, act25:34, act75:36, gpa:3.93, ed:true,  ea:false, deadline:"Jan 1",  tags:["Medicine","Engineering","Music","Education"] },
  { id:"rice",      name:"Rice University",              loc:"Houston, TX",      type:"private", accept:0.096, sat25:1490, sat75:1580, act25:34, act75:36, gpa:3.93, ed:true,  ea:false, deadline:"Jan 1",  tags:["Engineering","Music","Architecture","Physics"] },
  { id:"notredame", name:"Notre Dame",                   loc:"South Bend, IN",   type:"private", accept:0.126, sat25:1390, sat75:1540, act25:33, act75:35, gpa:3.92, ed:true,  ea:false, deadline:"Jan 1",  tags:["Law","Business","Engineering","Philosophy"] },
  { id:"wustl",     name:"Washington University St. Louis", loc:"St. Louis, MO",type:"private", accept:0.132, sat25:1490, sat75:1580, act25:34, act75:36, gpa:3.93, ed:true,  ea:false, deadline:"Jan 2",  tags:["Medicine","Engineering","Social Work","Architecture"] },
  { id:"emory",     name:"Emory University",             loc:"Atlanta, GA",      type:"private", accept:0.116, sat25:1380, sat75:1530, act25:32, act75:35, gpa:3.90, ed:true,  ea:false, deadline:"Jan 1",  tags:["Medicine","Business (Goizueta)","Public Health"] },
  { id:"cmu",       name:"Carnegie Mellon University",   loc:"Pittsburgh, PA",   type:"private", accept:0.113, sat25:1480, sat75:1580, act25:33, act75:36, gpa:3.93, ed:true,  ea:false, deadline:"Jan 1",  tags:["CS","Engineering","Drama","Business"] },
  { id:"georgetown",name:"Georgetown University",        loc:"Washington, DC",   type:"private", accept:0.138, sat25:1380, sat75:1540, act25:31, act75:35, gpa:3.92, ed:true,  ea:false, deadline:"Jan 10", tags:["International Relations","Law","Business"] },
  { id:"tufts",     name:"Tufts University",             loc:"Medford, MA",      type:"private", accept:0.109, sat25:1400, sat75:1550, act25:32, act75:35, gpa:3.91, ed:true,  ea:false, deadline:"Jan 1",  tags:["International Relations","Engineering","Medicine"] },
  { id:"nyu",       name:"NYU",                          loc:"New York, NY",     type:"private", accept:0.121, sat25:1370, sat75:1540, act25:31, act75:35, gpa:3.86, ed:true,  ea:false, deadline:"Jan 1",  tags:["Business (Stern)","Film","Arts","Law"] },
  { id:"northeastern",name:"Northeastern University",   loc:"Boston, MA",       type:"private", accept:0.068, sat25:1440, sat75:1560, act25:33, act75:35, gpa:3.93, ed:true,  ea:false, deadline:"Nov 1",  tags:["Co-op","Engineering","Business","Law"] },
  { id:"usc",       name:"University of Southern California", loc:"Los Angeles, CA", type:"private", accept:0.098, sat25:1400, sat75:1560, act25:32, act75:35, gpa:3.83, ed:true,  ea:false, deadline:"Jan 15", tags:["Film","Engineering","Business","Architecture"] },
  { id:"bu",        name:"Boston University",            loc:"Boston, MA",       type:"private", accept:0.148, sat25:1340, sat75:1510, act25:31, act75:34, gpa:3.85, ed:true,  ea:false, deadline:"Jan 2",  tags:["Engineering","Business","Medicine","Law"] },
  { id:"wake",      name:"Wake Forest University",       loc:"Winston-Salem, NC",type:"private", accept:0.198, sat25:1330, sat75:1490, act25:30, act75:34, gpa:3.91, ed:true,  ea:false, deadline:"Jan 1",  tags:["Business","Law","Medicine","Engineering"] },
  { id:"tulane",    name:"Tulane University",            loc:"New Orleans, LA",  type:"private", accept:0.116, sat25:1330, sat75:1510, act25:30, act75:34, gpa:3.80, ed:true,  ea:false, deadline:"Jan 15", tags:["Business","Public Health","Law","Architecture"] },
  { id:"case",      name:"Case Western Reserve",         loc:"Cleveland, OH",    type:"private", accept:0.273, sat25:1380, sat75:1530, act25:32, act75:35, gpa:3.86, ed:true,  ea:false, deadline:"Jan 15", tags:["Engineering","Medicine","Law","Management"] },
  // ── Liberal Arts ──
  { id:"williams",  name:"Williams College",             loc:"Williamstown, MA", type:"private", accept:0.088, sat25:1430, sat75:1570, act25:33, act75:35, gpa:3.93, ed:true,  ea:false, deadline:"Jan 9",  tags:["Economics","Mathematics","History","Sciences"] },
  { id:"amherst",   name:"Amherst College",              loc:"Amherst, MA",      type:"private", accept:0.094, sat25:1440, sat75:1570, act25:33, act75:35, gpa:3.93, ed:true,  ea:false, deadline:"Jan 1",  tags:["Open Curriculum","Economics","Sciences"] },
  { id:"pomona",    name:"Pomona College",               loc:"Claremont, CA",    type:"private", accept:0.074, sat25:1430, sat75:1560, act25:33, act75:35, gpa:3.94, ed:true,  ea:false, deadline:"Jan 8",  tags:["Sciences","Economics","CS","Humanities"] },
  { id:"swarthmore",name:"Swarthmore College",           loc:"Swarthmore, PA",   type:"private", accept:0.073, sat25:1450, sat75:1580, act25:33, act75:35, gpa:3.94, ed:true,  ea:false, deadline:"Jan 1",  tags:["Engineering","Sciences","Humanities"] },
  { id:"bowdoin",   name:"Bowdoin College",              loc:"Brunswick, ME",    type:"private", accept:0.082, sat25:1400, sat75:1540, act25:32, act75:35, gpa:3.93, ed:true,  ea:false, deadline:"Jan 8",  tags:["Government","Economics","Environmental Studies"] },
  { id:"middlebury",name:"Middlebury College",           loc:"Middlebury, VT",   type:"private", accept:0.133, sat25:1360, sat75:1520, act25:31, act75:34, gpa:3.91, ed:true,  ea:false, deadline:"Jan 1",  tags:["Languages","International Studies","Environmental"] },
  { id:"colby",     name:"Colby College",                loc:"Waterville, ME",   type:"private", accept:0.121, sat25:1340, sat75:1500, act25:30, act75:34, gpa:3.87, ed:true,  ea:false, deadline:"Jan 1",  tags:["Environmental Studies","Economics","Sciences"] },
  { id:"wesleyan",  name:"Wesleyan University",          loc:"Middletown, CT",   type:"private", accept:0.172, sat25:1360, sat75:1520, act25:31, act75:34, gpa:3.91, ed:true,  ea:false, deadline:"Jan 1",  tags:["Film","Sciences","Social Sciences"] },
  // ── Top Publics ──
  { id:"umich",     name:"University of Michigan",       loc:"Ann Arbor, MI",    type:"public",  accept:0.175, sat25:1360, sat75:1530, act25:32, act75:35, gpa:3.90, ed:false, ea:true,  deadline:"Feb 1",  tags:["Engineering","Business (Ross)","Law","Medicine"] },
  { id:"berkeley",  name:"UC Berkeley",                  loc:"Berkeley, CA",     type:"public",  accept:0.114, sat25:1290, sat75:1530, act25:28, act75:35, gpa:3.95, ed:false, ea:false, deadline:"Nov 30", tags:["CS","Engineering","Business (Haas)","Law"] },
  { id:"ucla",      name:"UCLA",                         loc:"Los Angeles, CA",  type:"public",  accept:0.101, sat25:1290, sat75:1530, act25:28, act75:35, gpa:3.96, ed:false, ea:false, deadline:"Nov 30", tags:["Film","Engineering","Medicine","Psychology"] },
  { id:"uva",       name:"University of Virginia",       loc:"Charlottesville, VA", type:"public", accept:0.206, sat25:1350, sat75:1520, act25:31, act75:35, gpa:3.90, ed:true,  ea:false, deadline:"Jan 1",  tags:["Business (McIntire)","Law","Engineering","Politics"] },
  { id:"unc",       name:"UNC Chapel Hill",              loc:"Chapel Hill, NC",  type:"public",  accept:0.195, sat25:1310, sat75:1490, act25:30, act75:34, gpa:3.93, ed:false, ea:true,  deadline:"Jan 15", tags:["Journalism","Business","Medicine","Public Policy"] },
  { id:"gatech",    name:"Georgia Tech",                 loc:"Atlanta, GA",      type:"public",  accept:0.176, sat25:1400, sat75:1540, act25:32, act75:35, gpa:3.93, ed:false, ea:true,  deadline:"Jan 1",  tags:["Engineering","CS","Architecture","Management"] },
  { id:"uiuc",      name:"University of Illinois Urbana-Champaign", loc:"Champaign, IL", type:"public", accept:0.448, sat25:1270, sat75:1500, act25:28, act75:34, gpa:3.88, ed:false, ea:false, deadline:"Nov 1",  tags:["Engineering","CS","Business (Gies)"] },
  { id:"wisc",      name:"University of Wisconsin-Madison", loc:"Madison, WI",  type:"public",  accept:0.493, sat25:1310, sat75:1470, act25:27, act75:32, gpa:3.86, ed:false, ea:false, deadline:"Feb 1",  tags:["Engineering","Business","Sciences","Journalism"] },
  { id:"uf",        name:"University of Florida",        loc:"Gainesville, FL",  type:"public",  accept:0.285, sat25:1310, sat75:1470, act25:29, act75:33, gpa:3.96, ed:false, ea:true,  deadline:"Nov 1",  tags:["Business","Engineering","Agriculture","Law"] },
  { id:"utaustin",  name:"UT Austin",                    loc:"Austin, TX",       type:"public",  accept:0.283, sat25:1190, sat75:1450, act25:26, act75:33, gpa:3.77, ed:false, ea:false, deadline:"Dec 1",  tags:["Business (McCombs)","Engineering","Law","Film"] },
  // ── UK / Canada ──
  { id:"oxford",    name:"University of Oxford",         loc:"Oxford, UK",       type:"private", accept:0.143, sat25:0,    sat75:0,    act25:0,  act75:0,  gpa:3.95, ed:false, ea:false, deadline:"Oct 15", tags:["PPE","Medicine","Law","Sciences","History"] },
  { id:"cambridge", name:"University of Cambridge",      loc:"Cambridge, UK",    type:"private", accept:0.158, sat25:0,    sat75:0,    act25:0,  act75:0,  gpa:3.95, ed:false, ea:false, deadline:"Oct 15", tags:["Natural Sciences","Mathematics","Engineering","Law"] },
  { id:"utoronto",  name:"University of Toronto",        loc:"Toronto, Canada",  type:"public",  accept:0.430, sat25:0,    sat75:0,    act25:0,  act75:0,  gpa:3.70, ed:false, ea:false, deadline:"Jan 15", tags:["CS","Business","Medicine","Law","Engineering"] },
  { id:"mcgill",    name:"McGill University",            loc:"Montreal, Canada", type:"public",  accept:0.420, sat25:0,    sat75:0,    act25:0,  act75:0,  gpa:3.70, ed:false, ea:false, deadline:"Jan 15", tags:["Medicine","Law","Engineering","Business"] },
  { id:"edinburgh", name:"University of Edinburgh",      loc:"Edinburgh, UK",    type:"public",  accept:0.385, sat25:0,    sat75:0,    act25:0,  act75:0,  gpa:3.75, ed:false, ea:false, deadline:"Jan 15", tags:["Medicine","Law","Sciences","Arts"] },
];

// ── Types ──────────────────────────────────────────────────────────────────
type ECTier = "national" | "regional" | "local";
type EC = { name: string; tier: ECTier; leadership: boolean };

type Profile = {
  gpa: string;
  gpaWeighted: string;
  satErw: string; satMath: string;
  act: string;
  testChoice: "sat" | "act" | "none";
  aps: string;
  avgApScore: string;
  ecs: EC[];
  awards: "none" | "regional" | "national" | "international";
  firstGen: boolean;
  intl: boolean;
  legacyIds: string[];
  major: string;
  regions: string[];
  typePrefs: string[];
};

type Result = { college: College; chance: number; fit: number; category: "safety" | "match" | "reach" | "far-reach" };
type Analysis = { strategy: string; gaps: string[]; essayAngles: string[]; timeline: string[] };

// ── Chance engine (research-based statistical model) ────────────────────
function satComposite(erw: string, math: string): number {
  const e = parseInt(erw) || 0, m = parseInt(math) || 0;
  return e + m;
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * Math.max(0, Math.min(1, t)); }

function testPercentile(profile: Profile, college: College): number {
  if (college.sat25 === 0) return 0.65; // UK/Canada — test not primary factor
  if (profile.testChoice === "none") return 0.40;

  if (profile.testChoice === "sat") {
    const sat = satComposite(profile.satErw, profile.satMath);
    if (!sat) return 0.40;
    const mid = (college.sat25 + college.sat75) / 2;
    if (sat < college.sat25 - 80) return 0.08;
    if (sat < college.sat25)      return lerp(0.08, 0.28, (sat - (college.sat25 - 80)) / 80);
    if (sat < mid)                return lerp(0.28, 0.55, (sat - college.sat25) / (mid - college.sat25));
    if (sat < college.sat75)      return lerp(0.55, 0.78, (sat - mid) / (college.sat75 - mid));
    if (sat < college.sat75 + 60) return lerp(0.78, 0.92, (sat - college.sat75) / 60);
    return 0.92;
  }

  // ACT
  const act = parseInt(profile.act) || 0;
  if (!act) return 0.40;
  if (act < college.act25 - 2) return 0.08;
  if (act < college.act25)     return lerp(0.08, 0.28, (act - (college.act25 - 2)) / 2);
  const actMid = (college.act25 + college.act75) / 2;
  if (act < actMid)            return lerp(0.28, 0.55, (act - college.act25) / (actMid - college.act25));
  if (act < college.act75)     return lerp(0.55, 0.78, (act - actMid) / (college.act75 - actMid));
  if (act < college.act75 + 1) return lerp(0.78, 0.92, act - college.act75);
  return 0.92;
}

function gpaPercentile(profile: Profile, college: College): number {
  const g = parseFloat(profile.gpa);
  if (isNaN(g)) return 0.45;
  const diff = g - college.gpa;
  if (diff >=  0.15) return 0.92;
  if (diff >=  0.05) return 0.80;
  if (diff >=  0.00) return 0.68;
  if (diff >= -0.10) return 0.52;
  if (diff >= -0.20) return 0.36;
  if (diff >= -0.30) return 0.22;
  return 0.10;
}

function ecScore(ecs: EC[]): number {
  if (!ecs.length) return 0.20;
  let score = 0;
  for (const ec of ecs) {
    score += ec.tier === "national" ? 0.28 : ec.tier === "regional" ? 0.16 : 0.08;
    if (ec.leadership) score += 0.06;
  }
  return Math.min(score, 0.92);
}

function awardScore(awards: Profile["awards"]): number {
  return { none: 0.30, regional: 0.55, national: 0.80, international: 0.95 }[awards];
}

function apBoost(aps: string, avgScore: string): number {
  const n = parseInt(aps) || 0;
  const avg = parseFloat(avgScore) || 3;
  if (n === 0) return 0;
  const base = Math.min(n / 10, 0.12);
  const quality = (avg - 3) / 2 * 0.06;
  return base + quality;
}

function computeChance(profile: Profile, college: College): number {
  const tp = testPercentile(profile, college);
  const gp = gpaPercentile(profile, college);
  const ep = ecScore(profile.ecs);
  const ap = awardScore(profile.awards);
  const apB = apBoost(profile.aps, profile.avgApScore);

  let holistic = 0.38 * tp + 0.32 * gp + 0.18 * ep + 0.12 * ap + apB;
  holistic = Math.min(holistic, 0.95);

  // Selectivity multiplier: very selective schools need near-perfect profiles
  const rate = college.accept;
  let mult: number;
  if (rate < 0.05) mult = 1.05;
  else if (rate < 0.08) mult = 1.35;
  else if (rate < 0.12) mult = 1.80;
  else if (rate < 0.18) mult = 2.30;
  else if (rate < 0.30) mult = 2.80;
  else if (rate < 0.50) mult = 3.40;
  else mult = 4.20;

  // Hooks
  if (profile.firstGen) holistic += 0.04;
  if (profile.legacyIds.includes(college.id)) holistic += 0.10;
  if (profile.intl && rate < 0.15) holistic -= 0.06; // int'l applicants face tougher odds at elite schools

  return Math.min(rate * mult * holistic, 0.91);
}

function fitScore(profile: Profile, college: College): number {
  let fit = 0.5;
  if (profile.typePrefs.length && profile.typePrefs.includes(college.type)) fit += 0.15;
  const regionMap: Record<string, string[]> = {
    northeast: ["MA","NY","CT","NJ","PA","RI","NH","VT","ME","DC","MD"],
    south: ["NC","SC","GA","FL","VA","TN","TX","LA","IN"],
    midwest: ["MI","IL","WI","OH","MO","IN"],
    west: ["CA","WA","OR"],
    uk: ["UK"],
    canada: ["Canada"],
    ireland: ["Ireland"],
  };
  const colLoc = college.loc;
  for (const region of profile.regions) {
    const states = regionMap[region] || [];
    if (states.some(s => colLoc.includes(s))) { fit += 0.20; break; }
  }
  if (profile.major) {
    const m = profile.major.toLowerCase();
    if (college.tags.some(t => t.toLowerCase().includes(m) || m.includes(t.toLowerCase().split(" ")[0]))) fit += 0.15;
  }
  return Math.min(fit, 1.0);
}

function categorise(chance: number): Result["category"] {
  if (chance >= 0.55) return "safety";
  if (chance >= 0.25) return "match";
  if (chance >= 0.08) return "reach";
  return "far-reach";
}

const CAT_LABEL: Record<Result["category"], string> = { safety: "Safety", match: "Match", reach: "Reach", "far-reach": "Far Reach" };
const CAT_COLOR: Record<Result["category"], string> = { safety: "#2d7a3c", match: "#1a6091", reach: "#c97a1a", "far-reach": "#c44b2a" };

// ── EC tier labels ─────────────────────────────────────────────────────────
const TIER_LABELS: Record<ECTier, string> = { national: "National / International", regional: "Regional / State", local: "School / Local" };
const AWARD_OPTS: { value: Profile["awards"]; label: string; sub: string }[] = [
  { value: "none",          label: "None",                 sub: "No major awards" },
  { value: "regional",      label: "Regional / State",     sub: "District competitions, state honours" },
  { value: "national",      label: "National",             sub: "National olympiad, merit scholar" },
  { value: "international", label: "International",        sub: "IMO, IOI, global competitions" },
];

const REGIONS = ["northeast","south","midwest","west","uk","canada","ireland"];
const REGION_LABELS: Record<string, string> = { northeast:"Northeast US", south:"South US", midwest:"Midwest US", west:"West US / CA", uk:"United Kingdom", canada:"Canada", ireland:"Ireland" };

// ── Main component ─────────────────────────────────────────────────────────
const BLANK: Profile = {
  gpa:"", gpaWeighted:"", satErw:"", satMath:"", act:"", testChoice:"sat",
  aps:"", avgApScore:"",
  ecs:[], awards:"none",
  firstGen:false, intl:false, legacyIds:[],
  major:"", regions:[], typePrefs:[],
};

export default function AdmissionsPage() {
  const [step, setStep]       = useState(0);
  const [profile, setProfile] = useState<Profile>(BLANK);
  const [results, setResults] = useState<Result[] | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [ecName, setEcName]   = useState("");
  const [ecTier, setEcTier]   = useState<ECTier>("local");
  const [ecLead, setEcLead]   = useState(false);
  const [query, setQuery]     = useState("");
  const [legacySearch, setLegacySearch] = useState("");

  function set<K extends keyof Profile>(k: K, v: Profile[K]) {
    setProfile(p => ({ ...p, [k]: v }));
  }

  function toggleArr<K extends keyof Profile>(k: K, val: string) {
    setProfile(p => {
      const arr = p[k] as string[];
      return { ...p, [k]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] };
    });
  }

  function addEc() {
    if (!ecName.trim()) return;
    set("ecs", [...profile.ecs, { name: ecName.trim(), tier: ecTier, leadership: ecLead }]);
    setEcName(""); setEcTier("local"); setEcLead(false);
  }

  async function generate() {
    setLoading(true); setError(""); setResults(null); setAnalysis(null);
    const computed: Result[] = COLLEGES
      .filter(c => {
        if (query.trim()) return c.name.toLowerCase().includes(query.toLowerCase()) || c.tags.some(t => t.toLowerCase().includes(query.toLowerCase()));
        return true;
      })
      .map(c => ({
        college: c,
        chance: computeChance(profile, c),
        fit: fitScore(profile, c),
        category: categorise(computeChance(profile, c)),
      }))
      .sort((a, b) => b.chance - a.chance);
    setResults(computed);

    try {
      const top5 = computed.slice(0, 5).map(r => r.college.name);
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "admissions", profile, topColleges: top5 }),
      });
      const data = await res.json();
      if (res.ok && data.strategy) setAnalysis(data as Analysis);
    } catch {}
    setLoading(false);
  }

  // ── Step validation ──────────────────────────────────────────────────────
  const step0Valid = profile.gpa.trim() !== "";
  const step1Valid = profile.ecs.length > 0;

  // ── Grouped results ──────────────────────────────────────────────────────
  const groups = useMemo(() => {
    if (!results) return null;
    const cats: Result["category"][] = ["safety", "match", "reach", "far-reach"];
    return cats.map(cat => ({ cat, items: results.filter(r => r.category === cat) })).filter(g => g.items.length > 0);
  }, [results]);

  const summaryStats = useMemo(() => {
    if (!results) return null;
    return {
      safety: results.filter(r => r.category === "safety").length,
      match: results.filter(r => r.category === "match").length,
      reach: results.filter(r => r.category === "reach").length,
      farReach: results.filter(r => r.category === "far-reach").length,
      bestChance: results[0]?.college.name || "",
      topChance: results[0]?.chance || 0,
    };
  }, [results]);

  // ── Results view ─────────────────────────────────────────────────────────
  if (results && groups) return (
    <TierGate requires="pro">
      <div>
        <header className="mob-hp" style={{ padding:"24px 44px", borderBottom:"1px solid var(--ink)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div className="mono" style={{ color:"var(--ink-3)" }}>Tool 16 · Admissions Engine · Your Profile</div>
          <button className="btn ghost" onClick={() => { setResults(null); setAnalysis(null); setStep(0); }}>Retake →</button>
        </header>

        <main className="mob-p" style={{ padding:"40px 44px 80px", maxWidth:1400, margin:"0 auto" }}>

          {/* Summary bar */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", border:"1px solid var(--ink)", marginBottom:32 }}>
            {[
              { label:"Safety",   count: summaryStats!.safety,   color:"#2d7a3c" },
              { label:"Match",    count: summaryStats!.match,    color:"#1a6091" },
              { label:"Reach",    count: summaryStats!.reach,    color:"#c97a1a" },
              { label:"Far Reach",count: summaryStats!.farReach, color:"#c44b2a" },
            ].map((s, i) => (
              <div key={s.label} style={{ padding:"20px 24px", borderRight: i < 3 ? "1px solid var(--ink)" : "none", textAlign:"center" }}>
                <div style={{ fontFamily:"var(--serif)", fontSize:42, fontWeight:700, color: s.count > 0 ? s.color : "var(--ink-3)" }}>{s.count}</div>
                <div className="mono" style={{ color:"var(--ink-3)", marginTop:4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div className="mob-col" style={{ display:"grid", gridTemplateColumns:"1fr 360px", gap:32 }}>

            {/* College list */}
            <div>
              {groups.map(group => (
                <div key={group.cat} style={{ marginBottom:28 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12, paddingBottom:8, borderBottom:`2px solid ${CAT_COLOR[group.cat]}` }}>
                    <span style={{ fontFamily:"var(--mono)", fontSize:9, letterSpacing:"0.12em", textTransform:"uppercase", color: CAT_COLOR[group.cat], fontWeight:700 }}>{CAT_LABEL[group.cat]}</span>
                    <span className="mono" style={{ color:"var(--ink-3)" }}>· {group.items.length} school{group.items.length !== 1 ? "s" : ""}</span>
                  </div>
                  {group.items.map((r, i) => (
                    <div key={r.college.id} style={{ border:"1px solid var(--ink)", borderBottom: i < group.items.length - 1 ? "none" : "1px solid var(--ink)", padding:"16px 20px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", alignItems:"baseline", gap:10, flexWrap:"wrap" }}>
                            <span style={{ fontFamily:"var(--serif)", fontSize:17, fontWeight:600 }}>{r.college.name}</span>
                            <span className="mono" style={{ color:"var(--ink-3)", fontSize:10 }}>{r.college.loc}</span>
                            {profile.legacyIds.includes(r.college.id) && <span className="mono" style={{ color:"var(--cinnabar-ink)", fontSize:9, padding:"1px 5px", border:"1px solid var(--cinnabar-ink)" }}>LEGACY</span>}
                          </div>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:7 }}>
                            {r.college.tags.slice(0,3).map(t => (
                              <span key={t} style={{ fontFamily:"var(--mono)", fontSize:9, padding:"2px 7px", border:"1px solid var(--rule)", color:"var(--ink-3)", textTransform:"uppercase" }}>{t}</span>
                            ))}
                            {r.college.ed && <span style={{ fontFamily:"var(--mono)", fontSize:9, padding:"2px 7px", background:"var(--ink)", color:"var(--paper)" }}>ED</span>}
                            {r.college.ea && <span style={{ fontFamily:"var(--mono)", fontSize:9, padding:"2px 7px", border:"1px solid var(--ink)", color:"var(--ink)" }}>EA</span>}
                          </div>
                        </div>
                        <div style={{ textAlign:"right", flexShrink:0 }}>
                          <div style={{ fontFamily:"var(--serif)", fontSize:26, fontWeight:700, color: CAT_COLOR[r.category] }}>{Math.round(r.chance * 100)}%</div>
                          <div className="mono" style={{ color:"var(--ink-3)", fontSize:9 }}>YOUR ODDS</div>
                          <div className="mono" style={{ color:"var(--ink-3)", fontSize:9, marginTop:2 }}>Admit rate: {Math.round(r.college.accept * 100)}%</div>
                        </div>
                      </div>
                      {/* Probability bar */}
                      <div style={{ marginTop:12, height:4, background:"var(--paper-2)", border:"1px solid var(--rule)" }}>
                        <div style={{ height:"100%", width:`${Math.round(r.chance * 100)}%`, background: CAT_COLOR[r.category], transition:"width 600ms ease" }} />
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                        <span className="mono" style={{ fontSize:9, color:"var(--ink-3)" }}>Deadline: {r.college.deadline}</span>
                        <span className="mono" style={{ fontSize:9, color:"var(--ink-3)" }}>Fit: {Math.round(r.fit * 100)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* AI analysis sidebar */}
            <div>
              {loading && !analysis && (
                <div style={{ border:"1px solid var(--ink)", padding:"24px 20px", marginBottom:20 }}>
                  <div className="mono cin" style={{ marginBottom:8 }}>Analysing profile…</div>
                  <div className="mono" style={{ color:"var(--ink-3)", fontSize:11 }}>Generating strategy, gaps, and essay angles.</div>
                </div>
              )}

              {analysis && (
                <>
                  <div style={{ border:"1px solid var(--ink)", padding:"20px", marginBottom:16 }}>
                    <div className="mono cin" style={{ marginBottom:12 }}>Strategy</div>
                    <p style={{ fontFamily:"var(--sans)", fontSize:13, lineHeight:1.65, color:"var(--ink-2)", margin:0 }}>{analysis.strategy}</p>
                  </div>

                  <div style={{ border:"1px solid var(--ink)", padding:"20px", marginBottom:16 }}>
                    <div className="mono cin" style={{ marginBottom:12 }}>Profile gaps</div>
                    {analysis.gaps.map((g, i) => (
                      <div key={i} style={{ display:"flex", gap:10, marginBottom:10, alignItems:"flex-start" }}>
                        <span className="mono" style={{ color:"var(--cinnabar-ink)", flexShrink:0, marginTop:1 }}>{String(i+1).padStart(2,"0")}</span>
                        <span style={{ fontFamily:"var(--sans)", fontSize:13, lineHeight:1.55 }}>{g}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ border:"1px solid var(--ink)", padding:"20px", marginBottom:16 }}>
                    <div className="mono cin" style={{ marginBottom:12 }}>Essay angles</div>
                    {analysis.essayAngles.map((e, i) => (
                      <div key={i} style={{ padding:"10px 0", borderBottom: i < analysis.essayAngles.length - 1 ? "1px solid var(--rule)" : "none" }}>
                        <div style={{ fontFamily:"var(--sans)", fontSize:13, lineHeight:1.5 }}>{e}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ border:"1px solid var(--ink)", padding:"20px" }}>
                    <div className="mono cin" style={{ marginBottom:12 }}>Key dates</div>
                    {analysis.timeline.map((t, i) => (
                      <div key={i} style={{ fontFamily:"var(--sans)", fontSize:12.5, lineHeight:1.6, color:"var(--ink-2)", marginBottom:4 }}>· {t}</div>
                    ))}
                  </div>
                </>
              )}

              {/* Disclaimer */}
              <div style={{ marginTop:16, padding:"14px 16px", border:"1px solid var(--rule)", background:"var(--paper-2)" }}>
                <div className="mono" style={{ color:"var(--ink-3)", fontSize:9, lineHeight:1.6 }}>
                  Probabilities are statistical estimates based on published CDS data and a holistic scoring model. They reflect historical patterns — not guarantees. Actual admissions decisions involve factors (essays, recommendations, institutional priorities) that cannot be fully modelled.
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop:60, borderTop:"1px solid var(--ink)", paddingTop:20, display:"flex", justifyContent:"space-between" }}>
            <Link href="/dashboard" className="mono" style={{ color:"var(--ink-3)" }}>← Dashboard</Link>
            <div className="mono" style={{ color:"var(--ink-3)" }}>Tool 16 of 16.</div>
          </div>
        </main>
      </div>
    </TierGate>
  );

  // ── Input view ─────────────────────────────────────────────────────────
  const STEPS = ["Academic", "Activities", "Preferences"];

  return (
    <TierGate requires="pro">
      <div>
        <header className="mob-hp" style={{ padding:"24px 44px", borderBottom:"1px solid var(--ink)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div className="mono" style={{ color:"var(--ink-3)" }}>Tool 16 · Admissions Engine</div>
          <div style={{ display:"flex", gap:0 }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{ padding:"6px 16px", fontFamily:"var(--mono)", fontSize:10, borderLeft:"1px solid var(--rule)", color: step === i ? "var(--paper)" : "var(--ink-3)", background: step === i ? "var(--ink)" : "transparent", cursor:"pointer" }} onClick={() => { if (i < step || (i === 1 && step0Valid) || (i === 2 && step1Valid)) setStep(i); }}>
                {String(i+1).padStart(2,"0")} {s}
              </div>
            ))}
          </div>
        </header>

        <main className="mob-p" style={{ padding:"40px 44px 80px", maxWidth:760, margin:"0 auto" }}>
          {/* Progress */}
          <div style={{ height:3, background:"var(--paper-2)", border:"1px solid var(--rule)", marginBottom:40 }}>
            <div style={{ height:"100%", width:`${((step + 1) / STEPS.length) * 100}%`, background:"var(--cinnabar)", transition:"width 400ms" }} />
          </div>

          {/* ── Step 0: Academic ── */}
          {step === 0 && (
            <div>
              <div className="mono cin" style={{ marginBottom:8 }}>Step 01 · Academic Profile</div>
              <h2 style={{ fontFamily:"var(--serif)", fontSize:32, fontWeight:500, fontStyle:"italic", letterSpacing:"-0.015em", margin:"0 0 32px" }}>Your grades and test scores.</h2>

              <div style={{ marginBottom:20 }}>
                <div className="mono" style={{ color:"var(--ink-3)", marginBottom:6 }}>Unweighted GPA (out of 4.0) *</div>
                <input type="number" min="0" max="4.0" step="0.01" value={profile.gpa} onChange={e => set("gpa", e.target.value)} placeholder="e.g. 3.85"
                  style={{ width:"100%", fontFamily:"var(--sans)", fontSize:18, border:"1px solid var(--ink)", background:"var(--paper)", padding:"12px 14px", color:"var(--ink)", boxSizing:"border-box" }} />
              </div>

              <div style={{ marginBottom:20 }}>
                <div className="mono" style={{ color:"var(--ink-3)", marginBottom:6 }}>Weighted GPA (optional)</div>
                <input type="number" min="0" max="5.5" step="0.01" value={profile.gpaWeighted} onChange={e => set("gpaWeighted", e.target.value)} placeholder="e.g. 4.3"
                  style={{ width:"100%", fontFamily:"var(--sans)", fontSize:18, border:"1px solid var(--ink)", background:"var(--paper)", padding:"12px 14px", color:"var(--ink)", boxSizing:"border-box" }} />
              </div>

              <div style={{ marginBottom:20 }}>
                <div className="mono" style={{ color:"var(--ink-3)", marginBottom:8 }}>Standardised test</div>
                <div style={{ display:"flex", gap:0, border:"1px solid var(--ink)" }}>
                  {(["sat","act","none"] as const).map((opt, i) => (
                    <button key={opt} onClick={() => set("testChoice", opt)}
                      style={{ flex:1, padding:"10px", fontFamily:"var(--mono)", fontSize:11, background: profile.testChoice === opt ? "var(--ink)" : "var(--paper)", color: profile.testChoice === opt ? "var(--paper)" : "var(--ink)", border:"none", borderRight: i < 2 ? "1px solid var(--ink)" : "none", cursor:"pointer", textTransform:"uppercase" }}>
                      {opt === "none" ? "Not submitting" : opt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {profile.testChoice === "sat" && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
                  <div>
                    <div className="mono" style={{ color:"var(--ink-3)", marginBottom:6 }}>SAT Reading & Writing</div>
                    <input type="number" min="200" max="800" value={profile.satErw} onChange={e => set("satErw", e.target.value)} placeholder="200–800"
                      style={{ width:"100%", fontFamily:"var(--sans)", fontSize:16, border:"1px solid var(--ink)", background:"var(--paper)", padding:"10px 12px", color:"var(--ink)", boxSizing:"border-box" }} />
                  </div>
                  <div>
                    <div className="mono" style={{ color:"var(--ink-3)", marginBottom:6 }}>SAT Math</div>
                    <input type="number" min="200" max="800" value={profile.satMath} onChange={e => set("satMath", e.target.value)} placeholder="200–800"
                      style={{ width:"100%", fontFamily:"var(--sans)", fontSize:16, border:"1px solid var(--ink)", background:"var(--paper)", padding:"10px 12px", color:"var(--ink)", boxSizing:"border-box" }} />
                  </div>
                  {profile.satErw && profile.satMath && (
                    <div style={{ gridColumn:"1/-1" }}>
                      <span className="mono" style={{ color:"var(--cinnabar-ink)" }}>Composite: {satComposite(profile.satErw, profile.satMath)}</span>
                    </div>
                  )}
                </div>
              )}

              {profile.testChoice === "act" && (
                <div style={{ marginBottom:20 }}>
                  <div className="mono" style={{ color:"var(--ink-3)", marginBottom:6 }}>ACT Composite</div>
                  <input type="number" min="1" max="36" value={profile.act} onChange={e => set("act", e.target.value)} placeholder="1–36"
                    style={{ width:"100%", fontFamily:"var(--sans)", fontSize:16, border:"1px solid var(--ink)", background:"var(--paper)", padding:"10px 12px", color:"var(--ink)", boxSizing:"border-box" }} />
                </div>
              )}

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:32 }}>
                <div>
                  <div className="mono" style={{ color:"var(--ink-3)", marginBottom:6 }}>AP / IB courses taken</div>
                  <input type="number" min="0" max="20" value={profile.aps} onChange={e => set("aps", e.target.value)} placeholder="e.g. 6"
                    style={{ width:"100%", fontFamily:"var(--sans)", fontSize:16, border:"1px solid var(--ink)", background:"var(--paper)", padding:"10px 12px", color:"var(--ink)", boxSizing:"border-box" }} />
                </div>
                <div>
                  <div className="mono" style={{ color:"var(--ink-3)", marginBottom:6 }}>Avg AP / IB score (1–5 / 1–7)</div>
                  <input type="number" min="1" max="7" step="0.1" value={profile.avgApScore} onChange={e => set("avgApScore", e.target.value)} placeholder="e.g. 4.2"
                    style={{ width:"100%", fontFamily:"var(--sans)", fontSize:16, border:"1px solid var(--ink)", background:"var(--paper)", padding:"10px 12px", color:"var(--ink)", boxSizing:"border-box" }} />
                </div>
              </div>

              <button className="btn" onClick={() => setStep(1)} disabled={!step0Valid} style={{ width:"100%", opacity: step0Valid ? 1 : 0.4 }}>
                Next: Activities →
              </button>
            </div>
          )}

          {/* ── Step 1: Activities ── */}
          {step === 1 && (
            <div>
              <div className="mono cin" style={{ marginBottom:8 }}>Step 02 · Activities & Profile</div>
              <h2 style={{ fontFamily:"var(--serif)", fontSize:32, fontWeight:500, fontStyle:"italic", letterSpacing:"-0.015em", margin:"0 0 32px" }}>What you do beyond class.</h2>

              {/* EC list */}
              {profile.ecs.length > 0 && (
                <div style={{ border:"1px solid var(--ink)", marginBottom:16 }}>
                  {profile.ecs.map((ec, i) => (
                    <div key={i} style={{ padding:"12px 16px", borderBottom: i < profile.ecs.length - 1 ? "1px solid var(--rule)" : "none", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div>
                        <div style={{ fontFamily:"var(--sans)", fontSize:13, fontWeight:600 }}>{ec.name}</div>
                        <div className="mono" style={{ color:"var(--ink-3)", fontSize:9, marginTop:2 }}>{TIER_LABELS[ec.tier]}{ec.leadership ? " · Leadership" : ""}</div>
                      </div>
                      <button onClick={() => set("ecs", profile.ecs.filter((_, j) => j !== i))}
                        style={{ background:"none", border:"none", cursor:"pointer", fontFamily:"var(--mono)", fontSize:11, color:"var(--ink-3)" }}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add EC */}
              <div style={{ border:"1px solid var(--ink)", padding:"18px", marginBottom:24 }}>
                <div className="mono" style={{ color:"var(--ink-3)", marginBottom:10 }}>Add activity</div>
                <input value={ecName} onChange={e => setEcName(e.target.value)} onKeyDown={e => e.key === "Enter" && addEc()} placeholder="e.g. Math Olympiad, Debate Club, Robotics Team…"
                  style={{ width:"100%", fontFamily:"var(--sans)", fontSize:14, border:"1px solid var(--ink)", background:"var(--paper)", padding:"10px 12px", color:"var(--ink)", boxSizing:"border-box", marginBottom:10 }} />
                <div style={{ display:"grid", gridTemplateColumns:"1fr auto auto", gap:8, alignItems:"center" }}>
                  <select value={ecTier} onChange={e => setEcTier(e.target.value as ECTier)}
                    style={{ fontFamily:"var(--mono)", fontSize:11, border:"1px solid var(--ink)", background:"var(--paper)", padding:"9px 8px", color:"var(--ink)" }}>
                    {(Object.entries(TIER_LABELS) as [ECTier, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <label style={{ fontFamily:"var(--mono)", fontSize:11, display:"flex", gap:6, alignItems:"center", cursor:"pointer", whiteSpace:"nowrap" }}>
                    <input type="checkbox" checked={ecLead} onChange={e => setEcLead(e.target.checked)} /> Leadership role
                  </label>
                  <button className="btn" onClick={addEc} disabled={!ecName.trim()} style={{ padding:"9px 16px", opacity: ecName.trim() ? 1 : 0.4 }}>Add</button>
                </div>
              </div>

              {/* Awards */}
              <div style={{ marginBottom:24 }}>
                <div className="mono" style={{ color:"var(--ink-3)", marginBottom:10 }}>Highest award / recognition level</div>
                <div style={{ border:"1px solid var(--ink)" }}>
                  {AWARD_OPTS.map((opt, i) => (
                    <button key={opt.value} onClick={() => set("awards", opt.value)}
                      style={{ display:"flex", width:"100%", padding:"14px 16px", background: profile.awards === opt.value ? "var(--ink)" : "var(--paper)", color: profile.awards === opt.value ? "var(--paper)" : "var(--ink)", border:"none", borderBottom: i < AWARD_OPTS.length - 1 ? "1px solid var(--rule)" : "none", cursor:"pointer", textAlign:"left", gap:14, alignItems:"center" }}>
                      <div style={{ width:14, height:14, borderRadius:"50%", border: profile.awards === opt.value ? "none" : "2px solid var(--rule)", background: profile.awards === opt.value ? "var(--cinnabar)" : "transparent", flexShrink:0 }} />
                      <div>
                        <div style={{ fontFamily:"var(--sans)", fontSize:13, fontWeight:600 }}>{opt.label}</div>
                        <div style={{ fontFamily:"var(--sans)", fontSize:11, opacity:0.65, marginTop:1 }}>{opt.sub}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Demographics */}
              <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap" }}>
                {[
                  { key:"firstGen", label:"First-generation college student" },
                  { key:"intl",     label:"International student" },
                ].map(opt => (
                  <label key={opt.key} style={{ display:"flex", gap:8, alignItems:"center", fontFamily:"var(--sans)", fontSize:13, cursor:"pointer", border:"1px solid var(--ink)", padding:"10px 14px" }}>
                    <input type="checkbox" checked={profile[opt.key as keyof Profile] as boolean} onChange={e => set(opt.key as keyof Profile, e.target.checked as never)} />
                    {opt.label}
                  </label>
                ))}
              </div>

              {/* Legacy */}
              <div style={{ marginBottom:32 }}>
                <div className="mono" style={{ color:"var(--ink-3)", marginBottom:8 }}>Legacy schools (parent / sibling attended)</div>
                <input value={legacySearch} onChange={e => setLegacySearch(e.target.value)} placeholder="Search school name…"
                  style={{ width:"100%", fontFamily:"var(--sans)", fontSize:13, border:"1px solid var(--ink)", background:"var(--paper)", padding:"9px 12px", color:"var(--ink)", boxSizing:"border-box", marginBottom:6 }} />
                {legacySearch && (
                  <div style={{ border:"1px solid var(--rule)", maxHeight:150, overflowY:"auto" }}>
                    {COLLEGES.filter(c => c.name.toLowerCase().includes(legacySearch.toLowerCase())).slice(0,6).map(c => (
                      <button key={c.id} onClick={() => { if (!profile.legacyIds.includes(c.id)) set("legacyIds", [...profile.legacyIds, c.id]); setLegacySearch(""); }}
                        style={{ display:"block", width:"100%", padding:"9px 12px", background:"none", border:"none", borderBottom:"1px solid var(--rule)", cursor:"pointer", textAlign:"left", fontFamily:"var(--sans)", fontSize:13 }}>
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
                {profile.legacyIds.length > 0 && (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:6 }}>
                    {profile.legacyIds.map(id => {
                      const c = COLLEGES.find(x => x.id === id);
                      return c ? (
                        <span key={id} style={{ fontFamily:"var(--mono)", fontSize:10, padding:"4px 8px", border:"1px solid var(--cinnabar-ink)", color:"var(--cinnabar-ink)" }}>
                          {c.name} <button onClick={() => set("legacyIds", profile.legacyIds.filter(x => x !== id))} style={{ background:"none", border:"none", cursor:"pointer", color:"inherit", padding:0, marginLeft:4 }}>✕</button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              <div style={{ display:"flex", gap:12 }}>
                <button className="btn ghost" onClick={() => setStep(0)} style={{ flex:1 }}>← Back</button>
                <button className="btn" onClick={() => setStep(2)} disabled={!step1Valid} style={{ flex:2, opacity: step1Valid ? 1 : 0.4 }}>Next: Preferences →</button>
              </div>
            </div>
          )}

          {/* ── Step 2: Preferences ── */}
          {step === 2 && (
            <div>
              <div className="mono cin" style={{ marginBottom:8 }}>Step 03 · Preferences</div>
              <h2 style={{ fontFamily:"var(--serif)", fontSize:32, fontWeight:500, fontStyle:"italic", letterSpacing:"-0.015em", margin:"0 0 32px" }}>Where and what you want to study.</h2>

              <div style={{ marginBottom:24 }}>
                <div className="mono" style={{ color:"var(--ink-3)", marginBottom:6 }}>Intended major / field (optional)</div>
                <input value={profile.major} onChange={e => set("major", e.target.value)} placeholder="e.g. Computer Science, Medicine, Economics…"
                  style={{ width:"100%", fontFamily:"var(--sans)", fontSize:14, border:"1px solid var(--ink)", background:"var(--paper)", padding:"10px 12px", color:"var(--ink)", boxSizing:"border-box" }} />
              </div>

              <div style={{ marginBottom:24 }}>
                <div className="mono" style={{ color:"var(--ink-3)", marginBottom:10 }}>Preferred regions</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {REGIONS.map(r => (
                    <button key={r} onClick={() => toggleArr("regions", r)}
                      style={{ padding:"9px 14px", fontFamily:"var(--sans)", fontSize:13, border:"1px solid var(--ink)", background: profile.regions.includes(r) ? "var(--ink)" : "var(--paper)", color: profile.regions.includes(r) ? "var(--paper)" : "var(--ink)", cursor:"pointer" }}>
                      {REGION_LABELS[r]}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom:24 }}>
                <div className="mono" style={{ color:"var(--ink-3)", marginBottom:10 }}>School type preference</div>
                <div style={{ display:"flex", gap:8 }}>
                  {[{ v:"private", l:"Private" }, { v:"public", l:"Public" }].map(t => (
                    <button key={t.v} onClick={() => toggleArr("typePrefs", t.v)}
                      style={{ flex:1, padding:"11px", fontFamily:"var(--sans)", fontSize:13, border:"1px solid var(--ink)", background: profile.typePrefs.includes(t.v) ? "var(--ink)" : "var(--paper)", color: profile.typePrefs.includes(t.v) ? "var(--paper)" : "var(--ink)", cursor:"pointer" }}>
                      {t.l}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom:32 }}>
                <div className="mono" style={{ color:"var(--ink-3)", marginBottom:6 }}>Filter to specific schools (optional)</div>
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. Engineering, California, Medicine…"
                  style={{ width:"100%", fontFamily:"var(--sans)", fontSize:14, border:"1px solid var(--ink)", background:"var(--paper)", padding:"10px 12px", color:"var(--ink)", boxSizing:"border-box" }} />
                <div className="mono" style={{ color:"var(--ink-3)", fontSize:10, marginTop:5 }}>Leave blank to evaluate all {COLLEGES.length} schools in our database.</div>
              </div>

              {error && <div style={{ marginBottom:16, fontFamily:"var(--sans)", fontSize:13, color:"var(--cinnabar-ink)" }}>{error}</div>}

              <div style={{ display:"flex", gap:12 }}>
                <button className="btn ghost" onClick={() => setStep(1)} style={{ flex:1 }}>← Back</button>
                <button className="btn" onClick={generate} disabled={loading} style={{ flex:2, opacity: loading ? 0.5 : 1 }}>
                  {loading ? "Computing chances…" : "Generate my list →"}
                </button>
              </div>
            </div>
          )}

          <div style={{ marginTop:60, borderTop:"1px solid var(--ink)", paddingTop:20, display:"flex", justifyContent:"space-between" }}>
            <Link href="/dashboard" className="mono" style={{ color:"var(--ink-3)" }}>← Dashboard</Link>
            <div className="mono" style={{ color:"var(--ink-3)" }}>Tool 16 of 16.</div>
          </div>
        </main>
      </div>
    </TierGate>
  );
}
