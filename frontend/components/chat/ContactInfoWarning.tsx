/**
 * Contact Info Warning Component
 *
 * Displays when users try to share contact information in messages
 */

'use client';

import React from 'react';
import { Alert } from '@/components/ui/alert';
import { useLanguage } from '@/contexts/LanguageContext';

interface ContactInfoWarningProps {
  show: boolean;
  detectedPatterns?: string[];
}

export const ContactInfoWarning: React.FC<ContactInfoWarningProps> = ({
  show,
  detectedPatterns = [],
}) => {
  const { t } = useLanguage();
  if (!show) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <div className="flex items-start gap-3">
        <svg
          className="h-5 w-5 flex-shrink-0 mt-0.5"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
            clipRule="evenodd"
          />
        </svg>
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">
            {t('contactInfoWarning', 'title')}
          </h3>
          <p className="text-sm">
            {t('contactInfoWarning', 'message')}
          </p>
          <div className="mt-2 text-xs">
            <strong>{t('contactInfoWarning', 'why')}</strong>
            <ul className="list-disc ml-4 mt-1 space-y-1">
              <li>{t('contactInfoWarning', 'reasonFraud')}</li>
              <li>{t('contactInfoWarning', 'reasonPayment')}</li>
              <li>{t('contactInfoWarning', 'reasonSupport')}</li>
              <li>{t('contactInfoWarning', 'reasonTraceability')}</li>
            </ul>
          </div>
          {detectedPatterns.length > 0 && (
            <p className="text-xs mt-2 opacity-75">
              {t('contactInfoWarning', 'detected')} : {detectedPatterns.join(', ')}
            </p>
          )}
        </div>
      </div>
    </Alert>
  );
};

export default ContactInfoWarning;
