import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#c8f43a",
          borderRadius: "7px",
          fontFamily: "sans-serif",
          fontSize: "17px",
          fontWeight: 800,
          color: "#0e0e0d",
        }}
      >
        SL
      </div>
    ),
    { ...size },
  );
}
