"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const SnowMountainClimbingViewer = dynamic(
  () => import("@/components/simulations/SnowMountainClimbingViewer"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "#10253a",
          display: "grid",
          placeItems: "center",
          color: "#a7f3d0",
        }}
      >
        Preparing the snow-mountain route…
      </div>
    ),
  },
);

export default function SnowMountainClimbingPage() {
  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#10253a",
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
          background: "rgba(16,37,58,0.84)",
          color: "#f8fafc",
          fontSize: "0.85rem",
          backdropFilter: "blur(4px)",
        }}
      >
        ← Catalog
      </Link>
      <SnowMountainClimbingViewer />
    </div>
  );
}
