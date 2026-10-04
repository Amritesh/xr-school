import type { Metadata } from "next";
import ColourPicnicViewer from "@/components/simulations/ColourPicnicViewer";

export const metadata: Metadata = {
  title: "The Colour Picnic — Playable Sample | XR School",
  description:
    "A short, hands-on colour adventure: pack fruit, paint a cup and decorate a garden picnic.",
  robots: { index: false, follow: false },
};

export default function ColourPicnicPreviewPage() {
  return <ColourPicnicViewer />;
}
