import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "../../ogCard";

export const alt = "GBL Note — Raid Attackers";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const TYPE_EN: Record<string, string> = {
  normal: "Normal", fire: "Fire", water: "Water", electric: "Electric", grass: "Grass", ice: "Ice",
  fighting: "Fighting", poison: "Poison", ground: "Ground", flying: "Flying", psychic: "Psychic",
  bug: "Bug", rock: "Rock", ghost: "Ghost", dragon: "Dragon", dark: "Dark", steel: "Steel", fairy: "Fairy",
};
const TYPE_COLOR: Record<string, string> = {
  normal: "#9fa19f", fire: "#e62829", water: "#2980ef", electric: "#d9a900", grass: "#3fa129",
  ice: "#37b6c9", fighting: "#ff8000", poison: "#9141cb", ground: "#915121", flying: "#6c93e0",
  psychic: "#ef4179", bug: "#91a119", rock: "#96843d", ghost: "#704170", dragon: "#5060e1",
  dark: "#4b4243", steel: "#5a8a9c", fairy: "#d76ad7",
};

export default function Image({ params }: { params: { type: string } }) {
  const ty = params.type;
  const accent = TYPE_COLOR[ty] || "#ea580c";
  return ogCard({
    badge: "RAID ATTACKERS",
    title: `${TYPE_EN[ty] || "Type"} Raids`,
    sub: "Best DPS Attackers · Tier",
    accent,
    dots: [accent, accent, accent],
  });
}
