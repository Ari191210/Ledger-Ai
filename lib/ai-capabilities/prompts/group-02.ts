// ═══════════════════════════════════════════════════════════════════════════
// M15-3 — CAPABILITY PROMPTS, 26 OF THEM, ONE FUNCTION EACH.
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
//   coach_chat · mark_scheme · mark_scheme_eval · subject_picker · essay_blueprint · concept_web · paper_dissector · lang_analyzer · lab_report · uni_match · compare · source · practice · predict · memory_palace · analogy · case_study · timeline · reading · grammar · study_guide · exam_strategy · concept_connect · model_answer · papers_explain · redemption_set
// ═══════════════════════════════════════════════════════════════════════════

import { SAFETY_PREAMBLE } from "../safety";
import type { CapabilityPrompt } from "../types";

export const coach_chat: CapabilityPrompt = (params) => {
      const chatCtx = params.context as Record<string, unknown> || {};
      return {
        system: `${SAFETY_PREAMBLE}You are a personal AI study coach for a school student. Be concise, warm, and actionable. Always respond with valid JSON only: {"reply":"your response"}`,
        userText: `Student context:
- Streak: ${chatCtx.streak || 0} days
- Weak topics: ${JSON.stringify(chatCtx.weakTopics || [])}
- Deadlines: ${JSON.stringify(chatCtx.deadlines || [])}

Conversation history:
${params.history || ""}

Student: ${params.message}

Respond with: {"reply":"your coaching response in 2-4 sentences, specific and actionable"}`,
      };
};

export const mark_scheme: CapabilityPrompt = (params) => {
      return {
        system: `${SAFETY_PREAMBLE}You are an experienced exam setter for ${params.board} board. Always respond with valid JSON only — no markdown fences.`,
        userText: `Generate a realistic exam question with mark scheme. Respond with exactly this JSON shape:
{"question":"full exam question text","totalMarks":${params.marks || 8},"markScheme":[{"criterion":"criterion name","marks":2,"detail":"what earns these marks"}],"hint":"one-line structure hint for the student"}

Rules:
- question: a genuine exam-style question for ${params.board} ${params.subject}, ${params.marks || 8} marks
- markScheme: criteria that sum to ${params.marks || 8} marks total
- Style it authentically for ${params.board} board (command words, structure, expectations)
- Topic: ${params.topic}`,
      };

};

export const mark_scheme_eval: CapabilityPrompt = (params) => {
      return {
        system: `${SAFETY_PREAMBLE}You are a strict but fair ${params.board} examiner. Always respond with valid JSON only — no markdown fences.`,
        userText: `Mark this student's answer against the mark scheme. Respond with exactly this JSON shape:
{"marksEarned":5,"totalMarks":8,"breakdown":[{"criterion":"criterion name","earned":2,"max":2,"comment":"specific feedback on this criterion"}],"missing":["mark point the student missed 1","mark point missed 2"],"improved":"a model 3-5 sentence answer that would score full marks"}

Question: ${params.question}

Mark scheme: ${JSON.stringify(params.markScheme)}

Student's answer: ${params.answer}`,
      };

};

export const subject_picker: CapabilityPrompt = (params) => {
      return {
        system: `${SAFETY_PREAMBLE}You are a senior school counsellor specialising in ${params.board} subject selection. Always respond with valid JSON only — no markdown fences.`,
        userText: `Recommend subject combinations for this Grade 11 student. Respond with exactly this JSON shape:
{"intro":"2 sentence personalised intro","combos":[{"combo":["Subject A","Subject B","Subject C"],"why":"2 sentence explanation","careerFit":["career 1","career 2","career 3"],"uniReqs":"what this opens at top unis","difficulty":"manageable","score":8}],"avoid":["combination to avoid with reason"],"tip":"one sharp piece of advice"}

combos: 3 different combinations, best first. difficulty: "manageable", "challenging", or "intense". score: 1-10 fit for this student.

Board: ${params.board}
Subjects they like/excel at: ${JSON.stringify(params.interests)}
Career interests: ${JSON.stringify(params.career)}
Additional context: ${params.extra || "none"}`,
      };

};

export const essay_blueprint: CapabilityPrompt = (params) => {
      const bpLvl = (params.level as string) || "A-Level";
      const bpGuide =
        bpLvl === "GCSE" || bpLvl === "IGCSE"
          ? "GCSE standard: clear topic sentences, PEEL paragraph structure, simple connectives, 2-3 pieces of evidence per paragraph, accessible vocabulary. Thesis should be a direct statement, not hedged."
          : bpLvl === "University" || bpLvl === "AP"
          ? "University standard: nuanced thesis with concession, sophisticated paragraph transitions, engagement with counter-arguments, historiographical awareness (for humanities), precise citation integration, academic register throughout."
          : bpLvl === "IB HL" || bpLvl === "IB SL"
          ? "IB standard: clear line of argument, conceptual analysis, counter-argument with rebuttal, command-word awareness (evaluate/assess/to what extent), theory of knowledge connections where relevant."
          : "A-Level standard: analytical thesis, PEEL or SEAL paragraphs, subject-specific terminology, evaluation of evidence, counter-argument in one paragraph, confident academic register.";
      return {
        system: `${SAFETY_PREAMBLE}You are an essay writing coach and expert in ${params.subject} at ${bpLvl} level. Always respond with valid JSON only — no markdown fences.`,
        userText: `Create a detailed essay blueprint. Respond with exactly this JSON shape:
{"title":"suggested essay title","thesis":"a clear, arguable thesis statement appropriate for ${bpLvl}","totalWords":${params.words || 1000},"sections":[{"title":"section name","purpose":"what this section achieves","points":["what to include","argument or evidence","analytical point"],"wordCount":250,"openWith":"suggested opening phrase or sentence"}],"dos":["do this","do that"],"donts":["avoid this","avoid that"],"keyTerms":["term1","term2","term3","term4","term5"]}

sections: Introduction + 3-4 body paragraphs + Conclusion. Word counts should sum to ${params.words || 1000}.
dos: 4-5 specific to this essay type and ${bpLvl} level. donts: 4-5. keyTerms: 5-8 subject-specific terms the examiner rewards.
${bpGuide}

Subject: ${params.subject}
Level: ${bpLvl}
Essay type: ${params.type}
Essay question: ${params.prompt}
Word limit: ${params.words}`,
      };
};

export const concept_web: CapabilityPrompt = (params) => {
      return {
        system: `${SAFETY_PREAMBLE}You are a knowledge cartographer and expert in ${params.subject}. Always respond with valid JSON only — no markdown fences.`,
        userText: `Build a concept web for this topic. Respond with exactly this JSON shape:
{"center":"concept name","description":"1-2 sentence summary of the concept","branches":[{"label":"branch name","children":[{"label":"sub-concept","detail":"1-2 sentence explanation","crossLinks":["related concept in another branch or subject"]}]}],"summary":"big-picture paragraph connecting all the branches"}

branches: 5-7 main branches, each with 3-4 children. crossLinks: note genuine connections to other concepts or subjects.

Subject: ${params.subject}
Level: ${params.level}
Concept: ${params.topic}`,
      };

};

export const paper_dissector: CapabilityPrompt = (params) => {
      return {
        system: `${SAFETY_PREAMBLE}You are a senior ${params.board} examiner and teacher. Always respond with valid JSON only — no markdown fences.`,
        userText: `Dissect this exam question for a student. Respond with exactly this JSON shape:
{"commandWord":"the key command word","commandDefinition":"what this command word requires in 1 sentence","totalMarks":${params.marks || 0},"timeAdvice":"recommended time to spend","parts":[{"label":"Part (a)","marks":4,"what":"what this part tests","howToAnswer":"specific strategy for this part"}],"keyContent":["required knowledge point 1","required knowledge point 2","required knowledge point 3","required knowledge point 4"],"structure":["step 1 of ideal answer","step 2","step 3","step 4"],"examinersTip":"what separates A from B answers","commonMistakes":["mistake students make 1","mistake 2","mistake 3"]}

parts: only include if there are sub-parts; otherwise empty array. keyContent: 4-6 points. structure: 4-6 steps.

Board: ${params.board}
Subject: ${params.subject}
Question: ${params.question}`,
      };

};

export const lang_analyzer: CapabilityPrompt = (params) => {
      return {
        system: `${SAFETY_PREAMBLE}You are an expert English literature and language teacher at ${params.level} level. Always respond with valid JSON only — no markdown fences.`,
        userText: `Analyse this ${params.textType} for a student. Respond with exactly this JSON shape:
{"type":"${params.textType}","tone":[{"label":"tone word","explanation":"why this tone in 1 sentence"}],"structure":[{"feature":"structural feature","effect":"effect on reader"}],"language":[{"device":"literary/language device","example":"quote from text","effect":"analytical effect statement"}],"themes":[{"theme":"theme name","evidence":"how the text develops this theme"}],"audience":"who this is written for","purpose":"main purpose of the text","grade9Points":["what top-band analysis would include 1","2","3","4"],"exampleAnswer":"a model analytical paragraph using P-E-E or similar structure (5-8 sentences)"}

tone: 3-4 tones. structure: 3-5 features. language: 5-7 devices with quotes. themes: 3-4 themes.
Focus: ${params.focus === "language" ? "language devices only (structure and themes minimal)" : params.focus === "structure" ? "structural features only" : "full analysis"}

Text type: ${params.textType}
Level: ${params.level}

Text:
${params.text}`,
      };

};

export const lab_report: CapabilityPrompt = (params) => {
      return {
        system: `${SAFETY_PREAMBLE}You are a science teacher and ${params.board} expert. Always respond with valid JSON only — no markdown fences.`,
        userText: `Generate a structured lab report for this experiment. Respond with exactly this JSON shape:
{"title":"formal experiment title","ibCriteria":"${params.board === "IB" ? "IB IA criteria overview: Personal Engagement, Exploration, Analysis, Evaluation, Communication" : null}","sections":[{"heading":"section name","content":"written content for this section","template":"table template or structured template if applicable, or null"}],"safetyNotes":["safety precaution 1","2","3"],"evaluationCriteria":["what examiners look for 1","2","3","4"]}

sections (in order): Title & Research Question, Introduction & Background, Hypothesis, Variables (IV/DV/CV), Materials & Apparatus, Method, Raw Data Table (template), Processed Data & Analysis, Conclusion, Evaluation & Improvements.
For IB: align to IA criteria. For A-Level: align to required practicals format.

Board: ${params.board}
Subject: ${params.subject}
Experiment: ${params.experiment}
Aim: ${params.aim || "not specified"}
Variables: ${params.variables || "not specified"}
Method summary: ${params.method || "not specified"}`,
      };

};

export const uni_match: CapabilityPrompt = (params) => {
      return {
        system: `${SAFETY_PREAMBLE}You are a university admissions counsellor with expertise in international university applications. Always respond with valid JSON only — no markdown fences.`,
        userText: `Match this student to suitable universities. Respond with exactly this JSON shape:
{"summary":"2-3 sentence honest assessment of this student's profile and prospects","unis":[{"name":"university name","country":"country","fitScore":8,"why":"2 sentence explanation of why this is a good fit","requirements":"entry requirements for their subject","strengths":["strength 1","strength 2","strength 3"],"applyBy":"application deadline or cycle","reach":"match"}],"gaps":["gap to address 1","gap 2","gap 3"],"advice":"2-3 sentence application strategy"}

unis: 8 universities, mix of safety/match/reach. reach: "safety", "match", or "reach".
fitScore: 1-10. requirements: specific grade thresholds. Be honest about chances.

Board: ${params.board}
Grades: ${params.grade}
Field: ${params.field}
Countries: ${JSON.stringify(params.countries)}
Additional: ${params.extra || "none"}`,
      };

};

export const compare: CapabilityPrompt = (params) => {
      const cmpLvl = (params.level as string) || "A-Level";
      const cmpGuide =
        cmpLvl === "GCSE" || cmpLvl === "IGCSE"
          ? "GCSE level: keep language clear and accessible. Criteria should focus on factual differences students can memorise. Verdict should be written in plain English a 15-year-old can quote in an exam."
          : cmpLvl === "IB"
          ? "IB level: adopt a global, multi-perspective approach. Criteria should enable evaluation across different viewpoints. Verdict should be analytical with evaluative language ('to a greater extent…', 'however…') and reference international examples where relevant."
          : cmpLvl === "University"
          ? "University level: engage with theoretical frameworks and scholarly nuance. Criteria should reference academic debates or paradigms. Verdict should demonstrate critical synthesis, acknowledging limitations of simple binary comparison."
          : "A-Level/CBSE level: criteria should enable evaluation and analysis, not just description. Use subject-specific terminology. Verdict should model A-Level evaluative language with a clear overall judgement.";
      return {
        system: `${SAFETY_PREAMBLE}You are an expert academic tutor skilled at building structured comparisons. Always respond with valid JSON only — no markdown fences.`,
        userText: `Build a detailed comparison chart. Respond with exactly this JSON shape:
{"title":"concise comparison title","items":${JSON.stringify(params.items)},"rows":[{"criterion":"criterion name","items":["description for item 1","description for item 2"]}],"similarities":["similarity 1","similarity 2","similarity 3"],"differences":["key difference 1","key difference 2","key difference 3"],"verdict":"2-3 sentence analytical summary of how they compare and what that means for a student studying this"}

rows: 6-8 meaningful criteria. similarities: 3-4 genuine shared features. differences: 3-4 most important contrasts. verdict: analytical, exam-ready insight.
Level: ${cmpLvl}. ${cmpGuide}
${params.criteria ? `Focus criteria on: ${params.criteria}` : "Choose the most academically useful criteria."}
${params.subject ? `Subject context: ${params.subject}` : ""}`,
      };
};

export const source: CapabilityPrompt = (params) => {
      return {
        system: `${SAFETY_PREAMBLE}You are an expert humanities teacher specialising in source analysis (OPCVL, HAPP, reliability frameworks). Always respond with valid JSON only — no markdown fences.`,
        userText: `Analyse this source for exam purposes. Respond with exactly this JSON shape:
{"origin":{"who":"who created it","what":"what type of source","when":"when it was created","context":"historical/political context at the time"},"purpose":"why this source was created","content":"what the source shows/argues in 2-3 sentences","value":{"origin":"value arising from who/when created","purpose":"value arising from why created","content":"value of what it shows"},"limitation":{"origin":"limitation arising from who/when created","purpose":"limitation arising from why created","content":"what the source leaves out or distorts"},"bias":["specific bias 1","specific bias 2","specific bias 3"],"utility":"overall assessment of utility for the stated question in 2-3 sentences","examTip":"one specific tip for using this source type in ${params.subject} exams"}

Be specific and analytical — generic answers score poorly. Reference the actual content throughout.
Subject: ${params.subject}
${params.origin ? `Origin information provided: ${params.origin}` : ""}
${params.question ? `Exam question context: ${params.question}` : ""}

Source text/description:
${params.sourceText}`,
      };

};

export const practice: CapabilityPrompt = (params) => {
      const prDiff = (params.difficulty as string) || "Mixed";
      const prGuide =
        prDiff === "Easy"   ? "Test direct recall and single-step application. All values given. One clear method. Confidence-building for students new to the topic."
        : prDiff === "Hard"  ? "Require multi-step reasoning, non-obvious setup, or synthesis across sub-topics. Unfamiliar contexts, missing steps to infer, or evaluation required. Stretch problems that a top student would find challenging."
        : prDiff === "Mixed" ? "Mix: 2 straightforward recall/application questions, 2 mid-difficulty requiring method choice, 1 harder problem requiring synthesis or multi-step approach."
        :                       "Test application and method selection. Values require substitution. Students must choose the right approach and show working. Standard exam difficulty.";
      const prMarks = prDiff === "Hard" ? 6 : prDiff === "Medium" ? 4 : 3;
      const prQtype = params.qtype as string | undefined;
      const prQtypeGuide = !prQtype ? ""
        : prQtype === "Worked problem"      ? "\nFormat: structured numeric or algebraic problem requiring step-by-step working. Show all substitution, algebra, and units in the solution."
        : prQtype === "Short answer"        ? "\nFormat: concise factual or conceptual questions. Answer in 1-3 sentences or a brief calculation. No extended working required."
        : prQtype === "Essay / evaluation"  ? "\nFormat: discursive questions using command words like Evaluate, Discuss, Assess, To what extent. Problems should require structured argument, evidence, and a judgement."
        : prQtype === "Data analysis"       ? "\nFormat: provide a small dataset, graph description, or experimental result in the problem. Student must interpret, calculate, or draw conclusions from data."
        : "";
      return {
        system: `${SAFETY_PREAMBLE}You are an expert ${params.subject} teacher and examiner. Always respond with valid JSON only — no markdown fences.`,
        userText: `Generate a practice problem set. Respond with exactly this JSON shape:
{"topic":"precise topic title","difficulty":"${prDiff}","problems":[{"number":1,"problem":"full problem statement with all necessary information","hint":"one-line hint that guides without giving away the method","marks":${prMarks},"solution":"complete step-by-step worked solution — number each step, show all working, explain the WHY at non-obvious steps"}]}

Generate exactly ${params.count || 5} problems.
Difficulty: ${prDiff}. ${prGuide}${prQtypeGuide}
marks: reflect actual exam mark allocation for ${params.level}
solution: complete enough that a student who got it wrong can fully understand — no skipped steps

Subject: ${params.subject}
Topic: ${params.topic}
Level: ${params.level}`,
      };
};

export const predict: CapabilityPrompt = (params) => {
      return {
        system: `${SAFETY_PREAMBLE}You are an experienced ${params.subject || "academic"} examiner at ${params.level} level. You deeply understand past paper patterns, examiner reports, and marking trends. Always respond with valid JSON only.`,
        userText: `Predict the most likely exam questions for the topic below. Respond with exactly this JSON:
{"topic":"${params.topic}","level":"${params.level}","questions":[{"q":"full exam question as it would appear on the paper","marks":0,"type":"Short Answer|Essay|Analysis|Evaluation|Problem","why":"why this question is likely — examiner trends, frequency, curriculum emphasis"}],"hotTopics":["topic that appears often","..."],"commandWords":["Explain","Evaluate","..."],"examTip":"one specific strategic tip"}

Generate 6-8 realistic exam questions. Vary question types (recall, analysis, evaluation, application). Marks: 2-20 depending on type. hotTopics: 4-6 items. commandWords: 4-6 specific command words used for this topic.
Topic: ${params.topic}
Subject: ${params.subject || "General"}
Level: ${params.level}`,
      };

};

export const memory_palace: CapabilityPrompt = (params) => {
      return {
        system: `${SAFETY_PREAMBLE}You are a memory technique expert specialising in the Method of Loci (memory palace). You create vivid, memorable spatial journeys through familiar locations. Always respond with valid JSON only.`,
        userText: `Create a memory palace for the items below. Use a familiar location (house, school corridor, high street) as the palace. Each station is a specific room or spot. Make images bizarre, vivid, and action-based — they stick better.

Respond with exactly this JSON:
{"topic":"${params.topic || "Items"}","palaceName":"name of the chosen location","stations":[{"number":1,"location":"specific spot in the location","item":"the item to memorise","image":"bizarre vivid image involving the item at this location","story":"one sentence narrative connecting the image to the item's meaning"}],"reviewTip":"how to review this palace for maximum retention"}

Create one station per item. Items to memorise:
${params.items}`,
      };

};

export const analogy: CapabilityPrompt = (params) => {
      return {
        system: `${SAFETY_PREAMBLE}You are a master educator who explains complex academic concepts through powerful, memorable analogies. Always respond with valid JSON only.`,
        userText: `Generate 3 progressively creative analogies for the concept below. The first should be the most intuitive, the third the most surprising and memorable.

Respond with exactly this JSON:
{"concept":"${params.concept}","analogies":[{"title":"short name for this analogy","analogy":"the analogy explained in 2-3 sentences, making it vivid and concrete","breakdown":"exactly how each element of the analogy maps to the concept","limitation":"where this analogy breaks down or misleads — critical for exam accuracy"}],"keyInsight":"the single deepest insight the analogies collectively reveal","examTip":"how understanding via analogy helps in exams"}

Subject context: ${params.subject || "General academic"}
Concept: ${params.concept}`,
      };

};

export const case_study: CapabilityPrompt = (params) => {
      const csLvl = (params.level as string) || "A-Level";
      const csGuide =
        csLvl === "GCSE"       ? "Write at GCSE level: clear, structured, straightforward. Use simple frameworks. Explain any business terms used. Recommendations should be practical and 2-3 sentences each."
        : csLvl === "IB"       ? "Write at IB Business Management level: apply frameworks rigorously, consider global and ethical dimensions. Recommendations must evaluate trade-offs across multiple stakeholders."
        : csLvl === "University" ? "Write at undergraduate strategy level: apply Porter, BCG, Ansoff, or financial logic where relevant. Recommendations must address risk, implementation, and measurable success metrics."
        :                          "Write at A-Level Business/Economics level: evaluate rather than describe — weigh short vs. long-term, consider stakeholder perspectives, address the command word directly.";
      return {
        system: `${SAFETY_PREAMBLE}You are a senior business studies and economics teacher with expertise in case study analysis using multiple frameworks. Always respond with valid JSON only.`,
        userText: `Analyse the following case study and respond with exactly this JSON:
{"title":"short descriptive title","summary":"2-3 sentence summary of the case","situation":"background context and current position","problem":"the core problem or decision the business/entity faces","stakeholders":["stakeholder 1","..."],"analysis":[{"framework":"framework name","points":["analysis point 1","point 2","point 3","point 4"]}],"recommendations":["specific actionable recommendation 1","recommendation 2","recommendation 3"],"conclusion":"evaluative judgement that weighs the evidence","examTip":"specific tip for answering this type of case study in exams"}

Level: ${csLvl}. ${csGuide}
Framework: ${params.framework === "Auto-select best" ? "choose the most appropriate for this case" : params.framework}
${params.question ? `Exam question to address: ${params.question}` : ""}
Case study:
${params.caseText}`,
      };
};

export const timeline: CapabilityPrompt = (params) => {
      const tlLvl = (params.level as string) || "A-Level";
      const tlGuide =
        tlLvl === "GCSE" || tlLvl === "IGCSE"
          ? "GCSE level: descriptions in 1-2 clear sentences. significance: one concrete consequence a student can memorise. examTip: focus on cause/effect chains and how to reference dates in essays."
          : tlLvl === "IB"
          ? "IB level: descriptions should note historical perspectives and multi-causal explanations. significance: address both short and long-term consequences. examTip: connect events to Paper 1/2 themes and TOK links."
          : tlLvl === "University"
          ? "University level: include historiographical debate where relevant. significance: engage with scholarly interpretation of each event's importance. examTip: advise how timelines support argument-led essays, not narrative ones."
          : "A-Level/CBSE level: descriptions should use analytical language. significance: explain the event's role in a broader causal chain. examTip: advise students on how to weave chronology into evaluative exam answers.";
      return {
        system: `${SAFETY_PREAMBLE}You are an expert ${params.subject} teacher who creates detailed annotated timelines. Always respond with valid JSON only.`,
        userText: `Create a comprehensive annotated timeline for the topic below. Respond with exactly this JSON:
{"title":"full descriptive title","period":"date range e.g. 1789–1815","events":[{"date":"specific date or year range","title":"name of event","description":"explanation of what happened","significance":"why this event matters — consequence and importance","category":"Political|Economic|Social|Military|Scientific|Other"}],"themes":["overarching theme 1","theme 2","theme 3","theme 4"],"examTip":"how to use timelines effectively in exam answers for this level"}

Generate 10-14 key events in chronological order. Vary categories for a complete picture.
Level: ${tlLvl}. ${tlGuide}
Subject: ${params.subject}
Topic: ${params.topic}`,
      };
};

export const reading: CapabilityPrompt = (params) => {
      return {
        system: `${SAFETY_PREAMBLE}You are an expert ${params.subject} teacher specialising in close reading, textual analysis, and comprehension. Always respond with valid JSON only.`,
        userText: `Analyse the passage below and respond with exactly this JSON:
{"title":"short descriptive title for the passage","summary":"3-4 sentence objective summary","tone":"the dominant tone(s) of the passage","themes":["theme 1","theme 2","theme 3"],"devices":[{"name":"device name","example":"short quote or description from text","effect":"analytical explanation of the intended effect"}],"questions":[{"q":"comprehension/analysis question","level":"Literal|Inference|Analysis|Evaluation","modelAnswer":"full model answer to this question"}],"vocabHighlights":[{"word":"word from text","meaning":"definition in context"}],"examTip":"specific tip for this passage type in exams"}

devices: 4-6 literary/language devices. questions: 4 questions at different levels (one each: Literal, Inference, Analysis, Evaluation). vocabHighlights: 6-8 words.
${params.question ? `Focus on exam question: ${params.question}` : ""}
Subject: ${params.subject}
Passage:
${params.passage}`,
      };

};

export const grammar: CapabilityPrompt = (params) => {
      const grLvl = (params.level as string) || "A-Level";
      const grStandard =
        grLvl === "GCSE" || grLvl === "IGCSE"
          ? "Judge against GCSE standard: clear topic sentences, correct punctuation and spelling, simple connectives used accurately, basic subject-specific vocabulary. Do not penalise for lack of university-level complexity."
          : grLvl === "University" || grLvl === "AP"
          ? "Judge against undergraduate standard: sophisticated argument structure, precise academic register, varied syntax, strong hedging language, authoritative evidence integration, zero informal register."
          : grLvl === "IB HL" || grLvl === "IB SL"
          ? "Judge against IB standard: structured analytical prose, precise command word awareness, nuanced vocabulary, clear thesis-argument-evidence flow, formal academic register throughout."
          : "Judge against A-Level/IGCSE standard: clear argument structure, accurate use of subject-specific vocabulary, analytical rather than descriptive tone, well-constructed paragraphs with evidence and explanation.";
      return {
        system: `${SAFETY_PREAMBLE}You are an expert academic writing coach who helps students improve grammar, style, vocabulary, and academic register. Always respond with valid JSON only.`,
        userText: `Check the writing below for grammar, style, vocabulary, and academic register issues. Respond with exactly this JSON:
{"overallScore":0,"band":"Excellent|Good|Developing|Needs work","issues":[{"type":"Grammar|Style|Vocabulary|Punctuation|Structure","original":"the problematic phrase or sentence","suggestion":"improved version","explanation":"why this is better"}],"strengths":["strength 1","strength 2","strength 3"],"rewrite":"full rewritten version of the text with all improvements applied","academicPhrases":["useful academic phrase 1","phrase 2","phrase 3","phrase 4","phrase 5"],"examTip":"one specific writing tip for ${params.purpose} writing at ${grLvl} level"}

overallScore: 0-100 calibrated for ${grLvl}. Identify up to 8 most important issues, prioritised by impact on marks.
${grStandard}
Writing type: ${params.purpose}
Level: ${grLvl}
Text:
${params.text}`,
      };
};

export const study_guide: CapabilityPrompt = (params) => {
      const sgLvl = (params.level as string) || "A-Level";
      const sgDepth = (params.depth as string) || "Deep Dive";
      const sgLvlGuide =
        sgLvl === "GCSE" || sgLvl === "IGCSE"
          ? "GCSE depth: mustKnow items should be definitions, key facts, and simple processes. Explanations: accessible, no assumed prior knowledge. Exam tip: focus on command words and mark allocation."
          : sgLvl === "JEE" || sgLvl === "CBSE Class 12" || sgLvl === "CBSE Class 11"
          ? "JEE/CBSE depth: mustKnow should include key formulae, derivations, and standard problem types. Sections should cover theory AND numerical application. Exam tip: focus on application speed and common traps."
          : sgLvl === "IB"
          ? "IB depth: mustKnow should include conceptual frameworks, evaluation language, and command words. Sections should cover both content and how to write about it analytically. Exam tip: emphasise how to answer 'evaluate' and 'discuss' commands."
          : "A-Level depth: mustKnow should include precise definitions, key formulae, and mechanisms. Sections should explain WHY, not just what. commonMistakes should target A-Level-specific errors. Exam tip: focus on synoptic links and evaluation.";
      const sgDepthGuide =
        sgDepth === "Quick Scan"
          ? "MODE — Quick Scan: keep section content to 2-3 sentences max. keyPoints: terse one-liners only. mustKnow: bare minimum 4-5 items. quickReview: 10 punchy one-liners to flash through in 2 minutes. Prioritise speed of absorption over completeness."
          : sgDepth === "Exam-Ready"
          ? "MODE — Exam-Ready: every section must reference what examiners specifically award marks for. mustKnow: include exact phrases/keywords examiners reward. commonMistakes: frame as 'students lose marks when…'. examTip: give a specific marking-scheme insight, not general advice. quickReview: write as exam-ready bullet points a student would recite under pressure."
          : "MODE — Deep Dive: full explanations with 4-6 sentences per section content and real examples. keyPoints should explain the WHY behind each point. mustKnow should include reasoning, not just the fact. For first-time learning or filling knowledge gaps.";
      return {
        system: `${SAFETY_PREAMBLE}You are a master ${params.subject || "academic"} teacher who creates comprehensive, exam-focused study guides. Always respond with valid JSON only.`,
        userText: `Create a complete study guide for the topic below. Respond with exactly this JSON:
{"topic":"${params.topic}","overview":"3-4 sentence overview of what this topic covers and why it matters at ${sgLvl}","sections":[{"title":"section title","content":"clear explanation","keyPoints":["key point 1","key point 2","key point 3"]}],"mustKnow":["essential fact/formula/definition 1","..."],"commonMistakes":["common mistake 1","..."],"quickReview":["one-line review point 1","..."],"examTip":"specific exam strategy for this topic at ${sgLvl}"}

sections: 4-6 logical sections. mustKnow: 5-7 items. commonMistakes: 4-5 items. quickReview: 8-10 one-liners.
${sgLvlGuide}
${sgDepthGuide}
Subject: ${params.subject || "General"}
Level: ${sgLvl}
Mode: ${sgDepth}
Topic: ${params.topic}`,
      };
};

export const exam_strategy: CapabilityPrompt = (params) => {
      return {
        system: `${SAFETY_PREAMBLE}You are an experienced exam coach who has helped thousands of students optimise their exam performance through strategic time management and technique. Always respond with valid JSON only.`,
        userText: `Create a personalised exam strategy. Respond with exactly this JSON:
{"subject":"${params.subject}","duration":${params.duration},"sections":[{"name":"section name","timeAllocation":"X minutes","approach":"how to approach this section strategically","pitfalls":["common pitfall 1","pitfall 2"]}],"timeManagement":"overall time management strategy for this specific exam","nerveControl":["technique 1","technique 2","technique 3"],"lastMinuteTips":["tip 1","tip 2","tip 3","tip 4"],"examDayChecklist":["item 1","item 2","..."],"examTip":"the single most important strategic insight for this exam"}

${params.format ? `Paper format: ${params.format}` : "Infer likely sections from the subject."}
${params.concerns ? `Student's concerns: ${params.concerns}` : ""}
Duration: ${params.duration} minutes
Subject: ${params.subject}`,
      };

};

export const concept_connect: CapabilityPrompt = (params) => {
      const ccSubject = (params.subject as string) || "";
      const ccLevel   = (params.level as string) || "A-Level";
      const ccCtx     = ccSubject
        ? `The student is studying ${ccSubject} at ${ccLevel}. Prioritise connections that are exam-relevant for this subject — connections that unlock essay arguments, evaluation points, or synoptic marks. Still find unexpected cross-subject links, but anchor the exam angles specifically to ${ccSubject}.`
        : `Find connections that are broadly useful across subjects. Prioritise links that are intellectually surprising and exam-generative at ${ccLevel} level.`;
      return {
        system: `${SAFETY_PREAMBLE}You are a brilliant interdisciplinary teacher who finds unexpected connections between concepts across and within subjects. Always respond with valid JSON only.`,
        userText: `Find deep connections between the two concepts below. Respond with exactly this JSON:
{"conceptA":"${params.conceptA}","conceptB":"${params.conceptB}","links":[{"type":"Structural|Causal|Analogical|Historical|Mathematical|Philosophical","description":"how these concepts connect via this type of link","example":"a specific concrete example illustrating this connection"}],"deepInsight":"the most surprising or profound insight this connection reveals","crossSubjectValue":"how understanding this connection helps across multiple subjects or disciplines","examAngles":["exam angle this connection enables 1","angle 2","angle 3"],"examTip":"how to use cross-concept connections in exam answers to gain marks at ${ccLevel}"}

Find 3-4 distinct types of connections. Be intellectually ambitious — the most valuable connections are often unexpected.
${ccCtx}
Concept A: ${params.conceptA}
Concept B: ${params.conceptB}`,
      };
};

export const model_answer: CapabilityPrompt = (params) => {
      const board = (params.examBoard as string) || "";
      const boardGuide = board
        ? `Exam board: ${board}. Write in the exact style ${board} rewards — use their specific command word conventions, mark allocation logic, and common examiner commentary.`
        : "";
      return {
        system: `${SAFETY_PREAMBLE}You are an expert ${params.subject || "academic"} examiner who writes model answers that demonstrate exactly what full marks requires. Always respond with valid JSON only.`,
        userText: `Write a model answer for the exam question below. Respond with exactly this JSON:
{"question":"${params.question}","marks":${params.marks},"modelAnswer":"the complete model answer written at full-marks level for ${params.level}${board ? ` (${board})` : ""} — appropriate academic language, specific evidence, structured argument","markingPoints":["key marking point 1","point 2","point 3"],"keywordsRequired":["keyword/phrase examiners specifically reward 1","keyword 2","keyword 3"],"whatMakesItGood":["specific quality 1","quality 2","quality 3"],"structureGuide":"how this answer is structured and why — so the student can replicate it","examTip":"one insight into what examiners reward most for this question type at ${board || params.level}"}

markingPoints: 4-6 key marking points this model answer covers.
keywordsRequired: 3-5 specific words, phrases, or concepts the examiner's mark scheme explicitly rewards — things a student MUST include for full marks.
Answer length: appropriate for ${params.marks} marks at ${params.level}.
${boardGuide}
Subject: ${params.subject || "General"}
Level: ${params.level}
Marks: ${params.marks}
Question: ${params.question}`,
      };
};

export const papers_explain: CapabilityPrompt = (params) => {
      return {
        system: `${SAFETY_PREAMBLE}You are a patient, expert tutor who explains why exam answers are correct in a clear, memorable way. Always respond with valid JSON only.`,
        userText: `A student got this question wrong. Explain why the correct answer is right. Respond with exactly this JSON:
{"explanation":"a clear 3-5 sentence explanation of WHY the correct answer is right — step by step reasoning, not just restating the answer. Use the student's subject language.","keyConcept":"the single most important concept or rule this question is testing — one sentence","examTip":"one specific tip for handling this type of question in an exam — how to spot it, approach it, or avoid getting it wrong"}

Question: ${params.question}
Correct answer: ${params.correct}
Topic: ${params.topic || "general"}`,
      };

};

export const redemption_set: CapabilityPrompt = (params) => {
      // Recovery system (Integrity Sprint): 3 fresh questions on a topic the
      // student previously got wrong. Passing ≥2 clears the open mistakes on
      // that topic — the v2 engine scores the clearing.
      return {
        system: `${SAFETY_PREAMBLE}You are an expert ${params.subject} examiner writing short targeted re-tests. Always respond with valid JSON only — no markdown fences.`,
        userText: `Write exactly 3 multiple-choice questions testing "${params.topic}" in ${params.subject}${params.board ? ` (${params.board} style)` : ""}. The student previously answered this topic wrong — the questions must genuinely test understanding, not recall of one phrasing. Vary the angle across the 3 questions. Respond with exactly this JSON:
{"questions":[{"q":"the question text","opts":["option A","option B","option C","option D"],"ans":0,"topic":"${params.topic}"}]}

ans is the 0-based index of the correct option. Exactly 3 questions, exactly 4 options each. Make distractors plausible — common misconceptions, not obviously wrong answers.`,
      };

};

