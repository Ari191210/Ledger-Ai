"use client"
import { useRef, useState, useCallback } from "react"

interface FileUploadProps {
  onChange?: (files: File[]) => void
  accept?: string
  multiple?: boolean
}

export function FileUpload({ onChange, accept, multiple = true }: FileUploadProps) {
  const [dragging, setDragging] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const commit = useCallback((incoming: File[]) => {
    const next = multiple ? [...files, ...incoming] : [incoming[0]]
    setFiles(next)
    onChange?.(next)
  }, [files, multiple, onChange])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = Array.from(e.dataTransfer.files)
    if (dropped.length) commit(dropped)
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? [])
    if (picked.length) commit(picked)
    e.target.value = ""
  }

  const remove = (i: number) => {
    const next = files.filter((_, idx) => idx !== i)
    setFiles(next)
    onChange?.(next)
  }

  const fmt = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  }

  return (
    <div style={{ width: "100%", fontFamily: "var(--sans)" }}>
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload files — click or drag and drop"
        onClick={() => inputRef.current?.click()}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click() }}
        onDragEnter={e => { e.preventDefault(); setDragging(true) }}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={e => { e.preventDefault(); setDragging(false) }}
        onDrop={onDrop}
        style={{
          width: "100%",
          minHeight: 180,
          border: `1.5px dashed ${dragging
            ? "var(--cinnabar-ink)"
            : "color-mix(in srgb, var(--ink) 20%, transparent)"}`,
          borderRadius: 14,
          background: dragging
            ? "color-mix(in srgb, var(--cinnabar-ink) 5%, var(--paper-2))"
            : "var(--paper-2)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          cursor: "pointer",
          transition: "border-color 220ms ease, background 220ms ease",
          userSelect: "none",
        }}
      >
        {/* Upload icon */}
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: "color-mix(in srgb, var(--cinnabar-ink) 12%, var(--paper))",
          border: "1px solid color-mix(in srgb, var(--cinnabar-ink) 30%, transparent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          color: "var(--cinnabar-ink)",
          transition: "transform 220ms ease",
          transform: dragging ? "scale(1.1) translateY(-4px)" : "scale(1)",
        }}>
          ↑
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", marginBottom: 4 }}>
            {dragging ? "Drop to upload" : "Drag files here, or click to browse"}
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
            {accept ? accept.replace(/,/g, ", ") : "Any file type"}{multiple ? " · Multiple files supported" : ""}
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={onInputChange}
          style={{ display: "none" }}
          aria-hidden="true"
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {files.map((f, i) => (
            <div
              key={`${f.name}-${i}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                borderRadius: 10,
                background: "color-mix(in srgb, var(--ink) 5%, transparent)",
                border: "1px solid color-mix(in srgb, var(--ink) 10%, transparent)",
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>
                {f.type.startsWith("image/") ? "◻" : f.name.endsWith(".pdf") ? "◈" : "◆"}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 500, color: "var(--ink)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{f.name}</div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{fmt(f.size)}</div>
              </div>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); remove(i) }}
                aria-label={`Remove ${f.name}`}
                style={{
                  background: "none", border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--mono)",
                  fontSize: 12,
                  color: "var(--ink-3)",
                  padding: "4px 6px",
                  borderRadius: 6,
                  flexShrink: 0,
                  lineHeight: 1,
                }}
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
