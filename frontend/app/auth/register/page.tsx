'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi } from '@/lib/api/auth';
import { toast } from '@/lib/hooks/useToast';
import { useLanguage } from '@/contexts/LanguageContext';

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'CLIENT' as 'CLIENT' | 'ARTISAN',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: t('common', 'error'),
        description: t('auth', 'passwordMismatch'),
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      toast({
        title: t('common', 'error'),
        description: t('auth', 'passwordTooShort'),
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    try {
      const response = await authApi.register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        role: formData.role,
      });

      // Tokens are set as httpOnly cookies by backend

      toast({
        title: t('auth', 'accountCreated'),
        description: t('auth', 'welcomeToKrafolt'),
        variant: 'success',
      });

      // Redirect based on role
      if (formData.role === 'ARTISAN') {
        router.push('/artisan/dashboard');
      } else {
        router.push('/client/dashboard');
      }
    } catch (error: any) {
      console.error('Register error:', error);
      toast({
        title: t('auth', 'registrationError'),
        description: error.response?.data?.message || t('auth', 'genericError'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-foreground">K</span>
            </div>
          </div>
          <CardTitle className="text-2xl text-center">{t('auth', 'registerTitle')}</CardTitle>
          <CardDescription className="text-center">
            {t('auth', 'registerSubtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t('auth', 'iAm')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'CLIENT' })}
                  className={`p-4 border-2 rounded-lg text-center transition-colors ${
                    formData.role === 'CLIENT'
                      ? 'border-blue-600 bg-primary/10'
                      : 'border-border hover:border-gray-400'
                  }`}
                >
                  <div className="text-2xl mb-1">👤</div>
                  <div className="font-medium">{t('auth', 'client')}</div>
                  <div className="text-xs text-muted-foreground">{t('auth', 'clientDescription')}</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'ARTISAN' })}
                  className={`p-4 border-2 rounded-lg text-center transition-colors ${
                    formData.role === 'ARTISAN'
                      ? 'border-blue-600 bg-primary/10'
                      : 'border-border hover:border-gray-400'
                  }`}
                >
                  <div className="text-2xl mb-1">🔨</div>
                  <div className="font-medium">{t('auth', 'artisan')}</div>
                  <div className="text-xs text-muted-foreground">{t('auth', 'artisanDescription')}</div>
                </button>
              </div>
            </div>

            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t('auth', 'firstName')} *
                </label>
                <Input
                  type="text"
                  placeholder="Jean"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t('auth', 'lastName')} *
                </label>
                <Input
                  type="text"
                  placeholder="Dupont"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t('auth', 'email')} *
              </label>
              <Input
                type="email"
                placeholder="votre@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t('auth', 'phone')}
              </label>
              <Input
                type="tel"
                placeholder="+352 123 456 789"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t('auth', 'passwordMinLength')}
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                autoComplete="new-password"
              />
            </div>

            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="terms"
                required
                className="mt-1"
              />
              <label htmlFor="terms" className="text-sm text-muted-foreground">
                {t('auth', 'acceptTerms')}{' '}
                <Link href="/terms" className="text-primary hover:underline">
                  {t('auth', 'termsOfService')}
                </Link>{' '}
                et la{' '}
                <Link href="/privacy" className="text-primary hover:underline">
                  {t('auth', 'privacyPolicy')}
                </Link>
              </label>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? t('auth', 'creatingAccount') : t('auth', 'createMyAccount')}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-card text-muted-foreground">
                  {t('auth', 'alreadyHaveAccount')}
                </span>
              </div>
            </div>

            <Link href="/auth/login">
              <Button
                type="button"
                variant="outline"
                className="w-full"
              >
                {t('common', 'login')}
              </Button>
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
