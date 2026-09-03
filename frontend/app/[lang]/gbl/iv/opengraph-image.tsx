import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "../ogCard";

export const alt = "GBL Note — IV Rank Checker";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard({ badge: "IV RANK", title: "IV Rank Checker", sub: "Best PvP IV Spreads by League", accent: "#3b5bdb" });
}
