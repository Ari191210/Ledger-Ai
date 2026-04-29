"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import TierGate from "@/components/tier-gate";
import { callAI } from "@/lib/ai-fetch";

// ── College database (real CDS data, 2024-25 cycle) ────────────────────────
type College = {
  id: string; name: string; loc: string; type: "private" | "public";
  size: "small" | "medium" | "large"; // <5k | 5-15k | >15k undergrad
  accept: number;
  sat25: number; sat75: number;
  act25: number; act75: number;
  gpa: number;
  ed_date: string | null; ea_date: string | null; rd_date: string;
  edBoost: number; // ED acceptance rate multiplier e.g. 1.8 = 80% better odds
  tags: string[];
  values: string[]; // what the admissions office prioritises
  category: string; // "ivy" | "elite" | "lac" | "public" | "intl"
};

const COLLEGES: College[] = [
  // ── Ivies ─────────────────────────────────────────────────────────────
  { id:"harvard",    name:"Harvard University",            loc:"Cambridge, MA",       type:"private", size:"medium", accept:0.036, sat25:1460, sat75:1580, act25:34, act75:36, gpa:3.95, ed_date:null,    ea_date:"Nov 1",  rd_date:"Jan 1",  edBoost:1.0,  tags:["Medicine","Law","Business","Sciences","Government"],    values:["Intellectual curiosity","Leadership","Impact at scale"],          category:"ivy" },
  { id:"princeton",  name:"Princeton University",          loc:"Princeton, NJ",       type:"private", size:"medium", accept:0.046, sat25:1450, sat75:1570, act25:33, act75:36, gpa:3.95, ed_date:"Nov 1", ea_date:null,     rd_date:"Jan 1",  edBoost:1.9,  tags:["Public Policy","Engineering","Sciences","Humanities"],   values:["Academic excellence","Public service","Independent research"],   category:"ivy" },
  { id:"yale",       name:"Yale University",               loc:"New Haven, CT",       type:"private", size:"medium", accept:0.044, sat25:1460, sat75:1580, act25:34, act75:36, gpa:3.95, ed_date:"Nov 1", ea_date:null,     rd_date:"Jan 2",  edBoost:2.1,  tags:["Law","Drama","Music","Architecture","Medicine"],        values:["Intellectual breadth","Community","Creative spirit"],            category:"ivy" },
  { id:"columbia",   name:"Columbia University",           loc:"New York, NY",        type:"private", size:"medium", accept:0.039, sat25:1490, sat75:1580, act25:34, act75:36, gpa:3.94, ed_date:"Nov 1", ea_date:null,     rd_date:"Jan 1",  edBoost:2.0,  tags:["Journalism","Urban Studies","Business","Engineering"],   values:["Urban engagement","Global perspective","Core curriculum rigor"], category:"ivy" },
  { id:"penn",       name:"University of Pennsylvania",    loc:"Philadelphia, PA",    type:"private", size:"large",  accept:0.059, sat25:1440, sat75:1570, act25:33, act75:36, gpa:3.93, ed_date:"Nov 1", ea_date:null,     rd_date:"Jan 5",  edBoost:1.85, tags:["Business (Wharton)","Engineering","Medicine","Law"],    values:["Professional ambition","Entrepreneurship","Interdisciplinary"],  category:"ivy" },
  { id:"brown",      name:"Brown University",              loc:"Providence, RI",      type:"private", size:"medium", accept:0.054, sat25:1460, sat75:1580, act25:33, act75:36, gpa:3.95, ed_date:"Nov 1", ea_date:null,     rd_date:"Jan 5",  edBoost:2.0,  tags:["Open Curriculum","CS","Public Health","Neuroscience"],  values:["Intellectual independence","Curiosity","Student agency"],        category:"ivy" },
  { id:"dartmouth",  name:"Dartmouth College",             loc:"Hanover, NH",         type:"private", size:"small",  accept:0.056, sat25:1440, sat75:1560, act25:33, act75:36, gpa:3.92, ed_date:"Nov 1", ea_date:null,     rd_date:"Jan 2",  edBoost:2.0,  tags:["Business (Tuck)","Engineering","Film","Liberal Arts"],   values:["Community spirit","Outdoors","Collaborative culture"],           category:"ivy" },
  { id:"cornell",    name:"Cornell University",            loc:"Ithaca, NY",          type:"private", size:"large",  accept:0.084, sat25:1400, sat75:1550, act25:33, act75:35, gpa:3.90, ed_date:"Nov 1", ea_date:null,     rd_date:"Jan 2",  edBoost:1.7,  tags:["Engineering","Hotel Admin","Architecture","Agriculture"], values:["Applied learning","Diverse programs","Practicality"],            category:"ivy" },
  // ── Elite privates ────────────────────────────────────────────────────
  { id:"mit",        name:"MIT",                           loc:"Cambridge, MA",       type:"private", size:"medium", accept:0.047, sat25:1510, sat75:1580, act25:35, act75:36, gpa:3.97, ed_date:null,    ea_date:"Nov 1",  rd_date:"Jan 1",  edBoost:1.0,  tags:["Engineering","CS","Physics","Economics","Robotics"],    values:["Technical depth","Maker mindset","Collaborative problem-solving"],category:"elite"},
  { id:"stanford",   name:"Stanford University",           loc:"Stanford, CA",        type:"private", size:"large",  accept:0.037, sat25:1460, sat75:1580, act25:34, act75:36, gpa:3.96, ed_date:null,    ea_date:"Nov 1",  rd_date:"Jan 2",  edBoost:1.0,  tags:["CS","Engineering","Business","Medicine","Design"],      values:["Entrepreneurship","Impact","Intellectual risk-taking"],          category:"elite"},
  { id:"caltech",    name:"Caltech",                       loc:"Pasadena, CA",        type:"private", size:"small",  accept:0.033, sat25:1530, sat75:1580, act25:35, act75:36, gpa:3.97, ed_date:null,    ea_date:null,     rd_date:"Jan 3",  edBoost:1.0,  tags:["Physics","Engineering","Chemistry","Astronomy","Math"], values:["Scientific rigour","Research depth","Academic intensity"],       category:"elite"},
  { id:"duke",       name:"Duke University",               loc:"Durham, NC",          type:"private", size:"medium", accept:0.058, sat25:1450, sat75:1570, act25:33, act75:36, gpa:3.93, ed_date:"Nov 1", ea_date:null,     rd_date:"Jan 2",  edBoost:1.85, tags:["Medicine","Policy","Business","Engineering","Basketball"],values:["Leadership","Service","Research"],                              category:"elite"},
  { id:"northwestern",name:"Northwestern University",     loc:"Evanston, IL",        type:"private", size:"large",  accept:0.065, sat25:1440, sat75:1560, act25:33, act75:35, gpa:3.92, ed_date:"Nov 1", ea_date:null,     rd_date:"Jan 2",  edBoost:1.8,  tags:["Journalism","Engineering","Theater","Music","Law"],     values:["Combination of arts and sciences","Depth + breadth"],           category:"elite"},
  { id:"jhu",        name:"Johns Hopkins University",      loc:"Baltimore, MD",       type:"private", size:"medium", accept:0.070, sat25:1480, sat75:1580, act25:34, act75:36, gpa:3.94, ed_date:"Nov 1", ea_date:null,     rd_date:"Jan 2",  edBoost:1.75, tags:["Medicine","Public Health","Engineering","International"],values:["Research intensity","Pre-med culture","Global focus"],          category:"elite"},
  { id:"vanderbilt", name:"Vanderbilt University",         loc:"Nashville, TN",       type:"private", size:"medium", accept:0.074, sat25:1470, sat75:1570, act25:34, act75:36, gpa:3.93, ed_date:"Nov 1", ea_date:null,     rd_date:"Jan 1",  edBoost:1.75, tags:["Medicine","Engineering","Music","Education","Business"],values:["Balance","Prestige","Collaborative campus"],                   category:"elite"},
  { id:"rice",       name:"Rice University",               loc:"Houston, TX",         type:"private", size:"small",  accept:0.096, sat25:1490, sat75:1580, act25:34, act75:36, gpa:3.93, ed_date:"Nov 1", ea_date:null,     rd_date:"Jan 1",  edBoost:1.7,  tags:["Engineering","Music","Architecture","Physics","Space"],  values:["Residential community","Research","Tight-knit culture"],        category:"elite"},
  { id:"wustl",      name:"WashU St. Louis",               loc:"St. Louis, MO",       type:"private", size:"medium", accept:0.132, sat25:1490, sat75:1580, act25:34, act75:36, gpa:3.93, ed_date:"Nov 1", ea_date:null,     rd_date:"Jan 2",  edBoost:1.65, tags:["Medicine","Engineering","Social Work","Architecture"],  values:["Academic rigour","Research","Generous aid"],                   category:"elite"},
  { id:"notre_dame", name:"Notre Dame",                    loc:"South Bend, IN",      type:"private", size:"large",  accept:0.126, sat25:1390, sat75:1540, act25:33, act75:35, gpa:3.92, ed_date:"Nov 1", ea_date:null,     rd_date:"Jan 1",  edBoost:1.6,  tags:["Law","Business","Engineering","Philosophy","Sports"],   values:["Community","Catholic mission","Service"],                       category:"elite"},
  { id:"emory",      name:"Emory University",              loc:"Atlanta, GA",         type:"private", size:"medium", accept:0.116, sat25:1380, sat75:1530, act25:32, act75:35, gpa:3.90, ed_date:"Nov 1", ea_date:null,     rd_date:"Jan 1",  edBoost:1.65, tags:["Medicine","Business","Public Health","Law"],            values:["Pre-health culture","Global health","Intellectual openness"],   category:"elite"},
  { id:"cmu",        name:"Carnegie Mellon",               loc:"Pittsburgh, PA",      type:"private", size:"medium", accept:0.113, sat25:1480, sat75:1580, act25:33, act75:36, gpa:3.93, ed_date:"Nov 1", ea_date:null,     rd_date:"Jan 1",  edBoost:1.6,  tags:["CS","Engineering","Drama","Business","Design"],         values:["Technical excellence","Creativity","Maker culture"],            category:"elite"},
  { id:"georgetown", name:"Georgetown University",         loc:"Washington, DC",      type:"private", size:"medium", accept:0.138, sat25:1380, sat75:1540, act25:31, act75:35, gpa:3.92, ed_date:"Nov 1", ea_date:null,     rd_date:"Jan 10", edBoost:1.55, tags:["International Relations","Law","Business","Medicine"],  values:["Service","Global affairs","Jesuit values"],                    category:"elite"},
  { id:"tufts",      name:"Tufts University",              loc:"Medford, MA",         type:"private", size:"medium", accept:0.109, sat25:1400, sat75:1550, act25:32, act75:35, gpa:3.91, ed_date:"Nov 1", ea_date:null,     rd_date:"Jan 1",  edBoost:1.65, tags:["International Relations","Engineering","Medicine","STEM"],values:["Global citizenship","Research","Active campus life"],          category:"elite"},
  { id:"usc",        name:"USC",                           loc:"Los Angeles, CA",     type:"private", size:"large",  accept:0.098, sat25:1400, sat75:1560, act25:32, act75:35, gpa:3.83, ed_date:"Nov 1", ea_date:null,     rd_date:"Jan 15", edBoost:1.55, tags:["Film","Engineering","Business","Architecture","Music"],  values:["Industry connections","LA network","Creative ambition"],        category:"elite"},
  { id:"nyu",        name:"NYU",                           loc:"New York, NY",        type:"private", size:"large",  accept:0.121, sat25:1370, sat75:1540, act25:31, act75:35, gpa:3.86, ed_date:"Nov 1", ea_date:null,     rd_date:"Jan 1",  edBoost:1.5,  tags:["Business (Stern)","Film","Arts","Law","Global Network"], values:["City engagement","Global campuses","Career focus"],            category:"elite"},
  { id:"northeastern",name:"Northeastern University",     loc:"Boston, MA",          type:"private", size:"large",  accept:0.068, sat25:1440, sat75:1560, act25:33, act75:35, gpa:3.93, ed_date:"Nov 1", ea_date:null,     rd_date:"Nov 1",  edBoost:1.7,  tags:["Co-op","Engineering","Business","Law","CS"],            values:["Experiential learning","Industry co-ops","Career outcomes"],   category:"elite"},
  { id:"boston_u",   name:"Boston University",            loc:"Boston, MA",          type:"private", size:"large",  accept:0.148, sat25:1340, sat75:1510, act25:31, act75:34, gpa:3.85, ed_date:"Nov 1", ea_date:null,     rd_date:"Jan 2",  edBoost:1.5,  tags:["Engineering","Business","Medicine","Law","Communications"],values:["Research output","Boston location","Diverse programs"],        category:"elite"},
  { id:"wake",       name:"Wake Forest University",       loc:"Winston-Salem, NC",   type:"private", size:"medium", accept:0.198, sat25:1330, sat75:1490, act25:30, act75:34, gpa:3.91, ed_date:"Nov 1", ea_date:null,     rd_date:"Jan 1",  edBoost:1.55, tags:["Business","Law","Medicine","Engineering"],              values:["Teaching focus","Community","Pro Humanitate"],                 category:"elite"},
  { id:"tulane",     name:"Tulane University",            loc:"New Orleans, LA",     type:"private", size:"medium", accept:0.116, sat25:1330, sat75:1510, act25:30, act75:34, gpa:3.80, ed_date:"Nov 1", ea_date:null,     rd_date:"Jan 15", edBoost:1.6,  tags:["Business","Public Health","Law","Architecture","Music"],values:["Vibrant culture","Community service","New Orleans"],           category:"elite"},
  { id:"case",       name:"Case Western Reserve",         loc:"Cleveland, OH",       type:"private", size:"medium", accept:0.273, sat25:1380, sat75:1530, act25:32, act75:35, gpa:3.86, ed_date:"Nov 1", ea_date:null,     rd_date:"Jan 15", edBoost:1.4,  tags:["Engineering","Medicine","Law","Management"],            values:["Research","STEM depth","Value for money"],                     category:"elite"},
  // ── Liberal Arts Colleges ──────────────────────────────────────────────
  { id:"williams",   name:"Williams College",             loc:"Williamstown, MA",    type:"private", size:"small",  accept:0.088, sat25:1430, sat75:1570, act25:33, act75:35, gpa:3.93, ed_date:"Nov 15",ea_date:null,     rd_date:"Jan 9",  edBoost:1.85, tags:["Economics","Mathematics","History","Sciences"],        values:["Intellectual intensity","Faculty access","Small community"],    category:"lac" },
  { id:"amherst",    name:"Amherst College",              loc:"Amherst, MA",         type:"private", size:"small",  accept:0.094, sat25:1440, sat75:1570, act25:33, act75:35, gpa:3.93, ed_date:"Nov 1", ea_date:null,     rd_date:"Jan 1",  edBoost:1.9,  tags:["Open Curriculum","Economics","Sciences"],               values:["Student-designed education","Intellectual freedom"],            category:"lac" },
  { id:"pomona",     name:"Pomona College",               loc:"Claremont, CA",       type:"private", size:"small",  accept:0.074, sat25:1430, sat75:1560, act25:33, act75:35, gpa:3.94, ed_date:"Nov 1", ea_date:null,     rd_date:"Jan 8",  edBoost:1.8,  tags:["Sciences","Economics","CS","Humanities"],               values:["Consortium access","California culture","Small class size"],    category:"lac" },
  { id:"swarthmore", name:"Swarthmore College",           loc:"Swarthmore, PA",      type:"private", size:"small",  accept:0.073, sat25:1450, sat75:1580, act25:33, act75:35, gpa:3.94, ed_date:"Nov 15",ea_date:null,     rd_date:"Jan 1",  edBoost:1.85, tags:["Engineering","Sciences","Humanities","Social Sciences"],values:["Intellectual rigour","Social justice","Quaker values"],         category:"lac" },
  { id:"bowdoin",    name:"Bowdoin College",              loc:"Brunswick, ME",       type:"private", size:"small",  accept:0.082, sat25:1400, sat75:1540, act25:32, act75:35, gpa:3.93, ed_date:"Nov 15",ea_date:null,     rd_date:"Jan 8",  edBoost:1.8,  tags:["Government","Economics","Environmental Studies","Biology"],values:["Outdoors","Community","Faculty mentorship"],                   category:"lac" },
  { id:"middlebury", name:"Middlebury College",           loc:"Middlebury, VT",      type:"private", size:"small",  accept:0.133, sat25:1360, sat75:1520, act25:31, act75:34, gpa:3.91, ed_date:"Nov 1", ea_date:null,     rd_date:"Jan 1",  edBoost:1.65, tags:["Languages","International Studies","Environmental","Film"],values:["Language immersion","Sustainability","Global outlook"],         category:"lac" },
  { id:"wesleyan",   name:"Wesleyan University",          loc:"Middletown, CT",      type:"private", size:"small",  accept:0.172, sat25:1360, sat75:1520, act25:31, act75:34, gpa:3.91, ed_date:"Nov 15",ea_date:null,     rd_date:"Jan 1",  edBoost:1.6,  tags:["Film","Sciences","Social Sciences","Music"],            values:["Creativity","Activism","Student empowerment"],                  category:"lac" },
  { id:"colby",      name:"Colby College",                loc:"Waterville, ME",      type:"private", size:"small",  accept:0.121, sat25:1340, sat75:1500, act25:30, act75:34, gpa:3.87, ed_date:"Nov 15",ea_date:null,     rd_date:"Jan 1",  edBoost:1.6,  tags:["Environmental Studies","Economics","Sciences","Government"],values:["Environmental mission","Campus community","Research"],         category:"lac" },
  { id:"colgate",    name:"Colgate University",           loc:"Hamilton, NY",        type:"private", size:"small",  accept:0.202, sat25:1340, sat75:1500, act25:31, act75:34, gpa:3.87, ed_date:"Nov 15",ea_date:null,     rd_date:"Jan 15", edBoost:1.55, tags:["Economics","Political Science","Psychology","Sciences"],values:["Alumni network","Athletic culture","Community bonds"],          category:"lac" },
  { id:"hamilton",   name:"Hamilton College",             loc:"Clinton, NY",         type:"private", size:"small",  accept:0.106, sat25:1360, sat75:1520, act25:31, act75:34, gpa:3.89, ed_date:"Nov 15",ea_date:null,     rd_date:"Jan 1",  edBoost:1.7,  tags:["Economics","Sciences","Humanities","Political Science"],values:["Writing-intensive curriculum","Faculty access","Debate"],       category:"lac" },
  // ── Top Publics ────────────────────────────────────────────────────────
  { id:"umich",      name:"University of Michigan",       loc:"Ann Arbor, MI",       type:"public",  size:"large",  accept:0.175, sat25:1360, sat75:1530, act25:32, act75:35, gpa:3.90, ed_date:null,    ea_date:"Nov 1",  rd_date:"Feb 1",  edBoost:1.0,  tags:["Engineering","Business (Ross)","Law","Medicine","CS"],  values:["School spirit","Research university","Wide program range"],    category:"public"},
  { id:"berkeley",   name:"UC Berkeley",                  loc:"Berkeley, CA",        type:"public",  size:"large",  accept:0.114, sat25:1290, sat75:1530, act25:28, act75:35, gpa:3.95, ed_date:null,    ea_date:null,     rd_date:"Nov 30", edBoost:1.0,  tags:["CS","Engineering","Business (Haas)","Law","Sciences"],  values:["Academic rigour","Research output","Bay Area network"],        category:"public"},
  { id:"ucla",       name:"UCLA",                         loc:"Los Angeles, CA",     type:"public",  size:"large",  accept:0.101, sat25:1290, sat75:1530, act25:28, act75:35, gpa:3.96, ed_date:null,    ea_date:null,     rd_date:"Nov 30", edBoost:1.0,  tags:["Film","Engineering","Medicine","Psychology","Business"],  values:["LA network","Research prestige","Diverse campus"],             category:"public"},
  { id:"uva",        name:"University of Virginia",       loc:"Charlottesville, VA", type:"public",  size:"large",  accept:0.206, sat25:1350, sat75:1520, act25:31, act75:35, gpa:3.90, ed_date:"Nov 1", ea_date:null,     rd_date:"Jan 1",  edBoost:1.75, tags:["Business (McIntire)","Law","Engineering","Politics"],   values:["Honor code","Historic campus","Strong alumni network"],        category:"public"},
  { id:"unc",        name:"UNC Chapel Hill",              loc:"Chapel Hill, NC",     type:"public",  size:"large",  accept:0.195, sat25:1310, sat75:1490, act25:30, act75:34, gpa:3.93, ed_date:null,    ea_date:"Oct 15", rd_date:"Jan 15", edBoost:1.0,  tags:["Journalism","Business","Medicine","Public Policy","Law"],values:["Research","Collaborative spirit","Carolina community"],        category:"public"},
  { id:"gatech",     name:"Georgia Tech",                 loc:"Atlanta, GA",         type:"public",  size:"large",  accept:0.176, sat25:1400, sat75:1540, act25:32, act75:35, gpa:3.93, ed_date:null,    ea_date:"Oct 15", rd_date:"Jan 1",  edBoost:1.0,  tags:["Engineering","CS","Architecture","Management","AI"],    values:["Technical rigor","Co-op","Industry readiness"],               category:"public"},
  { id:"uiuc",       name:"UIUC",                         loc:"Champaign, IL",       type:"public",  size:"large",  accept:0.448, sat25:1270, sat75:1500, act25:28, act75:34, gpa:3.88, ed_date:null,    ea_date:null,     rd_date:"Nov 1",  edBoost:1.0,  tags:["Engineering","CS","Business (Gies)","Agriculture"],     values:["CS powerhouse","Research","Industry pipeline"],               category:"public"},
  { id:"wisc",       name:"UW Madison",                   loc:"Madison, WI",         type:"public",  size:"large",  accept:0.493, sat25:1310, sat75:1470, act25:27, act75:32, gpa:3.86, ed_date:null,    ea_date:null,     rd_date:"Feb 1",  edBoost:1.0,  tags:["Engineering","Business","Sciences","Journalism"],       values:["Research leadership","Inclusive culture","Madison city life"], category:"public"},
  { id:"uf",         name:"University of Florida",        loc:"Gainesville, FL",     type:"public",  size:"large",  accept:0.285, sat25:1310, sat75:1470, act25:29, act75:33, gpa:3.96, ed_date:null,    ea_date:"Nov 1",  rd_date:"Nov 1",  edBoost:1.0,  tags:["Business","Engineering","Agriculture","Law","Medicine"],values:["Value","Research","Gator pride"],                             category:"public"},
  { id:"utaustin",   name:"UT Austin",                    loc:"Austin, TX",          type:"public",  size:"large",  accept:0.283, sat25:1190, sat75:1450, act25:26, act75:33, gpa:3.77, ed_date:null,    ea_date:null,     rd_date:"Dec 1",  edBoost:1.0,  tags:["Business (McCombs)","Engineering","Law","Film","CS"],   values:["Texas network","Austin ecosystem","Entrepreneurship"],         category:"public"},
  { id:"purdue",     name:"Purdue University",            loc:"West Lafayette, IN",  type:"public",  size:"large",  accept:0.534, sat25:1170, sat75:1400, act25:25, act75:32, gpa:3.77, ed_date:null,    ea_date:null,     rd_date:"Feb 1",  edBoost:1.0,  tags:["Engineering","Agriculture","Aviation","CS","Pharma"],   values:["Engineering excellence","Co-op","Value for money"],           category:"public"},
  // ── UK / Ireland / Canada ──────────────────────────────────────────────
  { id:"oxford",     name:"University of Oxford",         loc:"Oxford, UK",          type:"private", size:"medium", accept:0.143, sat25:0,    sat75:0,    act25:0,  act75:0,  gpa:3.95, ed_date:null,    ea_date:null,     rd_date:"Oct 15", edBoost:1.0,  tags:["PPE","Medicine","Law","Sciences","History","Maths"],    values:["Specialist knowledge","Tutorial system","Academic rigour"],    category:"intl" },
  { id:"cambridge",  name:"University of Cambridge",      loc:"Cambridge, UK",       type:"private", size:"medium", accept:0.158, sat25:0,    sat75:0,    act25:0,  act75:0,  gpa:3.95, ed_date:null,    ea_date:null,     rd_date:"Oct 15", edBoost:1.0,  tags:["Natural Sciences","Mathematics","Engineering","Law"],   values:["Research depth","Supervision system","STEM excellence"],       category:"intl" },
  { id:"imperial",   name:"Imperial College London",      loc:"London, UK",          type:"private", size:"medium", accept:0.143, sat25:0,    sat75:0,    act25:0,  act75:0,  gpa:3.90, ed_date:null,    ea_date:null,     rd_date:"Jan 15", edBoost:1.0,  tags:["Engineering","Medicine","CS","Business","Sciences"],    values:["STEM focus","London location","Industry links"],               category:"intl" },
  { id:"lse",        name:"LSE",                          loc:"London, UK",          type:"private", size:"medium", accept:0.160, sat25:0,    sat75:0,    act25:0,  act75:0,  gpa:3.88, ed_date:null,    ea_date:null,     rd_date:"Jan 15", edBoost:1.0,  tags:["Economics","Law","Politics","Sociology","Finance"],     values:["Social sciences dominance","London finance","Global network"],  category:"intl" },
  { id:"edinburgh",  name:"University of Edinburgh",      loc:"Edinburgh, UK",       type:"public",  size:"large",  accept:0.385, sat25:0,    sat75:0,    act25:0,  act75:0,  gpa:3.75, ed_date:null,    ea_date:null,     rd_date:"Jan 15", edBoost:1.0,  tags:["Medicine","Law","Sciences","Arts","Veterinary"],        values:["Historic campus","Research","Scottish culture"],               category:"intl" },
  { id:"utoronto",   name:"University of Toronto",        loc:"Toronto, Canada",     type:"public",  size:"large",  accept:0.430, sat25:0,    sat75:0,    act25:0,  act75:0,  gpa:3.70, ed_date:null,    ea_date:null,     rd_date:"Jan 15", edBoost:1.0,  tags:["CS","Business","Medicine","Law","Engineering"],         values:["Research output","Diverse city","World-class faculty"],        category:"intl" },
  { id:"mcgill",     name:"McGill University",            loc:"Montreal, Canada",    type:"public",  size:"large",  accept:0.420, sat25:0,    sat75:0,    act25:0,  act75:0,  gpa:3.70, ed_date:null,    ea_date:null,     rd_date:"Jan 15", edBoost:1.0,  tags:["Medicine","Law","Engineering","Business","Sciences"],   values:["Bilingual city","Research","Affordable tuition"],             category:"intl" },
  { id:"tcd",        name:"Trinity College Dublin",       loc:"Dublin, Ireland",     type:"public",  size:"medium", accept:0.380, sat25:0,    sat75:0,    act25:0,  act75:0,  gpa:3.65, ed_date:null,    ea_date:null,     rd_date:"Feb 1",  edBoost:1.0,  tags:["Medicine","Law","Engineering","Arts","Sciences"],       values:["Historic institution","EU access","Vibrant Dublin"],          category:"intl" },
];

// ── Types ──────────────────────────────────────────────────────────────────
type ECTier = "national" | "regional" | "local";
type EC = { name: string; tier: ECTier; leadership: boolean };
type Profile = {
  gpa: string; gpaWeighted: string;
  satErw: string; satMath: string;
  act: string; testChoice: "sat" | "act" | "none";
  aps: string; avgApScore: string;
  ecs: EC[];
  awards: "none" | "regional" | "national" | "international";
  firstGen: boolean; intl: boolean;
  legacyIds: string[];
  major: string;
};

type FactorRating = { score: number; label: string; arrow: "▲" | "→" | "▼" };
type Breakdown = { test: FactorRating; gpa: FactorRating; ecs: FactorRating; awards: FactorRating };
type CollegeResult = { college: College; chance: number; edChance: number; category: "safety"|"match"|"reach"|"far-reach"; breakdown: Breakdown };

// ── Chance engine ──────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) { return a + (b - a) * Math.max(0, Math.min(1, t)); }

function satComposite(erw: string, math: string) { return (parseInt(erw)||0) + (parseInt(math)||0); }

function testPct(p: Profile, c: College): number {
  if (c.sat25 === 0) return 0.62;
  if (p.testChoice === "none") return 0.38;
  if (p.testChoice === "sat") {
    const sat = satComposite(p.satErw, p.satMath);
    if (!sat) return 0.38;
    const mid = (c.sat25 + c.sat75) / 2;
    if (sat < c.sat25 - 80) return 0.08;
    if (sat < c.sat25)      return lerp(0.08, 0.28, (sat-(c.sat25-80))/80);
    if (sat < mid)          return lerp(0.28, 0.55, (sat-c.sat25)/(mid-c.sat25));
    if (sat < c.sat75)      return lerp(0.55, 0.78, (sat-mid)/(c.sat75-mid));
    if (sat < c.sat75+60)   return lerp(0.78, 0.93, (sat-c.sat75)/60);
    return 0.93;
  }
  const act = parseInt(p.act)||0;
  if (!act) return 0.38;
  if (act < c.act25-2) return 0.08;
  if (act < c.act25)   return lerp(0.08, 0.28, (act-(c.act25-2))/2);
  const mid = (c.act25+c.act75)/2;
  if (act < mid)       return lerp(0.28, 0.55, (act-c.act25)/(mid-c.act25));
  if (act < c.act75)   return lerp(0.55, 0.78, (act-mid)/(c.act75-mid));
  return lerp(0.78, 0.93, Math.min(act-c.act75, 2)/2);
}

function gpaPct(p: Profile, c: College): number {
  const g = parseFloat(p.gpa); if (isNaN(g)) return 0.45;
  const d = g - c.gpa;
  if (d >= 0.15) return 0.93; if (d >= 0.05) return 0.80; if (d >= 0) return 0.68;
  if (d >= -0.10) return 0.52; if (d >= -0.20) return 0.36; if (d >= -0.30) return 0.22;
  return 0.10;
}

function ecPct(ecs: EC[]): number {
  if (!ecs.length) return 0.18;
  let s = 0;
  for (const ec of ecs) { s += ec.tier==="national"?0.28:ec.tier==="regional"?0.16:0.08; if(ec.leadership) s+=0.06; }
  return Math.min(s, 0.93);
}

function awardPct(a: Profile["awards"]): number {
  return { none:0.28, regional:0.55, national:0.80, international:0.95 }[a];
}

function rate<T extends number>(score: T): FactorRating {
  const label = score > 0.70 ? "Strong" : score > 0.45 ? "Solid" : "Needs work";
  const arrow = score > 0.70 ? "▲" : score > 0.45 ? "→" : "▼" as const;
  return { score, label, arrow };
}

function computeResult(p: Profile, c: College): CollegeResult {
  const tp = testPct(p, c), gp = gpaPct(p, c), ep = ecPct(p.ecs), ap = awardPct(p.awards);
  const apB = Math.min((parseInt(p.aps)||0)/10*0.12 + (parseFloat(p.avgApScore)||3-3)/2*0.06, 0.18);
  let h = 0.38*tp + 0.32*gp + 0.18*ep + 0.12*ap + apB;
  if (p.firstGen) h += 0.04;
  if (p.legacyIds.includes(c.id)) h += 0.10;
  if (p.intl && c.accept < 0.15) h -= 0.06;
  h = Math.min(h, 0.96);
  const r = c.accept;
  const mult = r<0.05?1.05:r<0.08?1.35:r<0.12?1.80:r<0.18?2.30:r<0.30?2.80:r<0.50?3.40:4.20;
  const chance = Math.min(r * mult * h, 0.91);
  const edChance = c.ed_date ? Math.min(chance * c.edBoost, 0.92) : chance;
  const cat = chance>=0.55?"safety":chance>=0.25?"match":chance>=0.08?"reach":"far-reach";
  return { college:c, chance, edChance, category:cat, breakdown:{ test:rate(tp), gpa:rate(gp), ecs:rate(ep), awards:rate(ap) } };
}

// ── Days until deadline ─────────────────────────────────────────────────────
function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const [month, day] = dateStr.split(" ");
  const months: Record<string,number> = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
  const now = new Date();
  let target = new Date(now.getFullYear(), months[month], parseInt(day));
  if (target < now) target = new Date(now.getFullYear()+1, months[month], parseInt(day));
  return Math.ceil((target.getTime()-now.getTime())/86400000);
}

// ── Colors ─────────────────────────────────────────────────────────────────
const CAT_COLOR: Record<string,string> = { safety:"#2d7a3c", match:"#1a6091", reach:"#c97a1a", "far-reach":"#c44b2a" };
const CAT_LABEL: Record<string,string> = { safety:"Safety", match:"Match", reach:"Reach", "far-reach":"Far Reach" };

// ── Empty profile ──────────────────────────────────────────────────────────
const BLANK: Profile = { gpa:"", gpaWeighted:"", satErw:"", satMath:"", act:"", testChoice:"sat", aps:"", avgApScore:"", ecs:[], awards:"none", firstGen:false, intl:false, legacyIds:[], major:"" };

const CATEGORY_FILTERS = [
  { id:"all",    label:"All schools" },
  { id:"ivy",    label:"Ivy League" },
  { id:"elite",  label:"Elite privates" },
  { id:"lac",    label:"Liberal Arts" },
  { id:"public", label:"Top Publics" },
  { id:"intl",   label:"UK / Canada" },
];

const RATE_FILTERS = [
  { id:"all",    label:"Any rate",      min:0,    max:1    },
  { id:"ultra",  label:"< 8%",          min:0,    max:0.08 },
  { id:"highly", label:"8 – 20%",       min:0.08, max:0.20 },
  { id:"select", label:"20 – 40%",      min:0.20, max:0.40 },
  { id:"open",   label:"> 40%",         min:0.40, max:1    },
];

export default function AdmissionsPage() {
  const [phase, setPhase] = useState<"profile"|"explorer"|"list">("profile");
  const [step, setStep]   = useState(0);
  const [profile, setProfile] = useState<Profile>(BLANK);
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [selected, setSelected]   = useState<string | null>(null);
  const [ecName, setEcName] = useState(""); const [ecTier, setEcTier] = useState<ECTier>("local"); const [ecLead, setEcLead] = useState(false);
  const [legacyQ, setLegacyQ] = useState("");
  const [search, setSearch]   = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [rateFilter, setRateFilter] = useState("all");
  const [analysis, setAnalysis] = useState<{strategy:string;gaps:string[];essayAngles:string[];timeline:string[]}|null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  function set<K extends keyof Profile>(k: K, v: Profile[K]) { setProfile(p => ({ ...p, [k]: v })); }
  function addEc() {
    if (!ecName.trim()) return;
    set("ecs", [...profile.ecs, { name:ecName.trim(), tier:ecTier, leadership:ecLead }]);
    setEcName(""); setEcTier("local"); setEcLead(false);
  }

  const results = useMemo(() => {
    const map: Record<string, CollegeResult> = {};
    for (const c of COLLEGES) map[c.id] = computeResult(profile, c);
    return map;
  }, [profile]);

  const filtered = useMemo(() => {
    const rateF = RATE_FILTERS.find(r => r.id === rateFilter)!;
    return COLLEGES.filter(c => {
      if (catFilter !== "all" && c.category !== catFilter) return false;
      if (c.accept < rateF.min || c.accept > rateF.max) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.loc.toLowerCase().includes(q) || c.tags.some(t => t.toLowerCase().includes(q));
    });
  }, [catFilter, rateFilter, search]);

  const shortlistResults = useMemo(() => shortlist.map(id => results[id]).filter(Boolean).sort((a,b)=>b.chance-a.chance), [shortlist, results]);

  const listHealth = useMemo(() => {
    const cats = shortlistResults.map(r => r.category);
    const safety = cats.filter(c=>c==="safety").length;
    const match  = cats.filter(c=>c==="match").length;
    const reach  = cats.filter(c=>c==="reach").length;
    const far    = cats.filter(c=>c==="far-reach").length;
    if (!shortlist.length) return { label:"No schools added yet", color:"var(--ink-3)" };
    if (shortlist.length < 4) return { label:"Add more schools for a balanced list", color:"#c97a1a" };
    if (safety < 1) return { label:"Needs a safety school", color:"#c44b2a" };
    if (far > 3 && match < 2) return { label:"Too reach-heavy — add more matches", color:"#c44b2a" };
    if (safety > 4) return { label:"Too conservative — add some reaches", color:"#c97a1a" };
    return { label:`Well-balanced · ${safety} Safety · ${match} Match · ${reach} Reach · ${far} Far Reach`, color:"#2d7a3c" };
  }, [shortlist, shortlistResults]);

  const selectedResult = selected ? results[selected] : null;
  const selectedCollege = selected ? COLLEGES.find(c=>c.id===selected) : null;

  const toggleShortlist = useCallback((id: string) => {
    setShortlist(s => s.includes(id) ? s.filter(x=>x!==id) : [...s, id]);
  }, []);

  async function getAIAnalysis() {
    setLoadingAI(true); setAnalysis(null);
    try {
      const top5 = shortlistResults.slice(0,5).map(r=>r.college.name);
      const res = await callAI({ tool:"admissions", profile, topColleges:top5 });
      const data = await res.json();
      if (res.ok && data.strategy) setAnalysis(data);
    } catch {}
    setLoadingAI(false);
  }

  const step0Valid = profile.gpa.trim() !== "";

  // ── PROFILE PHASE ──────────────────────────────────────────────────────
  if (phase === "profile") return (
    <TierGate requires="pro">
      <div>
        <header className="mob-hp" style={{ padding:"20px 44px", borderBottom:"1px solid var(--ink)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div className="mono" style={{ color:"var(--ink-3)" }}>Admissions Engine</div>
          <div className="mono" style={{ color:"var(--ink-3)" }}>Step {step+1} of 2 · Profile setup</div>
        </header>
        <main className="mob-p" style={{ padding:"40px 44px 80px", maxWidth:680, margin:"0 auto" }}>
          <div style={{ height:3, background:"var(--paper-2)", border:"1px solid var(--rule)", marginBottom:40 }}>
            <div style={{ height:"100%", width:`${(step+1)/2*100}%`, background:"var(--cinnabar)", transition:"width 400ms" }} />
          </div>

          {step === 0 && (
            <div>
              <div className="mono cin" style={{ marginBottom:8 }}>Step 01 · Academic record</div>
              <h2 style={{ fontFamily:"var(--serif)", fontSize:30, fontWeight:500, fontStyle:"italic", letterSpacing:"-0.015em", margin:"0 0 28px" }}>Your grades and test scores.</h2>

              <div style={{ marginBottom:16 }}>
                <div className="mono" style={{ color:"var(--ink-3)", marginBottom:6 }}>Unweighted GPA (0–4.0) *</div>
                <input type="number" min="0" max="4.0" step="0.01" value={profile.gpa} onChange={e=>set("gpa",e.target.value)} placeholder="3.85"
                  style={{ width:"100%", fontFamily:"var(--sans)", fontSize:20, border:"1px solid var(--ink)", background:"var(--paper)", padding:"12px 14px", color:"var(--ink)", boxSizing:"border-box" }} />
              </div>
              <div style={{ marginBottom:20 }}>
                <div className="mono" style={{ color:"var(--ink-3)", marginBottom:6 }}>Weighted GPA (optional)</div>
                <input type="number" min="0" max="5.5" step="0.01" value={profile.gpaWeighted} onChange={e=>set("gpaWeighted",e.target.value)} placeholder="4.3"
                  style={{ width:"100%", fontFamily:"var(--sans)", fontSize:20, border:"1px solid var(--ink)", background:"var(--paper)", padding:"12px 14px", color:"var(--ink)", boxSizing:"border-box" }} />
              </div>

              <div style={{ border:"1px solid var(--ink)", display:"flex", marginBottom:16 }}>
                {(["sat","act","none"] as const).map((opt,i)=>(
                  <button key={opt} onClick={()=>set("testChoice",opt)}
                    style={{ flex:1, padding:"11px", fontFamily:"var(--mono)", fontSize:10, background:profile.testChoice===opt?"var(--ink)":"var(--paper)", color:profile.testChoice===opt?"var(--paper)":"var(--ink)", border:"none", borderRight:i<2?"1px solid var(--ink)":"none", cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.06em" }}>
                    {opt==="none"?"Not submitting":opt.toUpperCase()}
                  </button>
                ))}
              </div>

              {profile.testChoice==="sat" && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
                  <div>
                    <div className="mono" style={{ color:"var(--ink-3)", marginBottom:6 }}>SAT Reading & Writing</div>
                    <input type="number" min="200" max="800" value={profile.satErw} onChange={e=>set("satErw",e.target.value)} placeholder="720"
                      style={{ width:"100%", fontFamily:"var(--sans)", fontSize:16, border:"1px solid var(--ink)", background:"var(--paper)", padding:"10px 12px", color:"var(--ink)", boxSizing:"border-box" }} />
                  </div>
                  <div>
                    <div className="mono" style={{ color:"var(--ink-3)", marginBottom:6 }}>SAT Math</div>
                    <input type="number" min="200" max="800" value={profile.satMath} onChange={e=>set("satMath",e.target.value)} placeholder="780"
                      style={{ width:"100%", fontFamily:"var(--sans)", fontSize:16, border:"1px solid var(--ink)", background:"var(--paper)", padding:"10px 12px", color:"var(--ink)", boxSizing:"border-box" }} />
                  </div>
                  {profile.satErw && profile.satMath && <div style={{ gridColumn:"1/-1" }}><span className="mono cin">Composite: {satComposite(profile.satErw,profile.satMath)}</span></div>}
                </div>
              )}
              {profile.testChoice==="act" && (
                <div style={{ marginBottom:16 }}>
                  <div className="mono" style={{ color:"var(--ink-3)", marginBottom:6 }}>ACT Composite (1–36)</div>
                  <input type="number" min="1" max="36" value={profile.act} onChange={e=>set("act",e.target.value)} placeholder="34"
                    style={{ width:"100%", fontFamily:"var(--sans)", fontSize:16, border:"1px solid var(--ink)", background:"var(--paper)", padding:"10px 12px", color:"var(--ink)", boxSizing:"border-box" }} />
                </div>
              )}

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:28 }}>
                <div>
                  <div className="mono" style={{ color:"var(--ink-3)", marginBottom:6 }}>AP / IB courses</div>
                  <input type="number" min="0" max="20" value={profile.aps} onChange={e=>set("aps",e.target.value)} placeholder="6"
                    style={{ width:"100%", fontFamily:"var(--sans)", fontSize:16, border:"1px solid var(--ink)", background:"var(--paper)", padding:"10px 12px", color:"var(--ink)", boxSizing:"border-box" }} />
                </div>
                <div>
                  <div className="mono" style={{ color:"var(--ink-3)", marginBottom:6 }}>Avg AP / IB score</div>
                  <input type="number" min="1" max="7" step="0.1" value={profile.avgApScore} onChange={e=>set("avgApScore",e.target.value)} placeholder="4.2"
                    style={{ width:"100%", fontFamily:"var(--sans)", fontSize:16, border:"1px solid var(--ink)", background:"var(--paper)", padding:"10px 12px", color:"var(--ink)", boxSizing:"border-box" }} />
                </div>
              </div>
              <button className="btn" onClick={()=>setStep(1)} disabled={!step0Valid} style={{ width:"100%", opacity:step0Valid?1:0.4 }}>Next: Activities & profile →</button>
            </div>
          )}

          {step === 1 && (
            <div>
              <div className="mono cin" style={{ marginBottom:8 }}>Step 02 · Activities & profile</div>
              <h2 style={{ fontFamily:"var(--serif)", fontSize:30, fontWeight:500, fontStyle:"italic", letterSpacing:"-0.015em", margin:"0 0 28px" }}>Who you are beyond class.</h2>

              {profile.ecs.length > 0 && (
                <div style={{ border:"1px solid var(--ink)", marginBottom:14 }}>
                  {profile.ecs.map((ec,i)=>(
                    <div key={i} style={{ padding:"11px 16px", borderBottom:i<profile.ecs.length-1?"1px solid var(--rule)":"none", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div>
                        <div style={{ fontFamily:"var(--sans)", fontSize:13, fontWeight:600 }}>{ec.name}</div>
                        <div className="mono" style={{ color:"var(--ink-3)", fontSize:9, marginTop:2 }}>{ec.tier==="national"?"National / Intl":ec.tier==="regional"?"Regional / State":"School / Local"}{ec.leadership?" · Leadership":""}</div>
                      </div>
                      <button onClick={()=>set("ecs",profile.ecs.filter((_,j)=>j!==i))} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--ink-3)", fontFamily:"var(--mono)", fontSize:11 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ border:"1px solid var(--ink)", padding:"16px", marginBottom:20 }}>
                <div className="mono" style={{ color:"var(--ink-3)", marginBottom:8 }}>Add extracurricular</div>
                <input value={ecName} onChange={e=>setEcName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addEc()} placeholder="Math Olympiad, Debate, Robotics, Student Gov…"
                  style={{ width:"100%", fontFamily:"var(--sans)", fontSize:13, border:"1px solid var(--ink)", background:"var(--paper)", padding:"9px 12px", color:"var(--ink)", boxSizing:"border-box", marginBottom:8 }} />
                <div style={{ display:"grid", gridTemplateColumns:"1fr auto auto", gap:8, alignItems:"center" }}>
                  <select value={ecTier} onChange={e=>setEcTier(e.target.value as ECTier)}
                    style={{ fontFamily:"var(--mono)", fontSize:10, border:"1px solid var(--ink)", background:"var(--paper)", padding:"8px", color:"var(--ink)" }}>
                    <option value="national">National / International level</option>
                    <option value="regional">Regional / State level</option>
                    <option value="local">School / Local level</option>
                  </select>
                  <label style={{ fontFamily:"var(--mono)", fontSize:10, display:"flex", gap:5, alignItems:"center", cursor:"pointer", whiteSpace:"nowrap" }}>
                    <input type="checkbox" checked={ecLead} onChange={e=>setEcLead(e.target.checked)} /> Leadership
                  </label>
                  <button className="btn" onClick={addEc} disabled={!ecName.trim()} style={{ padding:"8px 14px", opacity:ecName.trim()?1:0.4 }}>Add</button>
                </div>
              </div>

              <div style={{ marginBottom:18 }}>
                <div className="mono" style={{ color:"var(--ink-3)", marginBottom:8 }}>Highest award / recognition</div>
                <div style={{ border:"1px solid var(--ink)" }}>
                  {([["none","None","No major awards"],["regional","Regional / State","District-level competition, state honours"],["national","National","National olympiad, merit scholar, published research"],["international","International","IMO, IOI, USABO, global competitions"]] as const).map(([v,l,s],i,arr)=>(
                    <button key={v} onClick={()=>set("awards",v)}
                      style={{ display:"flex", width:"100%", padding:"12px 16px", background:profile.awards===v?"var(--ink)":"var(--paper)", color:profile.awards===v?"var(--paper)":"var(--ink)", border:"none", borderBottom:i<arr.length-1?"1px solid var(--rule)":"none", cursor:"pointer", textAlign:"left", gap:12, alignItems:"center" }}>
                      <div style={{ width:12, height:12, borderRadius:"50%", border:profile.awards===v?"none":"2px solid var(--rule)", background:profile.awards===v?"var(--cinnabar)":"transparent", flexShrink:0 }} />
                      <div>
                        <div style={{ fontFamily:"var(--sans)", fontSize:13, fontWeight:600 }}>{l}</div>
                        <div style={{ fontFamily:"var(--sans)", fontSize:11, opacity:0.6, marginTop:1 }}>{s}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom:16 }}>
                <div className="mono" style={{ color:"var(--ink-3)", marginBottom:8 }}>Intended major / field</div>
                <input value={profile.major} onChange={e=>set("major",e.target.value)} placeholder="Computer Science, Medicine, Economics, Film…"
                  style={{ width:"100%", fontFamily:"var(--sans)", fontSize:13, border:"1px solid var(--ink)", background:"var(--paper)", padding:"9px 12px", color:"var(--ink)", boxSizing:"border-box" }} />
              </div>

              <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
                {[["firstGen","First-generation college student"],["intl","International student"]].map(([k,l])=>(
                  <label key={k} style={{ display:"flex", gap:8, alignItems:"center", fontFamily:"var(--sans)", fontSize:13, cursor:"pointer", border:"1px solid var(--ink)", padding:"9px 14px" }}>
                    <input type="checkbox" checked={profile[k as keyof Profile] as boolean} onChange={e=>set(k as keyof Profile, e.target.checked as never)} />{l}
                  </label>
                ))}
              </div>

              <div style={{ marginBottom:28 }}>
                <div className="mono" style={{ color:"var(--ink-3)", marginBottom:6 }}>Legacy schools (parent / sibling attended)</div>
                <input value={legacyQ} onChange={e=>setLegacyQ(e.target.value)} placeholder="Search…"
                  style={{ width:"100%", fontFamily:"var(--sans)", fontSize:13, border:"1px solid var(--ink)", background:"var(--paper)", padding:"9px 12px", color:"var(--ink)", boxSizing:"border-box", marginBottom:4 }} />
                {legacyQ && (
                  <div style={{ border:"1px solid var(--rule)", maxHeight:130, overflowY:"auto" }}>
                    {COLLEGES.filter(c=>c.name.toLowerCase().includes(legacyQ.toLowerCase())).slice(0,5).map(c=>(
                      <button key={c.id} onClick={()=>{if(!profile.legacyIds.includes(c.id))set("legacyIds",[...profile.legacyIds,c.id]);setLegacyQ("");}}
                        style={{ display:"block", width:"100%", padding:"8px 12px", background:"none", border:"none", borderBottom:"1px solid var(--rule)", cursor:"pointer", textAlign:"left", fontFamily:"var(--sans)", fontSize:13 }}>{c.name}</button>
                    ))}
                  </div>
                )}
                {profile.legacyIds.length>0 && (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:5 }}>
                    {profile.legacyIds.map(id=>{const c=COLLEGES.find(x=>x.id===id);return c?(<span key={id} style={{ fontFamily:"var(--mono)", fontSize:9, padding:"3px 8px", border:"1px solid var(--cinnabar-ink)", color:"var(--cinnabar-ink)" }}>{c.name} <button onClick={()=>set("legacyIds",profile.legacyIds.filter(x=>x!==id))} style={{ background:"none", border:"none", cursor:"pointer", color:"inherit", padding:0 }}>✕</button></span>):null;})}
                  </div>
                )}
              </div>

              <div style={{ display:"flex", gap:10 }}>
                <button className="btn ghost" onClick={()=>setStep(0)} style={{ flex:1 }}>← Back</button>
                <button className="btn" onClick={()=>setPhase("explorer")} style={{ flex:2 }}>Build my college list →</button>
              </div>
            </div>
          )}

          <div style={{ marginTop:60, borderTop:"1px solid var(--ink)", paddingTop:20, display:"flex", justifyContent:"space-between" }}>
            <Link href="/dashboard" className="mono" style={{ color:"var(--ink-3)" }}>← Dashboard</Link>
            <div className="mono" style={{ color:"var(--ink-3)" }}>Ledger.</div>
          </div>
        </main>
      </div>
    </TierGate>
  );

  // ── EXPLORER PHASE ─────────────────────────────────────────────────────
  if (phase === "explorer") return (
    <TierGate requires="pro">
      <div style={{ display:"flex", flexDirection:"column", height:"100vh" }}>
        {/* Header */}
        <div style={{ padding:"14px 24px", borderBottom:"1px solid var(--ink)", display:"flex", gap:16, alignItems:"center", flexShrink:0, flexWrap:"wrap" }}>
          <div className="mono" style={{ color:"var(--ink-3)", flexShrink:0 }}>School Explorer</div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search school, city, or program (e.g. Engineering, London, CS)…"
            style={{ flex:1, minWidth:200, fontFamily:"var(--sans)", fontSize:13, border:"1px solid var(--ink)", background:"var(--paper)", padding:"8px 12px", color:"var(--ink)" }} />
          <div style={{ display:"flex", gap:0, border:"1px solid var(--rule)", flexShrink:0 }}>
            {CATEGORY_FILTERS.map((f,i)=>(
              <button key={f.id} onClick={()=>setCatFilter(f.id)}
                style={{ padding:"7px 12px", fontFamily:"var(--mono)", fontSize:9, background:catFilter===f.id?"var(--ink)":"transparent", color:catFilter===f.id?"var(--paper)":"var(--ink-3)", border:"none", borderRight:i<CATEGORY_FILTERS.length-1?"1px solid var(--rule)":"none", cursor:"pointer", whiteSpace:"nowrap", letterSpacing:"0.04em" }}>
                {f.label}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", gap:0, border:"1px solid var(--rule)", flexShrink:0 }}>
            {RATE_FILTERS.map((f,i)=>(
              <button key={f.id} onClick={()=>setRateFilter(f.id)}
                style={{ padding:"7px 10px", fontFamily:"var(--mono)", fontSize:9, background:rateFilter===f.id?"var(--ink)":"transparent", color:rateFilter===f.id?"var(--paper)":"var(--ink-3)", border:"none", borderRight:i<RATE_FILTERS.length-1?"1px solid var(--rule)":"none", cursor:"pointer", whiteSpace:"nowrap" }}>
                {f.label}
              </button>
            ))}
          </div>
          <button className="btn" onClick={()=>setPhase("list")} style={{ flexShrink:0, position:"relative" }}>
            My List{shortlist.length>0?` (${shortlist.length})`:""} →
          </button>
        </div>

        {/* Body: cards + detail */}
        <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
          {/* School cards */}
          <div style={{ flex:1, overflowY:"auto", borderRight:"1px solid var(--ink)" }}>
            {filtered.length === 0 && (
              <div style={{ padding:"60px 24px", textAlign:"center", fontFamily:"var(--sans)", fontSize:14, color:"var(--ink-3)" }}>No schools match your filters.</div>
            )}
            {filtered.map(c => {
              const r = results[c.id];
              const inList = shortlist.includes(c.id);
              const isSelected = selected === c.id;
              return (
                <div key={c.id} onClick={()=>setSelected(c.id)}
                  style={{ padding:"14px 20px", borderBottom:"1px solid var(--rule)", cursor:"pointer", background:isSelected?"var(--paper-2)":"var(--paper)", display:"flex", gap:16, alignItems:"center" }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"baseline", gap:8, flexWrap:"wrap" }}>
                      <span style={{ fontFamily:"var(--serif)", fontSize:15, fontWeight:600 }}>{c.name}</span>
                      <span className="mono" style={{ color:"var(--ink-3)", fontSize:9 }}>{c.loc}</span>
                    </div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:5 }}>
                      {c.tags.slice(0,3).map(t=>(<span key={t} style={{ fontFamily:"var(--mono)", fontSize:8, padding:"2px 6px", border:"1px solid var(--rule)", color:"var(--ink-3)", textTransform:"uppercase" }}>{t}</span>))}
                      {c.ed_date && <span style={{ fontFamily:"var(--mono)", fontSize:8, padding:"2px 6px", background:"var(--ink)", color:"var(--paper)" }}>ED</span>}
                    </div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontFamily:"var(--serif)", fontSize:22, fontWeight:700, color:CAT_COLOR[r.category] }}>{Math.round(r.chance*100)}%</div>
                    <div className="mono" style={{ color:"var(--ink-3)", fontSize:8 }}>Admit: {Math.round(c.accept*100)}%</div>
                  </div>
                  <button onClick={e=>{e.stopPropagation();toggleShortlist(c.id);}}
                    style={{ width:28, height:28, border:"1px solid var(--ink)", background:inList?"var(--ink)":"var(--paper)", color:inList?"var(--paper)":"var(--ink)", cursor:"pointer", fontFamily:"var(--mono)", fontSize:14, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {inList?"✓":"+"}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Detail panel */}
          <div style={{ width:340, overflowY:"auto", flexShrink:0 }}>
            {!selectedCollege ? (
              <div style={{ padding:"60px 24px", textAlign:"center" }}>
                <div style={{ fontFamily:"var(--serif)", fontSize:18, fontStyle:"italic", color:"var(--ink-2)", marginBottom:8 }}>Click a school to see your detailed chances.</div>
                <div className="mono" style={{ color:"var(--ink-3)", fontSize:10 }}>{COLLEGES.length} schools in database.</div>
              </div>
            ) : (
              <div style={{ padding:"20px" }}>
                <div style={{ fontFamily:"var(--serif)", fontSize:20, fontWeight:700, marginBottom:2 }}>{selectedCollege.name}</div>
                <div className="mono" style={{ color:"var(--ink-3)", fontSize:10, marginBottom:16 }}>{selectedCollege.loc} · {selectedCollege.type} · {selectedCollege.size==="small"?"< 5k":selectedCollege.size==="medium"?"5–15k":"> 15k"} undergrads</div>

                {/* Your chance */}
                <div style={{ border:"1px solid var(--ink)", padding:"16px", marginBottom:14 }}>
                  <div className="mono" style={{ color:"var(--ink-3)", fontSize:9, marginBottom:8 }}>YOUR ADMISSION CHANCE</div>
                  <div style={{ fontFamily:"var(--serif)", fontSize:38, fontWeight:700, color:CAT_COLOR[selectedResult!.category], lineHeight:1 }}>{Math.round(selectedResult!.chance*100)}%</div>
                  <div className="mono" style={{ color:"var(--ink-3)", fontSize:9, marginTop:4 }}>{CAT_LABEL[selectedResult!.category].toUpperCase()} · Overall admit rate: {Math.round(selectedCollege.accept*100)}%</div>
                  <div style={{ height:4, background:"var(--paper-2)", border:"1px solid var(--rule)", marginTop:10 }}>
                    <div style={{ height:"100%", width:`${Math.round(selectedResult!.chance*100)}%`, background:CAT_COLOR[selectedResult!.category] }} />
                  </div>
                  {selectedCollege.ed_date && (
                    <div style={{ marginTop:10, padding:"8px 10px", background:"var(--paper-2)", border:"1px solid var(--rule)" }}>
                      <div className="mono" style={{ fontSize:9, color:"var(--ink-3)" }}>ED BOOST</div>
                      <div style={{ fontFamily:"var(--serif)", fontSize:22, fontWeight:700, color:"#2d7a3c" }}>{Math.round(selectedResult!.edChance*100)}%</div>
                      <div className="mono" style={{ color:"var(--ink-3)", fontSize:9 }}>if you apply Early Decision by {selectedCollege.ed_date}</div>
                    </div>
                  )}
                </div>

                {/* Factor breakdown */}
                <div style={{ border:"1px solid var(--ink)", marginBottom:14 }}>
                  <div style={{ padding:"10px 14px", borderBottom:"1px solid var(--rule)", background:"var(--paper-2)" }}>
                    <div className="mono cin" style={{ fontSize:9 }}>Your profile vs their admits</div>
                  </div>
                  {[
                    { key:"gpa",    label:"GPA",            val:selectedResult!.breakdown.gpa },
                    { key:"test",   label:profile.testChoice==="act"?"ACT":"SAT",  val:selectedResult!.breakdown.test },
                    { key:"ecs",    label:"Extracurriculars", val:selectedResult!.breakdown.ecs },
                    { key:"awards", label:"Awards",          val:selectedResult!.breakdown.awards },
                  ].map((f,i,arr)=>(
                    <div key={f.key} style={{ padding:"10px 14px", borderBottom:i<arr.length-1?"1px solid var(--rule)":"none", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div style={{ fontFamily:"var(--sans)", fontSize:12 }}>{f.label}</div>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:60, height:3, background:"var(--paper-2)", border:"1px solid var(--rule)" }}>
                          <div style={{ height:"100%", width:`${f.val.score*100}%`, background:f.val.score>0.7?"#2d7a3c":f.val.score>0.45?"#1a6091":"#c44b2a" }} />
                        </div>
                        <span style={{ fontFamily:"var(--mono)", fontSize:9, color:f.val.score>0.7?"#2d7a3c":f.val.score>0.45?"#1a6091":"#c44b2a" }}>{f.val.arrow} {f.val.label}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* School stats */}
                <div style={{ border:"1px solid var(--ink)", marginBottom:14 }}>
                  <div style={{ padding:"10px 14px", borderBottom:"1px solid var(--rule)", background:"var(--paper-2)" }}>
                    <div className="mono cin" style={{ fontSize:9 }}>Admitted student profile</div>
                  </div>
                  {[
                    { label:"Avg GPA", val:selectedCollege.gpa.toFixed(2) },
                    ...(selectedCollege.sat25>0?[{ label:"SAT middle 50%", val:`${selectedCollege.sat25}–${selectedCollege.sat75}` },{ label:"ACT middle 50%", val:`${selectedCollege.act25}–${selectedCollege.act75}` }]:[]),
                    { label:"Acceptance rate", val:`${Math.round(selectedCollege.accept*100)}%` },
                  ].map((s,i,arr)=>(
                    <div key={s.label} style={{ padding:"8px 14px", borderBottom:i<arr.length-1?"1px solid var(--rule)":"none", display:"flex", justifyContent:"space-between" }}>
                      <span style={{ fontFamily:"var(--sans)", fontSize:12, color:"var(--ink-2)" }}>{s.label}</span>
                      <span style={{ fontFamily:"var(--mono)", fontSize:11, fontWeight:600 }}>{s.val}</span>
                    </div>
                  ))}
                </div>

                {/* Deadlines */}
                <div style={{ border:"1px solid var(--ink)", marginBottom:14 }}>
                  <div style={{ padding:"10px 14px", borderBottom:"1px solid var(--rule)", background:"var(--paper-2)" }}>
                    <div className="mono cin" style={{ fontSize:9 }}>Deadlines</div>
                  </div>
                  {[
                    { label:"Early Decision", date:selectedCollege.ed_date },
                    { label:"Early Action",   date:selectedCollege.ea_date },
                    { label:"Regular Decision", date:selectedCollege.rd_date },
                  ].filter(d=>d.date).map((d,i,arr)=>{
                    const days = daysUntil(d.date);
                    return (
                      <div key={d.label} style={{ padding:"9px 14px", borderBottom:i<arr.length-1?"1px solid var(--rule)":"none", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <div>
                          <div style={{ fontFamily:"var(--sans)", fontSize:12, fontWeight:600 }}>{d.label}</div>
                          <div className="mono" style={{ color:"var(--ink-3)", fontSize:9 }}>{d.date}</div>
                        </div>
                        {days !== null && <span className="mono" style={{ fontSize:9, color:days<30?"var(--cinnabar-ink)":"var(--ink-3)" }}>{days}d</span>}
                      </div>
                    );
                  })}
                </div>

                {/* What they value */}
                <div style={{ border:"1px solid var(--ink)", marginBottom:16 }}>
                  <div style={{ padding:"10px 14px", borderBottom:"1px solid var(--rule)", background:"var(--paper-2)" }}>
                    <div className="mono cin" style={{ fontSize:9 }}>What they value</div>
                  </div>
                  <div style={{ padding:"12px 14px" }}>
                    {selectedCollege.values.map((v,i)=>(
                      <div key={i} style={{ fontFamily:"var(--sans)", fontSize:12, lineHeight:1.6, color:"var(--ink-2)" }}>· {v}</div>
                    ))}
                  </div>
                </div>

                <button className="btn" onClick={()=>toggleShortlist(selectedCollege.id)} style={{ width:"100%" }}>
                  {shortlist.includes(selectedCollege.id) ? "✓ Remove from my list" : "+ Add to my list"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </TierGate>
  );

  // ── LIST PHASE ─────────────────────────────────────────────────────────
  return (
    <TierGate requires="pro">
      <div>
        <header className="mob-hp" style={{ padding:"14px 24px", borderBottom:"1px solid var(--ink)", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
          <div className="mono" style={{ color:"var(--ink-3)" }}>My Admissions List · {shortlist.length} school{shortlist.length!==1?"s":""}</div>
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn ghost" onClick={()=>setPhase("explorer")}>← Explorer</button>
            <button className="btn ghost" onClick={()=>setPhase("profile")}>Edit profile</button>
            {shortlist.length > 0 && <button className="btn" onClick={getAIAnalysis} disabled={loadingAI}>{loadingAI?"Analysing…":"Get AI strategy →"}</button>}
          </div>
        </header>

        <main className="mob-p" style={{ padding:"32px 44px 80px", maxWidth:1300, margin:"0 auto" }}>

          {shortlist.length === 0 ? (
            <div style={{ textAlign:"center", padding:"80px 0" }}>
              <div style={{ fontFamily:"var(--serif)", fontSize:28, fontStyle:"italic", color:"var(--ink-2)", marginBottom:12 }}>Your list is empty.</div>
              <div className="mono" style={{ color:"var(--ink-3)", marginBottom:24 }}>Go to the Explorer and add schools to build your college list.</div>
              <button className="btn" onClick={()=>setPhase("explorer")}>Open School Explorer →</button>
            </div>
          ) : (
            <div className="mob-col" style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:32 }}>
              <div>
                {/* List health */}
                <div style={{ padding:"14px 18px", border:`1px solid ${listHealth.color}`, marginBottom:24, display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:listHealth.color, flexShrink:0 }} />
                  <span style={{ fontFamily:"var(--mono)", fontSize:10, color:listHealth.color, letterSpacing:"0.05em" }}>{listHealth.label.toUpperCase()}</span>
                </div>

                {/* Categorised list */}
                {(["far-reach","reach","match","safety"] as const).map(cat => {
                  const items = shortlistResults.filter(r=>r.category===cat);
                  if (!items.length) return null;
                  return (
                    <div key={cat} style={{ marginBottom:28 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12, paddingBottom:8, borderBottom:`2px solid ${CAT_COLOR[cat]}` }}>
                        <span style={{ fontFamily:"var(--mono)", fontSize:9, letterSpacing:"0.12em", textTransform:"uppercase", color:CAT_COLOR[cat], fontWeight:700 }}>{CAT_LABEL[cat]}</span>
                        <span className="mono" style={{ color:"var(--ink-3)" }}>· {items.length} school{items.length!==1?"s":""}</span>
                      </div>
                      {items.map((r,i)=>{
                        const nextDl = [r.college.ed_date, r.college.ea_date, r.college.rd_date].map(d=>({ date:d, days:daysUntil(d) })).filter(d=>d.date&&d.days!==null).sort((a,b)=>(a.days||999)-(b.days||999))[0];
                        return (
                          <div key={r.college.id} style={{ border:"1px solid var(--ink)", borderBottom:i<items.length-1?"none":"1px solid var(--ink)", padding:"16px 20px" }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                              <div style={{ flex:1 }}>
                                <div style={{ display:"flex", alignItems:"baseline", gap:8, flexWrap:"wrap" }}>
                                  <span style={{ fontFamily:"var(--serif)", fontSize:17, fontWeight:600 }}>{r.college.name}</span>
                                  <span className="mono" style={{ color:"var(--ink-3)", fontSize:9 }}>{r.college.loc}</span>
                                  {profile.legacyIds.includes(r.college.id) && <span className="mono" style={{ fontSize:8, padding:"1px 5px", border:"1px solid var(--cinnabar-ink)", color:"var(--cinnabar-ink)" }}>LEGACY</span>}
                                </div>
                                <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:6 }}>
                                  {r.college.tags.slice(0,3).map(t=>(<span key={t} style={{ fontFamily:"var(--mono)", fontSize:8, padding:"2px 6px", border:"1px solid var(--rule)", color:"var(--ink-3)", textTransform:"uppercase" }}>{t}</span>))}
                                  {r.college.ed_date && <span style={{ fontFamily:"var(--mono)", fontSize:8, padding:"2px 6px", background:"var(--ink)", color:"var(--paper)" }}>ED {r.college.ed_date}</span>}
                                  {r.college.ea_date && <span style={{ fontFamily:"var(--mono)", fontSize:8, padding:"2px 6px", border:"1px solid var(--ink)", color:"var(--ink)" }}>EA {r.college.ea_date}</span>}
                                </div>
                                <div style={{ display:"flex", gap:16, marginTop:8, flexWrap:"wrap" }}>
                                  {[
                                    { l:"GPA", f:r.breakdown.gpa },
                                    { l:profile.testChoice==="act"?"ACT":"SAT", f:r.breakdown.test },
                                    { l:"ECs", f:r.breakdown.ecs },
                                    { l:"Awards", f:r.breakdown.awards },
                                  ].map(b=>(
                                    <span key={b.l} style={{ fontFamily:"var(--mono)", fontSize:9, color:b.f.score>0.7?"#2d7a3c":b.f.score>0.45?"#1a6091":"#c44b2a" }}>{b.l} {b.f.arrow}</span>
                                  ))}
                                </div>
                              </div>
                              <div style={{ textAlign:"right", flexShrink:0 }}>
                                <div style={{ fontFamily:"var(--serif)", fontSize:28, fontWeight:700, color:CAT_COLOR[r.category] }}>{Math.round(r.chance*100)}%</div>
                                {r.college.ed_date && r.edChance > r.chance && (
                                  <div className="mono" style={{ color:"#2d7a3c", fontSize:9 }}>ED: {Math.round(r.edChance*100)}%</div>
                                )}
                                <div className="mono" style={{ color:"var(--ink-3)", fontSize:9 }}>Admit: {Math.round(r.college.accept*100)}%</div>
                              </div>
                            </div>
                            <div style={{ height:3, background:"var(--paper-2)", border:"1px solid var(--rule)", marginTop:12 }}>
                              <div style={{ height:"100%", width:`${Math.round(r.chance*100)}%`, background:CAT_COLOR[r.category] }} />
                            </div>
                            <div style={{ display:"flex", justifyContent:"space-between", marginTop:5, alignItems:"center" }}>
                              {nextDl ? <span className="mono" style={{ fontSize:9, color:nextDl.days!<30?"var(--cinnabar-ink)":"var(--ink-3)" }}>Next deadline: {nextDl.date} · {nextDl.days}d</span> : <span/>}
                              <button onClick={()=>toggleShortlist(r.college.id)} style={{ background:"none", border:"none", cursor:"pointer", fontFamily:"var(--mono)", fontSize:9, color:"var(--ink-3)" }}>Remove ✕</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                <button className="btn ghost" onClick={()=>setPhase("explorer")} style={{ width:"100%", marginTop:8 }}>+ Add more schools</button>
              </div>

              {/* AI sidebar */}
              <div>
                {!analysis && !loadingAI && (
                  <div style={{ border:"1px solid var(--ink)", padding:"24px" }}>
                    <div className="mono cin" style={{ marginBottom:10 }}>AI Strategy</div>
                    <p style={{ fontFamily:"var(--sans)", fontSize:13, lineHeight:1.65, color:"var(--ink-2)", margin:"0 0 16px" }}>
                      Get a personalised strategy for your list — essay angles, profile gaps, ED advice, and a month-by-month timeline.
                    </p>
                    <button className="btn" onClick={getAIAnalysis} style={{ width:"100%" }}>Generate strategy →</button>
                  </div>
                )}
                {loadingAI && (
                  <div style={{ border:"1px solid var(--ink)", padding:"24px" }}>
                    <div className="mono cin" style={{ marginBottom:8 }}>Analysing your list…</div>
                    <div className="mono" style={{ color:"var(--ink-3)", fontSize:11 }}>Reading your profile, evaluating school fit, generating your strategy.</div>
                  </div>
                )}
                {analysis && (
                  <>
                    <div style={{ border:"1px solid var(--ink)", padding:"20px", marginBottom:14 }}>
                      <div className="mono cin" style={{ marginBottom:10 }}>Your strategy</div>
                      <p style={{ fontFamily:"var(--sans)", fontSize:13, lineHeight:1.65, color:"var(--ink-2)", margin:0 }}>{analysis.strategy}</p>
                    </div>
                    <div style={{ border:"1px solid var(--ink)", padding:"20px", marginBottom:14 }}>
                      <div className="mono cin" style={{ marginBottom:10 }}>Profile gaps to fix</div>
                      {analysis.gaps.map((g,i)=>(
                        <div key={i} style={{ display:"flex", gap:10, marginBottom:10, alignItems:"flex-start" }}>
                          <span className="mono" style={{ color:"var(--cinnabar-ink)", flexShrink:0 }}>{String(i+1).padStart(2,"0")}</span>
                          <span style={{ fontFamily:"var(--sans)", fontSize:13, lineHeight:1.55 }}>{g}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ border:"1px solid var(--ink)", padding:"20px", marginBottom:14 }}>
                      <div className="mono cin" style={{ marginBottom:10 }}>Essay angles</div>
                      {analysis.essayAngles.map((e,i)=>(
                        <div key={i} style={{ padding:"9px 0", borderBottom:i<analysis.essayAngles.length-1?"1px solid var(--rule)":"none", fontFamily:"var(--sans)", fontSize:13, lineHeight:1.5 }}>{e}</div>
                      ))}
                    </div>
                    <div style={{ border:"1px solid var(--ink)", padding:"20px", marginBottom:14 }}>
                      <div className="mono cin" style={{ marginBottom:10 }}>Application timeline</div>
                      {analysis.timeline.map((t,i)=>(
                        <div key={i} style={{ fontFamily:"var(--sans)", fontSize:12.5, lineHeight:1.7, color:"var(--ink-2)" }}>· {t}</div>
                      ))}
                    </div>
                    <button className="btn ghost" onClick={getAIAnalysis} style={{ width:"100%" }}>Regenerate</button>
                  </>
                )}
                <div style={{ marginTop:14, padding:"12px 14px", border:"1px solid var(--rule)", background:"var(--paper-2)" }}>
                  <div className="mono" style={{ color:"var(--ink-3)", fontSize:9, lineHeight:1.6 }}>Probabilities use a research-based statistical model trained on published CDS data. They reflect historical patterns — not guarantees. Essays, recommendations, and institutional priorities cannot be fully modelled.</div>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop:60, borderTop:"1px solid var(--ink)", paddingTop:20, display:"flex", justifyContent:"space-between" }}>
            <Link href="/dashboard" className="mono" style={{ color:"var(--ink-3)" }}>← Dashboard</Link>
            <div className="mono" style={{ color:"var(--ink-3)" }}>Ledger.</div>
          </div>
        </main>
      </div>
    </TierGate>
  );
}
