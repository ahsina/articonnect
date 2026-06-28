'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface PhoneVerificationProps {
  onVerified?: (phone: string) => void;
  onCancel?: () => void;
  initialPhone?: string;
  required?: boolean;
  className?: string;
}

type VerificationStep = 'input' | 'verify' | 'success';

interface PhoneStatus {
  hasPhone: boolean;
  phone: string | null;
  verified: boolean;
  maskedPhone: string | null;
}

export function PhoneVerification({
  onVerified,
  onCancel,
  initialPhone = '',
  required = false,
  className = '',
}: PhoneVerificationProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<VerificationStep>('input');
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [phoneStatus, setPhoneStatus] = useState<PhoneStatus | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Fetch current phone status on mount
  useEffect(() => {
    fetchPhoneStatus();
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const fetchPhoneStatus = async () => {
    try {
      const response = await fetch('/api/auth/phone/status', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setPhoneStatus(data);
        if (data.phone && !initialPhone) {
          setPhone(data.phone);
        }
        if (data.verified) {
          setStep('success');
        }
      }
    } catch (err) {
      console.error('Failed to fetch phone status:', err);
    }
  };

  const sendCode = async () => {
    if (!phone || phone.length < 10) {
      setError(t('phoneVerification', 'invalidPhoneNumber') || 'Numero de telephone invalide');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/phone/send-code-authenticated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de l\'envoi du code');
      }

      setStep('verify');
      setCountdown(60); // 60 second cooldown
      setCode(['', '', '', '', '', '']);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError(t('phoneVerification', 'enterFullCode') || 'Veuillez entrer le code complet');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/phone/verify-code-authenticated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone, code: fullCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Code incorrect');
      }

      setStep('success');
      onVerified?.(phone);
    } catch (err: any) {
      setError(err.message);
      // Clear code on error
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (newCode.every(d => d) && newCode.length === 6) {
      setTimeout(() => verifyCode(), 100);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = [...code];
    for (let i = 0; i < pastedData.length; i++) {
      newCode[i] = pastedData[i];
    }
    setCode(newCode);
    if (pastedData.length === 6) {
      setTimeout(() => verifyCode(), 100);
    }
  };

  const formatPhoneDisplay = (phoneNumber: string) => {
    // Format for display: +33 6 12 34 56 78
    if (!phoneNumber) return '';
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length >= 11) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9, 11)}`;
    }
    return phoneNumber;
  };

  if (step === 'success') {
    return (
      <div className={`bg-green-500/10 border border-green-500/20 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500/15 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-green-400">
              {t('phoneVerification', 'verified') || 'Telephone verifie'}
            </p>
            <p className="text-sm text-green-600">
              {phoneStatus?.maskedPhone || formatPhoneDisplay(phone)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-card border border-border rounded-lg p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-foreground">
            {t('phoneVerification', 'title') || 'Verification du telephone'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {required
              ? t('phoneVerification', 'requiredDescription') || 'Un numero verifie est requis pour accepter des missions'
              : t('phoneVerification', 'description') || 'Securisez votre compte avec votre numero de telephone'
            }
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {step === 'input' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('phoneVerification', 'phoneLabel') || 'Numero de telephone'}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                +
              </span>
              <input
                type="tel"
                value={phone.replace('+', '')}
                onChange={(e) => setPhone('+' + e.target.value.replace(/\D/g, ''))}
                placeholder="33612345678"
                className="w-full pl-7 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                disabled={loading}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('phoneVerification', 'formatHint') || 'Format: +33612345678 (avec indicatif pays)'}
            </p>
          </div>

          <div className="flex gap-3">
            {onCancel && (
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-accent transition-colors"
                disabled={loading}
              >
                {t('common', 'cancel') || 'Annuler'}
              </button>
            )}
            <button
              onClick={sendCode}
              disabled={loading || !phone || phone.length < 10}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('common', 'sending') || 'Envoi...'}
                </span>
              ) : (
                t('phoneVerification', 'sendCode') || 'Envoyer le code'
              )}
            </button>
          </div>
        </div>
      )}

      {step === 'verify' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('phoneVerification', 'codeSent') || 'Un code a 6 chiffres a ete envoye au'}{' '}
            <span className="font-medium">{formatPhoneDisplay(phone)}</span>
          </p>

          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-14 text-center text-2xl font-semibold border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                disabled={loading}
                autoFocus={index === 0}
              />
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={verifyCode}
              disabled={loading || code.some(d => !d)}
              className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('common', 'verifying') || 'Verification...'}
                </span>
              ) : (
                t('phoneVerification', 'verify') || 'Verifier'
              )}
            </button>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep('input')}
                className="text-sm text-muted-foreground hover:text-foreground"
                disabled={loading}
              >
                {t('phoneVerification', 'changeNumber') || 'Changer de numero'}
              </button>

              {countdown > 0 ? (
                <span className="text-sm text-muted-foreground">
                  {t('phoneVerification', 'resendIn') || 'Renvoyer dans'} {countdown}s
                </span>
              ) : (
                <button
                  onClick={sendCode}
                  className="text-sm text-primary hover:text-primary"
                  disabled={loading}
                >
                  {t('phoneVerification', 'resendCode') || 'Renvoyer le code'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PhoneVerification;
