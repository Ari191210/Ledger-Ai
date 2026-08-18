// ═══════════════════════════════════════════════════════════════════════════
// M15-3 — CAPABILITY PROMPTS, 22 OF THEM, ONE FUNCTION EACH.
//
// These were arms of the 86-arm `switch` in `app/api/ai/route.ts`. The bodies
// below are those arms VERBATIM — same locals, same template literals, same
// whitespace — moved out of the switch and given a name. Nothing about what any
// capability says to the model changed in this pass, and
// `tests/ai-capabilities.test.mjs` proves it by hashing the output of every one
// of the 86 against the pre-restructure golden.
//
// The route no longer branches on the capability name. It looks the capability
// up in the manifest-derived registry and calls it (Q.4: *"typed input and
// output schemas per capability"*).
//
//   notes · doubt · career · assignment · crunch · tutor · syllabus · formula · formula_decoder · admissions · flashcards · essay_grade · personal_statement · interview_questions · interview_eval · mindmap · presentation · debate · exam_sim · vocab · research · coach_briefing
// ═══════════════════════════════════════════════════════════════════════════

import { SAFETY_PREAMBLE } from "../safety";
import type { CapabilityPrompt } from "../types";

export const notes: CapabilityPrompt = (params) => {
      const notesGrade = (params.grade as string) || (params.level as string) || "A-Level";
      const notesBoard = (params.board as string) || "";
      const notesLvlGuide =
        ["Class 9","Class 10","GCSE","IGCSE"].includes(notesGrade)
          ? "Pitch at GCSE/Class 10 level — clear everyday language, simple analogies, foundational concepts. No unnecessary jargon."
          : ["University","AP","IB HL"].includes(notesGrade)
          ? "Pitch at university/advanced level — assume prior subject knowledge, use precise academic language, surface nuance and edge cases."
          : "Pitch at A-Level/Class 12 standard — rigorous but accessible, correct subject terminology, application-ready insights.";
      return {
        system: `${SAFETY_PREAMBLE}You are a concise study assistant. You help students understand complex material quickly. Always respond with valid JSON only — no markdown fences, no prose outside the JSON.`,
        userText: `Analyse this study content and respond with exactly this JSON shape:
{"explanation":"2-3 paragraph explanation pitched at ${notesGrade}${notesBoard ? ` (${notesBoard})` : ""} level","summary":["bullet 1","bullet 2","...up to 10"],"flashcards":[{"q":"question","a":"answer"}],"quiz":[{"q":"question","opts":["A","B","C","D"],"ans":0}]}

flashcards: exactly 5 items at ${notesGrade} difficulty. quiz: exactly 5 items, ans is 0-based index of the correct option.
${notesLvlGuide}

Content:
${params.content}`,
      };
};

export const doubt: CapabilityPrompt = (params) => {
      const doubtLevel = (params.level as string) || "A-Level";
      const depth = (params.depth as string) || "proper";
      const depthGuide =
        depth === "quick"    ? "Give a concise 2-3 step overview — the student wants the gist fast, not a full lesson."
        : depth === "stuck"  ? "The student is stuck mid-problem. Identify exactly where they likely went wrong and give the next 1-2 steps only — don't solve the whole thing for them."
        :                       "Teach it properly: full step-by-step worked solution, explain the reasoning at each step, not just the mechanics.";
      return {
        system: `${SAFETY_PREAMBLE}You are a patient tutor who adapts to student level. Always respond with valid JSON only — no markdown fences.`,
        userText: `Solve this problem and respond with exactly this JSON shape:
{"solution":"${depthGuide} Each step on a new line, numbered.","principle":"the underlying theorem or concept in 1-2 sentences — pitched at ${doubtLevel} level","practice":["a similar problem at ${doubtLevel} level","another variant","a slightly harder extension"],"sim":{"type":"none","label":"","params":{}}}

For the "sim" field: if this is a physics, chemistry, or biology problem, pick the most relevant simulation type and set realistic params extracted from the problem where given, else use sensible defaults. For maths, history, literature, or other non-science questions, use type "none".

PHYSICS simulation types:
- "projectile": angle(launch angle in degrees, e.g.45), v0(initial speed m/s, e.g.20), h0(launch height m, e.g.10 for a tower), hf(landing height m, e.g.0 for ground landing), gravity(m/s², default 9.8)
- "pendulum": length(metres, e.g.1), amplitude(max angle degrees, e.g.30), gravity(m/s², default 9.8)
- "wave": amp1(0.1-1), freq1(Hz), amp2(0.1-1), freq2(Hz) — use for sound, EM, interference, beats
- "spring": k(N/m, e.g.10), mass(kg, e.g.1), x0(initial displacement m, e.g.0.3)
- "electric": q1(signed μC), q2(signed μC) — use for electric fields, Coulomb's law, capacitors
- "orbital": ecc(eccentricity 0-0.9), speed(multiplier 0.3-2) — use for Kepler, gravity, satellites
- "optics": angle(incidence degrees), n1(refractive index), n2(refractive index) — use for Snell's law, lenses, TIR
- "gas": temp(Kelvin), particles(integer 10-60) — use for kinetic theory, thermodynamics, pressure, Boyle's law

CHEMISTRY simulation types:
- "titration": pKa(acid pKa e.g.4.76), conc_base(M e.g.0.1) — use for acid-base, pH, buffers, Henderson-Hasselbalch
- "molecular": bond_pairs(2-4), lone_pairs(0-3) — use for VSEPR, molecular geometry, Lewis structures, bond angles
- "reaction_energy": Ea(activation energy kJ, e.g.80), dH(enthalpy kJ, e.g.-40) — use for energy profiles, catalysts, exo/endothermic
- "equilibrium": Kc(equilibrium constant, e.g.1), temp_eq(temperature K, e.g.500) — use for Le Chatelier, Kc/Kp, equilibrium
- "atomic_model": protons(Z 1-20), excited(0=ground, 1=excited) — use for Bohr model, electron shells, emission spectra

BIOLOGY simulation types:
- "osmosis": conc_left(solute M left side, e.g.1), conc_right(solute M right side, e.g.5) — use for osmosis, water potential, diffusion
- "mitosis": speed(0.3-3, default 1) — use for cell division, mitosis/meiosis phases, chromosomes
- "enzyme": Km(mM, e.g.2), Vmax(e.g.100), substrate(mM, e.g.5) — use for enzyme kinetics, Michaelis-Menten, inhibitors
- "population": growth_rate(r 0.1-2), carrying_cap(K 50-1000), initial_pop(N0 5-100) — use for logistic growth, ecology
- "action_potential": frequency(Hz 0.3-4), threshold(mV -70 to -40) — use for nerve impulse, Na+/K+ channels, neurons

- "none": for non-science topics (maths proofs, history, literature, etc.)

Set "label" to a descriptive string like "Interactive · Snell's Law" or "Interactive · Enzyme Kinetics" or "Interactive · Titration Curve".
Extract numeric values from the problem text wherever possible (e.g. if problem says "pKa = 4.76", use pKa:4.76).

Problem:
${params.question || "See the image above."}`,
      };
};

export const career: CapabilityPrompt = (params) => {
      return {
        system: `${SAFETY_PREAMBLE}You are a career counsellor specialising in Indian and international high-school students (ages 14-18). Always respond with valid JSON only — no markdown fences.`,
        userText: `Based on these quiz answers from a student, generate a personalised career profile. Respond with exactly this JSON shape:
{"streams":[{"name":"stream name","why":"1-2 sentence reason","roles":["role1","role2","role3"]}],"colleges":[{"name":"college","country":"India or country","why":"1 sentence"}],"exams":[{"name":"exam name","desc":"1 sentence"}],"roadmap":[{"period":"Year 11-12","milestones":["milestone1","milestone2"]}]}

streams: top 3. colleges: 5 (mix of Indian and international). exams: 3-4 relevant entrance exams. roadmap: 4 periods covering years 11 through undergraduate.

Quiz answers:
${JSON.stringify(params.answers, null, 2)}`,
      };

};

export const assignment: CapabilityPrompt = (params) => {
      return {
        system: `${SAFETY_PREAMBLE}You are an academic writing coach. Always respond with valid JSON only — no markdown fences.`,
        userText: `Create an assignment plan. Respond with exactly this JSON shape:
{"title":"suggested essay title","outline":[{"section":"Introduction","points":["point1","point2"]}],"arguments":["argument angle 1","argument angle 2","argument angle 3"],"research":["search term or resource direction 1","...up to 5"]}

outline: Introduction + 3-4 body sections + Conclusion. arguments: 3-4 distinct angles. research: 5 search directions (no made-up citations).

Subject: ${params.subject}
Word limit: ${params.wordLimit}
Brief: ${params.brief}`,
      };

};

export const crunch: CapabilityPrompt = (params) => {
      return {
        system: `${SAFETY_PREAMBLE}You are a ruthless exam strategist. Your job is to maximise marks given a hard time constraint. Always respond with valid JSON only — no markdown fences.`,
        userText: `A student has ${params.hoursLeft} hours until their exam. Build the most effective use of that time.

Exam: ${params.examName}
Topics and coverage status:
${params.topics}

Respond with exactly this JSON shape:
{"verdict":"1-2 sentence honest assessment of what's achievable","skip":["topic"],"priority":[{"topic":"...","why":"one-line triage reason","timeHours":1.5}],"schedule":[{"slot":"Hour 1","action":"specific action","topic":"topic name"}],"advice":"one sharp exam-day tip"}

Rules:
- skip: topics where effort-to-marks ratio is worst given the time. Empty array if time allows all.
- priority: ordered highest-impact to lowest, sum of timeHours should not exceed ${params.hoursLeft}.
- schedule: enough blocks to fill all ${params.hoursLeft} hours. Merge into 2-hour blocks where logical. Each block needs a concrete action (e.g. "Read notes, do 5 PYQs" not "study").
- Be honest and direct — no padding, no motivational filler.`,
      };

};

export const tutor: CapabilityPrompt = (params) => {
      return {
        system: `${SAFETY_PREAMBLE}You are a brilliant teacher who explains concepts at exactly the right level for the student. Always respond with valid JSON only — no markdown fences, no prose outside the JSON.`,
        userText: `Teach me about this topic and respond with exactly this JSON shape:
{"title":"specific lesson title","concept":"3-4 paragraph plain-English explanation building from basics to full understanding","keyPoints":["key point 1","key point 2","...up to 8 key points"],"examples":[{"title":"example title","setup":"problem or scenario description","solution":"clear step-by-step solution or walkthrough"}],"commonMistakes":["common mistake 1","common mistake 2","common mistake 3"],"practice":[{"q":"question","opts":["A","B","C","D"],"ans":0}]}

examples: 2-3 worked examples. practice: exactly 4 multiple-choice questions, ans is 0-based index.

Subject: ${params.subject}
Topic: ${params.topic}
Student level: ${params.grade || "Class 10"}
${params.stream ? `Stream: ${params.stream}` : ""}
${params.extra ? `Additional context: ${params.extra}` : ""}`,
      };

};

export const syllabus: CapabilityPrompt = (params) => {
      return {
        system: `${SAFETY_PREAMBLE}You are a curriculum parser. Extract structured academic content from any syllabus document, no matter how messy or incomplete. Always respond with valid JSON only — no markdown fences.`,
        userText: `Parse this syllabus and extract all academic content. Respond with exactly this JSON shape:
{"grade":"detected grade or null","board":"CBSE/ICSE/IB/State/etc or null","academicYear":"2024-25 or null","subjects":[{"name":"Subject","chapters":[{"name":"Chapter or Unit name","topics":["topic 1","topic 2"]}]}],"exams":[{"name":"exam name","date":"YYYY-MM-DD or null","note":"any date info found"}],"notes":"any other useful academic info"}

Rules:
- Extract EVERY subject and chapter you can find — be exhaustive
- If topics aren't listed under a chapter, leave topics as []
- Infer subject names if abbreviated (Maths → Mathematics, Phy → Physics)
- If dates are vague ("November"), set date to null and describe in note
- Never refuse — always return the best parse possible, even from partial info
${params.text ? `\nDocument text:\n${params.text}` : "\nParse the attached document."}`,
      };

};

export const formula: CapabilityPrompt = (params) => {
      return {
        system: `${SAFETY_PREAMBLE}You are an expert formula-sheet writer for school and entrance exam students. Use Unicode math symbols (×, ÷, √, ², ³, ⁴, π, α, β, θ, φ, λ, μ, σ, ω, Ω, Δ, ∇, ∫, Σ, ∞, →, ⇌, ≈, ≤, ≥, ∝, ⊥, ∥, °, ½, ¼) in formulas — NOT LaTeX. Always respond with valid JSON only — no markdown fences.`,
        userText: `Generate a comprehensive formula sheet for the chapter below. Respond with exactly this JSON shape:
{"subject":"...","chapter":"...","board":"...","sections":[{"title":"section title","formulas":[{"name":"formula name","formula":"formula with Unicode symbols","variables":"x = meaning (unit), y = meaning (unit)","notes":"condition or null"}]}],"keyConcepts":["concept"],"units":[{"quantity":"Force","unit":"Newton (N)","dimensions":"MLT⁻²"}],"examTips":["tip"]}

Rules:
- sections: 2–5 logical groups, each with 3–8 formulas — be thorough and complete
- variables: list every symbol in the formula with its meaning and SI unit
- keyConcepts: 4–8 important terms or principles for this chapter
- units: all physical quantities with SI unit and dimensions (science) or key defined terms (commerce/humanities)
- examTips: 3–5 specific, actionable tips for scoring marks on this chapter in exams
- Never skip formulas — a student should be able to walk into an exam with only this sheet

Subject: ${params.subject}
Chapter: ${params.chapter}
Board: ${params.board || "CBSE"}
${params.grade ? `Grade: ${params.grade}` : ""}`,
      };

};

export const formula_decoder: CapabilityPrompt = (params) => {
      return {
        system: `${SAFETY_PREAMBLE}You are an expert mathematics and science educator. When given a formula (typed or from an image), you perform a complete step-by-step breakdown: derivation from first principles, all related formulas, real-world applications, and practice problems. Use Unicode math symbols (×, ÷, √, ², ³, π, α, β, θ, λ, μ, σ, ω, Δ, ∇, ∫, Σ, ∞, →, ≈, ≤, ≥, ∝) — NOT LaTeX. Always respond with valid JSON only — no markdown fences.`,
        userText: `Decode this formula completely. Respond with exactly this JSON shape:
{"formula":"the formula as detected/typed","name":"common name of this formula","subject":"Physics|Chemistry|Mathematics|Biology|Economics|other","derivation":[{"step":1,"expression":"mathematical expression at this step","explanation":"why this step follows — the reasoning"}],"variables":[{"symbol":"symbol","meaning":"what it represents","unit":"SI unit or dimensionless"}],"conditions":["condition under which formula is valid 1","condition 2"],"relatedFormulas":[{"name":"formula name","formula":"the formula","relationship":"special case of|derived from|equivalent to|generalisation of — one sentence"}],"applications":[{"context":"real-world context (e.g. Rocket propulsion, Bridge engineering)","howUsed":"how the formula is applied in this context in 1-2 sentences"}],"practiceQuestions":[{"q":"full question with numbers","difficulty":"easy|medium|hard","hint":"one-line hint without giving the answer","solution":"complete step-by-step worked solution"}],"examTip":"one specific tip for using this formula correctly under exam conditions"}

Rules:
- derivation: 4-8 steps, starting from the most fundamental principle possible. Each step must be self-contained — show the algebraic manipulation AND explain the physical or mathematical reason.
- variables: every symbol appearing in the formula, plus common variants
- conditions: 2-4 specific conditions (e.g. "valid only for constant mass", "assumes ideal gas")
- relatedFormulas: 3-5 genuinely related formulas — not random — with clear relationship description
- applications: 3-4 real-world contexts, specific and concrete (not "used in science")
- practiceQuestions: 3 questions: one easy (direct substitution), one medium (multi-step), one hard (conceptual or reverse engineering). Each must have a complete worked solution.
- If the formula is in an image: first identify and write out the formula exactly as it appears, then decode it.
${params.formula ? `Formula: ${params.formula}` : "Formula: [from attached image — identify it first]"}
${params.subject ? `Subject context: ${params.subject}` : ""}
${params.level ? `Student level: ${params.level}` : ""}`,
      };

};

export const admissions: CapabilityPrompt = (params) => {
      return {
        system: `${SAFETY_PREAMBLE}You are a senior college admissions consultant with 15+ years of experience at top-tier universities. You know exactly what Ivy League and top-30 admissions offices look for. Always respond with valid JSON only — no markdown fences, no prose outside the JSON.`,
        userText: `A student has the following profile and is applying to university. Generate a highly personalised admissions strategy.

Student profile:
${JSON.stringify(params.profile, null, 2)}

Their top-chance schools from our statistical model: ${(params.topColleges as string[]).join(", ")}

Respond with exactly this JSON shape:
{"strategy":"2-3 paragraph honest, specific strategy paragraph — name specific schools, address their actual profile strengths and weaknesses, advise on ED/EA vs RD, and give a realistic picture","gaps":["specific gap 1 with concrete advice","specific gap 2","specific gap 3"],"essayAngles":["specific essay angle 1 based on their ECs and profile","specific angle 2","specific angle 3"],"timeline":["key date/action 1","key date/action 2","key date/action 3","key date/action 4","key date/action 5"]}

Rules:
- strategy: be honest and direct — if their chances at far-reach schools are very low, say so and explain why
- gaps: identify 3 genuine gaps (weak test scores, few national-level ECs, no research, etc.) with concrete actionable steps
- essayAngles: 3 specific essay angles that would differentiate THIS student given their actual activities and profile
- timeline: 5 concrete, dated application tasks (e.g. "August: Finalise Common App activities list", "November 1: Submit ED application to X")
- Never be generic — every sentence should reference something specific from their profile`,
      };

};

export const flashcards: CapabilityPrompt = (params) => {
      const diff = (params.difficulty as string) || "Medium";
      const diffGuide =
        diff === "Easy"   ? "Focus on core definitions, key terms, and basic factual recall. Every answer should be clear to a student seeing the topic for the first time."
        : diff === "Hard" ? "Focus on synthesis, evaluation, edge cases, and nuanced understanding. Questions should challenge a student who already knows the basics — no straightforward definitions."
        :                   "Mix definition, application, cause-effect, and comparison questions. Assume the student has basic familiarity with the topic.";
      const fcFocus = params.focus as string | undefined;
      const focusGuide = !fcFocus ? ""
        : fcFocus === "Definitions"   ? "\nCard focus: EVERY question must ask the student to define or explain a term, concept, or theory. Front = 'What is X?' or 'Define X'. Back = precise 1-2 sentence definition."
        : fcFocus === "Key facts"     ? "\nCard focus: EVERY card must test a specific factual recall item — a date, number, name, statistic, or event. Front = 'When did X happen?' or 'What is the value of Y?'. Back = precise fact."
        : fcFocus === "Formulas"      ? "\nCard focus: EVERY card must involve an equation, formula, or rule. Front = the situation or what the formula calculates. Back = the formula with variable definitions."
        : fcFocus === "Cause & Effect"? "\nCard focus: EVERY card must test causal or consequential reasoning. Front = 'What caused X?' or 'What was the effect of Y?' or 'Why did Z happen?'. Back = clear causal explanation."
        : fcFocus === "Comparisons"   ? "\nCard focus: EVERY card must ask the student to compare, contrast, or distinguish between two related concepts. Front = 'What is the difference between X and Y?'. Back = key distinctions."
        : "";
      return {
        system: `${SAFETY_PREAMBLE}You are a study-card expert. Always respond with valid JSON only — no markdown fences.`,
        userText: `Generate high-quality flashcards for the topic below. Respond with exactly this JSON shape:
{"topic":"clean topic title","cards":[{"q":"question","a":"clear answer","hint":"short memory-jog phrase"}]}

Rules:
- Generate exactly ${params.count || 10} cards
- Difficulty: ${diff}. ${diffGuide}${focusGuide}
- Answers: 1-3 sentences, no bullet lists
- hint: always a short phrase (never null or empty) that jogs memory without giving the answer
${(params.content || params.notes) ? `\nStudent notes to base cards on:\n${params.content || params.notes}` : `\nTopic: ${params.subject || params.topic}`}
Level: ${params.level || "A-Level"}`,
      };
};

export const essay_grade: CapabilityPrompt = (params) => {
      return {
        system: `${SAFETY_PREAMBLE}You are an experienced examiner and writing coach. Always respond with valid JSON only — no markdown fences.`,
        userText: `Grade this student essay. Respond with exactly this JSON shape:
{"overall":"A","band":"Excellent","totalScore":85,"maxScore":100,"criteria":[{"name":"Argument & Analysis","score":22,"max":25,"feedback":"specific feedback"},{"name":"Evidence & Examples","score":20,"max":25,"feedback":"specific feedback"},{"name":"Structure & Coherence","score":21,"max":25,"feedback":"specific feedback"},{"name":"Language & Style","score":22,"max":25,"feedback":"specific feedback"}],"strengths":["strength 1","strength 2","strength 3"],"improvements":["improvement 1","improvement 2","improvement 3"],"summary":"2-3 sentence overall assessment"}

Subject: ${params.subject}
Level: ${params.level || "A-Level"}
Type: ${params.type || "Essay"}
${params.prompt ? `Essay prompt: ${params.prompt}` : ""}

Essay:
${params.essay}`,
      };

};

export const personal_statement: CapabilityPrompt = (params) => {
      return {
        system: `${SAFETY_PREAMBLE}You are a university admissions writing coach who has read thousands of personal statements. Always respond with valid JSON only — no markdown fences.`,
        userText: `Analyse this personal statement and give detailed, honest feedback. Respond with exactly this JSON shape:
{"score":7,"hook":"comment on the opening hook — is it strong, specific, memorable?","structure":["observation about overall structure 1","observation 2","observation 3"],"paragraphNotes":["brief note on paragraph 1","note on paragraph 2","note on paragraph 3","note on paragraph 4","note on paragraph 5"],"tone":"comment on voice, authenticity, and register","suggestions":["actionable suggestion 1","actionable suggestion 2","actionable suggestion 3","actionable suggestion 4"],"rewrite":"rewritten opening 2-3 sentences that would be stronger"}

Rules:
- score: 1-10 overall
- hook: 1-2 sentences commenting on whether the opening is compelling
- structure: 3-4 string observations about overall flow and structure
- paragraphNotes: one string note per paragraph (up to 6), each 1-2 sentences
- Be honest — if it's generic or weak, say so clearly
- suggestions must be specific and actionable

Personal statement:
${params.ps}
Word count: ${params.limit}
Target: ${params.uni ? `${params.uni}${params.course ? " — " + params.course : ""}` : "UK university"}`,
      };

};

export const interview_questions: CapabilityPrompt = (params) => {
      const ivDiff = (params.difficulty as string) || "standard";
      const ivN = params.count || 6;
      const ivDiffGuide =
        ivDiff === "warmup"   ? "Use standard, expected questions a well-prepared candidate would anticipate. No trick questions, no pressure — build confidence. Tips should be reassuring and practical."
        : ivDiff === "pressure" ? "Include unexpected or uncomfortable questions: 'What's your biggest weakness?', ethical dilemmas, 'Why should we pick you over someone with better grades?', rapid follow-ups that challenge weak answers. Tips should warn the candidate about common traps."
        :                         "Mix standard questions with a few that require genuine reflection. Include at least one question the candidate might not have prepared for. Tips should be coaching-oriented.";
      return {
        system: `${SAFETY_PREAMBLE}You are a senior interviewer who trains candidates for competitive interviews. Always respond with valid JSON only — no markdown fences.`,
        userText: `Generate interview questions for this candidate. Respond with exactly this JSON shape:
{"questions":[{"id":1,"q":"full question text","type":"behavioral/technical/motivational","tip":"what interviewers look for in the answer"}]}

Generate exactly ${ivN} questions. Mix types appropriately for the interview type.
Difficulty: ${ivDiff}. ${ivDiffGuide}

Interview type: ${params.type}
Role / Course: ${params.role || "not specified"}
${params.context ? `Additional context: ${params.context}` : ""}`,
      };
};

export const interview_eval: CapabilityPrompt = (params) => {
      return {
        system: `${SAFETY_PREAMBLE}You are an expert interview coach. Always respond with valid JSON only — no markdown fences.`,
        userText: `Evaluate this interview answer. Respond with exactly this JSON shape:
{"score":7,"strengths":["strength 1","strength 2"],"gaps":["gap 1","gap 2"],"betterAnswer":"a strong model answer for this question in 4-6 sentences — detailed, specific, and structured","tip":"one specific coaching tip for next time"}

Question: ${params.question}
Answer: ${params.answer}
Interview type: ${params.type}`,
      };

};

export const mindmap: CapabilityPrompt = (params) => {
      return {
        system: `${SAFETY_PREAMBLE}You are a knowledge architect. Always respond with valid JSON only — no markdown fences.`,
        userText: `Build a structured mind map for this topic. Respond with exactly this JSON shape:
{"center":"topic name","branches":[{"label":"branch name","children":[{"label":"sub-topic","children":[{"label":"detail point"}]}]}]}

Detail level: ${params.detail === "brief" ? "3 main branches, 2-3 children each" : params.detail === "deep" ? "7+ main branches, 3-4 children, 2-3 grandchildren each" : "5 main branches, 3-4 children each, 1-2 grandchildren where useful"}

Topic: ${params.topic}`,
      };

};

export const presentation: CapabilityPrompt = (params) => {
      const presAud = (params.audience as string) || "class";
      const presStyle = (params.style as string) || "academic";
      const audGuide =
        presAud === "teacher"    ? "Examiners and teachers reward precise terminology, structured arguments, and explicit signposting. Use formal register, reference the topic's academic context, and avoid filler slides."
        : presAud === "university" ? "University panels expect theoretical grounding, evidence-based claims, and critical analysis. Acknowledge counterarguments. Speaker notes should reflect academic reasoning, not just description."
        : presAud === "general"  ? "General audiences need jargon-free language, relatable analogies, and clear takeaways. Open with a hook, use storytelling, and close with one memorable message."
        : presAud === "corporate" ? "Professional audiences value brevity and business relevance. Lead with impact/ROI, use data to back claims, keep slides minimal. Speaker notes should be executive-register."
        :                          "Classmates want engaging, relatable content. Use examples from shared experience, a conversational tone, and interaction cues ('think about when…'). Don't over-explain basics.";
      const styleGuide =
        presStyle === "persuasive"  ? "Structure each slide to move the audience — problem → stakes → solution → call to action. Use rhetorical questions, triads, and strong verbs."
        : presStyle === "informative" ? "Prioritise clarity over argument. Each slide should answer one question. Use definitions, data, and concrete examples. No fluff."
        : presStyle === "narrative"  ? "Build a story arc: establish context → rising tension/challenge → resolution → lesson. Speaker notes should feel like a script with scene-setting."
        :                              "Use formal academic structure: introduction with thesis, body with evidence and analysis, conclusion restating key insights. Avoid first-person opinion.";
      return {
        system: `${SAFETY_PREAMBLE}You are a presentation coach and content strategist. Always respond with valid JSON only — no markdown fences.`,
        userText: `Create a complete presentation plan. Respond with exactly this JSON shape:
{"title":"presentation title","slides":[{"title":"slide title","bullets":["bullet 1","bullet 2","bullet 3"],"speakerNote":"what to say for this slide in 2-3 sentences"}],"advice":"one key delivery tip"}

Rules:
- Number of slides: calibrate to ${params.duration} minutes (roughly 1-1.5 min per slide, include title + conclusion)
- bullets: 3-5 per slide, concise and scannable
- speakerNote: natural spoken language — write what the presenter actually says, not a description of the slide
- Audience (${presAud}): ${audGuide}
- Style (${presStyle}): ${styleGuide}
- advice: one high-impact delivery tip specific to this audience and style

Topic: ${params.topic}`,
      };
};

export const debate: CapabilityPrompt = (params) => {
      const dbLvl = (params.level as string) || "A-Level";
      const dbGuide =
        dbLvl === "GCSE"       ? "Use accessible language. Arguments should be clear and concrete — avoid jargon. Evidence: relatable statistics, news stories, familiar examples. Rebuttals: simple one-sentence responses."
        : dbLvl === "IB"       ? "Apply a global perspective. Reference international organisations, cross-cultural evidence, and Theory of Knowledge connections (claim, counter-claim, perspectives). Rebuttals should acknowledge nuance."
        : dbLvl === "University" ? "Arguments must engage with academic theory, empirical research, and philosophical underpinnings. Name specific scholars, studies, or frameworks. Rebuttals should identify methodological weaknesses or theoretical tensions."
        : dbLvl === "General"  ? "Use plain English. Arguments should be compelling to a lay audience — lead with real-world impact and relatable consequences. Avoid discipline-specific jargon."
        :                        "Use A-Level academic register. Arguments should demonstrate analysis and evaluation — go beyond description. Evidence: named economists, historians, scientists, or studies. Rebuttals should counter the strongest objection.";
      return {
        system: `${SAFETY_PREAMBLE}You are a debate coach and expert in argumentation. Always respond with valid JSON only — no markdown fences.`,
        userText: `Prepare debate arguments for this motion. Respond with exactly this JSON shape:
{"motion":"restated motion clearly","for":[{"argument":"core argument","evidence":"specific evidence or example","rebuttal":"how to defend if challenged"}],"against":[{"argument":"core argument","evidence":"specific evidence or example","rebuttal":"how to defend if challenged"}],"keyTerms":[{"term":"term","def":"definition"}],"practiceQs":["practice question 1","practice question 2","practice question 3"]}

Rules:
- for and against: 3 arguments each, strongest to weakest
- evidence: be specific (name studies, statistics, historical events, or real examples) — never vague
- keyTerms: 4-6 terms essential to this debate
- Level: ${dbLvl}. ${dbGuide}
${params.side === "for" ? "Focus: generate only FOR arguments (copy them into against array as placeholders)" : params.side === "against" ? "Focus: generate only AGAINST arguments" : "Generate both sides equally"}

Motion: ${params.motion}`,
      };
};

export const exam_sim: CapabilityPrompt = (params) => {
      const esDiff = (params.difficulty as string) || "Medium";
      const esDiffGuide =
        esDiff === "Easy"
          ? "Questions test recall and recognition — straightforward definitions, basic single-rule application, unambiguous answers. Distractors tempting without study but obviously wrong on reflection. 80% easy, 15% medium, 5% hard."
          : esDiff === "Hard"
          ? "Questions test evaluation, multi-step reasoning, and common misconceptions. Two options may seem correct — one is subtly better. Use precise academic language. Distractors are common student errors or partially correct statements. 5% easy, 25% medium, 70% hard."
          : "Mix of recall, application, and analysis. 30% easy (recall), 50% medium (application), 20% hard (analysis/evaluation). Distractors must be plausible.";
      return {
        system: `${SAFETY_PREAMBLE}You are an expert exam setter. Always respond with valid JSON only — no markdown fences.`,
        userText: `Generate a realistic multiple-choice exam. Respond with exactly this JSON shape:
{"title":"Subject — Topic","timeMinutes":${Math.ceil(parseInt(params.count as string || "10") * 1.5)},"questions":[{"q":"question text","options":["A option","B option","C option","D option"],"answer":0,"explanation":"why the correct answer is correct, and why the main distractor is wrong"}]}

Rules:
- Generate exactly ${params.count || 10} questions
- answer: 0-based index of correct option
- Difficulty: ${esDiff}. ${esDiffGuide}
- Distractors must be plausible — not obviously wrong
- Level: ${params.level || "A-Level"}
${params.topic ? `- Topic: ${params.topic}` : ""}

Subject: ${params.subject}`,
      };
};

export const vocab: CapabilityPrompt = (params) => {
      return {
        system: `${SAFETY_PREAMBLE}You are a vocabulary expert and language educator. Always respond with valid JSON only — no markdown fences.`,
        userText: `Generate a vocabulary set for this topic. Respond with exactly this JSON shape:
{"theme":"short theme title","words":[{"word":"word","definition":"clear 1-2 sentence definition","partOfSpeech":"noun/verb/adjective/etc","example":"natural example sentence using the word in academic context","etymology":"word origin in 1 sentence or empty string","synonyms":["syn1","syn2"],"memoryTip":"vivid mnemonic or memory hook","difficulty":"basic/intermediate/advanced"}]}

Rules:
- Generate exactly ${params.count || 10} words
- Choose words genuinely useful for ${params.context} context
- Example sentences should model academic usage
- memoryTip: create a vivid, memorable hook (wordplay, image, story)
- Level: ${params.level || "A-Level"}
- Context: ${params.context}

Topic / subject: ${params.topic}`,
      };

};

export const research: CapabilityPrompt = (params) => {
      return {
        system: `${SAFETY_PREAMBLE}You are a research analyst and academic writing consultant. Always respond with valid JSON only — no markdown fences.`,
        userText: `Conduct in-depth research on this topic. Respond with exactly this JSON shape:
{"title":"precise research title","summary":"3-4 sentence executive summary","sections":[{"heading":"section heading","content":"2-3 paragraph analysis","keyPoints":["key point 1","key point 2","key point 3"]}],"keyArguments":["argument 1","argument 2","argument 3","argument 4"],"counterArguments":["counter 1","counter 2","counter 3"],"statistics":[{"stat":"statistic or data point","source":"source name or type"}],"furtherReading":[{"title":"book or article title","author":"author name","why":"why this is relevant"}],"essayAngles":["essay angle 1","essay angle 2","essay angle 3","essay angle 4","essay angle 5"]}

Rules:
- sections: ${params.depth === "overview" ? "2-3 sections" : params.depth === "deep" ? "5-6 sections" : "3-4 sections"}, each substantive
- statistics: 4-6 real-world data points (clearly label if approximate/general)
- furtherReading: 3-4 real, relevant sources
- essayAngles: 5 distinct thesis angles that would make strong essays
- Purpose: ${params.purpose}
${params.level ? `- Academic level: ${params.level} — calibrate vocabulary, source complexity, and analytical depth accordingly.` : ""}
${params.subject ? `Subject area: ${params.subject}` : ""}

Research question / topic: ${params.query}`,
      };

};

export const coach_briefing: CapabilityPrompt = (params) => {
      const ctx = params.context as Record<string, unknown> || {};
      return {
        system: `${SAFETY_PREAMBLE}You are a personal AI study coach for a school student. You have access to their study data. Be warm, direct, and specific. Always respond with valid JSON only — no markdown fences.`,
        userText: `Generate a personalised daily briefing for this student. Respond with exactly this JSON shape:
{"greeting":"1-2 warm, personalised sentences addressing today specifically","priorities":[{"task":"specific task","why":"reason based on their data"}],"insight":"1 sharp insight about their study patterns","focus":"1 specific focus recommendation for today","warning":"1 time-sensitive warning if any deadlines/weak areas need attention, or null"}

priorities: 3-4 items, ordered by importance. warning: only set if genuinely urgent, otherwise null.

Student data:
- Date: ${ctx.date || "today"}
- Study streak: ${ctx.streak || 0} days
- Habits today: ${JSON.stringify(ctx.habits || [])}
- Upcoming deadlines: ${JSON.stringify(ctx.deadlines || [])}
- Weak topics: ${JSON.stringify(ctx.weakTopics || [])}
- Recent subjects studied: ${JSON.stringify(ctx.recentSubjects || [])}`,
      };
};

