export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Clerk sign-in route (client-side — see App.tsx). The old same-origin OIDC
// start URL (/api/oauth/login) stays live server-side but is no longer the
// app's sign-in entry point.
export const getLoginUrl = () => "/sign-in";
