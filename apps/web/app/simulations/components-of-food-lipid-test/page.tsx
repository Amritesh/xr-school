"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const LipidTestViewer = dynamic(
  () => import("@/components/simulations/LipidTestViewer"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "#07111f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ fontSize: 48 }}>🥜</div>
        <p style={{ color: "#9ca3af" }}>
          Preparing the food-testing laboratory…
        </p>
      </div>
    ),
  },
);

export default function ComponentsOfFoodLipidTestPage() {
  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#07111f",
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
          background: "rgba(0,0,0,0.58)",
          color: "#e5e7eb",
          fontSize: "0.85rem",
          backdropFilter: "blur(4px)",
        }}
      >
        ← Catalog
      </Link>
      <LipidTestViewer />
    </div>
  );
}
