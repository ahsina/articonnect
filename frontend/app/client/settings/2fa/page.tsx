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
import { useLanguage } from '@/contexts/LanguageContext';

export default function TwoFactorAuthPage() {
  const { t } = useLanguage();
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
        title: t('common', 'qrCodeGenerated'),
        description: t('common', 'scanWithApp'),
        variant: 'success',
      });
    } catch (error) {
      console.error('Enable 2FA error:', error);
      toast({
        title: t('common', 'error'),
        description: t('common', 'incorrectPassword'),
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
        title: t('common', 'success'),
        description: t('common', 'twoFactorActivated'),
        variant: 'success',
      });
    } catch (error) {
      console.error('Verify 2FA error:', error);
      toast({
        title: t('common', 'error'),
        description: t('common', 'invalidCode'),
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
        title: t('common', 'success'),
        description: t('common', 'twoFactorDeactivated'),
        variant: 'success',
      });
    } catch (error) {
      console.error('Disable 2FA error:', error);
      toast({
        title: t('common', 'error'),
        description: t('common', 'passwordOrCodeIncorrect'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    const content = `Codes de récupération Krafolt\n\nCompte: ${user?.email}\nDate: ${new Date().toLocaleDateString()}\n\n${backupCodes.join('\n')}\n\nConservez ces codes en lieu sûr. Chaque code ne peut être utilisé qu'une seule fois.`;
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
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button variant="ghost" onClick={() => router.back()} className="mb-6">
            {t('common', 'back')}
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>{t('common', 'backupCodes')}</CardTitle>
              <CardDescription>
                {t('common', 'backupCodesDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-amber-100 border rounded-lg p-4">
                <p className="text-sm text-amber-800 font-medium mb-2">
                  {t('common', 'important')}
                </p>
                <p className="text-sm text-amber-800">
                  {t('common', 'backupCodesWarning')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 bg-background rounded-lg font-mono text-sm">
                {backupCodes.map((code, index) => (
                  <div key={index} className="p-2 bg-card border rounded text-center">
                    {code}
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button onClick={downloadBackupCodes} className="flex-1">
                  {t('common', 'downloadCodes')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBackupCodes(false);
                    router.push('/client/profile');
                  }}
                  className="flex-1"
                >
                  {t('common', 'savedCodes')}
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
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button variant="ghost" onClick={() => setShowSetup(false)} className="mb-6">
            {t('common', 'back')}
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>{t('common', 'setup2FA')}</CardTitle>
              <CardDescription>
                {t('common', 'scanQRCode')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-center bg-card p-6 rounded-lg border">
                  <img src={qrCode} alt="QR Code 2FA" className="w-64 h-64" />
                </div>

                <div className="bg-background p-4 rounded-lg">
                  <p className="text-sm font-medium text-foreground mb-2">
                    {t('common', 'orEnterManually')}
                  </p>
                  <code className="block p-3 bg-card border rounded text-center font-mono text-sm break-all">
                    {secret}
                  </code>
                </div>

                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <p className="text-sm text-primary">
                    <strong>{t('common', 'recommendedApps')}</strong> Google Authenticator, Microsoft Authenticator, Authy
                  </p>
                </div>
              </div>

              <form onSubmit={handleVerify2FA} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t('common', 'enterVerificationCode')}
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
                  {loading ? t('common', 'verifying') : t('common', 'activate')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          {t('common', 'back')}
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{t('common', 'twoFactorSettings')}</CardTitle>
            <CardDescription>
              {t('common', 'twoFactorDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start justify-between p-4 bg-background rounded-lg">
              <div className="flex-1">
                <h3 className="font-medium text-foreground">
                  {is2FAEnabled ? t('common', 'twoFactorEnabled') : t('common', 'twoFactorDisabled')}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {is2FAEnabled
                    ? t('common', 'twoFactorEnabledDesc')
                    : t('common', 'twoFactorDisabledDesc')}
                </p>
              </div>
            </div>

            {!is2FAEnabled ? (
              <form onSubmit={handleEnable2FA} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t('auth', 'password')} *
                  </label>
                  <Input
                    type="password"
                    placeholder={t('auth', 'password')}
                    value={enablePassword}
                    onChange={(e) => setEnablePassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" disabled={loading}>
                  {loading ? t('common', 'configuring') : t('common', 'enable2FA')}
                </Button>
              </form>
            ) : (
              <>
                {!showDisableForm ? (
                  <Button
                    variant="destructive"
                    onClick={() => setShowDisableForm(true)}
                  >
                    {t('common', 'disable2FA')}
                  </Button>
                ) : (
                  <form onSubmit={handleDisable2FA} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        {t('auth', 'password')} *
                      </label>
                      <Input
                        type="password"
                        placeholder={t('auth', 'password')}
                        value={disablePassword}
                        onChange={(e) => setDisablePassword(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        {t('common', 'code2FA')} *
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
                        {loading ? t('common', 'deactivating') : t('common', 'deactivate')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowDisableForm(false)}
                        className="flex-1"
                      >
                        {t('common', 'cancel')}
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
