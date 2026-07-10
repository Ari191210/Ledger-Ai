"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { GooeyInput } from "@/components/ui/gooey-input";
import GlowHorizonFM from "@/components/ui/glow-horizon";
import { ProductWalkthrough } from "@/components/ui/product-walkthrough";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { useGSAP } from "@gsap/react";
import { BeforeAfterSection } from "@/components/ui/before-after-section";
import { StudentJourneySection } from "@/components/ui/student-journey";

const HeroInteractiveDemo = dynamic(
  () => import("@/components/ui/hero-interactive-demo").then(m => ({ default: m.HeroInteractiveDemo })),
  { ssr: false }
);
const ElasticSlider = dynamic(
  () => import("@/components/ui/elastic-slider"),
  { ssr: false }
);

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, useGSAP);

const FEATS = [
  { tag: "α", ttl: "Chapter Gap Tracker",        body: "See exactly how many chapters you're behind, and how many hours of daily study it takes to close the gap before your exam.", extra: "Recalculates every time you log a session or skip one. Works backwards from your exam date to show the exact cost of procrastination in marks." },
  { tag: "β", ttl: "Best Study Time Finder",     body: "We find the time of day when your focus peaks and schedule your hardest subject there, not some generic morning slot that doesn't work for you.", extra: "Log a few sessions and Ledger learns when your accuracy actually peaks, then puts your hardest subject in that slot." },
  { tag: "γ", ttl: "Spaced Revision Engine",     body: "Past-paper questions come back exactly when you're about to forget them. Not by date, not by topic, but by the moment your brain needs them most.", extra: "Each correct answer pushes the next review further out. Each wrong answer resets the interval. The same Ebbinghaus spaced repetition method used by medical students and high performers worldwide." },
  { tag: "δ", ttl: "Peer Struggle Heatmap",      body: "A map of which chapters students on your board find hardest. You are not alone on Conic Sections.", extra: "Builds from struggle data as Ledger students complete sessions. The more the platform is used, the sharper it shows you where to focus." },
  { tag: "ε", ttl: "Syllabus Parser",            body: "Upload your school's PDF syllabus. We read it and build your full year plan in seconds, not a template you then spend an hour editing.", extra: "Works on handwritten notes, scanned PDFs, and messy Word docs. Extracts chapters, topics, and exam dates even when the formatting is all over the place." },
  { tag: "ζ", ttl: "Study Pact",                 body: "Lock a revision session with a friend. If either of you skips, both streaks reset. The only study feature that works because it is uncomfortable.", extra: "Letting someone else down turns out to be more motivating than personal discipline. That is the whole design." },
  { tag: "η", ttl: "Score to College Predictor", body: "Score X on this week's test and these colleges move into reach. Score Y and they move out. Built on published cutoff data.", extra: "Covers JEE, NEET, CUET, and board exams. Shows rolling percentile so you know if you are safely inside the cutoff or right on the margin." },
] as const;

const TICKER = [
  "Know your score. Know your gaps.",
  "Tracks your exam readiness every time you use any tool",
  "Every wrong answer becomes a scheduled revision",
  "Built for CBSE, ICSE, IB, IGCSE, A-Level, JEE, NEET, SAT",
  "One login. Every tool you need.",
  "48 tools · one score · one streak",
];

const CAT_COLOR: Record<string, string> = {
  PLAN:     "var(--sage)",
  LEARN:    "var(--slate)",
  WRITE:    "var(--ochre)",
  PRACTISE: "var(--cinnabar-ink)",
  FUTURE:   "var(--plum)",
  TRACK:    "var(--teal)",
};

function scorePreviewCalc(papers: number, hasSyllabus: boolean, mistakesPerWeek: number, streak: number) {
  const pqa = papers > 0 ? Math.min(400, Math.round(papers * 18 + 50)) : 0;
  const syl = hasSyllabus ? 150 : 30;
  const mis = Math.max(0, Math.round(200 - mistakesPerWeek * 7));
  const con = Math.min(150, Math.round(streak * 7.5));
  return Math.min(1000, pqa + syl + mis + con);
}

function scoreTierLabel(n: number) {
  if (n >= 800) return "Exam Ready";
  if (n >= 600) return "Strong";
  if (n >= 400) return "Developing";
  if (n >= 200) return "Building";
  return "Beginner";
}

const TIERS = [
  { label: "Beginner",   min: 0,   max: 199  },
  { label: "Building",   min: 200, max: 399  },
  { label: "Developing", min: 400, max: 599  },
  { label: "Strong",     min: 600, max: 799  },
  { label: "Exam Ready", min: 800, max: 1000 },
];

const S = {
  cap:       { fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "var(--ink-3)" },
  capAccent: { fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "var(--cinnabar-ink)" },
  h2:        { fontFamily: "var(--serif)", fontSize: "clamp(26px,3.5vw,40px)", fontStyle: "normal" as const, fontWeight: 700, color: "var(--ink)", letterSpacing: "0.04em", lineHeight: 1.2, textWrap: "balance" as const },
  body:      { fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink-3)", lineHeight: 1.8, textWrap: "pretty" as const },
  rule:      { height: 1, background: "var(--rule)", width: "100%" },
  border:    "1px solid color-mix(in srgb, var(--ink) 8%, transparent)",
  borderInk: "1px solid var(--ink)",
};

export default function Home() {
  const [today,          setToday]          = useState("");
  const [expandedFeat,   setExpandedFeat]   = useState<number | null>(null);
  const [papers,         setPapers]         = useState(3);
  const [hasSyllabus,    setHasSyllabus]    = useState(false);
  const [mistakesPerWeek,setMistakesPerWeek]= useState(8);
  const [streak,         setStreak]         = useState(5);
  const [toolSearch,     setToolSearch]     = useState("");

  const [headline,       setHeadline]       = useState("Know exactly how ready you are for your exams");

  // PostHog A/B: hero headline variant
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).posthog) {
      const variant = (window as any).posthog.getFeatureFlag("hero-headline-variant");
      if (variant === "problem-aware") {
        setHeadline("Worried you’re behind on your syllabus?");
      } else if (variant === "outcome") {
        setHeadline("From confused to exam-ready in 6 weeks.");
      }
      // default: keep "Know exactly how ready you are for your exams"
    }
  }, []);


  const containerRef  = useRef<HTMLDivElement>(null);
  const scoreNumRef   = useRef<HTMLDivElement>(null);
  const prevScoreRef  = useRef(scorePreviewCalc(3, false, 8, 5));

  const scorePreview = scorePreviewCalc(papers, hasSyllabus, mistakesPerWeek, streak);

  useEffect(() => {
    setToday(new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" }));
  }, []);

  /* Scroll progress bar */
  useEffect(() => {
    const bar = document.getElementById("lp-scroll-bar");
    if (!bar) return;
    const onScroll = () => {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = total > 0 ? `${Math.min(100, (scrolled / total) * 100)}%` : "0%";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Navbar hide on scroll-down, show on scroll-up */
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>(".lp-header");
    if (!nav) return;
    nav.style.transition = "transform 0.35s cubic-bezier(0.16,1,0.3,1)";
    let last = window.scrollY;
    const onScroll = () => {
      const cur = window.scrollY;
      if (cur < 80) {
        nav.style.transform = "translateX(-50%) translateY(0)";
      } else if (cur > last) {
        nav.style.transform = "translateX(-50%) translateY(calc(-100% - 24px))";
      } else {
        nav.style.transform = "translateX(-50%) translateY(0)";
      }
      last = cur;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Animate score number on change */
  useEffect(() => {
    if (!scoreNumRef.current) return;
    const from = prevScoreRef.current;
    const to   = scorePreview;
    prevScoreRef.current = scorePreview;
    const obj = { val: from };
    gsap.to(obj, {
      val: to, duration: 0.5, ease: "power3.out",
      onUpdate() { if (scoreNumRef.current) scoreNumRef.current.textContent = String(Math.round(obj.val)); },
    });
  }, [scorePreview]);

  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add({ reduceMotion: "(prefers-reduced-motion: reduce)" }, (ctx) => {
      const reduceMotion = ctx.conditions?.reduceMotion ?? false;

      /* ── PRE-HIDE: set all scroll-animated elements invisible BEFORE anything fires ── */
      if (!reduceMotion) {
        gsap.set(".reveal-up",    { autoAlpha: 0, y: 48, clipPath: "inset(0 0 20% 0)" });
        gsap.set(".reveal-body",  { autoAlpha: 0, y: 40 });
        gsap.set(".bento-card",   { autoAlpha: 0, y: 40, scale: 0.96 });
        gsap.set(".feat-card",    { autoAlpha: 0, y: 56,  scale: 0.9 });
        gsap.set(".tool-item",    { autoAlpha: 0, x: -32 });
        gsap.set(".footer-col",   { autoAlpha: 0, y: 44 });
        gsap.set(".anim-divider", { scaleX: 0, transformOrigin: "left center" });
        gsap.set(".cta-content > *", { autoAlpha: 0, y: 40 });
      }

      /* ── ScrollToPlugin: smooth scroll all #anchor links ── */
      const handleAnchorClick = (e: Event) => {
        const a = e.currentTarget as HTMLAnchorElement;
        const hash = a.getAttribute("href");
        if (!hash?.startsWith("#")) return;
        const target = document.querySelector(hash);
        if (!target) return;
        e.preventDefault();
        gsap.to(window, { scrollTo: { y: target, offsetY: 60 }, duration: reduceMotion ? 0 : 1.1, ease: "power3.inOut" });
      };
      const anchors = containerRef.current?.querySelectorAll<HTMLAnchorElement>('a[href^="#"]') ?? [];
      anchors.forEach(a => a.addEventListener("click", handleAnchorClick));

      /* ── Hero entrance ── */
      if (reduceMotion) {
        gsap.set([".hero-ctas > *", ".hero-scroll"], { autoAlpha: 1, y: 0, scale: 1 });
      } else {
        gsap.timeline({ defaults: { ease: "power3.out" } })
          .fromTo(".hero-ctas > *",
            { autoAlpha: 0, y: 20, scale: 0.94 },
            { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.1 })
          .fromTo(".hero-scroll",
            { autoAlpha: 0, y: 10 },
            { autoAlpha: 1, y: 0, duration: 0.5 }, "-=0.2");
      }

      if (reduceMotion) {
        return () => anchors.forEach(a => a.removeEventListener("click", handleAnchorClick));
      }

      /* ── Hero h1 parallax on mouse ── */
      const heroEl = containerRef.current?.querySelector(".hero-section");
      const onHeroMove = (e: Event) => {
        const { clientX, clientY } = e as MouseEvent;
        const x = (clientX / window.innerWidth  - 0.5) * 18;
        const y = (clientY / window.innerHeight - 0.5) * 10;
        gsap.to(".hero-h1", { x, y, duration: 2.0, ease: "power2.out", overwrite: "auto" });
      };
      const onHeroLeave = () => gsap.to(".hero-h1", { x: 0, y: 0, duration: 1.6, ease: "power3.out" });
      heroEl?.addEventListener("mousemove", onHeroMove);
      heroEl?.addEventListener("mouseleave", onHeroLeave);

      /* ── Hero content parallax on scroll ── */
      gsap.to(".hero-content", {
        y: -90, ease: "none",
        scrollTrigger: { trigger: ".hero-section", start: "top top", end: "+=800", scrub: 2 },
      });

      /* ── Section dividers draw in ── */
      gsap.utils.toArray<HTMLElement>(".anim-divider").forEach(el => {
        gsap.to(el, {
          scaleX: 1, duration: 1.2, ease: "power2.inOut",
          scrollTrigger: { trigger: el, start: "top 94%", once: true },
        });
      });

      /* ── Section headings: clip-path reveal ── */
      gsap.utils.toArray<HTMLElement>(".reveal-up").forEach(el => {
        gsap.to(el, {
          autoAlpha: 1, y: 0, clipPath: "inset(0 0 0% 0)", duration: 0.85, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
        });
      });

      /* ── Body paragraphs ── */
      gsap.utils.toArray<HTMLElement>(".reveal-body").forEach((el, i) => {
        gsap.to(el, {
          autoAlpha: 1, y: 0, duration: 0.8, ease: "power2.out", delay: i * 0.06,
          scrollTrigger: { trigger: el, start: "top 92%", once: true },
        });
      });

      /* ── Bento cards: Y + scale reveal ── */
      gsap.utils.toArray<HTMLElement>(".bento-card").forEach((el, i) => {
        gsap.to(el, {
          autoAlpha: 1, y: 0, scale: 1, duration: 0.9, ease: "power3.out",
          delay: i * 0.12,
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
          clearProps: "transform,opacity,visibility",
        });
      });

      /* ── Feature cards: staggered wave ── */
      gsap.utils.toArray<HTMLElement>(".feat-card").forEach((el, i) => {
        gsap.to(el, {
          autoAlpha: 1, y: 0, scale: 1, duration: 0.85, ease: "power3.out", delay: i * 0.1,
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
          clearProps: "transform,opacity,visibility",
        });
      });

      /* ── Tool cards — scattered random-order slide ── */
      gsap.to(".tool-item", {
        autoAlpha: 1, x: 0, duration: 0.6,
        stagger: { each: 0.025, from: "random" },
        ease: "power2.out",
        scrollTrigger: { trigger: "#tools", start: "top 80%", once: true },
        clearProps: "opacity,transform,visibility",
      });

      /* ── Section inner scrub parallax ── */
      gsap.utils.toArray<HTMLElement>(".lp-inner").forEach(el => {
        gsap.fromTo(el,
          { y: 50 },
          { y: 0, ease: "none",
            scrollTrigger: { trigger: el.parentElement, start: "top 95%", end: "top 0%", scrub: 2 } }
        );
      });

      /* ── Footer columns ── */
      gsap.utils.toArray<HTMLElement>(".footer-col").forEach((el, i) => {
        gsap.to(el, {
          autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out", delay: i * 0.12,
          scrollTrigger: { trigger: el, start: "top 92%", once: true },
          clearProps: "opacity,transform,visibility",
        });
      });

      /* ── CTA section ── */
      gsap.to(".cta-content > *", {
        autoAlpha: 1, y: 0, duration: 0.85, stagger: 0.14, ease: "power3.out",
        scrollTrigger: { trigger: ".cta-section", start: "top 82%", once: true },
      });

      /* ── Hero glow fade on scroll exit ── */
      gsap.to(".hero-section", {
        "--hero-glow-opacity": 0,
        ease: "power1.in",
        scrollTrigger: { trigger: ".hero-section", start: "center top", end: "bottom top", scrub: 1.5 },
      });

      /* ── Hover micro-interactions ── */
      const hoverListeners: Array<() => void> = [];
      const addHover = (el: HTMLElement, enterVars: gsap.TweenVars, leaveVars: gsap.TweenVars) => {
        const onEnter = () => gsap.to(el, { ...enterVars, overwrite: "auto" });
        const onLeave = () => gsap.to(el, { ...leaveVars, overwrite: "auto" });
        el.addEventListener("mouseenter", onEnter);
        el.addEventListener("mouseleave", onLeave);
        hoverListeners.push(() => {
          el.removeEventListener("mouseenter", onEnter);
          el.removeEventListener("mouseleave", onLeave);
        });
      };

      /* Bento cards — skip .bento-tilt ones: the 3D tilt block below owns their
         hover, and doubled handlers overwrite each other's tweens (no tilt at all) */
      gsap.utils.toArray<HTMLElement>(".bento-card:not(.bento-tilt)").forEach(el =>
        addHover(el,
          { y: -6, scale: 1.02, duration: 0.28, ease: "power2.out" },
          { y:  0, scale: 1,    duration: 0.5,  ease: "power3.out" }
        )
      );

      /* Feature cards — lift + Greek letter scale */
      gsap.utils.toArray<HTMLElement>(".feat-card").forEach(el => {
        const letter = el.querySelector<HTMLElement>(".feat-letter");
        const onEnter = () => {
          gsap.to(el, { y: -6, scale: 1.02, duration: 0.28, ease: "power2.out", overwrite: "auto" });
          if (letter) gsap.to(letter, { scale: 1.15, color: "var(--cinnabar-ink)", duration: 0.22, ease: "power2.out", overwrite: "auto" });
        };
        const onLeave = () => {
          gsap.to(el, { y: 0, scale: 1, duration: 0.45, ease: "power3.out", overwrite: "auto" });
          if (letter) gsap.to(letter, { scale: 1, color: "var(--cinnabar-ink)", duration: 0.35, ease: "power3.out", overwrite: "auto" });
        };
        el.addEventListener("mouseenter", onEnter);
        el.addEventListener("mouseleave", onLeave);
        hoverListeners.push(() => {
          el.removeEventListener("mouseenter", onEnter);
          el.removeEventListener("mouseleave", onLeave);
        });
      });

      /* Nav links — y lift */
      gsap.utils.toArray<HTMLElement>(".lp-nav-link").forEach(el =>
        addHover(el,
          { y: -2, duration: 0.2, ease: "power2.out" },
          { y:  0, duration: 0.3, ease: "power3.out" }
        )
      );

      /* Hero CTA buttons */
      gsap.utils.toArray<HTMLElement>(".hero-cta-btn").forEach(el => {
        const onEnter = () => gsap.to(el, { y: -3, scale: 1.04, duration: 0.25, ease: "power2.out", overwrite: "auto" });
        const onLeave = () => gsap.to(el, { y:  0, scale: 1,    duration: 0.4,  ease: "power3.out", overwrite: "auto" });
        const onDown  = () => gsap.to(el, { scale: 0.97, duration: 0.1, ease: "power2.in", overwrite: "auto" });
        const onUp    = () => gsap.to(el, { scale: 1.04, duration: 0.15, ease: "power2.out", overwrite: "auto" });
        el.addEventListener("mouseenter", onEnter);
        el.addEventListener("mouseleave", onLeave);
        el.addEventListener("mousedown",  onDown);
        el.addEventListener("mouseup",    onUp);
        hoverListeners.push(() => {
          el.removeEventListener("mouseenter", onEnter);
          el.removeEventListener("mouseleave", onLeave);
          el.removeEventListener("mousedown",  onDown);
          el.removeEventListener("mouseup",    onUp);
        });
      });

      /* Tool cube cards — 3D tilt on cursor move */
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.utils.toArray<HTMLElement>(".tool-item").forEach(el => {
          const shadow = el.style.boxShadow;
          const onEnter = () => {
            gsap.to(el, { y: -8, scale: 1.022, transformPerspective: 1000, duration: 0.28, ease: "expo.out", overwrite: "auto" });
          };
          const onMove = (e: MouseEvent) => {
            const r = el.getBoundingClientRect();
            const x = ((e.clientX - r.left) / r.width  - 0.5) * 2;
            const y = ((e.clientY - r.top)  / r.height - 0.5) * 2;
            gsap.to(el, { rotationY: x * 10, rotationX: -y * 7, transformPerspective: 1000, duration: 0.18, ease: "power2.out", overwrite: "auto" });
            const sx = (-x * 12).toFixed(1);
            const sy = (-y * 8).toFixed(1);
            el.style.boxShadow = `${sx}px ${sy}px 28px color-mix(in srgb, var(--cat-color, var(--cinnabar-ink)) 20%, transparent)`;
          };
          const onLeave = () => {
            el.style.boxShadow = shadow;
            gsap.to(el, { y: 0, scale: 1, rotationY: 0, rotationX: 0, duration: 0.4, ease: "expo.out", overwrite: "auto" });
          };
          el.addEventListener("mouseenter", onEnter);
          el.addEventListener("mousemove",  onMove);
          el.addEventListener("mouseleave", onLeave);
          hoverListeners.push(() => {
            el.removeEventListener("mouseenter", onEnter);
            el.removeEventListener("mousemove",  onMove);
            el.removeEventListener("mouseleave", onLeave);
          });
        });
      }

      /* Bento cards — 3D tilt (gentler than tool cards since cards are larger) */
      gsap.utils.toArray<HTMLElement>(".bento-tilt").forEach(el => {
        const onEnter = () => {
          gsap.to(el, { y: -6, scale: 1.012, transformPerspective: 1400, duration: 0.32, ease: "power2.out", overwrite: "auto" });
        };
        const onMove = (e: MouseEvent) => {
          const rect = el.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width  - 0.5) * 2;
          const y = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;
          gsap.to(el, { rotationY: x * 7, rotationX: -y * 5, transformPerspective: 1400, duration: 0.25, ease: "power2.out", overwrite: "auto" });
        };
        const onLeave = () => {
          gsap.to(el, { y: 0, scale: 1, rotationY: 0, rotationX: 0, duration: 0.6, ease: "power3.out", overwrite: "auto" });
        };
        el.addEventListener("mouseenter", onEnter);
        el.addEventListener("mousemove",  onMove);
        el.addEventListener("mouseleave", onLeave);
        hoverListeners.push(() => {
          el.removeEventListener("mouseenter", onEnter);
          el.removeEventListener("mousemove",  onMove);
          el.removeEventListener("mouseleave", onLeave);
        });
      });

      /* CTA section buttons */
      gsap.utils.toArray<HTMLElement>(".cta-btn").forEach(el => {
        const onEnter = () => gsap.to(el, { scale: 1.04, y: -2, duration: 0.25, ease: "power2.out", overwrite: "auto" });
        const onLeave = () => gsap.to(el, { scale: 1,    y:  0, duration: 0.4,  ease: "power3.out", overwrite: "auto" });
        const onDown  = () => gsap.to(el, { scale: 0.97, duration: 0.1, ease: "power2.in", overwrite: "auto" });
        const onUp    = () => gsap.to(el, { scale: 1.04, duration: 0.15, ease: "power2.out", overwrite: "auto" });
        el.addEventListener("mouseenter", onEnter);
        el.addEventListener("mouseleave", onLeave);
        el.addEventListener("mousedown",  onDown);
        el.addEventListener("mouseup",    onUp);
        hoverListeners.push(() => {
          el.removeEventListener("mouseenter", onEnter);
          el.removeEventListener("mouseleave", onLeave);
          el.removeEventListener("mousedown",  onDown);
          el.removeEventListener("mouseup",    onUp);
        });
      });

      /* Section divider shimmer on scroll enter */
      gsap.utils.toArray<HTMLElement>(".anim-divider").forEach(el => {
        ScrollTrigger.create({
          trigger: el,
          start: "top 90%",
          once: true,
          onEnter: () => {
            gsap.fromTo(el,
              { opacity: 0.3 },
              { opacity: 1, duration: 0.6, ease: "power2.out",
                yoyo: false }
            );
          },
        });
      });

      /* ── Side-entrance reveals ── */
      if (!reduceMotion) {
        gsap.set(".reveal-left",  { autoAlpha: 0, x: -60 });
        gsap.set(".reveal-right", { autoAlpha: 0, x:  60 });
        ScrollTrigger.batch(".reveal-left", {
          onEnter: (els) => gsap.to(els, { autoAlpha: 1, x: 0, duration: 0.7, stagger: 0.08, ease: "power2.out", clearProps: "opacity,transform" }),
          once: true, start: "top 88%",
        });
        ScrollTrigger.batch(".reveal-right", {
          onEnter: (els) => gsap.to(els, { autoAlpha: 1, x: 0, duration: 0.7, stagger: 0.08, ease: "power2.out", clearProps: "opacity,transform" }),
          once: true, start: "top 88%",
        });
      }

      /* ── Force ScrollTrigger to recalculate positions after fonts/images settle ── */
      ScrollTrigger.refresh();

      return () => {
        heroEl?.removeEventListener("mousemove", onHeroMove);
        heroEl?.removeEventListener("mouseleave", onHeroLeave);
        anchors.forEach(a => a.removeEventListener("click", handleAnchorClick));
        hoverListeners.forEach(fn => fn());
      };
    });

    return () => mm.revert();
  }, { scope: containerRef });

  return (
    <div ref={containerRef} id="main-content" style={{ background: "transparent", color: "var(--ink)", minHeight: "100vh", position: "relative", zIndex: 1 }}>

      {/* ─── Scroll progress ─── */}
      <div id="lp-scroll-bar" style={{
        position: "fixed", top: 0, left: 0, height: 2,
        background: "var(--cinnabar-ink)", width: "0%",
        zIndex: 9999, pointerEvents: "none",
        boxShadow: "0 0 8px var(--cinnabar-ink)",
        transition: "none",
      }} />

      {/* ─── Floating navbar ─── */}
      <header className="gl-pane lp-header" style={{
        position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
        width: "calc(100% - 48px)", maxWidth: 960, zIndex: 50,
        border: S.border,
        borderRadius: 14,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "0 28px", height: 52,
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
          <span style={{ fontFamily: "var(--serif)", fontStyle: "normal", fontWeight: 700, fontSize: 16, color: "var(--ink)", letterSpacing: "0.1em" }}>LEDGER</span>
          <nav style={{ display: "flex", gap: 28 }} className="mob-hide">
            {[["#how", "How it works"], ["#tools", "Tools"], ["#features", "Features"], ["#score", "Score"]].map(([href, label]) => (
              <a key={href} href={href} className="lp-nav-link" style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 500, color: "var(--ink-3)", textDecoration: "none", letterSpacing: "0.04em", transition: "color 180ms", display: "inline-block" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--ink)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--ink-3)")}
              >{label}</a>
            ))}
            {[["Pricing", "/pricing"], ["FAQ", "/faq"]].map(([label, href]) => (
              <Link key={href} href={href} className="lp-nav-link" style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 500, color: "var(--ink-3)", textDecoration: "none", letterSpacing: "0.04em", transition: "color 180ms", display: "inline-block" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--ink)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--ink-3)")}
              >{label}</Link>
            ))}
          </nav>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/auth" className="mob-hide" style={{ fontFamily: "var(--sans)", fontSize: 11, fontWeight: 600, color: "var(--ink-3)", textDecoration: "none", letterSpacing: "0.1em", textTransform: "uppercase", transition: "color 180ms" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--ink)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--ink-3)")}
          >Sign in</Link>
          <Link href="/dashboard" className="btn" style={{ padding: "8px 18px", fontSize: 11, letterSpacing: "0.12em", textDecoration: "none", textTransform: "uppercase" }}>Open Ledger</Link>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="hero-section" style={{ position: "relative", width: "100%", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--paper)", overflow: "hidden" }}>

        {/* Glow horizon effect */}
        <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <GlowHorizonFM variant="top" />
        </div>

        {/* Hero value prop overlay */}
        <div className="hero-content" style={{ position: "absolute", zIndex: 3, top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "100%", maxWidth: 760, padding: "0 32px", textAlign: "center", pointerEvents: "none" }}>

          {/* Announcement pill */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 24,
            background: "color-mix(in srgb, var(--cinnabar-ink) 6%, var(--paper))",
            border: "1px solid color-mix(in srgb, var(--cinnabar-ink) 18%, transparent)",
            borderRadius: 99, padding: "5px 14px 5px 5px",
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
          }}>
            <span style={{
              background: "var(--cinnabar-ink)", color: "var(--paper)",
              fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase",
              padding: "3px 9px", borderRadius: 99, lineHeight: 1.6,
            }}>New</span>
            <span style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", letterSpacing: "0.02em" }}>
              Ledger Score: exam readiness in 60 seconds
            </span>
          </div>

          <h1 className="hero-h1" style={{
            fontFamily: "var(--serif)", fontWeight: 700, fontStyle: "normal",
            fontSize: "clamp(28px, 4.5vw, 56px)", color: "var(--ink)",
            lineHeight: 1.15, letterSpacing: "-0.02em", textWrap: "balance",
            marginBottom: 16,
          }}>
            {headline}
          </h1>
          <p style={{
            fontFamily: "var(--sans)", fontSize: "clamp(14px, 1.6vw, 17px)", color: "var(--ink-2)",
            lineHeight: 1.65, maxWidth: 520, margin: "0 auto", textWrap: "balance",
          }}>
            Upload your syllabus. Get a day-by-day plan, past papers, AI help, and a live readiness score out of 1000.
          </p>
          <div className="hero-ctas" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14, flexWrap: "wrap", pointerEvents: "auto", marginTop: 32 }}>
            <Link
              href="/auth"
              className="btn hero-cta-btn group"
              style={{
                textDecoration: "none", fontSize: 13, letterSpacing: "0.08em",
                padding: "13px 32px", display: "inline-flex", alignItems: "center",
                background: "var(--cinnabar-ink)", color: "var(--paper)",
                border: "none", borderRadius: 12, fontWeight: 700,
                fontFamily: "var(--sans)", overflow: "hidden",
              }}
            >
              <span style={{ overflow: "hidden", height: 20, display: "block" }}>
                <span className="flex flex-col transition-transform duration-500 group-hover:-translate-y-1/2"
                  style={{ transitionTimingFunction: "cubic-bezier(0.25,0.1,0.25,1)" }}>
                  <span style={{ lineHeight: "20px" }}>Get my free readiness score</span>
                  <span aria-hidden style={{ lineHeight: "20px" }}>Get my free readiness score</span>
                </span>
              </span>
            </Link>
            <a
              href="#how"
              className="btn ghost hero-cta-btn"
              style={{
                textDecoration: "none", fontSize: 13, letterSpacing: "0.08em",
                padding: "13px 26px", display: "inline-flex", alignItems: "center",
                borderRadius: 12, fontWeight: 600, fontFamily: "var(--sans)",
              }}
            >
              See how it works
            </a>
          </div>
          <div style={{ marginTop: 22, fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Free to start · No credit card · CBSE · ICSE · IB · IGCSE · A-Level · SAT
          </div>
        </div>

        {/* Scroll hint */}
        <div className="hero-scroll" style={{ position: "absolute", bottom: 48, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, zIndex: 4 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--ink-3)", letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.5 }}>Scroll</span>
          <div className="scroll-cue">
            <span />
            <span />
            <span />
          </div>
        </div>

      </section>

      {/* ─── Interactive Demo ─── */}
      <HeroInteractiveDemo />

      {/* ─── Ticker ─── */}
      <div className="gl-pane-alt" style={{ borderTop: S.border, borderBottom: S.border, padding: "10px 0", overflow: "hidden", whiteSpace: "nowrap" }}>
        <div className="ticker">
          <div className="ticker-track" style={{ color: "var(--ink-2)", fontSize: 10, fontFamily: "var(--mono)", letterSpacing: "0.08em" }}>
            {[0, 1].flatMap((k) => TICKER.map((item, i) => {
              const tc = (["var(--cinnabar-ink)","var(--powder-blue)","var(--sage)","var(--plum)","var(--tan-brand)"] as const)[i % 5];
              return (
                <span key={`${k}-${i}`} style={{ padding: "0 28px" }}>
                  <span style={{ color: tc, marginRight: 12 }}>·</span>{item}
                </span>
              );
            }))}
          </div>
        </div>
      </div>

      {/* ─── Product walkthrough ─── */}
      <ProductWalkthrough />

      {/* ─── 01 / Upload → Study → Score workflow ─── */}
      <section id="how" className="gl-pane-alt" style={{ borderBottom: S.border }}>
        <div className="lp-inner" style={{ maxWidth: 1120, margin: "0 auto", padding: "180px 56px 160px" }}>
          <div className="anim-divider" style={{ height: 1, background: "var(--rule)", marginBottom: 72 }} />
          <h2 className="reveal-up" style={{ ...S.h2, fontSize: "clamp(24px,3vw,40px)", letterSpacing: "-0.02em", marginBottom: 56 }}>
            How it works.
          </h2>

          <div className="bento-grid">
            {/* Big upload card — spans 8 cols */}
            <div className="bento-3 bento-tilt reveal-left" style={{ padding: "60px", borderRadius: 16, minHeight: 300, position: "relative", overflow: "hidden", background: "color-mix(in srgb, var(--ink) 5%, var(--paper))" }}>
              <div aria-hidden style={{ position: "absolute", top: -60, right: -60, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,202,175,0.18) 0%, transparent 70%)", filter: "blur(40px)", pointerEvents: "none" }} />
              <span className="reveal-up" style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--cinnabar-ink)" }}>01 · Upload</span>
              <h3 className="reveal-up" style={{ fontFamily: "var(--serif)", fontSize: "clamp(28px,3.5vw,48px)", fontStyle: "italic", color: "var(--ink)", lineHeight: 1.1, letterSpacing: "-0.02em", margin: "16px 0 20px", textWrap: "balance" }}>Your syllabus becomes your year.</h3>
              <p className="reveal-body" style={{ fontFamily: "var(--sans)", fontSize: 16, color: "var(--ink-2)", lineHeight: 1.7, maxWidth: 460 }}>Upload a PDF, or a photo of the printed sheet. Ledger reads every subject, chapter, and topic automatically. The whole year, mapped in seconds.</p>
            </div>

            {/* Boards stat card — spans 4 cols */}
            <div className="bento-1 bento-tilt reveal-right" style={{ padding: "40px 32px", borderRadius: 16, display: "flex", flexDirection: "column", justifyContent: "center", gap: 14, position: "relative", overflow: "hidden", background: "color-mix(in srgb, var(--ink) 5%, var(--paper))" }}>
              <span aria-hidden style={{ position: "absolute", top: -18, right: -6, fontFamily: "var(--serif)", fontSize: 160, fontWeight: 700, lineHeight: 1, color: "var(--ink)", opacity: 0.04, pointerEvents: "none", userSelect: "none" }}>6</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-3)" }}>Boards supported</span>
              <div style={{ fontFamily: "var(--serif)", fontSize: "clamp(32px,4vw,52px)", fontWeight: 700, color: "var(--cinnabar-ink)", lineHeight: 1 }}>6+</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)" }}>CBSE · ICSE · IB · IGCSE · A-Level · SAT</div>
            </div>

            {/* Study card — spans 6 */}
            <div className="bento-2 bento-tilt reveal-left" style={{ padding: "56px", borderRadius: 16, minHeight: 260, position: "relative", overflow: "hidden", background: "color-mix(in srgb, var(--ink) 5%, var(--paper))" }}>
              <div aria-hidden style={{ position: "absolute", bottom: -40, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(167,190,211,0.20) 0%, transparent 70%)", filter: "blur(40px)", pointerEvents: "none" }} />
              <span className="reveal-up" style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--powder-blue)" }}>02 · Study</span>
              <h3 className="reveal-up" style={{ fontFamily: "var(--serif)", fontSize: "clamp(24px,3vw,40px)", fontStyle: "italic", color: "var(--ink)", lineHeight: 1.15, letterSpacing: "-0.02em", margin: "16px 0 16px", textWrap: "balance" }}>One login. Every tool you need.</h3>
              <p className="reveal-body" style={{ fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink-2)", lineHeight: 1.7 }}>Doubt solver, essay workshop, past papers, prediction engine. All tools share the same score, same streak, same profile.</p>
            </div>

            {/* AI tools stat card — spans 6 */}
            <div className="bento-2 bento-tilt reveal-right" style={{ padding: "52px 44px", borderRadius: 16, display: "flex", flexDirection: "column", justifyContent: "center", gap: 14, position: "relative", overflow: "hidden", background: "color-mix(in srgb, var(--ink) 5%, var(--paper))" }}>
              <span aria-hidden style={{ position: "absolute", top: -24, right: -10, fontFamily: "var(--serif)", fontSize: 180, fontWeight: 700, lineHeight: 1, color: "var(--ink)", opacity: 0.04, pointerEvents: "none", userSelect: "none" }}>48</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-3)" }}>AI tools</span>
              <div style={{ fontFamily: "var(--serif)", fontSize: "clamp(32px,4vw,52px)", fontWeight: 700, color: "var(--cinnabar-ink)", lineHeight: 1 }}>48</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)" }}>Plan · Learn · Write · Practise · Future · Track</div>
            </div>

            {/* Score card — full width */}
            <div className="bento-4 bento-tilt reveal-up" style={{ padding: "60px 68px", borderRadius: 16, display: "flex", gap: 72, alignItems: "center", flexWrap: "wrap" as const, background: "color-mix(in srgb, var(--ink) 5%, var(--paper))" }}>
              <div style={{ flex: "1 1 320px" }}>
                <span className="reveal-up" style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--tan)" }}>03 · Score</span>
                <h3 className="reveal-up" style={{ fontFamily: "var(--serif)", fontSize: "clamp(28px,3.5vw,48px)", fontStyle: "italic", color: "var(--ink)", lineHeight: 1.1, letterSpacing: "-0.02em", margin: "16px 0 16px", textWrap: "balance" }}>One number. Every insight.</h3>
                <p className="reveal-body" style={{ fontFamily: "var(--sans)", fontSize: 16, color: "var(--ink-2)", lineHeight: 1.7 }}>Ledger Score runs on four signals: past paper accuracy, syllabus coverage, how fast you correct errors, and daily consistency. It updates every time you use any tool.</p>
              </div>
              <div style={{ flex: "0 0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {[
                  { n: "40%", l: "PYQ Accuracy" },
                  { n: "25%", l: "Syllabus" },
                  { n: "20%", l: "Mistakes" },
                  { n: "15%", l: "Consistency" },
                ].map((p, i) => (
                  <div key={i} style={{
                    padding: "22px 20px 20px", borderRadius: 12, position: "relative", overflow: "hidden",
                    background: "color-mix(in srgb, var(--ink) 4%, var(--paper))",
                    border: S.border,
                  }}>
                    <span aria-hidden style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 3, background: "var(--cinnabar-ink)", opacity: 0.3 + (parseInt(p.n) / 40) * 0.7 }} />
                    <div style={{ fontFamily: "var(--serif)", fontWeight: 700, fontSize: 28, color: "var(--ink)", lineHeight: 1 }}>{p.n}</div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 8 }}>{p.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 02 / Ledger Score ─── */}
      <section id="score" className="gl-pane" style={{ borderBottom: S.border }}>
        <div className="lp-inner" style={{ maxWidth: 1120, margin: "0 auto", padding: "160px 56px 144px" }}>
          <div className="anim-divider" style={{ height: 1, background: "var(--rule)", marginBottom: 72 }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 48 }}>
            <h2 className="reveal-up" style={S.h2}>What would your readiness score be right now?</h2>
            <div style={{ ...S.cap, fontSize: 9 }}>Live preview</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 20 }} className="mob-col">
            {/* Sliders */}
            <div className="glass-card reveal-left" style={{ padding: "32px 32px" }}>
              <div style={S.capAccent}>Adjust your activity</div>

              {[
                { label: "Past paper sessions done", val: papers,         min: 0, max: 20, set: setPapers,         unit: String(papers) },
                { label: "Mistakes per week",        val: mistakesPerWeek, min: 0, max: 30, set: setMistakesPerWeek, unit: String(mistakesPerWeek) },
                { label: "Focus streak (days)",      val: streak,          min: 0, max: 30, set: setStreak,          unit: `${streak}d` },
              ].map(({ label, val, min, max, set, unit }) => (
                <div key={label} style={{ marginTop: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{label}</span>
                    <span style={{ fontFamily: "var(--serif)", fontSize: 20, fontStyle: "normal", fontWeight: 700, color: "var(--cinnabar-ink)" }}>{unit}</span>
                  </div>
                  <ElasticSlider
                    startingValue={min}
                    maxValue={max}
                    defaultValue={val}
                    isStepped
                    stepSize={1}
                    leftIcon={<span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)" }}>{min}</span>}
                    rightIcon={<span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)" }}>{max}</span>}
                    onChange={set}
                    showValue={false}
                  />
                </div>
              ))}

              <button
                onClick={() => setHasSyllabus(v => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", marginTop: 20,
                  border: "none",
                  borderRadius: 10,
                  background: hasSyllabus ? "color-mix(in srgb, var(--cinnabar-ink) 16%, var(--paper))" : "color-mix(in srgb, var(--ink) 8%, transparent)",
                  boxShadow: hasSyllabus ? `0 0 0 1.5px var(--cinnabar-ink), 0 4px 14px color-mix(in srgb, var(--cinnabar-ink) 18%, transparent)` : "none",
                  color: "var(--ink)", cursor: "pointer", width: "100%",
                  fontFamily: "var(--sans)", fontSize: 13, fontWeight: 500,
                  transition: "all 200ms",
                }}
              >
                <div style={{
                  width: 16, height: 16, border: `1.5px solid ${hasSyllabus ? "var(--cinnabar-ink)" : "var(--rule)"}`,
                  background: hasSyllabus ? "var(--cinnabar-ink)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 180ms",
                }}>
                  {hasSyllabus && <span style={{ fontSize: 9, color: "var(--paper)", lineHeight: 1 }}>✓</span>}
                </div>
                Syllabus uploaded to Ledger
                {!hasSyllabus && <span style={{ marginLeft: "auto", ...S.capAccent, fontSize: 9 }}>+250 pts</span>}
              </button>
            </div>

            {/* Score display */}
            <div className="glass-card reveal-right" style={{ padding: "32px 32px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={S.cap}>Estimated Ledger Score</div>
              <div ref={scoreNumRef} style={{ fontFamily: "var(--serif)", fontSize: "clamp(72px,10vw,100px)", fontStyle: "normal", fontWeight: 700, letterSpacing: "0.02em", lineHeight: 1, marginTop: 8, color: "var(--ink)", transition: "color 300ms" }}>
                {scorePreview}
              </div>
              <div style={{ ...S.cap, marginTop: 6, color: "var(--cinnabar-ink)" }}>/ 1000 · {scoreTierLabel(scorePreview)}</div>

              {/* Tier bar */}
              <div style={{ marginTop: 20 }}>
                <div style={{ display: "flex", gap: 2 }}>
                  {TIERS.map(tier => {
                    const filled = scorePreview >= tier.min;
                    const isCurrent = scorePreview >= tier.min && scorePreview <= tier.max;
                    return (
                      <div key={tier.label} style={{ flex: 1, height: 5, background: filled ? (isCurrent ? "var(--cinnabar-ink)" : "var(--ink-3)") : "var(--rule)", transition: "background 400ms ease", borderRadius: 1 }} />
                    );
                  })}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  {TIERS.map(t => (
                    <span key={t.label} style={{ fontFamily: "var(--mono)", fontSize: 8, color: scorePreview >= t.min && scorePreview <= t.max ? "var(--cinnabar-ink)" : "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase", transition: "color 300ms" }}>{t.label}</span>
                  ))}
                </div>
              </div>

              {/* Improvement tips */}
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                {!hasSyllabus && (
                  <div style={{ padding: "8px 12px", background: "color-mix(in srgb, var(--paper) 60%, transparent)", border: "1px solid color-mix(in srgb, var(--ink) 8%, transparent)", borderRadius: 8, fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
                    <span style={{ color: "var(--cinnabar-ink)", fontWeight: 700 }}>+250 pts</span> · Upload your syllabus
                  </div>
                )}
                {papers < 5 && (
                  <div style={{ padding: "8px 12px", background: "color-mix(in srgb, var(--paper) 60%, transparent)", border: "1px solid color-mix(in srgb, var(--ink) 8%, transparent)", borderRadius: 8, fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
                    <span style={{ color: "var(--cinnabar-ink)", fontWeight: 700 }}>+{Math.round((5 - papers) * 18)} pts</span> · Do {5 - papers} more past paper sessions
                  </div>
                )}
                {streak < 7 && (
                  <div style={{ padding: "8px 12px", background: "color-mix(in srgb, var(--paper) 60%, transparent)", border: "1px solid color-mix(in srgb, var(--ink) 8%, transparent)", borderRadius: 8, fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
                    <span style={{ color: "var(--cinnabar-ink)", fontWeight: 700 }}>+{Math.round((7 - streak) * 7.5)} pts</span> · Build a 7-day streak
                  </div>
                )}
              </div>

              <Link href="/auth" className="btn" style={{ textDecoration: "none", marginTop: 24, display: "inline-flex", alignSelf: "flex-start", fontSize: 10, letterSpacing: "0.12em" }}>
                See your real score →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Start Here ─── */}
      <section style={{ borderBottom: S.border, background: "var(--paper)" }}>
        <div className="lp-inner" style={{ maxWidth: 1120, margin: "0 auto", padding: "120px 56px 100px" }}>
          <div className="anim-divider" style={{ height: 1, background: "var(--rule)", marginBottom: 72 }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap" as const, gap: 12, marginBottom: 56 }}>
            <h2 className="reveal-up" style={S.h2}>Start here. Takes 2 minutes.</h2>
            <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.12em", textTransform: "uppercase" as const }}>Then use any tool, in any order</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "var(--rule)" }} className="mob-col">
            {([
              { step: "01", title: "Upload your syllabus", body: "PDF, photo, or paste it in. Ledger maps every subject, chapter, and topic automatically. No manual setup.", cta: "Upload now →", href: "/dashboard", time: "60 seconds", color: "var(--cinnabar-ink)" },
              { step: "02", title: "See your Ledger Score", body: "Instant exam readiness across 4 signals: past paper accuracy, syllabus coverage, error rate, and daily consistency.", cta: "Check your score →", href: "/tools/grade-tracker", time: "Instant", color: "var(--powder-blue)" },
              { step: "03", title: "Fix your biggest gap", body: "The score shows exactly which chapters you are behind on. One tool, one session, one gap closed. Then repeat.", cta: "Browse tools →", href: "/dashboard", time: "5 minutes", color: "var(--sage)" },
            ] as const).map((s) => (
              <div key={s.step} style={{ background: "var(--paper)", padding: "52px 40px", display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--serif)", fontSize: 52, fontWeight: 700, color: s.color, lineHeight: 1, opacity: 0.22 }}>{s.step}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.12em", textTransform: "uppercase" as const }}>{s.time}</span>
                </div>
                <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 22, color: "var(--ink)", lineHeight: 1.2, letterSpacing: "-0.01em" }}>{s.title}</div>
                <p style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.7, margin: 0, flex: 1 }}>{s.body}</p>
                <Link href={s.href} style={{ fontFamily: "var(--mono)", fontSize: 10, color: s.color, textDecoration: "none", letterSpacing: "0.08em", marginTop: 4 }}>{s.cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 04 / Featured Tools ─── */}
      <section id="tools" style={{ borderBottom: S.border }}>
        <div className="lp-inner" style={{ maxWidth: 1120, margin: "0 auto", padding: "160px 56px 144px" }}>
          <div className="anim-divider" style={{ height: 1, background: "var(--rule)", marginBottom: 72 }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap" as const, gap: 12, marginBottom: 56 }}>
            <h2 className="reveal-up" style={S.h2}>Three tools to start with.</h2>
            <Link href="/dashboard" style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--cinnabar-ink)", letterSpacing: "0.12em", textTransform: "uppercase" as const, textDecoration: "none" }}>
              Browse all 48 →
            </Link>
          </div>

          {/* Search */}
          <div style={{ marginBottom: 64 }}>
            <GooeyInput
              value={toolSearch}
              onChange={setToolSearch}
              placeholder="Search tools: planner, essays, past papers…"
              style={{ width: "100%", maxWidth: 520 }}
            />
          </div>

          {/* 6 chunky cube cards — filtered by search */}
          {(() => {
            const ALL_TOOLS = [
              { n: "03", slug: "notes",  ttl: "Study Engine",  sub: "Upload a chapter. Get a full structured lesson, simplified.",  cat: "LEARN",    icon: "◎" },
              { n: "06", slug: "papers", ttl: "Past Papers",   sub: "CBSE, JEE, NEET, SAT, IB. Graded by AI, tracked in your score.",   cat: "PRACTISE", icon: "◆" },
              { n: "★",  slug: "score",  ttl: "Ledger Score",  sub: "Your real-time exam readiness across every topic you study.",   cat: "TRACK",    icon: "★" },
            ] as const;
            const q = toolSearch.trim().toLowerCase();
            const visible = q
              ? ALL_TOOLS.filter(t =>
                  t.ttl.toLowerCase().includes(q) ||
                  t.sub.toLowerCase().includes(q) ||
                  t.cat.toLowerCase().includes(q) ||
                  t.slug.includes(q)
                )
              : ALL_TOOLS;
            if (visible.length === 0) return (
              <div style={{ padding: "48px 0", textAlign: "center" }}>
                <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 18, color: "var(--ink-3)", marginBottom: 12 }}>
                  No match for &ldquo;{toolSearch}&rdquo;
                </div>
                <Link href={`/dashboard`} className="btn ghost" style={{ textDecoration: "none", fontSize: 11, padding: "8px 18px" }}>
                  Search all tools →
                </Link>
              </div>
            );
            return (
              <div className="cubes-grid" style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(visible.length, 3)}, 1fr)`, gap: 40 }}>
                {visible.map(t => {
                  const c = CAT_COLOR[t.cat] ?? "var(--cinnabar-ink)";
                  return (
                    <Link
                      href={`/tools/${t.slug}`}
                      key={t.n}
                      className="tool-item"
                      style={{
                        textDecoration: "none",
                        display: "flex",
                        flexDirection: "column",
                        padding: "36px 28px 28px",
                        background: `color-mix(in srgb, ${c} 14%, var(--paper))`,
                        border: `1.5px solid color-mix(in srgb, ${c} 45%, transparent)`,
                        borderRadius: 12,
                        boxShadow: `7px 7px 0 0 color-mix(in srgb, ${c} 60%, transparent)`,
                        cursor: "pointer",
                        minHeight: 220,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: c, letterSpacing: "0.16em", textTransform: "uppercase" as const }}>{t.cat}</span>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 20, color: c, lineHeight: 1, opacity: 0.65 }}>{t.icon}</span>
                      </div>
                      <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 22, color: "var(--ink)", lineHeight: 1.18, marginBottom: 10, letterSpacing: "-0.01em" }}>{t.ttl}</div>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.6, flex: 1 }}>{t.sub}</div>
                      <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: c, opacity: 0.55, letterSpacing: "0.08em" }}>{t.cat}</span>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: c }}>→</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            );
          })()}

          <div style={{ marginTop: 40, textAlign: "center" }}>
            <Link href="/dashboard" className="btn" style={{ textDecoration: "none", fontSize: 11, letterSpacing: "0.10em" }}>Open all tools →</Link>
          </div>
        </div>
      </section>

      {/* ─── 06 / Key Features ─── */}
      <section id="features" className="gl-pane-alt" style={{ borderBottom: S.border }}>
        <div className="lp-inner" style={{ maxWidth: 1120, margin: "0 auto", padding: "160px 56px 144px" }}>
          <div className="anim-divider" style={{ height: 1, background: "var(--rule)", marginBottom: 72 }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 56 }}>
            <h2 className="reveal-up" style={S.h2}>Features nobody else ships.</h2>
            <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.14em", textTransform: "uppercase" as const }}>What makes Ledger different</span>
          </div>

          {/* Top 3 — signature cards with left cinnabar accent */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28, marginBottom: 28 }} className="mob-col">
            {FEATS.slice(0, 3).map((f, i) => (
              <div className="feat-card glass-card bento-tilt" key={f.tag} style={{
                padding: "44px 32px",
                borderTop: "2px solid var(--cinnabar-ink)",
                display: "flex", flexDirection: "column", justifyContent: "space-between",
              }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
                    <span className="feat-letter" style={{ fontFamily: "var(--serif)", fontStyle: "normal", fontSize: 44, color: "var(--cinnabar-ink)", fontWeight: 700, lineHeight: 1, letterSpacing: "0.04em", display: "inline-block" }}>{f.tag}</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em", marginTop: 8 }}>0{i + 1} · 03</span>
                  </div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 14, letterSpacing: "0.03em", lineHeight: 1.2 }}>{f.ttl}</div>
                  <p style={{ fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.72, color: "var(--ink-2)", margin: 0 }}>{f.body}</p>
                </div>
                <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--rule)" }}>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--ink-3)", marginTop: 3, lineHeight: 1.5 }}>
                    {["Every tracked gap becomes a scheduled revision session. Nothing slips silently.", "Schedules work around your focus peak instead of a generic timetable", "The Ebbinghaus spaced repetition method, used by top students and medical trainees worldwide"][i]}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom 4 — compact, expand on click */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }} className="mob-2col">
            {FEATS.slice(3).map((f, i) => (
              <div
                className="feat-card glass-card bento-tilt"
                key={f.tag}
                style={{
                  borderTop: expandedFeat === i + 3 ? "2px solid var(--cinnabar-ink)" : "2px solid transparent",
                  cursor: "pointer",
                  transition: "border-color 150ms ease, background 150ms ease",
                  padding: "22px 20px",
                }}
                onClick={() => setExpandedFeat(expandedFeat === i + 3 ? null : i + 3)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                  <span className="feat-letter" style={{ fontFamily: "var(--serif)", fontStyle: "normal", fontSize: 24, color: "var(--cinnabar-ink)", fontWeight: 700, letterSpacing: "0.04em", display: "inline-block" }}>{f.tag}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: expandedFeat === i + 3 ? "var(--cinnabar-ink)" : "var(--ink-3)", marginTop: 6, letterSpacing: "0.06em" }}>
                    {expandedFeat === i + 3 ? "[ − ]" : "[ + ]"}
                  </span>
                </div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 14, fontWeight: 600, color: "var(--ink)", margin: "8px 0 8px", letterSpacing: "0.02em", lineHeight: 1.3 }}>{f.ttl}</div>
                <p style={{ fontFamily: "var(--sans)", fontSize: 12, lineHeight: 1.65, color: "var(--ink-3)", margin: 0 }}>{f.body}</p>
                {expandedFeat === i + 3 && (
                  <p style={{ fontFamily: "var(--sans)", fontSize: 11, lineHeight: 1.65, color: "var(--ink-3)", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--rule)" }}>
                    {f.extra}
                  </p>
                )}
              </div>
            ))}
            {/* Exam-Day Mode — live */}
            <div className="glass-card" style={{ padding: "22px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between", borderTop: "2px solid var(--cinnabar-ink)" }}>
              <div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--cinnabar-ink)", marginBottom: 10 }}>Now live</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 8, lineHeight: 1.3 }}>Exam-Day Mode</div>
                <p style={{ fontFamily: "var(--sans)", fontSize: 12, lineHeight: 1.65, color: "var(--ink-3)", margin: 0 }}>
                  Locks to what you got wrong in the last 14 days. No decisions. Just the gaps.
                </p>
              </div>
              <Link href="/tools/exam-day" style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--cinnabar-ink)", marginTop: 14, letterSpacing: "0.08em", textDecoration: "none" }}>Open Exam-Day Mode →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ChatGPT vs Ledger comparison ─── */}
      <section style={{ borderBottom: S.border, background: "var(--paper)" }}>
        <div className="lp-inner" style={{ maxWidth: 1120, margin: "0 auto", padding: "160px 56px 144px" }}>
          <div className="anim-divider" style={{ height: 1, background: "var(--rule)", marginBottom: 72 }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 64 }}>
            <h2 className="reveal-up" style={S.h2}>Why not just use ChatGPT?</h2>
            <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.14em", textTransform: "uppercase" as const }}>
              Students ask this every day
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }} className="mob-col">
            {/* ChatGPT column */}
            <div className="reveal-left bento-tilt" style={{ borderRadius: 16, overflow: "hidden", background: "var(--paper)" }}>
              <div style={{ padding: "20px 28px", borderBottom: "1px solid var(--rule)", background: "color-mix(in srgb, var(--ink) 3%, var(--paper))" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "var(--ink-3)", marginBottom: 4 }}>Generic AI</div>
                <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 22, color: "var(--ink-2)" }}>ChatGPT / Gemini</div>
              </div>
              {[
                "Answers your question, then forgets it",
                "Has no idea what board you're on",
                "Doesn't know what chapters you're behind on",
                "Can't track what you've covered",
                "No readiness score, no way to measure progress",
                "No exam date awareness",
                "Generic study tips, not your specific syllabus",
                "Starts fresh every session",
              ].map((row, i) => (
                <div key={i} style={{ padding: "14px 28px", borderBottom: i < 7 ? "1px solid var(--rule)" : "none", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ color: "var(--ink-3)", fontSize: 14, flexShrink: 0 }}>✕</span>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)", lineHeight: 1.4 }}>{row}</span>
                </div>
              ))}
            </div>

            {/* Ledger column */}
            <div className="reveal-right bento-tilt" style={{ borderRadius: 16, overflow: "hidden", background: "var(--paper)", boxShadow: "0 2px 4px color-mix(in srgb, var(--cinnabar-ink) 8%, transparent), 0 12px 32px color-mix(in srgb, var(--cinnabar-ink) 14%, transparent)" }}>
              <div style={{ padding: "20px 28px", borderBottom: "1px solid color-mix(in srgb, var(--cinnabar-ink) 25%, transparent)", background: "color-mix(in srgb, var(--cinnabar-ink) 8%, var(--paper))" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "var(--cinnabar-ink)", marginBottom: 4 }}>Built for exams</div>
                <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 22, color: "var(--ink)" }}>StudyLedger</div>
              </div>
              {[
                "Remembers every session, every subject, every gap",
                "Knows your board, grade, and exam date",
                "Shows exactly how many chapters you're behind, and how long to catch up",
                "Tracks syllabus coverage across every tool you use",
                "Live 0-1000 readiness score, updated every session",
                "Counts down to your exam and adjusts your plan daily",
                "Everything calibrated to your actual uploaded syllabus",
                "Your history, your score, your streak, always there",
              ].map((row, i) => (
                <div key={i} style={{ padding: "14px 28px", borderBottom: i < 7 ? "1px solid color-mix(in srgb, var(--cinnabar-ink) 15%, transparent)" : "none", display: "flex", alignItems: "center", gap: 12, background: i % 2 === 0 ? "color-mix(in srgb, var(--cinnabar-ink) 3%, var(--paper))" : "transparent" }}>
                  <span style={{ color: "var(--cinnabar-ink)", fontSize: 14, flexShrink: 0 }}>✓</span>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.4 }}>{row}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 40, textAlign: "center" }}>
            <p style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: "clamp(16px,2vw,22px)", color: "var(--ink-2)", margin: "0 0 24px" }}>
              ChatGPT answers questions. Ledger builds a system around your syllabus.
            </p>
            <Link href="/dashboard" className="btn" style={{ textDecoration: "none", fontSize: 11, letterSpacing: "0.10em" }}>
              Upload your syllabus free →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Competitive table: Quizlet / Notion / GCR ─── */}
      <section style={{ borderBottom: S.border, background: "var(--paper)" }}>
        <div className="lp-inner" style={{ maxWidth: 1120, margin: "0 auto", padding: "100px 56px 80px" }}>
          <div style={{ marginBottom: 48 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "var(--ink-3)", marginBottom: 12 }}>vs everything else</div>
            <h2 className="reveal-up" style={{ ...S.h2, fontSize: "clamp(22px,2.8vw,34px)" }}>Why not Quizlet, Notion, or Google Classroom?</h2>
          </div>
          <div className="reveal-up bento-tilt" style={{ overflowX: "auto" as const, borderRadius: 16, background: "var(--paper)", padding: "8px 4px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" as const, fontFamily: "var(--sans)", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" as const, padding: "14px 20px", fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "var(--ink-3)", borderBottom: "1px solid var(--rule)", fontWeight: 500 }}>Feature</th>
                  {(["Quizlet", "Notion", "Google Classroom", "ChatGPT", "Ledger"] as const).map((tool, i) => (
                    <th key={tool} style={{ textAlign: "center" as const, padding: "14px 16px", fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: i === 4 ? "var(--cinnabar-ink)" : "var(--ink-3)", borderBottom: "1px solid var(--rule)", fontWeight: i === 4 ? 700 : 500 }}>{tool}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {([
                  ["Board-aware study plan",          false, false, false, false, true],
                  ["Real-time exam readiness score",  false, false, false, false, true],
                  ["Past papers, AI-graded",          false, false, false, false, true],
                  ["AI that knows your syllabus",     false, false, false, false, true],
                  ["Tracks gaps across sessions",     false, false, false, false, true],
                  ["48 integrated study tools",      false, false, false, false, true],
                  ["Flashcard practice",              true,  false, false, false, true],
                  ["Works across all 6 boards",       false, false, true,  false, true],
                  ["Free to start",                   true,  true,  true,  true,  true],
                ] as const).map(([feat, ...vals], ri) => (
                  <tr key={String(feat)} style={{ background: ri % 2 === 0 ? "color-mix(in srgb, var(--ink) 2%, transparent)" : "transparent" }}>
                    <td style={{ padding: "13px 20px", color: "var(--ink-2)", lineHeight: 1.4 }}>{feat}</td>
                    {vals.map((v, ci) => (
                      <td key={ci} style={{ textAlign: "center" as const, padding: "13px 16px", fontSize: 14 }}>
                        {v
                          ? <span style={{ color: ci === 4 ? "var(--cinnabar-ink)" : "var(--sage)" }}>✓</span>
                          : <span style={{ color: "var(--ink-3)", opacity: 0.35 }}>✕</span>
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 32, textAlign: "center" as const }}>
            <Link href="/dashboard" className="btn" style={{ textDecoration: "none", fontSize: 11, letterSpacing: "0.10em" }}>
              Try Ledger free →
            </Link>
          </div>
        </div>
      </section>

      <BeforeAfterSection />
      <StudentJourneySection />

      {/* ─── Waitlist ─── */}
      <section style={{ borderBottom: S.border, background: "color-mix(in oklch, var(--paper) 55%, transparent)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "120px 24px 100px", textAlign: "center" }}>
          <div style={{ ...S.capAccent, marginBottom: 20 }}>Now live</div>
          <h2 style={{ ...S.h2, marginBottom: 12 }}>
            Exam-Day Mode is here.
          </h2>
          <p style={{ fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink-3)", lineHeight: 1.7, marginBottom: 36 }}>
            The morning of the paper, Ledger locks to a single screen: only what you got wrong in the last 14 days. No decisions. Just the gaps.
          </p>
          <Link href="/tools/exam-day" style={{
            display: "inline-block",
            background: "var(--cinnabar-ink)", color: "#fff",
            borderRadius: 12, padding: "13px 28px",
            fontSize: 14, fontWeight: 700, cursor: "pointer",
            fontFamily: "var(--sans)", letterSpacing: "0.02em",
            textDecoration: "none",
            transition: "transform 150ms ease-out",
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "")}
          >
            Open Exam-Day Mode →
          </Link>
          <div style={{ marginTop: 20, fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Free while in launch · No sign-up wall · Your gaps, your morning</div>
        </div>
      </section>

      {/* ─── 08 / Final CTA ─── */}
      <section className="cta-section gl-pane-alt" style={{ borderBottom: S.border }}>
        <div className="lp-inner" style={{ maxWidth: 1120, margin: "0 auto", padding: "96px 40px" }}>
          <div className="cta-content" style={{ textAlign: "center", maxWidth: 680, margin: "0 auto" }}>
            <div style={{ ...S.capAccent, marginBottom: 28 }}>Start today · Free · No credit card</div>
            <h2 style={{
              fontFamily: "var(--serif)", fontStyle: "normal", fontWeight: 700,
              fontSize: "clamp(32px,5.5vw,64px)", color: "var(--ink)", letterSpacing: "0.04em", lineHeight: 1.05,
              marginBottom: 24,
            }}>
              Your exam is closer than it feels.
            </h2>
            <p style={{ fontFamily: "var(--sans)", fontSize: 16, color: "var(--ink-3)", lineHeight: 1.7, marginBottom: 40, maxWidth: 480, margin: "0 auto 40px" }}>
              Build the system that closes the gap. One score. One streak. Everything calibrated to your board, your grade, and your exam date.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/dashboard" className="btn cta-btn" style={{ textDecoration: "none", fontSize: 12, letterSpacing: "0.1em", padding: "14px 32px", display: "inline-block" }}>
                Open the Ledger →
              </Link>
              <Link href="/auth" className="btn ghost cta-btn" style={{ textDecoration: "none", fontSize: 12, letterSpacing: "0.1em", padding: "14px 32px", display: "inline-block" }}>
                Sign in
              </Link>
            </div>
            <div style={{ marginTop: 36, ...S.cap, fontSize: 9 }}>
              JEE · NEET · CBSE · ICSE · IB · IGCSE · A-Level · SAT
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{ borderTop: S.border, background: "var(--paper-2)" }}>

        {/* 4-col editorial grid */}
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", gap: 1, background: "var(--rule)" }} className="mob-2col">

          {/* Branding */}
          <div className="footer-col" style={{ background: "var(--paper)", padding: "48px 36px" }}>
            <div style={{ fontFamily: "var(--serif)", fontStyle: "normal", fontWeight: 800, fontSize: 38, letterSpacing: "0.08em", color: "var(--ink)", lineHeight: 0.9, marginBottom: 10 }}>LEDGER</div>
            <div style={{ height: 3, width: 44, background: "var(--cinnabar-ink)", marginBottom: 18 }} />
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: 20 }}>
              The Student&apos;s Operating System · Est. MMXXV
            </div>
            <p style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", margin: "0 0 10px", lineHeight: 1.68, maxWidth: 250 }}>
              Built by a student, for students. Not VC-funded. Not a feature of a bigger platform.
            </p>
            <p style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", margin: 0, lineHeight: 1.68, maxWidth: 250 }}>
              Independent and student-funded. We will never sell your study data.
            </p>
          </div>

          {/* Tools */}
          <div className="footer-col" style={{ background: "var(--paper)", padding: "48px 24px" }}>
            <div style={{ ...S.capAccent, marginBottom: 20 }}>Tools</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)" }}>
              {["Study Engine", "Past Papers", "Doubt Solver", "AI Flashcards", "Focus Dashboard", "Essay Workshop", "Practice Suite", "Ledger Score™"].map(t => (
                <li key={t} style={{ marginBottom: 10, lineHeight: 1 }}>{t}</li>
              ))}
              <li style={{ marginTop: 16 }}>
                <Link href="/dashboard" style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--cinnabar-ink)", textDecoration: "none", letterSpacing: "0.06em" }}>
                  → All tools
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="footer-col" style={{ background: "var(--paper)", padding: "48px 24px" }}>
            <div style={{ ...S.capAccent, marginBottom: 20 }}>Company</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)" }}>
              {([["Pricing", "/pricing"], ["FAQ", "/faq"], ["Contact", "mailto:hello@studyledger.in"]] as const).map(([label, href]) => (
                <li key={label} style={{ marginBottom: 10, lineHeight: 1 }}>
                  <a href={href} style={{ color: "var(--ink-3)", textDecoration: "none" }}>{label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="footer-col" style={{ background: "var(--paper)", padding: "48px 24px" }}>
            <div style={{ ...S.capAccent, marginBottom: 20 }}>Legal</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, fontFamily: "var(--sans)", fontSize: 12 }}>
              {([["Privacy Policy", "/legal/privacy"], ["Terms of Use", "/legal/terms"], ["Data & Compliance", "/legal/data"], ["IP & Copyright", "/legal/ip"]] as const).map(([label, href]) => (
                <li key={label} style={{ marginBottom: 10, lineHeight: 1 }}>
                  <Link href={href} style={{ color: "var(--ink-3)", textDecoration: "none" }}>{label}</Link>
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid var(--rule)" }}>
              <a href="mailto:hello@studyledger.in" style={{ display: "block", fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.08em", textDecoration: "none" }}>hello@studyledger.in</a>
            </div>
          </div>

        </div>

        {/* Colophon */}
        <div className="lp-inner" style={{ borderTop: "1px solid var(--rule)", padding: "13px 40px", maxWidth: 1120, margin: "0 auto", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.12em", textTransform: "uppercase" as const }}>MMXXVI Ledger</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em" }}>{today}</span>
        </div>

      </footer>

    </div>
  );
}
