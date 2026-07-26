"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const RockClimbingViewer = dynamic(
  () => import("@/components/simulations/RockClimbingViewer"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "#17221f",
          display: "grid",
          placeItems: "center",
          color: "#fbbf24",
        }}
      >
        Preparing the mountain climbing route…
      </div>
    ),
  },
);

export default function RockClimbingPage() {
  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#17221f",
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
          background: "rgba(23,34,31,0.82)",
          color: "#f7fee7",
          fontSize: "0.85rem",
          backdropFilter: "blur(4px)",
        }}
      >
        ← Catalog
      </Link>
      <RockClimbingViewer />
    </div>
  );
}
