'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import apiClient from '@/lib/api/client';
import { toast } from '@/lib/hooks/useToast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

function TwoFactorVerifyForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState('');

  useEffect(() => {
    // Get session token from session storage (set by login page)
    const storedSessionToken = sessionStorage.getItem('2fa_sessionToken');

    if (!storedSessionToken) {
      toast({
        title: t('auth', 'sessionExpired'),
        description: t('auth', 'pleaseReconnect'),
        variant: 'destructive',
      });
      router.push('/auth/login');
      return;
    }

    setSessionToken(storedSessionToken);
  }, [router, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (token.length !== 6) {
      toast({
        title: t('common', 'error'),
        description: t('auth', 'code6Digits'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Complete 2FA login with session token
      const response = await apiClient.post('/auth/2fa/complete', {
        sessionToken,
        twoFactorCode: token,
      });

      // Clear temporary session token
      sessionStorage.removeItem('2fa_sessionToken');

      // Refresh user data (tokens are set as httpOnly cookies)
      await refreshUser();

      toast({
        title: t('auth', 'loginSuccess'),
        description: t('auth', 'welcomeToKrafolt'),
        variant: 'success',
      });

      // Redirect based on user role
      if (response.data.user.role === 'ARTISAN') {
        router.push('/artisan/dashboard');
      } else if (response.data.user.role === 'CLIENT') {
        router.push('/client/dashboard');
      } else {
        router.push('/admin/dashboard');
      }
    } catch (error) {
      console.error('2FA verification error:', error);
      toast({
        title: t('auth', 'invalidCode'),
        description: t('auth', 'incorrectCode'),
        variant: 'destructive',
      });
      setToken('');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    sessionStorage.removeItem('2fa_sessionToken');
    router.push('/auth/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-2xl font-bold text-white">🔐</span>
            </div>
          </div>
          <CardTitle className="text-2xl text-center">{t('auth', 'twoFactorAuth')}</CardTitle>
          <CardDescription className="text-center">
            {t('auth', 'enter6DigitCode')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t('auth', 'twoFactorCode')}
              </label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="123456"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                required
                autoComplete="one-time-code"
                className="text-center text-2xl tracking-widest"
                autoFocus
              />
              <p className="text-xs text-muted-foreground text-center">
                {t('auth', 'useTotpApp')}
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || token.length !== 6}
            >
              {loading ? t('auth', 'verifying') : t('auth', 'verify')}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleCancel}
            >
              {t('common', 'cancel')}
            </Button>

            <div className="text-center text-sm">
              <p className="text-muted-foreground mb-2">{t('auth', 'noAccessToApp')}</p>
              <Link
                href="/auth/2fa-recovery"
                className="text-primary hover:text-primary hover:underline"
              >
                {t('auth', 'useRecoveryCode')}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingFallback() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-muted-foreground">{t('common', 'loading')}</div>
    </div>
  );
}

export default function TwoFactorVerifyPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <TwoFactorVerifyForm />
    </Suspense>
  );
}
