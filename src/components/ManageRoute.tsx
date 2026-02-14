import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

/**
 * Protects routes that require management permissions (create, edit, delete).
 * Viewers and users with expired subscriptions are redirected to dashboard.
 */
const ManageRoute = () => {
  const { isAuthenticated, role, isLoading } = useAuth();
  const { isBlocked } = useSubscriptionStatus();

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Viewers cannot access management routes
  if (role === "viewer") {
    return <Navigate to="/dashboard" replace />;
  }

  // Users with expired trial/subscription cannot access management routes
  if (isBlocked) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default ManageRoute;