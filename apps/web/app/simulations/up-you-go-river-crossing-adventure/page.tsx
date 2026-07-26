"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const RiverCrossingAdventureViewer = dynamic(
  () => import("@/components/simulations/RiverCrossingAdventureViewer"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "#102b35",
          display: "grid",
          placeItems: "center",
          color: "#7dd3fc",
        }}
      >
        Preparing the mountain river crossing…
      </div>
    ),
  },
);

export default function RiverCrossingAdventurePage() {
  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#102b35",
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
          background: "rgba(16,43,53,0.82)",
          color: "#f0f9ff",
          fontSize: "0.85rem",
          backdropFilter: "blur(4px)",
        }}
      >
        ← Catalog
      </Link>
      <RiverCrossingAdventureViewer />
    </div>
  );
}
