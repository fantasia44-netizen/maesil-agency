import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "../ogCard";

export const alt = "GBL Note — Trade Cards";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard({ badge: "TRADE", title: "Trade Cards", sub: "Wants · Backgrounds · Share", accent: "#0d9488" });
}
