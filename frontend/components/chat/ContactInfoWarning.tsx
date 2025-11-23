/**
 * Contact Info Warning Component
 *
 * Displays when users try to share contact information in messages
 */

'use client';

import React from 'react';
import { Alert } from '@/components/ui/alert';

interface ContactInfoWarningProps {
  show: boolean;
  detectedPatterns?: string[];
}

export const ContactInfoWarning: React.FC<ContactInfoWarningProps> = ({
  show,
  detectedPatterns = [],
}) => {
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
            Informations de contact détectées
          </h3>
          <p className="text-sm">
            Pour votre sécurité et celle de nos utilisateurs, le partage d'informations
            de contact (téléphone, email, réseaux sociaux) est interdit sur ArtiConnect.
          </p>
          <div className="mt-2 text-xs">
            <strong>Pourquoi ?</strong>
            <ul className="list-disc ml-4 mt-1 space-y-1">
              <li>Protection contre les arnaques et fraudes</li>
              <li>Garantie de paiement sécurisé via la plateforme</li>
              <li>Accès au support et médiation en cas de litige</li>
              <li>Traçabilité des échanges pour votre protection</li>
            </ul>
          </div>
          {detectedPatterns.length > 0 && (
            <p className="text-xs mt-2 opacity-75">
              Détecté : {detectedPatterns.join(', ')}
            </p>
          )}
        </div>
      </div>
    </Alert>
  );
};

export default ContactInfoWarning;
