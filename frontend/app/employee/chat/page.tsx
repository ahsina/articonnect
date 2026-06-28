'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { InternalChat } from '@/components/chat/InternalChat';

interface UserData {
  id: string;
  companyId?: string;
}

export default function EmployeeChatPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        if (!response.ok) {
          router.push('/auth/login');
          return;
        }

        const data = await response.json();

        // Get company ID from employee employment
        const employmentRes = await fetch('/api/employee/employment', {
          credentials: 'include',
        });

        if (employmentRes.ok) {
          const employment = await employmentRes.json();
          setUserData({
            id: data.id,
            companyId: employment.companyId,
          });
        } else {
          setError('Vous n\'êtes pas associé à une entreprise');
        }
      } catch (err) {
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !userData?.companyId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Accès non autorisé</h1>
          <p className="text-muted-foreground mb-6">
            {error || 'Vous devez être employé d\'une entreprise pour accéder à la messagerie interne.'}
          </p>
          <a
            href="/employee"
            className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Retour à l'accueil
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Messagerie d'équipe</h1>
          <p className="text-muted-foreground">Communiquez avec les membres de votre entreprise</p>
        </div>

        {/* Chat Component */}
        <InternalChat
          companyId={userData.companyId}
          currentUserId={userData.id}
        />
      </div>
    </div>
  );
}
