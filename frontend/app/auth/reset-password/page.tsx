'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi } from '@/lib/api/auth';
import { toast } from '@/lib/hooks/useToast';
import { useLanguage } from '@/contexts/LanguageContext';

function ResetPasswordForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      toast({
        title: t('auth', 'tokenMissing'),
        description: t('auth', 'resetLinkInvalid'),
        variant: 'destructive',
      });
    }
  }, [searchParams, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: t('common', 'error'),
        description: t('auth', 'passwordMismatch'),
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: t('common', 'error'),
        description: t('auth', 'passwordTooShort'),
        variant: 'destructive',
      });
      return;
    }

    if (!token) {
      toast({
        title: t('common', 'error'),
        description: t('auth', 'tokenMissing'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      await authApi.resetPassword(token, newPassword);
      toast({
        title: t('common', 'success'),
        description: t('auth', 'passwordResetSuccess'),
        variant: 'success',
      });

      setTimeout(() => {
        router.push('/auth/login');
      }, 1500);
    } catch (error) {
      console.error('Reset password error:', error);
      toast({
        title: t('common', 'error'),
        description: t('auth', 'resetLinkExpired'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-foreground">K</span>
            </div>
          </div>
          <CardTitle className="text-2xl text-center">{t('auth', 'newPassword')}</CardTitle>
          <CardDescription className="text-center">
            {t('auth', 'chooseSecurePassword')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t('auth', 'newPasswordMinLength')}
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t('auth', 'confirmPassword')} *
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !token}
            >
              {loading ? t('auth', 'resetting') : t('auth', 'resetPassword')}
            </Button>

            <div className="text-center text-sm">
              <Link
                href="/auth/login"
                className="text-primary hover:text-primary hover:underline"
              >
                {t('auth', 'backToLogin')}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
