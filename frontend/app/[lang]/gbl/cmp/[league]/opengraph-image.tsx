import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "../../ogCard";

export const alt = "GBL Note — CMP Rank";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const NAME: Record<string, string> = {
  great: "Great League", ultra: "Ultra League", master: "Master League",
  great_mega: "Great League", ultra_mega: "Ultra League", master_mega: "Master League",
};

export default function Image({ params }: { params: { league: string } }) {
  const lg = params.league;
  const mega = lg.endsWith("_mega");
  return ogCard({
    badge: mega ? "MEGA CMP RANK" : "CMP RANK",
    title: NAME[lg] || "Battle League",
    sub: "Attack · Charge Priority",
    accent: "#0891b2",
  });
}
