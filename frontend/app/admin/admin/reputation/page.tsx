'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Star, Minus, Plus, X } from 'lucide-react';
import { adminApi, UserReputation } from '@/lib/api/admin';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ReputationPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState('');
  const [reputation, setReputation] = useState<UserReputation | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [recentAdjustments, setRecentAdjustments] = useState<
    Array<{ userId: string; adjustment: number; reason: string; timestamp: string }>
  >([]);

  const handleLookup = async () => {
    if (!userId.trim()) {
      setError(t('adminReputation', 'enterUserId'));
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const data = await adminApi.getUserReputation(userId.trim());
      setReputation(data);
    } catch (err: unknown) {
      console.error('Error fetching reputation:', err);
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 404) {
        setError(t('adminReputation', 'userNotFound'));
      } else if (error.response?.status === 403) {
        router.push('/');
      } else {
        setError(t('adminReputation', 'fetchError'));
      }
      setReputation(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjust = async () => {
    if (!userId.trim() || adjustmentAmount === 0 || !adjustmentReason.trim()) {
      setError(t('adminReputation', 'provideAmountReason'));
      return;
    }
    try {
      setProcessing(true);
      setError(null);
      const data = await adminApi.adjustReputation(
        userId.trim(),
        adjustmentAmount,
        adjustmentReason,
      );
      setReputation(data);
      setSuccess(
        `Reputation adjusted by ${adjustmentAmount > 0 ? '+' : ''}${adjustmentAmount} points`,
      );

      // Add to recent adjustments
      setRecentAdjustments((prev) => [
        {
          userId: userId.trim(),
          adjustment: adjustmentAmount,
          reason: adjustmentReason,
          timestamp: new Date().toISOString(),
        },
        ...prev.slice(0, 9),
      ]);

      // Reset form
      setAdjustmentAmount(0);
      setAdjustmentReason('');
    } catch (err) {
      console.error('Error adjusting reputation:', err);
      setError(t('adminReputation', 'adjustError'));
    } finally {
      setProcessing(false);
    }
  };

  const getReputationColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-primary';
    if (score >= 40) return 'text-foreground';
    if (score >= 20) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return 'bg-green-600';
    if (score >= 60) return 'bg-primary';
    if (score >= 40) return 'bg-amber-500';
    if (score >= 20) return 'bg-amber-500';
    return 'bg-red-600';
  };

  const getLevelVariant = (
    level: string,
  ): 'success' | 'warning' | 'info' | 'error' | 'secondary' => {
    const map: Record<string, 'success' | 'warning' | 'info' | 'error' | 'secondary'> = {
      GOLD: 'warning',
      SILVER: 'info',
      BRONZE: 'warning',
      NEW: 'info',
      TRUSTED: 'success',
      WARNING: 'error',
    };
    return map[level] || 'secondary';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Preset adjustment reasons
  const presetReasons = [
    {
      label: t('adminReputation', 'presetDisputeFavorLabel'),
      value: 10,
      reason: t('adminReputation', 'presetDisputeFavorReason'),
    },
    {
      label: t('adminReputation', 'presetDisputeAgainstLabel'),
      value: -15,
      reason: t('adminReputation', 'presetDisputeAgainstReason'),
    },
    {
      label: t('adminReputation', 'presetExcellentLabel'),
      value: 5,
      reason: t('adminReputation', 'presetExcellentReason'),
    },
    { label: t('adminReputation', 'presetMinorLabel'), value: -10, reason: t('adminReputation', 'presetMinorReason') },
    { label: t('adminReputation', 'presetMajorLabel'), value: -25, reason: t('adminReputation', 'presetMajorReason') },
    { label: t('adminReputation', 'presetFalseNoShowLabel'), value: -20, reason: t('adminReputation', 'presetFalseNoShowReason') },
    { label: t('adminReputation', 'presetRehabLabel'), value: 15, reason: t('adminReputation', 'presetRehabReason') },
  ];

  const avgRating = Number(reputation?.averageRating) || 0;
  const filledStars = Math.round(avgRating);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.push('/admin/admin/dashboard')}
            className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={t('adminReputation', 'back')}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              {t('adminReputation', 'title')}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{t('adminReputation', 'subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="flex-shrink-0 font-semibold hover:opacity-70"
            aria-label={t('adminReputation', 'dismiss')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-success">
          <span>{success}</span>
          <button
            onClick={() => setSuccess(null)}
            className="flex-shrink-0 font-semibold hover:opacity-70"
            aria-label={t('adminReputation', 'dismiss')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_360px]">
        {/* Lookup + Reputation */}
        <Card className="overflow-hidden">
          <div className="border-b border-border p-5">
            <h2 className="font-display text-base font-bold text-foreground">
              {t('adminReputation', 'lookupTitle')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('adminReputation', 'lookupDesc')}</p>
          </div>
          <div className="p-5">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder={t('adminReputation', 'enterUserIdPlaceholder')}
                  className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm text-foreground focus:border-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                />
              </div>
              <Button onClick={handleLookup} disabled={loading} className="h-10 rounded-xl">
                {loading ? t('adminReputation', 'loading') : t('adminReputation', 'lookup')}
              </Button>
            </div>

            {/* Reputation Display */}
            {reputation && (
              <div className="mt-6 space-y-6">
                {/* Score */}
                <div className="rounded-2xl border border-border bg-muted/40 p-5">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t('adminReputation', 'reputationScore')}
                      </p>
                      <p
                        className={`mt-1 font-display text-4xl font-extrabold tracking-tight ${getReputationColor(reputation.score)}`}
                      >
                        {reputation.score}
                        <span className="ml-1 text-lg font-semibold text-muted-foreground">/100</span>
                      </p>
                    </div>
                    <Badge variant={getLevelVariant(reputation.level)}>{reputation.level}</Badge>
                  </div>
                  <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${getScoreBarColor(reputation.score)}`}
                      style={{ width: `${Math.max(0, Math.min(100, reputation.score))}%` }}
                    />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                  <Card className="p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t('adminReputation', 'totalMissions')}
                    </p>
                    <p className="mt-2 font-display text-2xl font-extrabold tracking-tight text-foreground">
                      {reputation.totalMissions}
                    </p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t('adminReputation', 'completed')}
                    </p>
                    <p className="mt-2 font-display text-2xl font-extrabold tracking-tight text-success">
                      {reputation.completedMissions}
                    </p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t('adminReputation', 'cancelled')}
                    </p>
                    <p className="mt-2 font-display text-2xl font-extrabold tracking-tight text-destructive">
                      {reputation.cancelledMissions}
                    </p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t('adminReputation', 'noShows')}
                    </p>
                    <p className="mt-2 font-display text-2xl font-extrabold tracking-tight text-warning">
                      {reputation.noShowCount}
                    </p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t('adminReputation', 'avgRating')}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="font-display text-2xl font-extrabold tracking-tight text-foreground">
                        {avgRating.toFixed(1)}
                      </span>
                      <div className="flex items-center">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < filledStars
                                ? 'fill-warning text-warning'
                                : 'text-muted-foreground'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t('adminReputation', 'reviews')}
                    </p>
                    <p className="mt-2 font-display text-2xl font-extrabold tracking-tight text-primary">
                      {reputation.reviewCount}
                    </p>
                  </Card>
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  {t('adminReputation', 'lastUpdated')} {formatDate(reputation.lastUpdated)}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Adjustment Section */}
        <Card className="overflow-hidden">
          <div className="border-b border-border p-5">
            <h2 className="font-display text-base font-bold text-foreground">
              {t('adminReputation', 'adjustTitle')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('adminReputation', 'adjustDesc')}</p>
          </div>
          <div className="p-5">
            {!reputation ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {t('adminReputation', 'lookupFirst')}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Quick Presets */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('adminReputation', 'quickPresets')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {presetReasons.map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setAdjustmentAmount(preset.value);
                          setAdjustmentReason(preset.reason);
                        }}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                          preset.value > 0
                            ? 'border-green-500/30 bg-green-500/10 text-success hover:bg-green-500/20'
                            : 'border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20'
                        }`}
                      >
                        {preset.label} ({preset.value > 0 ? '+' : ''}
                        {preset.value})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Manual Adjustment */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('adminReputation', 'adjustmentAmount')}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAdjustmentAmount((prev) => prev - 5)}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background px-3 font-display text-sm font-bold text-destructive transition-colors hover:bg-muted"
                    >
                      -5
                    </button>
                    <button
                      onClick={() => setAdjustmentAmount((prev) => prev - 1)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-destructive transition-colors hover:bg-muted"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      value={adjustmentAmount}
                      onChange={(e) => setAdjustmentAmount(parseInt(e.target.value) || 0)}
                      className="h-10 w-20 rounded-xl border border-border bg-background text-center font-display text-base font-bold text-foreground focus:border-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <button
                      onClick={() => setAdjustmentAmount((prev) => prev + 1)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-success transition-colors hover:bg-muted"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setAdjustmentAmount((prev) => prev + 5)}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background px-3 font-display text-sm font-bold text-success transition-colors hover:bg-muted"
                    >
                      +5
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t('adminReputation', 'newScoreWillBe')}{' '}
                    <strong className={getReputationColor(reputation.score + adjustmentAmount)}>
                      {Math.max(0, Math.min(100, reputation.score + adjustmentAmount))}
                    </strong>{' '}
                    / 100
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('adminReputation', 'reasonLabel')}
                  </label>
                  <textarea
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    placeholder={t('adminReputation', 'reasonPlaceholder')}
                    rows={4}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <Button
                  onClick={handleAdjust}
                  disabled={processing || adjustmentAmount === 0 || !adjustmentReason.trim()}
                  className="w-full rounded-xl"
                >
                  {processing
                    ? t('adminReputation', 'applying')
                    : t('adminReputation', 'applyAdjustment')}
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Recent Adjustments */}
      {recentAdjustments.length > 0 && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border p-5">
            <h2 className="font-display text-base font-bold text-foreground">
              {t('adminReputation', 'recentAdjustments')}
            </h2>
            <Badge variant="secondary">{recentAdjustments.length}</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="whitespace-nowrap px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t('adminReputation', 'userIdCol')}
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t('adminReputation', 'adjustmentCol')}
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t('adminReputation', 'reasonCol')}
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t('adminReputation', 'timeCol')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentAdjustments.map((adj, idx) => (
                  <tr key={idx} className="transition-colors hover:bg-muted/40">
                    <td className="whitespace-nowrap px-4 py-3 align-middle font-mono text-xs text-muted-foreground">
                      {adj.userId}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-middle">
                      <Badge variant={adj.adjustment > 0 ? 'success' : 'error'}>
                        {adj.adjustment > 0 ? '+' : ''}
                        {adj.adjustment}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 align-middle text-muted-foreground">{adj.reason}</td>
                    <td className="whitespace-nowrap px-4 py-3 align-middle text-muted-foreground">
                      {formatDate(adj.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
