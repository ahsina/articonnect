'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const success = searchParams.get('success');

  useEffect(() => {
    if (success === 'true') {
      // OAuth successful, refresh user data
      refreshUser().then(() => {
        router.push('/client/dashboard');
      });
    } else {
      // OAuth failed
      router.push('/auth/login?error=oauth_failed');
    }
  }, [success, refreshUser, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Connexion en cours...</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Chargement...</div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
