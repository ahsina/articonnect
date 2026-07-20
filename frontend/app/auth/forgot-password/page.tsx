'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi } from '@/lib/api/auth';
import { toast } from '@/lib/hooks/useToast';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authApi.forgotPassword(email);
      setEmailSent(true);
      toast({
        title: t('auth', 'emailSent'),
        description: t('auth', 'emailSentDescription'),
        variant: 'success',
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      toast({
        title: t('common', 'error'),
        description: t('auth', 'genericErrorRetry'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex items-center justify-center gap-2.5 mb-4">
              <div className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center">
                <span className="text-2xl font-extrabold text-primary-foreground font-display">K</span>
              </div>
              <span className="font-display text-[22px] font-extrabold tracking-tight text-foreground">Krafolt</span>
            </div>
            <div className="flex items-center justify-center mb-2">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-success"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
            </div>
            <CardTitle className="font-display text-2xl tracking-tight">{t('auth', 'emailSentTitle')}</CardTitle>
            <CardDescription>
              {t('auth', 'emailSentInfo')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              {t('auth', 'checkInbox')}
            </p>
            <Link href="/auth/login" className="block">
              <Button className="w-full" variant="outline">
                {t('auth', 'backToLogin')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center gap-2.5 mb-4">
            <div className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-2xl font-extrabold text-primary-foreground font-display">K</span>
            </div>
            <span className="font-display text-[22px] font-extrabold tracking-tight text-foreground">Krafolt</span>
          </div>
          <CardTitle className="font-display text-2xl text-center tracking-tight">{t('auth', 'forgotPasswordTitle')}</CardTitle>
          <CardDescription className="text-center">
            {t('auth', 'forgotPasswordSubtitle')}
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
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? t('auth', 'sending') : t('auth', 'sendLink')}
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
