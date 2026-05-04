export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { getServerSession } from "next-auth";

import { Header } from "@/components/layout/Header";
import { UsersTable } from "@/components/users/UsersTable";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!session || !isAdmin(role)) redirect("/dashboard");

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

  const rawId = Number((session.user as { id?: string }).id);
  const currentUserId = Number.isFinite(rawId) ? rawId : undefined;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, flex: 1 }}>
      <Header title="Users" />
      <Box sx={{ flex: 1, overflow: "auto", py: { xs: 2, sm: 3 } }}>
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Manage application accounts and roles. Only administrators see this section.
          </Typography>
          <UsersTable
            currentUserId={currentUserId}
            initialUsers={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))}
          />
        </Container>
      </Box>
    </Box>
  );
}
