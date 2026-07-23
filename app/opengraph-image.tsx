import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/seo/site";

export const runtime = "edge";
export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background: "linear-gradient(135deg, #0b1220 0%, #1a2f6b 48%, #2e63ff 100%)",
          color: "#ffffff",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "rgba(255,255,255,0.14)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              fontWeight: 700,
            }}
          >
            +
          </div>
          <div style={{ fontSize: "34px", fontWeight: 700 }}>{siteConfig.name}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "900px" }}>
          <div
            style={{
              fontSize: "24px",
              fontWeight: 600,
              color: "#9ec0ff",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {siteConfig.tagline}
          </div>
          <div style={{ fontSize: "64px", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.03em" }}>
            Grow Your Clinic.
            <br />
            Let AI Handle Everything Else.
          </div>
          <div style={{ fontSize: "28px", lineHeight: 1.4, color: "rgba(255,255,255,0.86)" }}>
            AI-powered patient growth, automation, and revenue recovery for Indian clinics.
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "22px", color: "rgba(255,255,255,0.72)" }}>
          <span>Founded by {siteConfig.founder.name}</span>
          <span>growclinicos.com</span>
        </div>
      </div>
    ),
    size,
  );
}
