export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { USER_ROLES, isAdmin } from "@/lib/roles";

const CreateUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(6),
  fullName: z.string().min(1),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  role: z.enum(USER_ROLES),
});

async function forbidIfNotAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string })?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function GET() {
  const denied = await forbidIfNotAdmin();
  if (denied) return denied;

  const users = await prisma.user.findMany({
    orderBy: { username: "asc" },
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
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const denied = await forbidIfNotAdmin();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateUserSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;
  const dup = await prisma.user.findUnique({ where: { username: d.username } });
  if (dup) return NextResponse.json({ error: "Username already taken" }, { status: 409 });

  let emailParsed: string | null = null;
  if (d.email && d.email.length > 0) {
    const clash = await prisma.user.findUnique({ where: { email: d.email } }).catch(() => null);
    if (clash) return NextResponse.json({ error: "Email already taken" }, { status: 409 });
    emailParsed = d.email;
  }

  const passwordHash = await bcrypt.hash(d.password, 10);

  try {
    const created = await prisma.user.create({
      data: {
        username: d.username.trim(),
        fullName: d.fullName.trim(),
        passwordHash,
        role: d.role,
        email: emailParsed,
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
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not create user";
    console.error("[POST /api/users]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
