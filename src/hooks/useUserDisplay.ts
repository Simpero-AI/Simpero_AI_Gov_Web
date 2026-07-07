import { useAuth } from "@/_core/hooks/useAuth";

export function useUserDisplay() {
  const { user } = useAuth();
  const userInitial = user?.name
    ? user.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : (user?.email?.[0]?.toUpperCase() ?? "S");
  const userName = user?.name ?? user?.email?.split("@")[0] ?? undefined;
  const userRoleLabel = user?.role === "admin" ? "Admin" : user?.role ? "Analyst" : undefined;
  return { userInitial, userName, userRoleLabel };
}
