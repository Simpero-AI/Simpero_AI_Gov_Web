// Shared render wrapper for admin component tests: QueryClientProvider +
// react-router <MemoryRouter> pinned to the admin base path. Router context
// only — tests that need a real `:param` register their own <Routes>/<Route>
// (see OrgDetail.test.tsx).
import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";

export function renderAdmin(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/admin"]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}
