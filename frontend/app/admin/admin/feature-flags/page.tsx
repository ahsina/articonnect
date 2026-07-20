'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  adminApi,
  FeatureFlag,
  FeatureFlagType,
  FeatureFlagStatus,
  CreateFeatureFlagDto,
} from '@/lib/api/admin';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/contexts/LanguageContext';

export default function FeatureFlagsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state for create/edit
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    description: '',
    type: FeatureFlagType.BOOLEAN,
    enabled: false,
    percentage: 50,
    allowedUsers: '',
    allowedRoles: '',
    tags: '',
    owner: '',
    notes: '',
  });

  useEffect(() => {
    loadFlags();
  }, []);

  const loadFlags = async () => {
    try {
      const data = await adminApi.getFeatureFlags();
      setFlags(data);
      setError(null);
    } catch (err: any) {
      console.error('Error loading feature flags:', err);
      if (err.response?.status === 403) {
        router.push('/');
      } else {
        setError(t('adminFeatureFlags', 'errorLoad'));
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      key: '',
      name: '',
      description: '',
      type: FeatureFlagType.BOOLEAN,
      enabled: false,
      percentage: 50,
      allowedUsers: '',
      allowedRoles: '',
      tags: '',
      owner: '',
      notes: '',
    });
  };

  const handleCreateFlag = async () => {
    setActionLoading('create');
    try {
      const dto: CreateFeatureFlagDto = {
        key: formData.key,
        name: formData.name,
        description: formData.description || undefined,
        type: formData.type,
        value: {
          enabled: formData.enabled,
          ...(formData.type === FeatureFlagType.PERCENTAGE && {
            percentage: formData.percentage,
          }),
          ...(formData.type === FeatureFlagType.USER_LIST && {
            allowedUsers: formData.allowedUsers.split(',').map((s) => s.trim()).filter(Boolean),
            allowedRoles: formData.allowedRoles.split(',').map((s) => s.trim()).filter(Boolean),
          }),
        },
        metadata: {
          tags: formData.tags.split(',').map((s) => s.trim()).filter(Boolean),
          owner: formData.owner || undefined,
          notes: formData.notes || undefined,
        },
      };
      await adminApi.createFeatureFlag(dto);
      await loadFlags();
      setShowCreateModal(false);
      resetForm();
      setError(null);
    } catch (err) {
      console.error('Error creating feature flag:', err);
      setError(t('adminFeatureFlags', 'errorCreate'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggle = async (flag: FeatureFlag) => {
    setActionLoading(flag.key);
    try {
      if (flag.value.enabled) {
        await adminApi.disableFeatureFlag(flag.key);
      } else {
        await adminApi.enableFeatureFlag(flag.key);
      }
      await loadFlags();
      setError(null);
    } catch (err) {
      console.error('Error toggling feature flag:', err);
      setError(t('adminFeatureFlags', 'errorToggle').replace('{name}', flag.name));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (key: string) => {
    if (!confirm(t('adminFeatureFlags', 'confirmDelete'))) return;

    setActionLoading(key);
    try {
      await adminApi.deleteFeatureFlag(key);
      await loadFlags();
      setError(null);
    } catch (err) {
      console.error('Error deleting feature flag:', err);
      setError(t('adminFeatureFlags', 'errorDelete'));
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: FeatureFlagStatus) => {
    switch (status) {
      case FeatureFlagStatus.ACTIVE:
        return 'bg-success/10 text-success';
      case FeatureFlagStatus.INACTIVE:
        return 'bg-muted text-muted-foreground';
      case FeatureFlagStatus.ARCHIVED:
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const filteredFlags = flags.filter((flag) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && flag.value.enabled) ||
      (filter === 'inactive' && !flag.value.enabled);

    const matchesSearch =
      !searchQuery ||
      flag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flag.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flag.description?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">{t('common', 'loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-start gap-4">
            <button
              onClick={() => router.push('/admin/admin/dashboard')}
              className="mt-1 text-sm text-muted-foreground hover:text-foreground"
            >
              {t('adminFeatureFlags', 'back')}
            </button>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">{t('adminFeatureFlags', 'title')}</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {t('adminFeatureFlags', 'subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {t('adminFeatureFlags', 'newFlag')}
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('adminFeatureFlags', 'totalFlags')}</p>
            <p className="mt-2 font-display text-3xl font-bold text-foreground">{flags.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('adminFeatureFlags', 'enabled')}</p>
            <p className="mt-2 font-display text-3xl font-bold text-success">
              {flags.filter((f) => f.value.enabled).length}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('adminFeatureFlags', 'disabled')}</p>
            <p className="mt-2 font-display text-3xl font-bold text-muted-foreground">
              {flags.filter((f) => !f.value.enabled).length}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('adminFeatureFlags', 'percentageRollouts')}</p>
            <p className="mt-2 font-display text-3xl font-bold text-warning">
              {flags.filter((f) => f.type === FeatureFlagType.PERCENTAGE).length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`rounded-xl px-4 py-2 text-sm font-medium ${filter === 'all' ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-foreground hover:bg-muted'}`}
              >
                {t('adminFeatureFlags', 'filterAll')} ({flags.length})
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`rounded-xl px-4 py-2 text-sm font-medium ${filter === 'active' ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-foreground hover:bg-muted'}`}
              >
                {t('adminFeatureFlags', 'enabled')} ({flags.filter((f) => f.value.enabled).length})
              </button>
              <button
                onClick={() => setFilter('inactive')}
                className={`rounded-xl px-4 py-2 text-sm font-medium ${filter === 'inactive' ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-foreground hover:bg-muted'}`}
              >
                {t('adminFeatureFlags', 'disabled')} ({flags.filter((f) => !f.value.enabled).length})
              </button>
            </div>
            <Input
              placeholder={t('adminFeatureFlags', 'searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </div>

        {/* Flags List */}
        <div className="space-y-3">
          {filteredFlags.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center">
              <h3 className="mb-2 font-display text-lg font-semibold text-foreground">{t('adminFeatureFlags', 'noFlagsFound')}</h3>
              <p className="text-sm text-muted-foreground">{t('adminFeatureFlags', 'noFlagsHint')}</p>
            </div>
          ) : (
            filteredFlags.map((flag) => (
              <div
                key={flag.key}
                className={`rounded-2xl border bg-card p-5 ${flag.value.enabled ? 'border-success/30' : 'border-border'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground">{flag.name}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(flag.status)}`}
                      >
                        {flag.status}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {flag.type}
                      </span>
                    </div>
                    <p className="mb-2">
                      <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">{flag.key}</code>
                    </p>
                    {flag.description && (
                      <p className="text-sm text-muted-foreground">{flag.description}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {flag.type === FeatureFlagType.PERCENTAGE && (
                        <span className="rounded-full bg-blue-600/10 px-2 py-1 text-xs font-medium text-blue-600">
                          {flag.value.percentage}% {t('adminFeatureFlags', 'rollout')}
                        </span>
                      )}
                      {flag.type === FeatureFlagType.USER_LIST &&
                        flag.value.allowedUsers &&
                        flag.value.allowedUsers.length > 0 && (
                          <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                            {flag.value.allowedUsers.length} {t('adminFeatureFlags', 'usersAllowed')}
                          </span>
                        )}
                      {flag.metadata?.tags?.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {t('adminFeatureFlags', 'updated')}: {new Date(flag.updatedAt).toLocaleString('fr-FR')}
                      {flag.updatedBy && ` by ${flag.updatedBy.slice(0, 8)}...`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <Switch
                      checked={flag.value.enabled}
                      onChange={() => handleToggle(flag)}
                      disabled={actionLoading === flag.key}
                    />
                    <button
                      onClick={() => handleDelete(flag.key)}
                      disabled={actionLoading === flag.key}
                      className="text-sm font-medium text-destructive hover:text-destructive/80 disabled:opacity-50"
                    >
                      {t('adminFeatureFlags', 'delete')}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-2xl border border-border shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-border">
                <h2 className="font-display text-xl font-semibold text-foreground">{t('adminFeatureFlags', 'createTitle')}</h2>
              </div>
              <div className="p-6 space-y-4">
                <Input
                  label={t('adminFeatureFlags', 'labelKey')}
                  placeholder="my-feature-flag"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  hint={t('adminFeatureFlags', 'hintKey')}
                />
                <Input
                  label={t('adminFeatureFlags', 'labelName')}
                  placeholder="My Feature Flag"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <Textarea
                  label={t('adminFeatureFlags', 'labelDescription')}
                  placeholder={t('adminFeatureFlags', 'placeholderDescription')}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">{t('adminFeatureFlags', 'labelType')}</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as FeatureFlagType })
                    }
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value={FeatureFlagType.BOOLEAN}>{t('adminFeatureFlags', 'typeBoolean')}</option>
                    <option value={FeatureFlagType.PERCENTAGE}>{t('adminFeatureFlags', 'typePercentage')}</option>
                    <option value={FeatureFlagType.USER_LIST}>{t('adminFeatureFlags', 'typeUserList')}</option>
                    <option value={FeatureFlagType.ENVIRONMENT}>{t('adminFeatureFlags', 'typeEnvironment')}</option>
                  </select>
                </div>

                <Switch
                  label={t('adminFeatureFlags', 'initiallyEnabled')}
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                />

                {formData.type === FeatureFlagType.PERCENTAGE && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {t('adminFeatureFlags', 'rolloutPercentage')}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData.percentage}
                      onChange={(e) =>
                        setFormData({ ...formData, percentage: parseInt(e.target.value) })
                      }
                      className="w-full"
                    />
                    <span className="text-sm text-muted-foreground">{formData.percentage}%</span>
                  </div>
                )}

                {formData.type === FeatureFlagType.USER_LIST && (
                  <>
                    <Input
                      label={t('adminFeatureFlags', 'labelAllowedUsers')}
                      placeholder="user-id-1, user-id-2"
                      value={formData.allowedUsers}
                      onChange={(e) => setFormData({ ...formData, allowedUsers: e.target.value })}
                      hint={t('adminFeatureFlags', 'hintAllowedUsers')}
                    />
                    <Input
                      label={t('adminFeatureFlags', 'labelAllowedRoles')}
                      placeholder="ADMIN, ARTISAN"
                      value={formData.allowedRoles}
                      onChange={(e) => setFormData({ ...formData, allowedRoles: e.target.value })}
                      hint={t('adminFeatureFlags', 'hintAllowedRoles')}
                    />
                  </>
                )}

                <Input
                  label={t('adminFeatureFlags', 'labelTags')}
                  placeholder="beta, experimental, frontend"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  hint={t('adminFeatureFlags', 'hintTags')}
                />
                <Input
                  label={t('adminFeatureFlags', 'labelOwner')}
                  placeholder={t('adminFeatureFlags', 'placeholderOwner')}
                  value={formData.owner}
                  onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                />
                <Textarea
                  label={t('adminFeatureFlags', 'labelNotes')}
                  placeholder={t('adminFeatureFlags', 'placeholderNotes')}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <div className="p-6 border-t border-border flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  {t('adminFeatureFlags', 'cancel')}
                </button>
                <button
                  onClick={handleCreateFlag}
                  disabled={!formData.key || !formData.name || actionLoading === 'create'}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {actionLoading === 'create' ? t('adminFeatureFlags', 'creating') : t('adminFeatureFlags', 'createFlag')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
