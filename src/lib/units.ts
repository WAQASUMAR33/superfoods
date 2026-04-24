export type Unit = "KG" | "MAUND" | "BAG";

export const MAUND_TO_KG = 40;
export const BAG_TO_KG = 50;

export function toKg(qty: number, unit: Unit): number {
  if (unit === "MAUND") return qty * MAUND_TO_KG;
  if (unit === "BAG") return qty * BAG_TO_KG;
  return qty;
}

export function fromKg(kg: number, unit: Unit): number {
  if (unit === "MAUND") return kg / MAUND_TO_KG;
  if (unit === "BAG") return kg / BAG_TO_KG;
  return kg;
}

export function formatDisplay(kg: number, unit: Unit): string {
  const qty = fromKg(kg, unit);
  const label = unit === "MAUND" ? "Mnd" : unit === "BAG" ? "Bag" : "Kg";
  if (unit === "KG") return `${qty.toFixed(2)} Kg`;
  return `${qty.toFixed(2)} ${label} (${kg.toFixed(2)} Kg)`;
}

export const UNIT_OPTIONS: { value: Unit; label: string }[] = [
  { value: "KG", label: "Kilograms (Kg)" },
  { value: "MAUND", label: "Maunds (40 Kg)" },
  { value: "BAG", label: "Bags (50 Kg)" },
];
