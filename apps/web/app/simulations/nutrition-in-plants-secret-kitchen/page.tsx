"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const SecretGardenKitchenViewer = dynamic(
  () => import("@/components/simulations/SecretGardenKitchenViewer"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "#052e16",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ fontSize: 48 }}>🌿</div>
        <p style={{ color: "#bbf7d0" }}>Opening the secret garden kitchen…</p>
      </div>
    ),
  },
);

export default function SecretGardenKitchenPage() {
  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#052e16",
      }}
    >
      <Link
        href="/simulations"
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          zIndex: 20,
          padding: "6px 14px",
          borderRadius: 8,
          background: "rgba(5,46,22,0.78)",
          border: "1px solid rgba(134,239,172,0.35)",
          color: "#dcfce7",
          fontSize: "0.85rem",
          backdropFilter: "blur(4px)",
        }}
      >
        ← Simulations
      </Link>
      <SecretGardenKitchenViewer />
    </div>
  );
}
