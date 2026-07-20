'use client';

import { useRouter } from 'next/navigation';
import { PhoneVerification } from '@/components/auth/PhoneVerification';
import { useTranslation } from '@/hooks/useTranslation';

export default function PhoneSettingsPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const handleVerified = (phone: string) => {
    // Show success and redirect after delay
    setTimeout(() => {
      router.push('/settings');
    }, 2000);
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="mx-auto max-w-md px-4">
        <div className="mb-5">
          <button
            onClick={handleCancel}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('common', 'back') || 'Retour'}
          </button>
        </div>

        <h1 className="mb-2 font-display text-2xl font-extrabold tracking-tight text-foreground">
          {t('settings', 'phoneTitle') || 'Verification du telephone'}
        </h1>
        <p className="mb-6 text-muted-foreground">
          {t('settings', 'phoneDescription') || 'Verifiez votre numero de telephone pour securiser votre compte et recevoir des notifications importantes.'}
        </p>

        <PhoneVerification
          onVerified={handleVerified}
          onCancel={handleCancel}
          required={false}
        />

        <div className="mt-6 rounded-2xl bg-muted p-5">
          <h3 className="mb-3 font-semibold text-foreground">
            {t('settings', 'whyVerifyPhone') || 'Pourquoi verifier votre telephone ?'}
          </h3>
          <ul className="space-y-2.5 text-sm text-foreground">
            <li className="flex items-start gap-2.5">
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {t('settings', 'phoneReason1') || 'Accepter des missions (obligatoire pour les artisans)'}
            </li>
            <li className="flex items-start gap-2.5">
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {t('settings', 'phoneReason2') || 'Recevoir des alertes SMS importantes'}
            </li>
            <li className="flex items-start gap-2.5">
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {t('settings', 'phoneReason3') || 'Recuperation de compte securisee'}
            </li>
            <li className="flex items-start gap-2.5">
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {t('settings', 'phoneReason4') || 'Contact direct en cas d\'urgence'}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
