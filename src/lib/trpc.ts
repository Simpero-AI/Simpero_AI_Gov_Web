import { createTRPCReact } from "@trpc/react-query";
// FROZEN snapshot of simpero_GOV_AI@4cdfe5ce1c382febf777e5289ee2e209d0c4479f — do not edit; deleted in FE-7.
import type { AppRouter } from "@/api/_legacy/server/routers";

export const trpc = createTRPCReact<AppRouter>();
