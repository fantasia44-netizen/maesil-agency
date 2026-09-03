import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "../ogCard";

export const alt = "GBL Note — Event Calendar";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard({ badge: "EVENTS", title: "Event Calendar", sub: "Community Day · Spotlight · Raids", accent: "#0d9488" });
}
