import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "../../ogCard";

export const alt = "GBL Note — PvP Tier List";
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
    badge: mega ? "MEGA TIER LIST" : "TIER LIST",
    title: NAME[lg] || "Battle League",
    sub: mega ? "PvP Tier · Mega" : "PvP Tier List",
    accent: mega ? "#db2777" : "#7c3aed",
  });
}
