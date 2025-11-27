'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  companyApi,
  Company,
  CompanySettings,
  UpdateCompanySettingsDto,
  UpdateCompanyDto,
} from '@/lib/api/company';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

export default function CompanySettingsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'commission' | 'notifications'>('general');

  const [generalForm, setGeneralForm] = useState<UpdateCompanyDto>({});
  const [settingsForm, setSettingsForm] = useState<UpdateCompanySettingsDto>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const companyData = await companyApi.getMyCompany();
      setCompany(companyData);
      setGeneralForm({
        companyName: companyData.companyName,
        description: companyData.description || '',
        website: companyData.website || '',
        baseAddress: companyData.baseAddress,
        city: companyData.city,
        postalCode: companyData.postalCode,
        country: companyData.country,
        serviceRadius: companyData.serviceRadius,
      });

      if (companyData.settings) {
        setSettings(companyData.settings);
        setSettingsForm({
          defaultCommissionRate: companyData.settings.defaultCommissionRate,
          ownerCommissionRate: companyData.settings.ownerCommissionRate,
          autoAssignMissions: companyData.settings.autoAssignMissions,
          requireManagerApproval: companyData.settings.requireManagerApproval,
          allowEmployeeSelfAssignment: companyData.settings.allowEmployeeSelfAssignment,
          payoutFrequency: companyData.settings.payoutFrequency,
          minimumPayout: companyData.settings.minimumPayout,
          notifyOwnerOnNewMission: companyData.settings.notifyOwnerOnNewMission,
          notifyManagerOnNewMission: companyData.settings.notifyManagerOnNewMission,
          notifyEmployeeOnAssignment: companyData.settings.notifyEmployeeOnAssignment,
          defaultWorkingHoursStart: companyData.settings.defaultWorkingHoursStart || '',
          defaultWorkingHoursEnd: companyData.settings.defaultWorkingHoursEnd || '',
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGeneral = async () => {
    if (!company) return;
    setSaving(true);
    try {
      await companyApi.update(company.id, generalForm);
      toast({
        title: t('common', 'success') || 'Success',
        description: t('company', 'settingsSaved') || 'Settings saved successfully',
        variant: 'success',
      });
      loadData();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('company', 'settingsError') || 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!company) return;
    setSaving(true);
    try {
      await companyApi.updateSettings(company.id, settingsForm);
      toast({
        title: t('common', 'success') || 'Success',
        description: t('company', 'settingsSaved') || 'Settings saved successfully',
        variant: 'success',
      });
      loadData();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('company', 'settingsError') || 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600">{t('common', 'loading') || 'Loading...'}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('company', 'companySettings') || 'Company Settings'}
        </h1>
        <p className="text-gray-600">
          {t('company', 'manageSettings') || 'Manage your company configuration'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 font-medium ${activeTab === 'general' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
        >
          {t('company', 'general') || 'General'}
        </button>
        <button
          onClick={() => setActiveTab('commission')}
          className={`px-4 py-2 font-medium ${activeTab === 'commission' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
        >
          {t('company', 'commission') || 'Commission & Payouts'}
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 font-medium ${activeTab === 'notifications' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
        >
          {t('company', 'notifications') || 'Notifications'}
        </button>
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('company', 'generalSettings') || 'General Settings'}</CardTitle>
            <CardDescription>
              {t('company', 'generalSettingsDesc') || 'Basic company information'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('company', 'companyName') || 'Company Name'}
              </label>
              <Input
                value={generalForm.companyName || ''}
                onChange={(e) => setGeneralForm({ ...generalForm, companyName: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('company', 'description') || 'Description'}
              </label>
              <textarea
                value={generalForm.description || ''}
                onChange={(e) => setGeneralForm({ ...generalForm, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('company', 'website') || 'Website'}
              </label>
              <Input
                type="url"
                value={generalForm.website || ''}
                onChange={(e) => setGeneralForm({ ...generalForm, website: e.target.value })}
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('company', 'city') || 'City'}
                </label>
                <Input
                  value={generalForm.city || ''}
                  onChange={(e) => setGeneralForm({ ...generalForm, city: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('company', 'postalCode') || 'Postal Code'}
                </label>
                <Input
                  value={generalForm.postalCode || ''}
                  onChange={(e) => setGeneralForm({ ...generalForm, postalCode: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('company', 'serviceRadius') || 'Service Radius (km)'}
                </label>
                <Input
                  type="number"
                  value={generalForm.serviceRadius || 20}
                  onChange={(e) =>
                    setGeneralForm({ ...generalForm, serviceRadius: parseInt(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="pt-4">
              <Button onClick={handleSaveGeneral} disabled={saving}>
                {saving
                  ? t('common', 'saving') || 'Saving...'
                  : t('common', 'saveChanges') || 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Commission Settings */}
      {activeTab === 'commission' && (
        <Card>
          <CardHeader>
            <CardTitle>
              {t('company', 'commissionSettings') || 'Commission & Payout Settings'}
            </CardTitle>
            <CardDescription>
              {t('company', 'commissionSettingsDesc') ||
                'Configure employee commissions and payouts'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('company', 'defaultCommissionRate') || 'Default Commission Rate (%)'}
                </label>
                <Input
                  type="number"
                  value={settingsForm.defaultCommissionRate || 50}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      defaultCommissionRate: parseInt(e.target.value),
                    })
                  }
                  min="0"
                  max="100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('company', 'defaultCommissionDesc') || 'Applied to new employees'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('company', 'minimumPayout') || 'Minimum Payout (€)'}
                </label>
                <Input
                  type="number"
                  value={settingsForm.minimumPayout || 50}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, minimumPayout: parseInt(e.target.value) })
                  }
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('company', 'payoutFrequency') || 'Payout Frequency'}
              </label>
              <select
                value={settingsForm.payoutFrequency || 'WEEKLY'}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, payoutFrequency: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="DAILY">{t('company', 'daily') || 'Daily'}</option>
                <option value="WEEKLY">{t('company', 'weekly') || 'Weekly'}</option>
                <option value="BIWEEKLY">{t('company', 'biweekly') || 'Bi-Weekly'}</option>
                <option value="MONTHLY">{t('company', 'monthly') || 'Monthly'}</option>
              </select>
            </div>

            <div className="space-y-3 pt-4">
              <h4 className="font-medium text-gray-900">
                {t('company', 'missionAssignment') || 'Mission Assignment'}
              </h4>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settingsForm.autoAssignMissions || false}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, autoAssignMissions: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">
                  {t('company', 'autoAssign') || 'Auto-assign missions based on availability'}
                </span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settingsForm.requireManagerApproval || false}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, requireManagerApproval: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">
                  {t('company', 'requireApproval') ||
                    'Require manager approval for mission acceptance'}
                </span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settingsForm.allowEmployeeSelfAssignment || false}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      allowEmployeeSelfAssignment: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">
                  {t('company', 'selfAssignment') || 'Allow employees to claim unassigned missions'}
                </span>
              </label>
            </div>

            <div className="pt-4">
              <Button onClick={handleSaveSettings} disabled={saving}>
                {saving
                  ? t('common', 'saving') || 'Saving...'
                  : t('common', 'saveChanges') || 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notification Settings */}
      {activeTab === 'notifications' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('company', 'notificationSettings') || 'Notification Settings'}</CardTitle>
            <CardDescription>
              {t('company', 'notificationSettingsDesc') ||
                'Configure who gets notified about company events'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settingsForm.notifyOwnerOnNewMission || false}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, notifyOwnerOnNewMission: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">
                  {t('company', 'notifyOwner') || 'Notify owner on new missions'}
                </span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settingsForm.notifyManagerOnNewMission || false}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      notifyManagerOnNewMission: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">
                  {t('company', 'notifyManager') || 'Notify managers on new missions'}
                </span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settingsForm.notifyEmployeeOnAssignment || false}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      notifyEmployeeOnAssignment: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">
                  {t('company', 'notifyEmployee') || 'Notify employees when assigned to missions'}
                </span>
              </label>
            </div>

            <div className="grid md:grid-cols-2 gap-4 pt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('company', 'defaultWorkStart') || 'Default Working Hours Start'}
                </label>
                <Input
                  type="time"
                  value={settingsForm.defaultWorkingHoursStart || '09:00'}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, defaultWorkingHoursStart: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('company', 'defaultWorkEnd') || 'Default Working Hours End'}
                </label>
                <Input
                  type="time"
                  value={settingsForm.defaultWorkingHoursEnd || '18:00'}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, defaultWorkingHoursEnd: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="pt-4">
              <Button onClick={handleSaveSettings} disabled={saving}>
                {saving
                  ? t('common', 'saving') || 'Saving...'
                  : t('common', 'saveChanges') || 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
