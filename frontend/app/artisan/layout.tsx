'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function ArtisanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRole="ARTISAN">
      {children}
    </ProtectedRoute>
  );
}
