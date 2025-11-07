'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi } from '@/lib/api/auth';
import { toast } from '@/lib/hooks/useToast';

export default function TwoFactorVerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    // Get email and password from session storage (set by login page)
    const storedEmail = sessionStorage.getItem('2fa_email');
    const storedPassword = sessionStorage.getItem('2fa_password');

    if (!storedEmail || !storedPassword) {
      toast({
        title: 'Session expirée',
        description: 'Veuillez vous reconnecter',
        variant: 'destructive',
      });
      router.push('/auth/login');
      return;
    }

    setEmail(storedEmail);
    setPassword(storedPassword);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (token.length !== 6) {
      toast({
        title: 'Erreur',
        description: 'Le code doit contenir 6 chiffres',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Login with 2FA token
      const response = await authApi.login({
        email,
        password,
        twoFactorToken: token,
      });

      // Clear temporary credentials
      sessionStorage.removeItem('2fa_email');
      sessionStorage.removeItem('2fa_password');

      // Save tokens
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);

      toast({
        title: 'Connexion réussie',
        description: 'Bienvenue sur ArtiConnect !',
        variant: 'success',
      });

      // Redirect based on user role
      if (response.user.role === 'ARTISAN') {
        router.push('/artisan/dashboard');
      } else if (response.user.role === 'CLIENT') {
        router.push('/client/dashboard');
      } else {
        router.push('/admin/dashboard');
      }
    } catch (error) {
      console.error('2FA verification error:', error);
      toast({
        title: 'Code invalide',
        description: 'Le code que vous avez entré est incorrect',
        variant: 'destructive',
      });
      setToken('');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    sessionStorage.removeItem('2fa_email');
    sessionStorage.removeItem('2fa_password');
    router.push('/auth/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-2xl font-bold text-white">🔐</span>
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Authentification à deux facteurs</CardTitle>
          <CardDescription className="text-center">
            Entrez le code à 6 chiffres de votre application d'authentification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Code 2FA
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
              <p className="text-xs text-gray-500 text-center">
                Utilisez Google Authenticator, Authy ou une autre application TOTP
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || token.length !== 6}
            >
              {loading ? 'Vérification...' : 'Vérifier'}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleCancel}
            >
              Annuler
            </Button>

            <div className="text-center text-sm">
              <p className="text-gray-600 mb-2">Vous n'avez pas accès à votre application ?</p>
              <Link
                href="/auth/2fa-recovery"
                className="text-blue-600 hover:text-blue-700 hover:underline"
              >
                Utiliser un code de récupération
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
