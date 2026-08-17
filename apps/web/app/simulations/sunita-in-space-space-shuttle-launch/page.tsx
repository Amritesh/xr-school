"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const SpaceShuttleLaunchViewer = dynamic(
  () => import("@/components/simulations/SpaceShuttleLaunchViewer"),
  { ssr: false },
);

export default function SpaceShuttleLaunchPage() {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#030712",
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
          background: "rgba(3,12,28,0.8)",
          border: "1px solid rgba(125,211,252,0.38)",
          color: "#dbeafe",
          fontSize: "0.85rem",
          backdropFilter: "blur(4px)",
        }}
      >
        ← Simulations
      </Link>
      <SpaceShuttleLaunchViewer />
    </div>
  );
}
