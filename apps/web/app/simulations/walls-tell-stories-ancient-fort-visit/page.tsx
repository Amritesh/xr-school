"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const AncientFortVisitViewer = dynamic(
  () => import("@/components/simulations/AncientFortVisitViewer"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "#24180f",
          display: "grid",
          placeItems: "center",
          color: "#f5c16c",
        }}
      >
        Opening the ancient fort gateway…
      </div>
    ),
  },
);

export default function AncientFortVisitPage() {
  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#24180f",
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
          background: "rgba(36,24,15,0.84)",
          color: "#fff7ed",
          fontSize: "0.85rem",
          backdropFilter: "blur(4px)",
        }}
      >
        ← Catalog
      </Link>
      <AncientFortVisitViewer />
    </div>
  );
}
