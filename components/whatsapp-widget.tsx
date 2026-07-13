"use client"
import { MessageCircle } from "lucide-react"

export function WhatsAppWidget() {
  return (
    <>
      <style>{`
        @keyframes wa-enter {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }

        .wa-root {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          display: block;
          text-decoration: none;
          /* drop-shadow, NOT box-shadow: it follows the clipped silhouette
             instead of being sliced off by the clip-path on .wa-pill */
          filter: drop-shadow(0 4px 24px color-mix(in srgb, black 35%, transparent));
          opacity: 0;
          animation: wa-enter 260ms cubic-bezier(0.16, 1, 0.3, 1) 1200ms forwards;
          /* The anchor's box is always the FULL expanded pill width, because
             clip-path on .wa-pill changes only painting, not layout. Left
             hit-testable, that box would swallow clicks across the invisible
             collapsed region. So the anchor takes no pointer events; .wa-pill
             takes them instead, and because .wa-pill IS clipped, its hit area
             is exactly its visible shape. Clicks still bubble to the anchor,
             so navigation is unaffected. */
          pointer-events: none;
        }

        .wa-pill {
          display: inline-flex;
          align-items: center;
          height: 48px;
          width: max-content;
          border-radius: 9999px;
          background: color-mix(in srgb, var(--paper) 62%, transparent);
          backdrop-filter: blur(20px) saturate(160%);
          -webkit-backdrop-filter: blur(20px) saturate(160%);
          border: 1px solid color-mix(in srgb, var(--ink) 14%, transparent);
          box-shadow: inset 0 1px 0 color-mix(in srgb, white 8%, transparent);

          /* collapsed: reveal only the rightmost 48px (the icon) */
          clip-path: inset(0 0 0 calc(100% - 48px) round 9999px);
          transition: clip-path 320ms cubic-bezier(0.16, 1, 0.3, 1);
          /* The real pointer target. Because this element is clipped, its hit
             area is its VISIBLE shape — the 48px circle when collapsed, the
             whole pill when open. See the note on .wa-root. */
          pointer-events: auto;
        }

        .wa-label {
          font-family: var(--sans);
          font-size: 13px;
          font-weight: 600;
          color: var(--ink);
          white-space: nowrap;
          padding-left: 4px;
          padding-right: 18px;
          opacity: 0;
          transform: translateX(6px);
          transition: opacity 200ms cubic-bezier(0.16, 1, 0.3, 1),
                      transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .wa-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          color: #25D366;
          order: 2;
        }

        /* Hover motion only where hover is real — touch fires false hovers on tap.
           Keyed on .wa-pill, not .wa-root: the anchor has pointer-events:none, so
           it is never itself hovered, and hovering the anchor's full 150px box
           would in any case expand the widget from an invisible region. */
        @media (hover: hover) and (pointer: fine) {
          .wa-pill:hover {
            clip-path: inset(0 0 0 0 round 9999px);
          }
          .wa-pill:hover .wa-label {
            opacity: 1;
            transform: translateX(0);
            transition-delay: 60ms;
          }
        }

        .wa-pill:active {
          transform: scale(0.97);
          transition: transform 160ms cubic-bezier(0.16, 1, 0.3, 1),
                      clip-path 320ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Keyboard users never trigger :hover — reveal the label on focus too,
           so the anchor's accessible affordance matches the pointer one. */
        .wa-root:focus-visible .wa-pill {
          clip-path: inset(0 0 0 0 round 9999px);
        }
        .wa-root:focus-visible .wa-label {
          opacity: 1;
          transform: translateX(0);
        }

        @media (prefers-reduced-motion: reduce) {
          .wa-root {
            animation: none;
            opacity: 1;
          }
          .wa-pill,
          .wa-label {
            transition-duration: 1ms;
          }
          .wa-label { transform: none; }
          .wa-pill:active { transform: none; }
        }
      `}</style>

      <a
        className="wa-root"
        href="https://wa.me/919355500199?text=Hi%2C%20I%20need%20help%20with%20StudyLedger"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
      >
        <span className="wa-pill">
          <span className="wa-label">Chat with us</span>
          <span className="wa-icon">
            <MessageCircle size={20} strokeWidth={2.2} />
          </span>
        </span>
      </a>
    </>
  )
}
