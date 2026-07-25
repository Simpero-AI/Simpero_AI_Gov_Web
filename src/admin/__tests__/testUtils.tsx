// Shared render wrapper for admin component tests: QueryClientProvider +
// wouter <Router base="/admin"> (mirrors the plan's Phase 5 test guidance).
import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router } from "wouter";

export function renderAdmin(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Router base="/admin">{ui}</Router>
    </QueryClientProvider>
  );
}
