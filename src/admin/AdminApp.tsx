import { Redirect, Route, Switch } from "wouter";
import AdminGuard from "./components/AdminGuard";
import AdminHome from "./pages/AdminHome";
import Invitations from "./pages/Invitations";
import Members from "./pages/Members";
import OrgDetail from "./pages/OrgDetail";
import Organizations from "./pages/Organizations";

/**
 * Lazy entrypoint for the guarded portal subtree, mounted at /admin (nest)
 * in App.tsx's outer <Switch>. Child paths below are relative to /admin.
 */
export default function AdminApp() {
  return (
    <AdminGuard>
      <Switch>
        <Route path="/" component={AdminHome} />
        <Route path="/organizations" component={Organizations} />
        <Route path="/organizations/:orgId" component={OrgDetail} />
        <Route path="/members" component={Members} />
        <Route path="/invitations" component={Invitations} />
        <Route>
          <Redirect to="~/" />
        </Route>
      </Switch>
    </AdminGuard>
  );
}
