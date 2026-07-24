'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput, isPlausiblePhone } from '@/components/ui/PhoneInput';
import { authApi } from '@/lib/api/auth';
import { toast } from '@/lib/hooks/useToast';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
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

    // Le backend exige un minimum de 12 caractères : on aligne le contrôle client.
    if (formData.password.length < 12) {
      toast({
        title: t('common', 'error'),
        description: 'Le mot de passe doit contenir au moins 12 caractères.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Le téléphone est obligatoire et doit être plausible (E.164, 6 à 14 chiffres).
    if (!formData.phone || !isPlausiblePhone(formData.phone)) {
      setPhoneError('Veuillez saisir un numéro de téléphone valide.');
      toast({
        title: t('common', 'error'),
        description: 'Veuillez saisir un numéro de téléphone valide.',
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
    <div className="relative min-h-screen bg-muted flex items-center justify-center p-4">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center gap-2.5 mb-4">
            <div className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-2xl font-extrabold text-primary-foreground font-display">K</span>
            </div>
            <span className="font-display text-[22px] font-extrabold tracking-tight text-foreground">Krafolt</span>
          </div>
          <CardTitle className="font-display text-2xl text-center tracking-tight">{t('auth', 'registerTitle')}</CardTitle>
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
                  className={`p-4 border-2 rounded-2xl text-center transition-colors ${
                    formData.role === 'CLIENT'
                      ? 'border-foreground bg-muted'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <div
                    className={`w-10 h-10 mx-auto mb-2.5 rounded-xl flex items-center justify-center transition-colors ${
                      formData.role === 'CLIENT' ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <svg
                      className={`w-5 h-5 ${formData.role === 'CLIENT' ? 'text-primary-foreground' : 'text-foreground'}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div className="font-display font-bold">{t('auth', 'client')}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t('auth', 'clientDescription')}</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'ARTISAN' })}
                  className={`p-4 border-2 rounded-2xl text-center transition-colors ${
                    formData.role === 'ARTISAN'
                      ? 'border-foreground bg-muted'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <div
                    className={`w-10 h-10 mx-auto mb-2.5 rounded-xl flex items-center justify-center transition-colors ${
                      formData.role === 'ARTISAN' ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <svg
                      className={`w-5 h-5 ${formData.role === 'ARTISAN' ? 'text-primary-foreground' : 'text-foreground'}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                    </svg>
                  </div>
                  <div className="font-display font-bold">{t('auth', 'artisan')}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t('auth', 'artisanDescription')}</div>
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
                {t('auth', 'phone')} *
              </label>
              <PhoneInput
                value={formData.phone}
                error={!!phoneError}
                onChange={(e164, valid) => {
                  setFormData({ ...formData, phone: e164 });
                  if (phoneError && valid) setPhoneError('');
                }}
              />
              {phoneError && (
                <p className="text-sm text-destructive" role="alert">
                  {phoneError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Mot de passe * (min. 12 caractères)
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
                <Link href="/legal/terms" className="text-primary hover:underline">
                  {t('auth', 'termsOfService')}
                </Link>{' '}
                et la{' '}
                <Link href="/legal/privacy" className="text-primary hover:underline">
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
