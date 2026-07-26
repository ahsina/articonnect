'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput, isPlausiblePhone } from '@/components/ui/PhoneInput';
import { authApi, type MeResponse } from '@/lib/api/auth';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/lib/hooks/useToast';
import { CheckCircle2, Mail, Phone, Loader2, RefreshCw } from 'lucide-react';

const RESEND_COOLDOWN = 60; // secondes

function StatusPill({
  verified,
  t,
}: {
  verified: boolean;
  t: (ns: string, key: string) => string;
}) {
  return verified ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
      <CheckCircle2 className="h-3.5 w-3.5" /> {t('onboarding', 'statusVerified') || 'Vérifié'}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
      {t('onboarding', 'statusPending') || 'En attente'}
    </span>
  );
}

export default function OnboardingVerifyPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const { t } = useLanguage();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Email
  const [resendingEmail, setResendingEmail] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Téléphone
  const [phoneValue, setPhoneValue] = useState('');
  const [phoneValid, setPhoneValid] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [code, setCode] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  const redirectByRole = useCallback(
    (role: MeResponse['role']) => {
      if (role === 'ARTISAN') router.replace('/artisan/dashboard');
      else if (role === 'ADMIN') router.replace('/admin/admin');
      else router.replace('/client/dashboard');
    },
    [router],
  );

  const loadMe = useCallback(async () => {
    try {
      const data = await authApi.getMe();
      setMe(data);
      if (data.phone && !phoneValue) {
        setPhoneValue(data.phone);
        setPhoneValid(isPlausiblePhone(data.phone));
      }
      // Les deux vérifications sont OK : on quitte le mur.
      if (data.emailVerified && data.phoneVerified) {
        redirectByRole(data.role);
      }
    } catch {
      router.replace('/auth/login');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redirectByRole, router]);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = () => {
    setEmailCooldown(RESEND_COOLDOWN);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setEmailCooldown((s) => {
        if (s <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const handleResendEmail = async () => {
    setResendingEmail(true);
    try {
      await authApi.resendVerification();
      startCooldown();
      toast({
        title: t('onboarding', 'emailSentTitle') || 'Email envoyé',
        description:
          t('onboarding', 'emailSentDesc') ||
          'Un nouveau lien de vérification vient de vous être envoyé.',
        variant: 'success',
      });
    } catch {
      toast({
        title: t('common', 'error') || 'Erreur',
        description:
          t('onboarding', 'emailResendError') || "Impossible d'envoyer l'email pour le moment.",
        variant: 'destructive',
      });
    } finally {
      setResendingEmail(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await loadMe();
  };

  const handleSendCode = async () => {
    if (!isPlausiblePhone(phoneValue)) {
      setPhoneError(t('onboarding', 'invalidPhone') || 'Veuillez saisir un numéro de téléphone valide.');
      return;
    }
    setPhoneError('');
    setSendingCode(true);
    try {
      const res = await authApi.sendPhoneCode(phoneValue);
      setCodeSent(true);
      // Mode démo (SMS indisponible, ex. géo Twilio) : le backend renvoie le code pour
      // ne pas bloquer l'onboarding. On préremplit et on l'affiche discrètement.
      if (res?.devCode) {
        setCode(res.devCode);
        setDemoCode(res.devCode);
      } else {
        setDemoCode('');
      }
      toast({
        title: res?.devCode
          ? t('onboarding', 'codeGeneratedDemo') || 'Code généré (démo)'
          : t('onboarding', 'codeSentTitle') || 'Code envoyé',
        description: res?.devCode
          ? t('onboarding', 'codeSentDemoDesc') ||
            'SMS indisponible pour ce pays — code affiché ci-dessous (mode démo).'
          : t('onboarding', 'codeSentDesc') || 'Un code à 6 chiffres vous a été envoyé par SMS.',
        variant: 'success',
      });
    } catch (error: any) {
      toast({
        title: t('common', 'error') || 'Erreur',
        description:
          error?.response?.data?.message ||
          t('onboarding', 'codeSendError') ||
          "Impossible d'envoyer le code SMS.",
        variant: 'destructive',
      });
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      setPhoneError(t('onboarding', 'codeSixDigits') || 'Le code doit contenir 6 chiffres.');
      return;
    }
    setPhoneError('');
    setVerifyingCode(true);
    try {
      await authApi.verifyPhoneCode(code, phoneValue);
      toast({
        title: t('onboarding', 'phoneVerifiedTitle') || 'Téléphone vérifié',
        description: t('onboarding', 'phoneVerifiedDesc') || 'Votre numéro a bien été confirmé.',
        variant: 'success',
      });
      setCode('');
      await loadMe();
    } catch (error: any) {
      toast({
        title: t('common', 'error') || 'Erreur',
        description:
          error?.response?.data?.message ||
          t('onboarding', 'codeInvalid') ||
          'Code incorrect ou expiré.',
        variant: 'destructive',
      });
    } finally {
      setVerifyingCode(false);
    }
  };

  if (loading || !me) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center gap-2.5 mb-4">
            <div className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-2xl font-extrabold text-primary-foreground font-display">K</span>
            </div>
            <span className="font-display text-[22px] font-extrabold tracking-tight text-foreground">Krafolt</span>
          </div>
          <CardTitle className="font-display text-2xl text-center tracking-tight">
            {t('onboarding', 'confirmAccountTitle') || 'Confirmez votre compte'}
          </CardTitle>
          <CardDescription className="text-center">
            {t('onboarding', 'confirmAccountDesc') ||
              'Vérifiez votre email et votre téléphone pour accéder à Krafolt.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Étape Email */}
          <div className="rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Mail className="h-5 w-5 text-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-display font-bold text-foreground">{t('onboarding', 'emailLabel') || 'Email'}</p>
                  <p className="text-sm text-muted-foreground truncate">{me.email}</p>
                </div>
              </div>
              <StatusPill verified={me.emailVerified} t={t} />
            </div>

            {!me.emailVerified && (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t('onboarding', 'emailLinkSentPrefix') || 'Un lien de vérification a été envoyé à'}{' '}
                  <span className="font-medium text-foreground">{me.email}</span>
                  {t('onboarding', 'emailLinkSentSuffix') || '. Cliquez dessus pour continuer.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    isLoading={resendingEmail}
                    loadingText={t('onboarding', 'sending') || 'Envoi…'}
                    disabled={emailCooldown > 0}
                    onClick={handleResendEmail}
                  >
                    {emailCooldown > 0
                      ? `${t('onboarding', 'resend') || 'Renvoyer'} (${emailCooldown}s)`
                      : t('onboarding', 'resendEmail') || "Renvoyer l'email"}
                  </Button>
                  <Button
                    className="flex-1"
                    leftIcon={<RefreshCw className="h-4 w-4" />}
                    onClick={handleRefresh}
                  >
                    {t('onboarding', 'verifiedRefresh') || "J'ai vérifié, rafraîchir"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Étape Téléphone */}
          <div className="rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Phone className="h-5 w-5 text-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-display font-bold text-foreground">{t('onboarding', 'phoneLabel') || 'Téléphone'}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {me.phoneVerified ? me.phone : t('onboarding', 'notVerified') || 'Non vérifié'}
                  </p>
                </div>
              </div>
              <StatusPill verified={me.phoneVerified} t={t} />
            </div>

            {!me.phoneVerified && (
              <div className="mt-3 space-y-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    {me.phone
                      ? t('onboarding', 'yourNumber') || 'Votre numéro'
                      : t('onboarding', 'addNumber') || 'Ajoutez votre numéro'}
                  </label>
                  <PhoneInput
                    value={phoneValue}
                    error={!!phoneError && !codeSent}
                    disabled={codeSent}
                    onChange={(e164, valid) => {
                      setPhoneValue(e164);
                      setPhoneValid(valid);
                      if (phoneError) setPhoneError('');
                    }}
                  />
                </div>

                {!codeSent ? (
                  <Button
                    className="w-full"
                    isLoading={sendingCode}
                    loadingText={t('onboarding', 'sending') || 'Envoi…'}
                    disabled={!phoneValid}
                    onClick={handleSendCode}
                  >
                    {t('onboarding', 'sendCode') || 'Envoyer le code'}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">
                        {t('onboarding', 'smsCodeLabel') || 'Code reçu par SMS'}
                      </label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="123456"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="tracking-[0.3em] text-center text-lg"
                      />
                      {demoCode && (
                        <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
                          {t('onboarding', 'demoCodeNotice') ||
                            'Mode démo : SMS indisponible pour ce pays. Code prérempli'}
                          &nbsp;:{' '}
                          <span className="font-semibold tabular-nums">{demoCode}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        isLoading={sendingCode}
                        loadingText={t('onboarding', 'sending') || 'Envoi…'}
                        onClick={handleSendCode}
                      >
                        {t('onboarding', 'resendCode') || 'Renvoyer le code'}
                      </Button>
                      <Button
                        className="flex-1"
                        isLoading={verifyingCode}
                        loadingText={t('onboarding', 'verifying') || 'Vérification…'}
                        disabled={code.length !== 6}
                        onClick={handleVerifyCode}
                      >
                        {t('onboarding', 'verify') || 'Vérifier'}
                      </Button>
                    </div>
                  </div>
                )}

                {phoneError && (
                  <p className="text-sm text-destructive" role="alert">
                    {phoneError}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={() => logout()}
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              {t('onboarding', 'logout') || 'Se déconnecter'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
