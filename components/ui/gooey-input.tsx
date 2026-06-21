"use client"
import { useRef, useState } from "react"

interface GooeyInputProps {
  placeholder?: string
  value?: string
  onChange?: (v: string) => void
  className?: string
  style?: React.CSSProperties
}

export function GooeyInput({
  placeholder = "Search...",
  value,
  onChange,
  className,
  style,
}: GooeyInputProps) {
  const [focused, setFocused] = useState(false)
  const [internal, setInternal] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const controlled = value !== undefined
  const val = controlled ? value : internal

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!controlled) setInternal(e.target.value)
    onChange?.(e.target.value)
  }

  const clear = () => {
    if (!controlled) setInternal("")
    onChange?.("")
    inputRef.current?.focus()
  }

  return (
    <div
      className={className}
      style={{ position: "relative", display: "flex", alignItems: "center", height: 46, ...style }}
    >
      {/* SVG gooey filter — hidden, shared per page */}
      <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden="true">
        <defs>
          <filter id="goo-search-filter" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"
              result="cm"
            />
            <feComposite in="SourceGraphic" in2="cm" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* Gooey blobs — filtered background layer */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          filter: "url(#goo-search-filter)",
          zIndex: 0,
        }}
      >
        {/* Main pill body */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: focused
              ? "color-mix(in srgb, var(--cinnabar-ink) 10%, var(--paper-2))"
              : "var(--paper-2)",
            borderRadius: 999,
            transition: "background 350ms ease",
          }}
        />
        {/* Icon blob — expands on focus */}
        <div
          style={{
            position: "absolute",
            left: focused ? 4 : 8,
            top: "50%",
            transform: "translateY(-50%)",
            width: focused ? 38 : 30,
            height: focused ? 38 : 30,
            background: focused
              ? "color-mix(in srgb, var(--cinnabar-ink) 22%, var(--paper-2))"
              : "color-mix(in srgb, var(--ink) 6%, transparent)",
            borderRadius: "50%",
            transition: "all 450ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
        {/* Clear button blob */}
        {val && (
          <div
            style={{
              position: "absolute",
              right: 4,
              top: "50%",
              transform: "translateY(-50%)",
              width: 30,
              height: 30,
              background: "color-mix(in srgb, var(--cinnabar-ink) 14%, var(--paper-2))",
              borderRadius: "50%",
            }}
          />
        )}
      </div>

      {/* Border ring — above goo layer, not filtered */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 999,
          border: `1.5px solid ${
            focused
              ? "color-mix(in srgb, var(--cinnabar-ink) 60%, transparent)"
              : "color-mix(in srgb, var(--ink) 12%, transparent)"
          }`,
          transition: "border-color 300ms ease",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />

      {/* Actual input — no filter, always crisp */}
      <div
        style={{
          position: "relative",
          zIndex: 3,
          display: "flex",
          alignItems: "center",
          width: "100%",
          height: "100%",
        }}
      >
        <span
          style={{
            position: "absolute",
            left: 14,
            fontFamily: "var(--mono)",
            fontSize: 17,
            color: focused ? "var(--cinnabar-ink)" : "var(--ink-3)",
            transition: "color 300ms ease",
            pointerEvents: "none",
            lineHeight: 1,
            userSelect: "none",
          }}
        >
          ⌕
        </span>
        <input
          ref={inputRef}
          type="search"
          value={val}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          aria-label={placeholder}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            fontFamily: "var(--sans)",
            fontSize: 14,
            color: "var(--ink)",
            paddingLeft: 42,
            paddingRight: val ? 42 : 16,
            height: "100%",
          }}
        />
        {val && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            style={{
              position: "absolute",
              right: 12,
              width: 22,
              height: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "none",
              border: "none",
              fontFamily: "var(--mono)",
              fontSize: 11,
              color: "var(--ink-3)",
              cursor: "pointer",
              borderRadius: "50%",
              lineHeight: 1,
              padding: 0,
            }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
