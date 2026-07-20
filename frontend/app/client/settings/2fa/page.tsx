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
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground mb-4"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            {t('common', 'back')}
          </button>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-3">
                {t('common', 'backupCodes')}
                <span className="inline-flex items-center rounded-full bg-success/10 text-success text-xs font-bold px-2.5 py-0.5">
                  {t('common', 'twoFactorEnabled') || '2FA activée'}
                </span>
              </CardTitle>
              <CardDescription>
                {t('common', 'backupCodesDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4">
                <svg className="w-5 h-5 shrink-0 text-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 9v4M12 17h.01" /></svg>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">
                    {t('common', 'important')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('common', 'backupCodesWarning')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {backupCodes.map((code, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-border bg-muted p-3 text-center font-mono text-sm tracking-wider"
                  >
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
          <button
            onClick={() => setShowSetup(false)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground mb-4"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            {t('common', 'back')}
          </button>

          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground mb-1">
            {t('common', 'setup2FA')}
          </h1>
          <p className="text-muted-foreground mb-6">{t('common', 'twoFactorDescription')}</p>

          {/* Étape 1 : scan QR */}
          <Card className="rounded-2xl shadow-sm mb-4">
            <CardHeader>
              <CardTitle className="font-display text-lg">1. {t('common', 'scanQRCode')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-border bg-muted p-5">
                <div className="shrink-0 rounded-xl border border-border bg-card p-3">
                  <img src={qrCode} alt="QR Code 2FA" className="h-40 w-40" />
                </div>
                <div className="min-w-[200px] flex-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
                    {t('common', 'orEnterManually')}
                  </p>
                  <code className="block break-all rounded-lg border border-border bg-card px-3.5 py-3 font-mono text-sm tracking-widest">
                    {secret}
                  </code>
                  <p className="mt-3 text-sm text-muted-foreground">
                    <strong className="text-foreground">{t('common', 'recommendedApps')}</strong> Google Authenticator, Microsoft Authenticator, Authy
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Étape 2 : code de vérif */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="font-display text-lg">2. {t('common', 'enterVerificationCode')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerify2FA} className="space-y-4">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="123456"
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value.replace(/\D/g, ''))}
                  required
                  className="text-center text-2xl font-display font-bold tracking-[0.4em]"
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || verifyToken.length !== 6}
                >
                  {loading ? t('common', 'verifying') : (t('common', 'activate2FA') || t('common', 'activate'))}
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
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground mb-4"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          {t('common', 'back')}
        </button>

        <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground mb-1">
          {t('common', 'twoFactorSettings')}
        </h1>
        <p className="text-muted-foreground mb-6">{t('common', 'twoFactorDescription')}</p>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="space-y-6 pt-6">
            <div className="flex items-start gap-4 rounded-2xl border border-border bg-muted p-4">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  is2FAEnabled ? 'bg-success/15 text-success' : 'bg-card text-muted-foreground'
                }`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display font-bold text-foreground">
                    {is2FAEnabled ? t('common', 'twoFactorEnabled') : t('common', 'twoFactorDisabled')}
                  </h3>
                  {is2FAEnabled && (
                    <span className="inline-flex items-center rounded-full bg-success/10 text-success text-xs font-bold px-2.5 py-0.5">
                      {t('common', 'twoFactorEnabled') || 'Activée'}
                    </span>
                  )}
                </div>
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
