/** Application roles stored in `User.role` — keep in sync with seeds and forms. */
export const USER_ROLES = ["ADMIN", "MANAGER", "CASHIER"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function isAdmin(role: string | null | undefined): boolean {
  return role === "ADMIN";
}
