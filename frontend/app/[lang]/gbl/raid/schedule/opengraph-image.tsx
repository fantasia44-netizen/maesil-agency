import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "../../ogCard";

export const alt = "GBL Note — Raid Calendar";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard({ badge: "RAID CALENDAR", title: "Raid Schedule", sub: "Boss Rotation · Events", accent: "#f59e0b" });
}
