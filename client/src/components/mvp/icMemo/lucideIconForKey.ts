/**
 * Map composer-emitted IcMemoIconKey strings to lucide-react icons.
 *
 * Closed allowlist — composer output is validated against
 * `IC_MEMO_ICON_KEYS` in shared/simperoTypes; unknown keys defensively fall
 * back to FileText so a missing mapping never crashes the deliverable view.
 */
import {
  TrendingUp,
  Users,
  Shield,
  DollarSign,
  Target,
  Award,
  AlertTriangle,
  CheckCircle,
  Building,
  Globe,
  Calendar,
  FileText,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { IcMemoIconKey } from "@shared/simperoTypes";

const MAP: Record<IcMemoIconKey, LucideIcon> = {
  growth: TrendingUp,
  team: Users,
  moat: Shield,
  unit_economics: DollarSign,
  market: Target,
  customers: Award,
  trending_up: TrendingUp,
  users: Users,
  shield: Shield,
  dollar_sign: DollarSign,
  target: Target,
  award: Award,
  alert_triangle: AlertTriangle,
  check_circle: CheckCircle,
  building: Building,
  globe: Globe,
  calendar: Calendar,
  file_text: FileText,
  sparkles: Sparkles,
};

export function lucideIconForKey(key: string): LucideIcon {
  return (MAP as Record<string, LucideIcon>)[key] ?? FileText;
}
