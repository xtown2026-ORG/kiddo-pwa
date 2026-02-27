import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthProvider";
import { getMyProfile } from "../modules/profile/profile.api";

const APPROVAL_ROLES = ["teacher", "student"];

export default function RequireApproval({ children }) {
  const { user, loading, updateUser } = useAuth();
  const location = useLocation();
  const [profileGate, setProfileGate] = useState({
    firstLogin: null,
    approvalStatus: null,
  });
  const [checking, setChecking] = useState(true);

  const shouldCheck = useMemo(() => {
    return user?.role && APPROVAL_ROLES.includes(user.role);
  }, [user?.role]);

  useEffect(() => {
    let isMounted = true;

    async function fetchApprovalStatus() {
      if (!shouldCheck) {
        if (isMounted) setChecking(false);
        return;
      }

      try {
        setChecking(true);
        const res = await getMyProfile(user.role);
        const data = res?.data || {};
        const approvalStatus = data?.approval_status || null;
        const firstLogin =
          typeof data?.first_login === "boolean"
            ? data.first_login
            : typeof data?.user?.first_login === "boolean"
              ? data.user.first_login
              : null;

        if (isMounted) {
          const normalized = data?.user ? { ...data, ...data.user } : data;
          setProfileGate({
            firstLogin,
            approvalStatus,
          });
          updateUser?.({
            ...(typeof firstLogin === "boolean" ? { first_login: firstLogin } : {}),
            ...(approvalStatus ? { approval_status: approvalStatus } : {}),
            ...(normalized?.name ? { name: normalized.name } : {}),
          });
        }
      } catch (err) {
        console.error("Failed to fetch approval status:", err);
        if (isMounted) {
          setProfileGate({
            firstLogin: user?.first_login ?? null,
            approvalStatus: user?.approval_status ?? null,
          });
        }
      } finally {
        if (isMounted) {
          setChecking(false);
        }
      }
    }

    fetchApprovalStatus();

    return () => {
      isMounted = false;
    };
  }, [shouldCheck, user?.role]);

  if (loading || checking) return null;
  if (!shouldCheck) return children;

  if (profileGate.firstLogin === true && location.pathname !== "/first-login") {
    return (
      <Navigate to="/first-login" state={{ from: location }} replace />
    );
  }

  if (profileGate.approvalStatus !== "approved") {
    const roleProfilePath = user?.role ? `/${user.role}/profile` : null;
    const roleDashboardPath = user?.role ? `/${user.role}/dashboard` : null;
    const isProfileRoute = roleProfilePath
      ? location.pathname.startsWith(roleProfilePath)
      : false;
    const isDashboardRoute = roleDashboardPath
      ? location.pathname.startsWith(roleDashboardPath)
      : false;
    const isApprovalRoute = location.pathname.startsWith("/approval-pending");

    if (!isProfileRoute && !isDashboardRoute && !isApprovalRoute) {
      return (
        <Navigate to="/approval-pending" state={{ from: location }} replace />
      );
    }
  }

  return children;
}
