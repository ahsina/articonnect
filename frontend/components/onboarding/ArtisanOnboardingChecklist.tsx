'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  href: string;
  icon: string;
  priority: 'required' | 'recommended' | 'optional';
}

interface ArtisanOnboardingChecklistProps {
  profile: {
    hasPhoto: boolean;
    hasDescription: boolean;
    hasCategories: boolean;
    hasServiceArea: boolean;
    stripeConnected: boolean;
    kycVerified: boolean;
    hasCertifications: boolean;
    hasWorkingHours: boolean;
    hasPortfolio: boolean;
    bankAccountLinked: boolean;
  };
  onDismiss?: () => void;
  compact?: boolean;
}

export default function ArtisanOnboardingChecklist({
  profile,
  onDismiss,
  compact = false,
}: ArtisanOnboardingChecklistProps) {
  const { t } = useLanguage();
  const [dismissed, setDismissed] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const steps: OnboardingStep[] = [
    {
      id: 'photo',
      title: t('onboarding', 'addPhoto') || 'Add Profile Photo',
      description: t('onboarding', 'addPhotoDesc') || 'Profiles with photos get 3x more responses',
      completed: profile.hasPhoto,
      href: '/artisan/profile',
      icon: '📷',
      priority: 'required',
    },
    {
      id: 'description',
      title: t('onboarding', 'writeDescription') || 'Write Your Bio',
      description: t('onboarding', 'writeDescriptionDesc') || 'Tell clients about your experience and expertise',
      completed: profile.hasDescription,
      href: '/artisan/profile',
      icon: '✏️',
      priority: 'required',
    },
    {
      id: 'categories',
      title: t('onboarding', 'selectCategories') || 'Select Service Categories',
      description: t('onboarding', 'selectCategoriesDesc') || 'Choose the services you offer',
      completed: profile.hasCategories,
      href: '/artisan/profile',
      icon: '🔧',
      priority: 'required',
    },
    {
      id: 'serviceArea',
      title: t('onboarding', 'setServiceArea') || 'Set Your Service Area',
      description: t('onboarding', 'setServiceAreaDesc') || 'Define where you can work',
      completed: profile.hasServiceArea,
      href: '/artisan/profile',
      icon: '📍',
      priority: 'required',
    },
    {
      id: 'stripe',
      title: t('onboarding', 'connectStripe') || 'Connect Stripe Account',
      description: t('onboarding', 'connectStripeDesc') || 'Required to receive payments',
      completed: profile.stripeConnected,
      href: '/artisan/stripe',
      icon: '💳',
      priority: 'required',
    },
    {
      id: 'kyc',
      title: t('onboarding', 'verifyIdentity') || 'Verify Your Identity',
      description: t('onboarding', 'verifyIdentityDesc') || 'Complete KYC for full platform access',
      completed: profile.kycVerified,
      href: '/artisan/settings',
      icon: '🪪',
      priority: 'required',
    },
    {
      id: 'workingHours',
      title: t('onboarding', 'setAvailability') || 'Set Your Availability',
      description: t('onboarding', 'setAvailabilityDesc') || 'Define your working hours',
      completed: profile.hasWorkingHours,
      href: '/artisan/availability/working-hours',
      icon: '🕐',
      priority: 'recommended',
    },
    {
      id: 'certifications',
      title: t('onboarding', 'addCertifications') || 'Add Certifications',
      description: t('onboarding', 'addCertificationsDesc') || 'Boost trust with verified credentials',
      completed: profile.hasCertifications,
      href: '/artisan/certifications',
      icon: '📜',
      priority: 'recommended',
    },
    {
      id: 'portfolio',
      title: t('onboarding', 'uploadPortfolio') || 'Upload Portfolio',
      description: t('onboarding', 'uploadPortfolioDesc') || 'Show off your best work',
      completed: profile.hasPortfolio,
      href: '/artisan/profile',
      icon: '🖼️',
      priority: 'optional',
    },
    {
      id: 'bank',
      title: t('onboarding', 'linkBank') || 'Link Bank Account',
      description: t('onboarding', 'linkBankDesc') || 'For automatic payouts',
      completed: profile.bankAccountLinked,
      href: '/artisan/stripe',
      icon: '🏦',
      priority: 'optional',
    },
  ];

  const requiredSteps = steps.filter(s => s.priority === 'required');
  const recommendedSteps = steps.filter(s => s.priority === 'recommended');
  const optionalSteps = steps.filter(s => s.priority === 'optional');

  const completedCount = steps.filter(s => s.completed).length;
  const requiredCompletedCount = requiredSteps.filter(s => s.completed).length;
  const progress = Math.round((completedCount / steps.length) * 100);
  const requiredProgress = Math.round((requiredCompletedCount / requiredSteps.length) * 100);

  const isFullySetup = requiredProgress === 100;
  const displaySteps = showAll ? steps : steps.filter(s => !s.completed).slice(0, 3);

  if (dismissed || (isFullySetup && !showAll)) {
    return null;
  }

  if (compact) {
    return (
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-3xl">🚀</div>
              <div>
                <h3 className="font-medium text-foreground">
                  {t('onboarding', 'completeProfile') || 'Complete Your Profile'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {progress}% {t('onboarding', 'complete') || 'complete'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={progress} className="w-24 h-2" />
              <Link href="/artisan/profile">
                <Button size="sm">{t('common', 'continue') || 'Continue'}</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl">🚀</div>
            <div>
              <CardTitle className="text-xl">
                {t('onboarding', 'welcomeArtisan') || 'Welcome to Krafolt!'}
              </CardTitle>
              <p className="text-muted-foreground">
                {t('onboarding', 'completeSetup') || 'Complete your profile to start receiving missions'}
              </p>
            </div>
          </div>
          {onDismiss && (
            <Button variant="ghost" size="sm" onClick={() => {
              setDismissed(true);
              onDismiss();
            }}>
              ✕
            </Button>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t('onboarding', 'overallProgress') || 'Overall Progress'}
            </span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3" />

          {requiredProgress < 100 && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="destructive" className="text-xs">
                {requiredSteps.length - requiredCompletedCount} {t('onboarding', 'requiredLeft') || 'required steps left'}
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Required Steps */}
          {requiredSteps.filter(s => !s.completed || showAll).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <span className="text-red-500">●</span>
                {t('onboarding', 'required') || 'Required'}
              </h4>
              <div className="space-y-2">
                {requiredSteps.filter(s => !s.completed || showAll).map((step) => (
                  <StepItem key={step.id} step={step} />
                ))}
              </div>
            </div>
          )}

          {/* Recommended Steps */}
          {(showAll || requiredProgress === 100) && recommendedSteps.filter(s => !s.completed || showAll).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <span className="text-yellow-500">●</span>
                {t('onboarding', 'recommended') || 'Recommended'}
              </h4>
              <div className="space-y-2">
                {recommendedSteps.filter(s => !s.completed || showAll).map((step) => (
                  <StepItem key={step.id} step={step} />
                ))}
              </div>
            </div>
          )}

          {/* Optional Steps */}
          {showAll && optionalSteps.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <span className="text-muted-foreground">●</span>
                {t('onboarding', 'optional') || 'Optional'}
              </h4>
              <div className="space-y-2">
                {optionalSteps.map((step) => (
                  <StepItem key={step.id} step={step} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t flex justify-between items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll
              ? t('onboarding', 'showLess') || 'Show Less'
              : t('onboarding', 'showAll') || 'Show All Steps'}
          </Button>

          {requiredProgress === 100 && (
            <Badge className="bg-green-500/15 text-green-400">
              ✓ {t('onboarding', 'readyToWork') || 'Ready to receive missions!'}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StepItem({ step }: { step: OnboardingStep }) {
  return (
    <Link
      href={step.href}
      className={`
        flex items-center gap-3 p-3 rounded-lg border transition-all
        ${step.completed
          ? 'bg-green-500/10 border-green-500/30'
          : 'bg-card border-border hover:border-blue-300 hover:shadow-sm'}
      `}
    >
      <div className="text-2xl">{step.icon}</div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={`font-medium ${step.completed ? 'text-green-400' : 'text-foreground'}`}>
            {step.title}
          </span>
          {step.completed && (
            <Badge className="bg-green-500/15 text-green-400 text-xs">✓</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{step.description}</p>
      </div>
      {!step.completed && (
        <Button size="sm" variant="outline">
          →
        </Button>
      )}
    </Link>
  );
}
