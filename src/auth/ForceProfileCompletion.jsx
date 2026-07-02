import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function ForceProfileCompletion({ children }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return null;

    if (user && user.first_login) {
        const completionPath = user?.role === "parent" ? "/parent/profile" : "/first-login";
        // Already on the target page — don't redirect again (prevents infinite loop)
        if (location.pathname === completionPath) {
            return children;
        }
        return <Navigate to={completionPath} state={{ from: location }} replace />;
    }

    return children;
}
