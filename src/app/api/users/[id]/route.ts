export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { USER_ROLES, isAdmin } from "@/lib/roles";

const UpdateUserSchema = z.object({
  fullName: z.string().min(1),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  role: z.enum(USER_ROLES),
  isActive: z.boolean(),
  password: z.union([z.string().min(6), z.literal("")]).optional(),
});

async function requireAdmin(req: NextRequest, paramsPromise: Promise<{ id: string }>) {
  const session = await getServerSession(authOptions);
  if (!session) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const role = (session.user as { role?: string }).role;
  if (!isAdmin(role)) return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };

  const { id } = await paramsPromise;
  const numericId = Number(id);
  if (Number.isNaN(numericId)) return { response: NextResponse.json({ error: "Invalid id" }, { status: 400 }) };

  const selfId = (session.user as { id?: string }).id;
  return { numericId, selfId } as const;
}

async function countActiveAdmins(excludeUserId?: number) {
  return prisma.user.count({
    where: { role: "ADMIN", isActive: true, ...(excludeUserId !== undefined ? { id: { not: excludeUserId } } : {}) },
  });
}

/** Prevent removing admin role/deactivating sole admin account. */
async function enforceLastAdminSafety(
  userId: number,
  incoming: z.infer<typeof UpdateUserSchema>,
  current: { role: string; isActive: boolean }
) {
  const wasProtected = current.role === "ADMIN" && current.isActive;
  if (!wasProtected) return null;

  const becomesNonAdminOrInactive =
    incoming.role !== "ADMIN" ||
    incoming.isActive === false;

  if (becomesNonAdminOrInactive) {
    const remaining = await countActiveAdmins(userId);
    if (remaining < 1) {
      return NextResponse.json(
        { error: "Cannot demote or deactivate the last active ADMIN. Create another admin first." },
        { status: 409 }
      );
    }
  }
  return null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin(_req, params);
  if ("response" in ctx) return ctx.response;
  const { numericId } = ctx;

  const user = await prisma.user.findUnique({
    where: { id: numericId },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin(req, params);
  if ("response" in ctx) return ctx.response;
  const { numericId, selfId } = ctx;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = UpdateUserSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const incoming = parsed.data;

  const existing = await prisma.user.findUnique({ where: { id: numericId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const safety = await enforceLastAdminSafety(numericId, incoming, { role: existing.role, isActive: existing.isActive });
  if (safety) return safety;

  if (incoming.isActive === false && selfId !== undefined && String(existing.id) === selfId) {
    return NextResponse.json({ error: "You cannot deactivate your own account" }, { status: 409 });
  }

  if (incoming.email && incoming.email.length > 0) {
    const clash = await prisma.user.findFirst({
      where: { email: incoming.email, id: { not: numericId } },
    });
    if (clash) return NextResponse.json({ error: "Email already taken" }, { status: 409 });
  }

  try {
    const passwordHash =
      incoming.password && incoming.password.length >= 6
        ? await bcrypt.hash(incoming.password, 10)
        : undefined;

    const updated = await prisma.user.update({
      where: { id: numericId },
      data: {
        fullName: incoming.fullName.trim(),
        email:
          incoming.email === undefined ? undefined : incoming.email === "" ? null : incoming.email,
        role: incoming.role,
        isActive: incoming.isActive,
        ...(passwordHash ? { passwordHash } : {}),
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not update user";
    console.error("[PUT /api/users/[id]]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
