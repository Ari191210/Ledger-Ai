"use client"
import { MessageCircle } from "lucide-react"

export function WhatsAppWidget() {
  return (
    <a
      href="https://wa.me/919355500199?text=Hi%2C%20I%20need%20help%20with%20StudyLedger"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "12px 20px",
        borderRadius: "9999px",
        background: "#25D366",
        color: "#fff",
        fontFamily: "var(--font-sans)",
        fontSize: "0.875rem",
        fontWeight: 600,
        textDecoration: "none",
        boxShadow: "0 4px 20px rgba(37, 211, 102, 0.4)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"
        ;(e.currentTarget as HTMLElement).style.boxShadow = "0 6px 28px rgba(37, 211, 102, 0.5)"
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.transform = "translateY(0)"
        ;(e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(37, 211, 102, 0.4)"
      }}
    >
      <MessageCircle size={18} />
      <span>Chat with us</span>
    </a>
  )
}
