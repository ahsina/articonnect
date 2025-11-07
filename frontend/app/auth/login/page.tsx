'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/lib/hooks/useToast';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(formData.email, formData.password);

      toast({
        title: 'Connexion réussie',
        description: 'Bienvenue sur ArtiConnect !',
        variant: 'success',
      });

      // Redirect based on user role (will be handled by auth context)
      router.push('/client/dashboard');
    } catch (error: unknown) {
      console.error('Login error:', error);

      const err = error as { message?: string; response?: { data?: { message?: string } } };

      if (err.message === '2FA_REQUIRED') {
        // Store credentials temporarily for 2FA verification
        sessionStorage.setItem('2fa_email', formData.email);
        sessionStorage.setItem('2fa_password', formData.password);

        toast({
          title: 'Authentification à deux facteurs',
          description: 'Veuillez entrer votre code 2FA',
        });

        router.push('/auth/2fa-verify');
      } else {
        toast({
          title: 'Erreur de connexion',
          description: err.response?.data?.message || 'Identifiants incorrects',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-2xl font-bold text-white">AC</span>
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Connexion</CardTitle>
          <CardDescription className="text-center">
            Connectez-vous à votre compte ArtiConnect
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Email
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
              <label className="text-sm font-medium text-gray-700">
                Mot de passe
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
                className="text-blue-600 hover:text-blue-700 hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Pas encore de compte ?
                </span>
              </div>
            </div>

            <Link href="/auth/register">
              <Button
                type="button"
                variant="outline"
                className="w-full"
              >
                Créer un compte
              </Button>
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
