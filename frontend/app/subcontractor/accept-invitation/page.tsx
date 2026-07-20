'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  XCircle,
  LogIn,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { subcontractorApi } from '@/lib/api/subcontractor';

const PORTAL_PATH = '/subcontractor/portal';

// États du deep-link d'acceptation d'invitation sous-traitant.
type Phase =
  | 'checking' // auth en cours de résolution
  | 'need-login' // visiteur non connecté
  | 'no-token' // token absent de l'URL
  | 'accepting' // appel API en cours
  | 'success' // invitation acceptée
  | 'already' // invitation déjà traitée / déjà sous-traitant -> accès au portail
  | 'invalid' // token inconnu / expiré
  | 'error'; // échec inattendu (réessayable)

function AcceptInvitationInner() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const token = searchParams.get('token') || '';
  const [phase, setPhase] = useState<Phase>('checking');
  // Empêche un double appel d'acceptation (StrictMode monte l'effet 2x en dev).
  const attemptedRef = useRef(false);

  useEffect(() => {
    // 1) On attend la résolution de l'auth (cookie httpOnly -> whoami).
    if (authLoading) {
      setPhase('checking');
      return;
    }
    // 2) Token manquant : lien invalide.
    if (!token) {
      setPhase('no-token');
      return;
    }
    // 3) Non connecté : l'acceptation exige une session (JwtAuthGuard). On invite
    //    à se connecter SANS déclencher la redirection dure de l'intercepteur 401.
    if (!user) {
      setPhase('need-login');
      return;
    }
    // 4) Connecté + token : on accepte (une seule fois).
    if (attemptedRef.current) return;
    attemptedRef.current = true;
    setPhase('accepting');

    subcontractorApi.manage
      .acceptInvitation(token)
      .then(() => {
        setPhase('success');
        // Redirection douce vers le portail après un court délai.
        setTimeout(() => router.push(PORTAL_PATH), 1600);
      })
      .catch((err: any) => {
        const status = err?.response?.status;
        if (status === 400 || status === 409) {
          // Invitation déjà traitée, ou déjà sous-traitant de ce donneur d'ordre :
          // pas une erreur bloquante -> on propose l'accès au portail.
          setPhase('already');
        } else if (status === 404) {
          setPhase('invalid');
        } else {
          setPhase('error');
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, token]);

  const retry = () => {
    attemptedRef.current = false;
    // Re-déclenche l'effet en repassant par 'checking'.
    setPhase(authLoading ? 'checking' : user ? 'accepting' : 'need-login');
    if (!authLoading && user && token) {
      attemptedRef.current = true;
      setPhase('accepting');
      subcontractorApi.manage
        .acceptInvitation(token)
        .then(() => {
          setPhase('success');
          setTimeout(() => router.push(PORTAL_PATH), 1600);
        })
        .catch((err: any) => {
          const status = err?.response?.status;
          if (status === 400 || status === 409) setPhase('already');
          else if (status === 404) setPhase('invalid');
          else setPhase('error');
        });
    }
  };

  // --- Rendu par état -------------------------------------------------------
  let icon: React.ReactNode = null;
  let title = '';
  let description = '';
  let actions: React.ReactNode = null;

  switch (phase) {
    case 'checking':
    case 'accepting':
      icon = <Loader2 className="h-10 w-10 animate-spin text-primary" />;
      title =
        phase === 'accepting'
          ? t('subcontractor', 'acceptingInvitation') || 'Acceptation en cours…'
          : t('common', 'loading') || 'Chargement…';
      description =
        t('subcontractor', 'acceptingHint') ||
        'Nous validons votre invitation, merci de patienter.';
      break;

    case 'need-login':
      icon = <LogIn className="h-10 w-10 text-primary" />;
      title = t('subcontractor', 'loginToAccept') || 'Connectez-vous pour accepter';
      description =
        t('subcontractor', 'loginToAcceptHint') ||
        "Connectez-vous à votre compte artisan, puis rouvrez le lien d'invitation reçu par email pour finaliser.";
      actions = (
        <Button
          onClick={() => router.push('/auth/login')}
          className="w-full gap-2"
          leftIcon={<LogIn className="h-4 w-4" />}
        >
          {t('auth', 'login') || 'Se connecter'}
        </Button>
      );
      break;

    case 'no-token':
      icon = <XCircle className="h-10 w-10 text-destructive" />;
      title = t('subcontractor', 'invalidInvitation') || 'Lien invalide';
      description =
        t('subcontractor', 'noTokenHint') ||
        "Ce lien d'invitation est incomplet. Utilisez le lien exact reçu par email.";
      actions = (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push(PORTAL_PATH)}
        >
          {t('subcontractor', 'goToPortal') || 'Aller au portail'}
        </Button>
      );
      break;

    case 'success':
      icon = <CheckCircle2 className="h-10 w-10 text-success" />;
      title = t('subcontractor', 'invitationAccepted') || 'Invitation acceptée';
      description =
        t('subcontractor', 'invitationAcceptedHint') ||
        'Vous êtes désormais sous-traitant. Redirection vers votre portail…';
      actions = (
        <Button
          className="w-full gap-2"
          rightIcon={<ArrowRight className="h-4 w-4" />}
          onClick={() => router.push(PORTAL_PATH)}
        >
          {t('subcontractor', 'goToPortal') || 'Aller au portail'}
        </Button>
      );
      break;

    case 'already':
      icon = <CheckCircle2 className="h-10 w-10 text-success" />;
      title = t('subcontractor', 'invitationAlready') || 'Invitation déjà traitée';
      description =
        t('subcontractor', 'invitationAlreadyHint') ||
        'Cette invitation a déjà été acceptée. Accédez directement à votre portail.';
      actions = (
        <Button
          className="w-full gap-2"
          rightIcon={<ArrowRight className="h-4 w-4" />}
          onClick={() => router.push(PORTAL_PATH)}
        >
          {t('subcontractor', 'goToPortal') || 'Aller au portail'}
        </Button>
      );
      break;

    case 'invalid':
      icon = <XCircle className="h-10 w-10 text-destructive" />;
      title = t('subcontractor', 'invitationInvalid') || 'Invitation invalide ou expirée';
      description =
        t('subcontractor', 'invitationInvalidHint') ||
        "Ce lien d'invitation n'est plus valide. Demandez au donneur d'ordre de vous renvoyer une invitation.";
      actions = (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push(PORTAL_PATH)}
        >
          {t('subcontractor', 'goToPortal') || 'Aller au portail'}
        </Button>
      );
      break;

    case 'error':
    default:
      icon = <XCircle className="h-10 w-10 text-destructive" />;
      title = t('common', 'error') || 'Une erreur est survenue';
      description =
        t('subcontractor', 'acceptError') ||
        "Impossible de traiter l'invitation pour le moment. Veuillez réessayer.";
      actions = (
        <div className="flex w-full flex-col gap-2">
          <Button onClick={retry} className="w-full">
            {t('common', 'retry') || 'Réessayer'}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push(PORTAL_PATH)}
          >
            {t('subcontractor', 'goToPortal') || 'Aller au portail'}
          </Button>
        </div>
      );
      break;
  }

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-2xl border-border shadow-sm">
        <CardHeader className="space-y-3">
          <p className="text-center font-display text-lg font-extrabold text-foreground">Krafolt</p>
          <div className="flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              {icon}
            </div>
          </div>
          <CardTitle className="text-center font-display text-xl">{title}</CardTitle>
          <CardDescription className="text-center">{description}</CardDescription>
        </CardHeader>
        {actions && <CardContent>{actions}</CardContent>}
      </Card>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AcceptInvitationInner />
    </Suspense>
  );
}
