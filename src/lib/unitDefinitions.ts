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

export function isMissingUnitTableError(error: unknown): boolean {
  return isMissingUnitTable(error);
}

function hasUnitDelegate(): boolean {
  return typeof (prisma as unknown as { unitDefinition?: unknown }).unitDefinition === "object";
}

export function isUnitStoreUnavailable(error: unknown): boolean {
  if (isMissingUnitTable(error)) return true;
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022") return true;
  if (error instanceof TypeError && /unitDefinition/i.test(error.message)) return true;
  return false;
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
  if (!hasUnitDelegate()) return fallbackUnits();
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
    if (!isUnitStoreUnavailable(error)) throw error;
  }
  return fallbackUnits();
}

export async function isUnitAllowed(code: string): Promise<boolean> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return false;
  if (!hasUnitDelegate()) return fallbackUnits().some((u) => u.code === normalized);
  try {
    const row = await prisma.unitDefinition.findFirst({
      where: { code: normalized, isActive: true },
      select: { id: true },
    });
    return !!row;
  } catch (error) {
    if (!isUnitStoreUnavailable(error)) throw error;
    return fallbackUnits().some((u) => u.code === normalized);
  }
}
