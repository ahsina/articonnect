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

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          {t('artisan', 'paymentSetup') || 'Payment Setup'}
        </h1>
        <p className="text-muted-foreground">
          {t('artisan', 'stripeDescription') ||
            'Set up Stripe Connect to receive payments for your services'}
        </p>
      </div>

      {/* Status Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {t('artisan', 'stripeConnectStatus') || 'Stripe Connect Status'}
              </CardTitle>
              <CardDescription>
                {t('artisan', 'stripeStatusDesc') || 'Your payment account status'}
              </CardDescription>
            </div>
            {status?.onboarded ? (
              <Badge className="bg-green-100 text-green-700">
                {t('artisan', 'active') || 'Active'}
              </Badge>
            ) : status?.accountId ? (
              <Badge className="bg-amber-100 text-amber-800">
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
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-green-100 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <span className="text-xl"></span>
                    <span className="font-medium">
                      {t('artisan', 'chargesEnabled') || 'Charges Enabled'}
                    </span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    {t('artisan', 'canReceivePayments') || 'You can receive payments from clients'}
                  </p>
                </div>
                <div className="p-4 bg-green-100 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <span className="text-xl"></span>
                    <span className="font-medium">
                      {t('artisan', 'payoutsEnabled') || 'Payouts Enabled'}
                    </span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    {t('artisan', 'canReceivePayouts') ||
                      'You can receive payouts to your bank account'}
                  </p>
                </div>
              </div>
              <div className="p-4 bg-background rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>{t('artisan', 'accountId') || 'Account ID'}:</strong> {status.accountId}
                </p>
              </div>
              <Button variant="outline" onClick={handleRefreshOnboarding} disabled={creating}>
                {t('artisan', 'updateBankDetails') || 'Update Bank Details'}
              </Button>
            </div>
          ) : status?.accountId ? (
            <div className="space-y-4">
              <div className="p-4 bg-amber-100 border rounded-lg">
                <h4 className="font-medium text-amber-800">
                  {t('artisan', 'onboardingIncomplete') || 'Onboarding Incomplete'}
                </h4>
                <p className="text-sm text-amber-800 mt-1">
                  {t('artisan', 'completeOnboarding') ||
                    'Please complete your Stripe onboarding to start receiving payments.'}
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div
                  className={`p-4 rounded-lg ${status.chargesEnabled ? 'bg-green-100' : 'bg-background'}`}
                >
                  <div
                    className={`flex items-center gap-2 ${status.chargesEnabled ? 'text-green-700' : 'text-muted-foreground'}`}
                  >
                    <span className="text-xl">{status.chargesEnabled ? '' : '○'}</span>
                    <span className="font-medium">
                      {t('artisan', 'chargesEnabled') || 'Charges Enabled'}
                    </span>
                  </div>
                </div>
                <div
                  className={`p-4 rounded-lg ${status.payoutsEnabled ? 'bg-green-100' : 'bg-background'}`}
                >
                  <div
                    className={`flex items-center gap-2 ${status.payoutsEnabled ? 'text-green-700' : 'text-muted-foreground'}`}
                  >
                    <span className="text-xl">{status.payoutsEnabled ? '' : '○'}</span>
                    <span className="font-medium">
                      {t('artisan', 'payoutsEnabled') || 'Payouts Enabled'}
                    </span>
                  </div>
                </div>
              </div>
              <Button onClick={handleRefreshOnboarding} disabled={creating}>
                {creating
                  ? t('common', 'loading') || 'Loading...'
                  : t('artisan', 'continueOnboarding') || 'Continue Onboarding'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <h4 className="font-medium text-primary">
                  {t('artisan', 'getStarted') || 'Get Started with Stripe'}
                </h4>
                <p className="text-sm text-primary mt-1">
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
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t('artisan', 'howItWorks') || 'How It Works'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                  1
                </span>
                <p className="text-sm text-muted-foreground">
                  {t('artisan', 'step1') || 'Complete a mission for a client'}
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                  2
                </span>
                <p className="text-sm text-muted-foreground">
                  {t('artisan', 'step2') || 'Client confirms completion and payment is processed'}
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
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
          <CardHeader>
            <CardTitle className="text-lg">{t('artisan', 'fees') || 'Fees'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">
                  {t('artisan', 'platformFee') || 'Platform Commission'}
                </span>
                <span className="font-medium text-foreground">12%</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">
                  {t('artisan', 'stripeFee') || 'Stripe Processing'}
                </span>
                <span className="font-medium text-foreground">{t('artisanStripe', 'included') || 'Included'}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">
                  {t('artisan', 'yourEarnings') || 'Your Earnings'}
                </span>
                <span className="font-bold text-green-600">88%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
