import * as React from 'react';
import { cn } from '@/lib/utils';

export interface PasswordStrengthProps {
  password: string;
  className?: string;
  showRequirements?: boolean;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  { label: 'Au moins 8 caractères', test: (p) => p.length >= 8 },
  { label: 'Une lettre majuscule', test: (p) => /[A-Z]/.test(p) },
  { label: 'Une lettre minuscule', test: (p) => /[a-z]/.test(p) },
  { label: 'Un chiffre', test: (p) => /[0-9]/.test(p) },
  { label: 'Un caractère spécial', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

const getStrength = (password: string): { score: number; label: string; color: string } => {
  if (!password) {
    return { score: 0, label: '', color: 'bg-muted' };
  }

  const passedRequirements = requirements.filter((req) => req.test(password)).length;
  const percentage = (passedRequirements / requirements.length) * 100;

  if (percentage <= 20) {
    return { score: 1, label: 'Très faible', color: 'bg-red-500' };
  } else if (percentage <= 40) {
    return { score: 2, label: 'Faible', color: 'bg-yellow-500' };
  } else if (percentage <= 60) {
    return { score: 3, label: 'Moyen', color: 'bg-yellow-500' };
  } else if (percentage <= 80) {
    return { score: 4, label: 'Fort', color: 'bg-lime-500' };
  } else {
    return { score: 5, label: 'Très fort', color: 'bg-green-500' };
  }
};

const PasswordStrength = ({
  password,
  className,
  showRequirements = true,
}: PasswordStrengthProps) => {
  const strength = getStrength(password);
  const segments = 5;

  if (!password) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Force du mot de passe</span>
          <span
            className={cn(
              'font-medium',
              strength.score <= 2 && 'text-red-600',
              strength.score === 3 && 'text-yellow-600',
              strength.score >= 4 && 'text-green-600'
            )}
          >
            {strength.label}
          </span>
        </div>
        <div className="flex gap-1" role="progressbar" aria-valuenow={strength.score} aria-valuemin={0} aria-valuemax={5}>
          {Array.from({ length: segments }).map((_, index) => (
            <div
              key={index}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors duration-300',
                index < strength.score ? strength.color : 'bg-muted'
              )}
            />
          ))}
        </div>
      </div>

      {/* Requirements list */}
      {showRequirements && (
        <ul className="space-y-1 text-xs" aria-label="Exigences du mot de passe">
          {requirements.map((req, index) => {
            const passed = req.test(password);
            return (
              <li
                key={index}
                className={cn(
                  'flex items-center gap-2 transition-colors duration-200',
                  passed ? 'text-green-600' : 'text-muted-foreground'
                )}
              >
                {passed ? (
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  </svg>
                )}
                <span>{req.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export { PasswordStrength, getStrength };
