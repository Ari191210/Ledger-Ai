import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "StudyLedger · academic intelligence platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Satori (next/og's renderer) can't parse WOFF2 or variable fonts, so pull
// static per-weight WOFF (v1) files from the @fontsource package on jsDelivr.
const FONT = (weight: number) =>
  `https://cdn.jsdelivr.net/npm/@fontsource/geist/files/geist-latin-${weight}-normal.woff`;

export default async function Image() {
  const [regular, bold] = await Promise.all([
    fetch(FONT(400)).then((r) => r.arrayBuffer()),
    fetch(FONT(800)).then((r) => r.arrayBuffer()),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0e0e0d",
          padding: "72px",
          fontFamily: "Geist",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "10px",
              background: "#c8f43a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "26px",
              fontWeight: 800,
              color: "#0e0e0d",
            }}
          >
            SL
          </div>
          <div style={{ fontSize: "28px", color: "#9d9c96", letterSpacing: "-0.02em" }}>
            studyledger.in
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              fontSize: "72px",
              fontWeight: 800,
              color: "#f3f2ee",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              maxWidth: "980px",
            }}
          >
            Know exactly where you stand.
          </div>
          <div style={{ fontSize: "30px", color: "#9d9c96", maxWidth: "820px", lineHeight: 1.4 }}>
            One score for your prep. 25 tools that turn study data into a plan, built for Indian
            students.
          </div>
        </div>

        <div style={{ display: "flex", gap: "40px" }}>
          {["planner", "mistake dna", "exam simulator", "peer heatmap"].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                fontSize: "22px",
                color: "#67665f",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Geist", data: regular, weight: 400, style: "normal" },
        { name: "Geist", data: bold, weight: 800, style: "normal" },
      ],
    },
  );
}
