import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "../../ogCard";

export const alt = "GBL Note — Raid Bosses";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard({ badge: "RAID BOSSES", title: "Raid Boss List", sub: "CP · Counters · Weather", accent: "#ea580c" });
}
