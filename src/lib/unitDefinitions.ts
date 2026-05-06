import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { UNIT_OPTIONS } from "@/lib/units";

export type AppUnitDefinition = {
  id: number;
  code: string;
  name: string;
  kgFactor: number;
  isActive: boolean;
};

function isMissingUnitTable(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021";
}

export function fallbackUnits(): AppUnitDefinition[] {
  return UNIT_OPTIONS.map((u, idx) => ({
    id: idx + 1,
    code: u.value,
    name: u.label.split(" (")[0],
    kgFactor: u.value === "MAUND" ? 40 : u.value === "BAG" ? 50 : 1,
    isActive: true,
  }));
}

export async function getActiveUnitsOrFallback(): Promise<AppUnitDefinition[]> {
  try {
    const units = await prisma.unitDefinition.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
    });
    if (units.length > 0) {
      return units.map((u) => ({
        id: u.id,
        code: u.code,
        name: u.name,
        kgFactor: Number(u.kgFactor),
        isActive: u.isActive,
      }));
    }
  } catch (error) {
    if (!isMissingUnitTable(error)) throw error;
  }
  return fallbackUnits();
}

export async function isUnitAllowed(code: string): Promise<boolean> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return false;
  try {
    const row = await prisma.unitDefinition.findFirst({
      where: { code: normalized, isActive: true },
      select: { id: true },
    });
    return !!row;
  } catch (error) {
    if (!isMissingUnitTable(error)) throw error;
    return fallbackUnits().some((u) => u.code === normalized);
  }
}
