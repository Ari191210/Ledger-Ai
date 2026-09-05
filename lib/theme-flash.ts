// A quick lime flash across the whole screen, the "power-on" moment when
// you flip dark/light. Plain DOM, no React, so it works from anywhere
// (top-bar toggle, settings switch) without threading state through.
export function flashTheme(): void {
  if (typeof document === "undefined") return;
  const el = document.createElement("div");
  el.style.position = "fixed";
  el.style.inset = "0";
  el.style.zIndex = "9999";
  el.style.pointerEvents = "none";
  el.style.background = "var(--accent)";
  el.style.opacity = "0.32";
  el.style.transition = "opacity 360ms ease-out";
  document.body.appendChild(el);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.opacity = "0";
    });
  });
  setTimeout(() => el.remove(), 420);
}
