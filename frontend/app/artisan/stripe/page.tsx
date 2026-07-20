'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { artisanApi, StripeOnboardingStatus } from '@/lib/api/artisan';
import { useLanguage } from '@/contexts/LanguageContext';

export default function StripeOnboardingPage() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<StripeOnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const data = await artisanApi.getStripeOnboardingStatus();
      setStatus(data);
    } catch (error) {
      console.error('Error loading Stripe status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartOnboarding = async () => {
    setCreating(true);
    try {
      const { url } = await artisanApi.createStripeOnboardingLink();
      window.location.href = url;
    } catch (error) {
      console.error('Error creating onboarding link:', error);
      setCreating(false);
    }
  };

  const handleRefreshOnboarding = async () => {
    setCreating(true);
    try {
      const { url } = await artisanApi.refreshStripeOnboardingLink();
      window.location.href = url;
    } catch (error) {
      console.error('Error refreshing onboarding link:', error);
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">{t('common', 'loading') || 'Loading...'}</div>
      </div>
    );
  }

  const CapabilityTile = ({
    enabled,
    title,
    desc,
  }: {
    enabled: boolean;
    title: string;
    desc?: string;
  }) => (
    <div
      className={`rounded-2xl border p-4 ${enabled ? 'bg-success/[0.06] border-success/25' : 'bg-muted border-border'}`}
    >
      <div className="flex items-center gap-2.5 font-semibold text-sm">
        <span
          className={`w-[22px] h-[22px] rounded-full grid place-items-center flex-shrink-0 ${enabled ? 'bg-success text-white' : 'bg-border text-muted-foreground'}`}
        >
          {enabled ? (
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          ) : (
            <span className="w-2.5 h-2.5 rounded-full border-2 border-current" />
          )}
        </span>
        <span className={enabled ? 'text-foreground' : 'text-muted-foreground'}>{title}</span>
      </div>
      {desc && <div className="text-xs text-muted-foreground mt-1.5 ml-[32px]">{desc}</div>}
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-display font-extrabold tracking-tight text-foreground">
          {t('artisan', 'paymentSetup') || 'Payment Setup'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('artisan', 'stripeDescription') ||
            'Set up Stripe Connect to receive payments for your services'}
        </p>
      </div>

      {/* Status Card */}
      <Card className="mb-5">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-display">
                {t('artisan', 'stripeConnectStatus') || 'Stripe Connect Status'}
              </CardTitle>
              <CardDescription>
                {t('artisan', 'stripeStatusDesc') || 'Your payment account status'}
              </CardDescription>
            </div>
            {status?.onboarded ? (
              <Badge className="bg-success/10 text-success">
                {t('artisan', 'active') || 'Active'}
              </Badge>
            ) : status?.accountId ? (
              <Badge className="bg-warning/15 text-warning">
                ⏳ {t('artisan', 'incomplete') || 'Incomplete'}
              </Badge>
            ) : (
              <Badge className="bg-muted text-foreground">
                {t('artisan', 'notConfigured') || 'Not Configured'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {status?.onboarded ? (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-3.5">
                <CapabilityTile
                  enabled
                  title={t('artisan', 'chargesEnabled') || 'Charges Enabled'}
                  desc={t('artisan', 'canReceivePayments') || 'You can receive payments from clients'}
                />
                <CapabilityTile
                  enabled
                  title={t('artisan', 'payoutsEnabled') || 'Payouts Enabled'}
                  desc={
                    t('artisan', 'canReceivePayouts') ||
                    'You can receive payouts to your bank account'
                  }
                />
              </div>
              <div className="bg-muted border border-border rounded-xl px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground font-mono">{t('artisan', 'accountId') || 'Account ID'}:</strong>{' '}
                  {status.accountId}
                </p>
              </div>
              <Button variant="outline" onClick={handleRefreshOnboarding} disabled={creating}>
                {t('artisan', 'updateBankDetails') || 'Update Bank Details'}
              </Button>
            </div>
          ) : status?.accountId ? (
            <div className="space-y-4">
              <div className="flex gap-3 items-start bg-warning/10 border border-warning/35 rounded-2xl px-4 py-3.5">
                <svg className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.3 3.9l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0z" />
                  <path d="M12 9v4M12 17h.01" />
                </svg>
                <div>
                  <h4 className="font-semibold text-sm text-warning">
                    {t('artisan', 'onboardingIncomplete') || 'Onboarding Incomplete'}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t('artisan', 'completeOnboarding') ||
                      'Please complete your Stripe onboarding to start receiving payments.'}
                  </p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3.5">
                <CapabilityTile
                  enabled={!!status.chargesEnabled}
                  title={t('artisan', 'chargesEnabled') || 'Charges Enabled'}
                />
                <CapabilityTile
                  enabled={!!status.payoutsEnabled}
                  title={t('artisan', 'payoutsEnabled') || 'Payouts Enabled'}
                />
              </div>
              {status.accountId && (
                <div className="bg-muted border border-border rounded-xl px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground font-mono">{t('artisan', 'accountId') || 'Account ID'}:</strong>{' '}
                    {status.accountId}
                  </p>
                </div>
              )}
              <Button onClick={handleRefreshOnboarding} disabled={creating}>
                {creating
                  ? t('common', 'loading') || 'Loading...'
                  : t('artisan', 'continueOnboarding') || 'Continue Onboarding'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-primary/[0.06] border border-primary/15 rounded-2xl px-4 py-3.5">
                <h4 className="font-semibold text-sm text-foreground">
                  {t('artisan', 'getStarted') || 'Get Started with Stripe'}
                </h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t('artisan', 'stripeGetStartedDesc') ||
                    'Connect your bank account to receive payments for completed missions.'}
                </p>
              </div>
              <Button onClick={handleStartOnboarding} disabled={creating} size="lg">
                {creating
                  ? t('common', 'loading') || 'Loading...'
                  : t('artisan', 'setupPayments') || 'Set Up Payments'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information Cards */}
      <div className="grid md:grid-cols-2 gap-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">
              {t('artisan', 'howItWorks') || 'How It Works'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              <li className="flex items-start gap-3 py-2.5">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted text-foreground flex items-center justify-center text-xs font-bold font-display">
                  1
                </span>
                <p className="text-sm text-muted-foreground">
                  {t('artisan', 'step1') || 'Complete a mission for a client'}
                </p>
              </li>
              <li className="flex items-start gap-3 py-2.5">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted text-foreground flex items-center justify-center text-xs font-bold font-display">
                  2
                </span>
                <p className="text-sm text-muted-foreground">
                  {t('artisan', 'step2') || 'Client confirms completion and payment is processed'}
                </p>
              </li>
              <li className="flex items-start gap-3 py-2.5">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted text-foreground flex items-center justify-center text-xs font-bold font-display">
                  3
                </span>
                <p className="text-sm text-muted-foreground">
                  {t('artisan', 'step3') || 'Funds are transferred to your connected bank account'}
                </p>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">{t('artisan', 'fees') || 'Fees'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <div className="flex justify-between items-center py-2.5 border-b border-border text-sm">
                <span className="text-muted-foreground">
                  {t('artisan', 'platformFee') || 'Platform Commission'}
                </span>
                <span className="font-bold text-foreground">12%</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-border text-sm">
                <span className="text-muted-foreground">
                  {t('artisan', 'stripeFee') || 'Stripe Processing'}
                </span>
                <span className="font-bold text-foreground">{t('artisanStripe', 'included') || 'Included'}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 text-sm">
                <span className="text-muted-foreground">
                  {t('artisan', 'yourEarnings') || 'Your Earnings'}
                </span>
                <span className="font-bold text-success">88%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
