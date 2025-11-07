'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi } from '@/lib/api/auth';
import { userApi } from '@/lib/api/user';
import { toast } from '@/lib/hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';

export default function TwoFactorAuthPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  // Enable form
  const [enablePassword, setEnablePassword] = useState('');
  const [verifyToken, setVerifyToken] = useState('');

  // Disable form
  const [disablePassword, setDisablePassword] = useState('');
  const [disableToken, setDisableToken] = useState('');
  const [showDisableForm, setShowDisableForm] = useState(false);

  useEffect(() => {
    loadUserStatus();
  }, []);

  const loadUserStatus = async () => {
    try {
      const profile = await userApi.getProfile();
      setIs2FAEnabled(profile.twoFactorEnabled || false);
    } catch (error) {
      console.error('Error loading user status:', error);
    }
  };

  const handleEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authApi.enable2FA(enablePassword);
      setQrCode(response.qrCode);
      setSecret(response.secret);
      setShowSetup(true);
      setEnablePassword('');

      toast({
        title: 'QR Code généré',
        description: 'Scannez le code avec votre application',
        variant: 'success',
      });
    } catch (error) {
      console.error('Enable 2FA error:', error);
      toast({
        title: 'Erreur',
        description: 'Mot de passe incorrect',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authApi.verify2FA(verifyToken);

      if (response.backupCodes) {
        setBackupCodes(response.backupCodes);
        setShowBackupCodes(true);
      }

      setIs2FAEnabled(true);
      setShowSetup(false);
      setVerifyToken('');

      toast({
        title: 'Succès',
        description: 'Authentification à deux facteurs activée',
        variant: 'success',
      });
    } catch (error) {
      console.error('Verify 2FA error:', error);
      toast({
        title: 'Erreur',
        description: 'Code invalide',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authApi.disable2FA(disablePassword, disableToken);
      setIs2FAEnabled(false);
      setShowDisableForm(false);
      setDisablePassword('');
      setDisableToken('');

      toast({
        title: 'Succès',
        description: 'Authentification à deux facteurs désactivée',
        variant: 'success',
      });
    } catch (error) {
      console.error('Disable 2FA error:', error);
      toast({
        title: 'Erreur',
        description: 'Mot de passe ou code incorrect',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    const content = `Codes de récupération ArtiConnect\n\nCompte: ${user?.email}\nDate: ${new Date().toLocaleDateString()}\n\n${backupCodes.join('\n')}\n\nConservez ces codes en lieu sûr. Chaque code ne peut être utilisé qu'une seule fois.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `articonnect-backup-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (showBackupCodes) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button variant="ghost" onClick={() => router.back()} className="mb-6">
            ← Retour
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>Codes de récupération</CardTitle>
              <CardDescription>
                Conservez ces codes en lieu sûr. Vous pourrez les utiliser pour accéder à votre compte si vous perdez votre téléphone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 font-medium mb-2">
                  ⚠️ Important
                </p>
                <p className="text-sm text-yellow-700">
                  Chaque code ne peut être utilisé qu'une seule fois. Ne partagez ces codes avec personne.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg font-mono text-sm">
                {backupCodes.map((code, index) => (
                  <div key={index} className="p-2 bg-white border rounded text-center">
                    {code}
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button onClick={downloadBackupCodes} className="flex-1">
                  📥 Télécharger les codes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBackupCodes(false);
                    router.push('/client/profile');
                  }}
                  className="flex-1"
                >
                  J'ai sauvegardé mes codes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (showSetup) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button variant="ghost" onClick={() => setShowSetup(false)} className="mb-6">
            ← Retour
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>Configuration 2FA</CardTitle>
              <CardDescription>
                Scannez le QR code avec votre application d'authentification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-center bg-white p-6 rounded-lg border">
                  <img src={qrCode} alt="QR Code 2FA" className="w-64 h-64" />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Ou entrez ce code manuellement :
                  </p>
                  <code className="block p-3 bg-white border rounded text-center font-mono text-sm break-all">
                    {secret}
                  </code>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Applications recommandées :</strong> Google Authenticator, Microsoft Authenticator, Authy
                  </p>
                </div>
              </div>

              <form onSubmit={handleVerify2FA} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Entrez le code de vérification
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="123456"
                    value={verifyToken}
                    onChange={(e) => setVerifyToken(e.target.value.replace(/\D/g, ''))}
                    required
                    className="text-center text-2xl tracking-widest"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || verifyToken.length !== 6}
                >
                  {loading ? 'Vérification...' : 'Activer 2FA'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          ← Retour
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Authentification à deux facteurs (2FA)</CardTitle>
            <CardDescription>
              Ajoutez une couche de sécurité supplémentaire à votre compte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">
                  {is2FAEnabled ? '✅ 2FA activée' : '🔓 2FA désactivée'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {is2FAEnabled
                    ? 'Votre compte est protégé par l\'authentification à deux facteurs'
                    : 'Protégez votre compte avec un code de vérification supplémentaire'}
                </p>
              </div>
            </div>

            {!is2FAEnabled ? (
              <form onSubmit={handleEnable2FA} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Mot de passe *
                  </label>
                  <Input
                    type="password"
                    placeholder="Votre mot de passe"
                    value={enablePassword}
                    onChange={(e) => setEnablePassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" disabled={loading}>
                  {loading ? 'Configuration...' : 'Activer la 2FA'}
                </Button>
              </form>
            ) : (
              <>
                {!showDisableForm ? (
                  <Button
                    variant="destructive"
                    onClick={() => setShowDisableForm(true)}
                  >
                    Désactiver la 2FA
                  </Button>
                ) : (
                  <form onSubmit={handleDisable2FA} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Mot de passe *
                      </label>
                      <Input
                        type="password"
                        placeholder="Votre mot de passe"
                        value={disablePassword}
                        onChange={(e) => setDisablePassword(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Code 2FA *
                      </label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        placeholder="123456"
                        value={disableToken}
                        onChange={(e) => setDisableToken(e.target.value.replace(/\D/g, ''))}
                        required
                        className="text-center text-2xl tracking-widest"
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button
                        type="submit"
                        variant="destructive"
                        disabled={loading}
                        className="flex-1"
                      >
                        {loading ? 'Désactivation...' : 'Désactiver'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowDisableForm(false)}
                        className="flex-1"
                      >
                        Annuler
                      </Button>
                    </div>
                  </form>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
