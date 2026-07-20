'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { InternalChat } from '@/components/chat/InternalChat';
import { useLanguage } from '@/contexts/LanguageContext';

interface UserData {
  id: string;
  companyId?: string;
}

export default function EmployeeChatPage() {
  const { t } = useLanguage();
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
          setError(t('employeeChat', 'noCompany'));
        }
      } catch (err) {
        setError(t('employeeChat', 'loadError'));
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
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-border border-t-foreground"></div>
          <p className="mt-4 text-sm text-muted-foreground">{t('employeeChat', 'loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !userData?.companyId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
            <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="mb-2 font-display text-xl font-bold text-foreground">{t('employeeChat', 'accessDenied')}</h1>
          <p className="mb-6 text-muted-foreground">
            {error || t('employeeChat', 'mustBeEmployee')}
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t('employeeChat', 'backHome')}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">{t('employeeChat', 'teamMessaging')}</h1>
          <p className="mt-1 text-muted-foreground">{t('employeeChat', 'teamMessagingDesc')}</p>
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
