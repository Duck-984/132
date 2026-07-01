import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getCurrentAdmin, verifyAdminSession, AdminRole } from '../lib/auth';

interface Props {
  children: React.ReactNode;
  requiredRole?: AdminRole;
}

const ROLE_RANK: Record<AdminRole, number> = { seller: 1, content: 1, support: 2, manager: 3, admin: 4, super_admin: 5 };

export const AdminRoute = ({ children, requiredRole }: Props) => {
  const [verified, setVerified] = useState<boolean | null>(null);
  const admin = getCurrentAdmin();

  useEffect(() => {
    if (!admin) {
      setVerified(false);
      return;
    }

    verifyAdminSession().then((valid) => {
      setVerified(valid);
    });
  }, [admin]);

  // Loading state while verifying
  if (verified === null) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-surface-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!verified || !admin) {
    return <Navigate to="/admin" replace />;
  }

  if (requiredRole && ROLE_RANK[admin.role] < ROLE_RANK[requiredRole]) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
};
