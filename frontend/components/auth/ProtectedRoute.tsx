'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'CLIENT' | 'ARTISAN' | 'ADMIN';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Not authenticated
      if (!isAuthenticated) {
        router.push('/auth/login');
        return;
      }

      // Check role if required
      if (requiredRole && user?.role !== requiredRole) {
        // Redirect to appropriate dashboard based on user's role
        if (user?.role === 'ARTISAN') {
          router.push('/artisan/dashboard');
        } else if (user?.role === 'CLIENT') {
          router.push('/client/dashboard');
        } else if (user?.role === 'ADMIN') {
          router.push('/admin/dashboard');
        } else {
          router.push('/auth/login');
        }
      }
    }
  }, [loading, isAuthenticated, user, requiredRole, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Not authenticated or wrong role
  if (!isAuthenticated || (requiredRole && user?.role !== requiredRole)) {
    return null;
  }

  // Authenticated and correct role
  return <>{children}</>;
}
