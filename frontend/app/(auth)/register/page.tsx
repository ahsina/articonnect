'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi } from '@/lib/api/auth';
import { useLanguage } from '@/contexts/LanguageContext';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const defaultRole = searchParams.get('role') === 'artisan' ? 'ARTISAN' : 'CLIENT';

  const [formData, setFormData] = useState<{
    email: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
    phone: string;
    role: 'CLIENT' | 'ARTISAN';
  }>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: defaultRole,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError(t('register.passwordMismatch'));
      return;
    }

    if (formData.password.length < 8) {
      setError(t('register.passwordTooShort'));
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...registerData } = formData;
      const response = await authApi.register(registerData);

      // Tokens are set as httpOnly cookies by backend
      // Redirect based on role
      if (response.user.role === 'ARTISAN') {
        router.push('/artisan/profile?setup=true');
      } else {
        router.push('/client/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t('register.registrationError'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
            {t('register.title')}
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            {t('register.alreadyRegistered')}{' '}
            <Link href="/login" className="font-medium text-primary hover:text-primary">
              {t('register.loginLink')}
            </Link>
          </p>
        </div>

        <div className="flex justify-center space-x-4 mb-6">
          <Button
            type="button"
            variant={formData.role === 'CLIENT' ? 'default' : 'outline'}
            onClick={() => setFormData({ ...formData, role: 'CLIENT' })}
          >
            {t('register.findArtisan')}
          </Button>
          <Button
            type="button"
            variant={formData.role === 'ARTISAN' ? 'default' : 'outline'}
            onClick={() => setFormData({ ...formData, role: 'ARTISAN' })}
          >
            {t('register.iAmArtisan')}
          </Button>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-500/10 p-4">
              <div className="text-sm text-red-400">{error}</div>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="text"
                placeholder={t('register.firstName')}
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
              <Input
                type="text"
                placeholder={t('register.lastName')}
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>

            <Input
              type="email"
              placeholder={t('register.email')}
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            <Input
              type="tel"
              placeholder={t('register.phone')}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />

            <Input
              type="password"
              placeholder={t('register.password')}
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />

            <Input
              type="password"
              placeholder={t('register.confirmPassword')}
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            />
          </div>

          <div className="flex items-center">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              required
              className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-foreground">
              {t('register.acceptTerms')}{' '}
              <Link href="/terms" className="text-primary hover:text-primary">
                {t('register.termsOfService')}
              </Link>{' '}
              {t('register.and')}{' '}
              <Link href="/privacy" className="text-primary hover:text-primary">
                {t('register.privacyPolicy')}
              </Link>
            </label>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('register.creating') : t('register.createAccount')}
          </Button>
        </form>
      </div>
    </div>
  );
}


export default function RegisterPage() {
  const { t } = useLanguage();

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">{t('register.loading')}</div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
