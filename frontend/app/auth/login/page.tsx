'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/lib/hooks/useToast';
import { authApi } from '@/lib/api/auth';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleOAuthLogin = (provider: 'google' | 'facebook' | 'apple') => {
    // Base OAuth calculée depuis l'origine courante (ex: https://krafolt.com) afin de ne
    // jamais renvoyer vers une IP/URL codée en dur : le redirect_uri suit le domaine réel.
    // NEXT_PUBLIC_API_URL ne sert que de repli en dev local (API sur un autre port).
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const isLocal = /localhost|127\.0\.0\.1/.test(origin);
    const base =
      (!isLocal && origin) || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    window.location.href = `${base}/auth/${provider}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authApi.login(formData);

      // Check if 2FA is required
      if (response.requires2FA && response.sessionToken) {
        // Store temporary session token (NOT password!)
        sessionStorage.setItem('2fa_sessionToken', response.sessionToken);

        toast({
          title: 'Authentification à deux facteurs',
          description: 'Veuillez entrer votre code 2FA',
        });

        router.push('/auth/2fa-verify');
        return;
      }

      // Login successful - tokens are set as httpOnly cookies
      await refreshUser();

      toast({
        title: t('auth', 'loginSuccess'),
        description: t('common', 'welcome') + ' sur Krafolt !',
        variant: 'success',
      });

      // Redirect based on user role
      if (response.user?.role === 'ARTISAN') {
        router.push('/artisan/dashboard');
      } else if (response.user?.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/client/dashboard');
      }
    } catch (error: unknown) {
      console.error('Login error:', error);

      const err = error as { message?: string; response?: { data?: { message?: string } } };

      toast({
        title: t('auth', 'loginError'),
        description: err.response?.data?.message || 'Identifiants incorrects',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-muted flex items-center justify-center p-4">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center gap-2.5 mb-4">
            <div className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-2xl font-extrabold text-primary-foreground font-display">K</span>
            </div>
            <span className="font-display text-[22px] font-extrabold tracking-tight text-foreground">Krafolt</span>
          </div>
          <CardTitle className="font-display text-2xl text-center tracking-tight">{t('common', 'login')}</CardTitle>
          <CardDescription className="text-center">
            {t('authPages', 'loginSubtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t('auth', 'email')}
              </label>
              <Input
                type="email"
                placeholder={t('auth', 'email')}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t('auth', 'password')}
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                autoComplete="current-password"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <Link
                href="/auth/forgot-password"
                className="text-primary hover:text-primary hover:underline"
              >
                {t('auth', 'forgotPassword')}
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? t('common', 'loading') : t('common', 'login')}
            </Button>
          </form>

          {/* OAuth Login Options */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-muted-foreground">{t('auth', 'continueWith')}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOAuthLogin('google')}
              className="w-full"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => handleOAuthLogin('facebook')}
              className="w-full"
            >
              <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => handleOAuthLogin('apple')}
              className="w-full"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
            </Button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-muted-foreground">
                {t('auth', 'noAccount')}
              </span>
            </div>
          </div>

          <Link href="/auth/register">
            <Button
              type="button"
              variant="outline"
              className="w-full"
            >
              {t('auth', 'createAccount')}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
