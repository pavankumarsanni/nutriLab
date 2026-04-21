import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "NutriFitLab — Eat smart. Train hard.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "linear-gradient(135deg, #052e16 0%, #14532d 50%, #166534 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background decorative circles */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            right: "-80px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.04)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-120px",
            left: "-60px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.03)",
          }}
        />

        {/* Top label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "100px",
            padding: "8px 20px",
            marginBottom: "32px",
          }}
        >
          <span style={{ fontSize: "14px", color: "#86efac", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            AI-Powered Health &amp; Fitness
          </span>
        </div>

        {/* Logo + Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "16px" }}>
          <span style={{ fontSize: "72px" }}>🧪</span>
          <span
            style={{
              fontSize: "80px",
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-2px",
            }}
          >
            NutriFitLab
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: "32px",
            color: "#4ade80",
            fontWeight: 600,
            letterSpacing: "0.02em",
            marginBottom: "40px",
          }}
        >
          Eat smart. Train hard.
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: "12px" }}>
          {["AI Meal Plans", "Workout Generator", "Nutrition Chat", "Personal Profile"].map((label) => (
            <div
              key={label}
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "8px",
                padding: "10px 18px",
                color: "#d1fae5",
                fontSize: "18px",
                fontWeight: 500,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: "absolute",
            bottom: "28px",
            color: "rgba(255,255,255,0.35)",
            fontSize: "16px",
            letterSpacing: "0.05em",
          }}
        >
          nutrifitlab.vercel.app
        </div>
      </div>
    ),
    { ...size }
  );
}
