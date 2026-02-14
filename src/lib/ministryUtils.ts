import type { Ministry } from "@/hooks/useMinistries";

/**
 * Formats a ministry name with its leader name(s).
 * Example: "Louvor (João Silva)" or "Louvor (João, Maria)"
 */
export function formatMinistryWithLeader(ministry: Ministry | undefined | null): string {
  if (!ministry) return "Sem ministério";
  if (!ministry.leaderName) return ministry.name;
  return `${ministry.name} (${ministry.leaderName})`;
}
