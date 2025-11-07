'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRole="CLIENT">
      {children}
    </ProtectedRoute>
  );
}
