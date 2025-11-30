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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto px-4">
        <div className="mb-6">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('common', 'back') || 'Retour'}
          </button>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t('settings', 'phoneTitle') || 'Verification du telephone'}
        </h1>
        <p className="text-gray-600 mb-6">
          {t('settings', 'phoneDescription') || 'Verifiez votre numero de telephone pour securiser votre compte et recevoir des notifications importantes.'}
        </p>

        <PhoneVerification
          onVerified={handleVerified}
          onCancel={handleCancel}
          required={false}
        />

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">
            {t('settings', 'whyVerifyPhone') || 'Pourquoi verifier votre telephone ?'}
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {t('settings', 'phoneReason1') || 'Accepter des missions (obligatoire pour les artisans)'}
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {t('settings', 'phoneReason2') || 'Recevoir des alertes SMS importantes'}
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {t('settings', 'phoneReason3') || 'Recuperation de compte securisee'}
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
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
