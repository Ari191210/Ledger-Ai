"use client"
import { useState } from "react"
import { motion } from "framer-motion"
import { MessageCircle } from "lucide-react"

const EASE = [0.16, 1, 0.3, 1] as const

export function WhatsAppWidget() {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.a
      href="https://wa.me/919355500199?text=Hi%2C%20I%20need%20help%20with%20StudyLedger"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial={{ opacity: 0, scale: 0.7, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 1.2, ease: EASE }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.92 }}
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: "inline-flex",
        alignItems: "center",
        height: 48,
        minWidth: 48,
        borderRadius: 9999,
        textDecoration: "none",
        overflow: "hidden",
        background: "var(--paper)",
        border: "1px solid var(--rule)",
        boxShadow:
          "0 2px 10px color-mix(in srgb, black 18%, transparent)",
      }}
    >
      <span
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 48, height: 48, flexShrink: 0, color: "#25D366",
        }}
      >
        <MessageCircle size={20} strokeWidth={2.2} />
      </span>
      <motion.span
        initial={false}
        animate={{ width: hovered ? "auto" : 0, opacity: hovered ? 1 : 0, marginRight: hovered ? 18 : 0 }}
        transition={{ duration: 0.32, ease: EASE }}
        style={{
          fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600,
          color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden",
        }}
      >
        Chat with us
      </motion.span>
    </motion.a>
  )
}
