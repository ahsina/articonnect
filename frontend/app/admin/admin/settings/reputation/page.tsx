'use client';

import { useState, useEffect } from 'react';
import { adminApi, ReputationRules } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

const defaultReputationRules: ReputationRules = {
  initialScore: 50,
  maxScore: 100,
  minScore: 0,
  completedMissionBonus: 5,
  fiveStarReviewBonus: 10,
  fourStarReviewBonus: 5,
  threeStarReviewBonus: 0,
  twoStarReviewPenalty: 5,
  oneStarReviewPenalty: 10,
  noShowPenalty: 20,
  cancellationPenalty: 5,
  lateCancellationPenalty: 10,
  disputeLossPenalty: 15,
  disputeWinBonus: 5,
  verificationBonus: 10,
  responseTimeBonus: 3,
  streakBonus: 10,
  streakThreshold: 5,
  inactivityPenalty: 2,
  inactivityThresholdDays: 30,
  goldThreshold: 85,
  silverThreshold: 70,
  bronzeThreshold: 50,
  trustedThreshold: 90,
  warningThreshold: 30,
};

export default function ReputationRulesPage() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<ReputationRules>(defaultReputationRules);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getReputationRules();
      setSettings(data);
    } catch (err) {
      console.error('Error loading reputation rules:', err);
      setSettings(defaultReputationRules);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await adminApi.updateReputationRules(settings);
      setSuccess(t('adminSettingsReputation', 'saveSuccess'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving reputation rules:', err);
      setError(t('adminSettingsReputation', 'saveError'));
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof ReputationRules>(key: K, value: ReputationRules[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-100 border border-red-200 rounded-lg text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-4 font-medium">
            {t('adminSettingsReputation', 'dismiss')}
          </button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-100 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      {/* Score Bounds */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsReputation', 'scoreConfigTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsReputation', 'scoreConfigDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('adminSettingsReputation', 'initialScore')}</label>
              <input
                type="number"
                value={settings.initialScore}
                onChange={(e) => updateSetting('initialScore', parseInt(e.target.value))}
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">{t('adminSettingsReputation', 'initialScoreHint')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('adminSettingsReputation', 'minScore')}</label>
              <input
                type="number"
                value={settings.minScore}
                onChange={(e) => updateSetting('minScore', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('adminSettingsReputation', 'maxScore')}</label>
              <input
                type="number"
                value={settings.maxScore}
                onChange={(e) => updateSetting('maxScore', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Level Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsReputation', 'levelThresholdsTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsReputation', 'levelThresholdsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="p-4 bg-amber-100 rounded-lg border border-amber-200">
              <label className="block text-sm font-medium text-amber-800 mb-1">{t('adminSettingsReputation', 'levelGold')}</label>
              <input
                type="number"
                value={settings.goldThreshold}
                onChange={(e) => updateSetting('goldThreshold', parseInt(e.target.value))}
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-yellow-500/30 rounded-lg focus:ring-2 focus:ring-yellow-500"
              />
              <p className="mt-1 text-xs text-yellow-600">{t('adminSettingsReputation', 'scoreGte')} {settings.goldThreshold}</p>
            </div>
            <div className="p-4 bg-background rounded-lg border border-border">
              <label className="block text-sm font-medium text-foreground mb-1">{t('adminSettingsReputation', 'levelSilver')}</label>
              <input
                type="number"
                value={settings.silverThreshold}
                onChange={(e) => updateSetting('silverThreshold', parseInt(e.target.value))}
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-gray-500"
              />
              <p className="mt-1 text-xs text-muted-foreground">{t('adminSettingsReputation', 'scoreGte')} {settings.silverThreshold}</p>
            </div>
            <div className="p-4 bg-amber-100 rounded-lg border border-amber-200">
              <label className="block text-sm font-medium text-amber-800 mb-1">{t('adminSettingsReputation', 'levelBronze')}</label>
              <input
                type="number"
                value={settings.bronzeThreshold}
                onChange={(e) => updateSetting('bronzeThreshold', parseInt(e.target.value))}
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-yellow-500/30 rounded-lg focus:ring-2 focus:ring-yellow-500"
              />
              <p className="mt-1 text-xs text-yellow-600">{t('adminSettingsReputation', 'scoreGte')} {settings.bronzeThreshold}</p>
            </div>
            <div className="p-4 bg-green-100 rounded-lg border border-green-200">
              <label className="block text-sm font-medium text-green-700 mb-1">{t('adminSettingsReputation', 'levelTrusted')}</label>
              <input
                type="number"
                value={settings.trustedThreshold}
                onChange={(e) => updateSetting('trustedThreshold', parseInt(e.target.value))}
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-green-500/30 rounded-lg focus:ring-2 focus:ring-green-500"
              />
              <p className="mt-1 text-xs text-green-600">{t('adminSettingsReputation', 'scoreGte')} {settings.trustedThreshold}</p>
            </div>
            <div className="p-4 bg-red-100 rounded-lg border border-red-200">
              <label className="block text-sm font-medium text-red-700 mb-1">{t('adminSettingsReputation', 'levelWarning')}</label>
              <input
                type="number"
                value={settings.warningThreshold}
                onChange={(e) => updateSetting('warningThreshold', parseInt(e.target.value))}
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-red-500/30 rounded-lg focus:ring-2 focus:ring-red-500"
              />
              <p className="mt-1 text-xs text-red-600">{t('adminSettingsReputation', 'scoreLt')} {settings.warningThreshold}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mission Bonuses */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsReputation', 'missionBonusesTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsReputation', 'missionBonusesDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsReputation', 'completedMissionBonus')}
              </label>
              <input
                type="number"
                value={settings.completedMissionBonus}
                onChange={(e) => updateSetting('completedMissionBonus', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-green-600">
                +{settings.completedMissionBonus} {t('adminSettingsReputation', 'points')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsReputation', 'responseTimeBonus')}
              </label>
              <input
                type="number"
                value={settings.responseTimeBonus}
                onChange={(e) => updateSetting('responseTimeBonus', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-green-600">
                +{settings.responseTimeBonus} {t('adminSettingsReputation', 'forFastResponse')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsReputation', 'verificationBonus')}
              </label>
              <input
                type="number"
                value={settings.verificationBonus}
                onChange={(e) => updateSetting('verificationBonus', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-green-600">
                +{settings.verificationBonus} {t('adminSettingsReputation', 'oneTimeBonus')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review Score Changes */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsReputation', 'reviewChangesTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsReputation', 'reviewChangesDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="p-4 bg-green-100 rounded-lg">
              <label className="block text-sm font-medium text-foreground mb-1">{t('adminSettingsReputation', 'fiveStars')}</label>
              <input
                type="number"
                value={settings.fiveStarReviewBonus}
                onChange={(e) => updateSetting('fiveStarReviewBonus', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-green-600">+{settings.fiveStarReviewBonus}</p>
            </div>
            <div className="p-4 bg-green-100 rounded-lg">
              <label className="block text-sm font-medium text-foreground mb-1">{t('adminSettingsReputation', 'fourStars')}</label>
              <input
                type="number"
                value={settings.fourStarReviewBonus}
                onChange={(e) => updateSetting('fourStarReviewBonus', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-green-600">+{settings.fourStarReviewBonus}</p>
            </div>
            <div className="p-4 bg-background rounded-lg">
              <label className="block text-sm font-medium text-foreground mb-1">{t('adminSettingsReputation', 'threeStars')}</label>
              <input
                type="number"
                value={settings.threeStarReviewBonus}
                onChange={(e) => updateSetting('threeStarReviewBonus', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {settings.threeStarReviewBonus >= 0 ? '+' : ''}
                {settings.threeStarReviewBonus}
              </p>
            </div>
            <div className="p-4 bg-red-100 rounded-lg">
              <label className="block text-sm font-medium text-foreground mb-1">{t('adminSettingsReputation', 'twoStars')}</label>
              <input
                type="number"
                value={settings.twoStarReviewPenalty}
                onChange={(e) => updateSetting('twoStarReviewPenalty', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-red-600">-{settings.twoStarReviewPenalty}</p>
            </div>
            <div className="p-4 bg-red-100 rounded-lg">
              <label className="block text-sm font-medium text-foreground mb-1">{t('adminSettingsReputation', 'oneStar')}</label>
              <input
                type="number"
                value={settings.oneStarReviewPenalty}
                onChange={(e) => updateSetting('oneStarReviewPenalty', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-red-600">-{settings.oneStarReviewPenalty}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Penalties */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsReputation', 'penaltiesTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsReputation', 'penaltiesDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsReputation', 'noShowPenalty')}
              </label>
              <input
                type="number"
                value={settings.noShowPenalty}
                onChange={(e) => updateSetting('noShowPenalty', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-red-600">-{settings.noShowPenalty} {t('adminSettingsReputation', 'points')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsReputation', 'cancellationPenalty')}
              </label>
              <input
                type="number"
                value={settings.cancellationPenalty}
                onChange={(e) => updateSetting('cancellationPenalty', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-red-600">-{settings.cancellationPenalty} {t('adminSettingsReputation', 'points')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsReputation', 'lateCancellationPenalty')}
              </label>
              <input
                type="number"
                value={settings.lateCancellationPenalty}
                onChange={(e) => updateSetting('lateCancellationPenalty', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-red-600">
                -{settings.lateCancellationPenalty} {t('adminSettingsReputation', 'points')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dispute Effects */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsReputation', 'disputeEffectsTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsReputation', 'disputeEffectsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsReputation', 'disputeLossPenalty')}
              </label>
              <input
                type="number"
                value={settings.disputeLossPenalty}
                onChange={(e) => updateSetting('disputeLossPenalty', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-red-600">-{settings.disputeLossPenalty} {t('adminSettingsReputation', 'points')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsReputation', 'disputeWinBonus')}
              </label>
              <input
                type="number"
                value={settings.disputeWinBonus}
                onChange={(e) => updateSetting('disputeWinBonus', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-green-600">+{settings.disputeWinBonus} {t('adminSettingsReputation', 'points')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Streak & Inactivity */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettingsReputation', 'streakInactivityTitle')}</CardTitle>
          <CardDescription>{t('adminSettingsReputation', 'streakInactivityDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('adminSettingsReputation', 'streakBonus')}</label>
              <input
                type="number"
                value={settings.streakBonus}
                onChange={(e) => updateSetting('streakBonus', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-green-600">+{settings.streakBonus} {t('adminSettingsReputation', 'points')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsReputation', 'streakThreshold')}
              </label>
              <input
                type="number"
                value={settings.streakThreshold}
                onChange={(e) => updateSetting('streakThreshold', parseInt(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsReputation', 'inactivityPenalty')}
              </label>
              <input
                type="number"
                value={settings.inactivityPenalty}
                onChange={(e) => updateSetting('inactivityPenalty', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-red-600">-{settings.inactivityPenalty} {t('adminSettingsReputation', 'perMonth')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminSettingsReputation', 'inactivityThreshold')}
              </label>
              <input
                type="number"
                value={settings.inactivityThresholdDays}
                onChange={(e) => updateSetting('inactivityThresholdDays', parseInt(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? t('adminSettingsReputation', 'saving') : t('adminSettingsReputation', 'saveButton')}
        </button>
      </div>
    </div>
  );
}
