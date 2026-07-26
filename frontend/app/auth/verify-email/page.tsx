'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/api/auth';
import { toast } from '@/lib/hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!token) {
        setStatus('error');
        return;
      }
      try {
        await authApi.verifyEmail(token);
        if (!cancelled) setStatus('success');
      } catch {
        if (!cancelled) setStatus('error');
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleResend = async () => {
    setResending(true);
    try {
      await authApi.resendVerification();
      toast({
        title: t('auth', 'emailSentTitle') || 'Email envoyé',
        description:
          t('auth', 'emailResentDesc') || 'Un nouveau lien de vérification vous a été envoyé.',
        variant: 'success',
      });
    } catch {
      toast({
        title: t('common', 'error') || 'Erreur',
        description:
          t('auth', 'emailResendError') || "Impossible d'envoyer l'email. Réessayez plus tard.",
        variant: 'destructive',
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center gap-2.5 mb-4">
            <div className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-2xl font-extrabold text-primary-foreground font-display">K</span>
            </div>
            <span className="font-display text-[22px] font-extrabold tracking-tight text-foreground">Krafolt</span>
          </div>

          {status === 'loading' && (
            <>
              <div className="flex justify-center py-2">
                <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
              </div>
              <CardTitle className="font-display text-2xl text-center tracking-tight">
                {t('auth', 'verifyingTitle') || 'Vérification en cours…'}
              </CardTitle>
              <CardDescription className="text-center">
                {t('auth', 'verifyingDesc') || 'Merci de patienter un instant.'}
              </CardDescription>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex justify-center py-2">
                <CheckCircle2 className="h-12 w-12 text-success" />
              </div>
              <CardTitle className="font-display text-2xl text-center tracking-tight">
                {t('auth', 'emailVerifiedTitle') || 'Email vérifié ✓'}
              </CardTitle>
              <CardDescription className="text-center">
                {t('auth', 'emailVerifiedDesc') || 'Votre adresse email a bien été confirmée.'}
              </CardDescription>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex justify-center py-2">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle className="font-display text-2xl text-center tracking-tight">
                {t('auth', 'linkInvalidTitle') || 'Lien invalide ou expiré'}
              </CardTitle>
              <CardDescription className="text-center">
                {t('auth', 'linkInvalidDesc') ||
                  "Ce lien de vérification n'est plus valide. Demandez-en un nouveau ci-dessous."}
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-3">
          {status === 'success' && (
            <Button className="w-full" onClick={() => router.push('/onboarding/verify')}>
              {t('common', 'continue') || 'Continuer'}
            </Button>
          )}

          {status === 'error' && (
            <>
              {isAuthenticated && (
                <Button
                  className="w-full"
                  isLoading={resending}
                  loadingText={t('auth', 'sendingInProgress') || 'Envoi en cours…'}
                  onClick={handleResend}
                >
                  {t('auth', 'resendVerificationEmail') || "Renvoyer l'email de vérification"}
                </Button>
              )}
              <Link href="/auth/login">
                <Button variant="outline" className="w-full">
                  {t('auth', 'backToLogin') || 'Retour à la connexion'}
                </Button>
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-muted flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
