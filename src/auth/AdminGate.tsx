import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function AdminGate() {
  const { isAdmin, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;
  if (!isAdmin) {
    const next = encodeURIComponent(
      `${location.pathname}${location.search}${location.hash}`,
    );
    return <Navigate to={`/login?mode=login&next=${next}`} replace />;
  }

  return <Outlet />;
}
