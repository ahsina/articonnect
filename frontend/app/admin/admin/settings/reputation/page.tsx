'use client';

import { useState, useEffect } from 'react';
import { adminApi, ReputationRules } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

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
      setSuccess('Reputation rules saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving reputation rules:', err);
      setError('Failed to save reputation rules');
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
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-4 font-medium">
            Dismiss
          </button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
          {success}
        </div>
      )}

      {/* Score Bounds */}
      <Card>
        <CardHeader>
          <CardTitle>Score Configuration</CardTitle>
          <CardDescription>Configure reputation score bounds</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Initial Score</label>
              <input
                type="number"
                value={settings.initialScore}
                onChange={(e) => updateSetting('initialScore', parseInt(e.target.value))}
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">Starting score for new users</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Minimum Score</label>
              <input
                type="number"
                value={settings.minScore}
                onChange={(e) => updateSetting('minScore', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Maximum Score</label>
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
          <CardTitle>Level Thresholds</CardTitle>
          <CardDescription>Configure score thresholds for each level</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <label className="block text-sm font-medium text-yellow-400 mb-1">Gold</label>
              <input
                type="number"
                value={settings.goldThreshold}
                onChange={(e) => updateSetting('goldThreshold', parseInt(e.target.value))}
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-yellow-500/30 rounded-lg focus:ring-2 focus:ring-yellow-500"
              />
              <p className="mt-1 text-xs text-yellow-600">Score &gt;= {settings.goldThreshold}</p>
            </div>
            <div className="p-4 bg-background rounded-lg border border-border">
              <label className="block text-sm font-medium text-foreground mb-1">Silver</label>
              <input
                type="number"
                value={settings.silverThreshold}
                onChange={(e) => updateSetting('silverThreshold', parseInt(e.target.value))}
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-gray-500"
              />
              <p className="mt-1 text-xs text-muted-foreground">Score &gt;= {settings.silverThreshold}</p>
            </div>
            <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <label className="block text-sm font-medium text-yellow-400 mb-1">Bronze</label>
              <input
                type="number"
                value={settings.bronzeThreshold}
                onChange={(e) => updateSetting('bronzeThreshold', parseInt(e.target.value))}
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-yellow-500/30 rounded-lg focus:ring-2 focus:ring-yellow-500"
              />
              <p className="mt-1 text-xs text-yellow-600">Score &gt;= {settings.bronzeThreshold}</p>
            </div>
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <label className="block text-sm font-medium text-green-400 mb-1">Trusted</label>
              <input
                type="number"
                value={settings.trustedThreshold}
                onChange={(e) => updateSetting('trustedThreshold', parseInt(e.target.value))}
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-green-500/30 rounded-lg focus:ring-2 focus:ring-green-500"
              />
              <p className="mt-1 text-xs text-green-600">Score &gt;= {settings.trustedThreshold}</p>
            </div>
            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              <label className="block text-sm font-medium text-red-400 mb-1">Warning</label>
              <input
                type="number"
                value={settings.warningThreshold}
                onChange={(e) => updateSetting('warningThreshold', parseInt(e.target.value))}
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-red-500/30 rounded-lg focus:ring-2 focus:ring-red-500"
              />
              <p className="mt-1 text-xs text-red-600">Score &lt; {settings.warningThreshold}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mission Bonuses */}
      <Card>
        <CardHeader>
          <CardTitle>Mission Bonuses</CardTitle>
          <CardDescription>Points earned for mission-related actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Completed Mission Bonus
              </label>
              <input
                type="number"
                value={settings.completedMissionBonus}
                onChange={(e) => updateSetting('completedMissionBonus', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-green-600">
                +{settings.completedMissionBonus} points
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Response Time Bonus
              </label>
              <input
                type="number"
                value={settings.responseTimeBonus}
                onChange={(e) => updateSetting('responseTimeBonus', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-green-600">
                +{settings.responseTimeBonus} for fast response
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Verification Bonus
              </label>
              <input
                type="number"
                value={settings.verificationBonus}
                onChange={(e) => updateSetting('verificationBonus', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-green-600">
                +{settings.verificationBonus} one-time bonus
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review Score Changes */}
      <Card>
        <CardHeader>
          <CardTitle>Review Score Changes</CardTitle>
          <CardDescription>Points gained or lost based on review ratings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="p-4 bg-green-500/10 rounded-lg">
              <label className="block text-sm font-medium text-foreground mb-1">5 Stars</label>
              <input
                type="number"
                value={settings.fiveStarReviewBonus}
                onChange={(e) => updateSetting('fiveStarReviewBonus', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-green-600">+{settings.fiveStarReviewBonus}</p>
            </div>
            <div className="p-4 bg-green-500/10 rounded-lg">
              <label className="block text-sm font-medium text-foreground mb-1">4 Stars</label>
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
              <label className="block text-sm font-medium text-foreground mb-1">3 Stars</label>
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
            <div className="p-4 bg-red-500/10 rounded-lg">
              <label className="block text-sm font-medium text-foreground mb-1">2 Stars</label>
              <input
                type="number"
                value={settings.twoStarReviewPenalty}
                onChange={(e) => updateSetting('twoStarReviewPenalty', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-red-600">-{settings.twoStarReviewPenalty}</p>
            </div>
            <div className="p-4 bg-red-500/10 rounded-lg">
              <label className="block text-sm font-medium text-foreground mb-1">1 Star</label>
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
          <CardTitle>Penalties</CardTitle>
          <CardDescription>Points deducted for negative actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                No-Show Penalty
              </label>
              <input
                type="number"
                value={settings.noShowPenalty}
                onChange={(e) => updateSetting('noShowPenalty', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-red-600">-{settings.noShowPenalty} points</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Cancellation Penalty
              </label>
              <input
                type="number"
                value={settings.cancellationPenalty}
                onChange={(e) => updateSetting('cancellationPenalty', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-red-600">-{settings.cancellationPenalty} points</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Late Cancellation Penalty
              </label>
              <input
                type="number"
                value={settings.lateCancellationPenalty}
                onChange={(e) => updateSetting('lateCancellationPenalty', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-red-600">
                -{settings.lateCancellationPenalty} points
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dispute Effects */}
      <Card>
        <CardHeader>
          <CardTitle>Dispute Effects</CardTitle>
          <CardDescription>Points changed based on dispute outcomes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Dispute Loss Penalty
              </label>
              <input
                type="number"
                value={settings.disputeLossPenalty}
                onChange={(e) => updateSetting('disputeLossPenalty', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-red-600">-{settings.disputeLossPenalty} points</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Dispute Win Bonus
              </label>
              <input
                type="number"
                value={settings.disputeWinBonus}
                onChange={(e) => updateSetting('disputeWinBonus', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-green-600">+{settings.disputeWinBonus} points</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Streak & Inactivity */}
      <Card>
        <CardHeader>
          <CardTitle>Streak &amp; Inactivity</CardTitle>
          <CardDescription>Bonuses for consistency, penalties for inactivity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Streak Bonus</label>
              <input
                type="number"
                value={settings.streakBonus}
                onChange={(e) => updateSetting('streakBonus', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-green-600">+{settings.streakBonus} points</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Streak Threshold (missions)
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
                Inactivity Penalty (/month)
              </label>
              <input
                type="number"
                value={settings.inactivityPenalty}
                onChange={(e) => updateSetting('inactivityPenalty', parseInt(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-red-600">-{settings.inactivityPenalty} per month</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Inactivity Threshold (days)
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
          {saving ? 'Saving...' : 'Save Reputation Rules'}
        </button>
      </div>
    </div>
  );
}
