'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, UnverifiedArtisan, VerificationStatus, KycStatus } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

type TabType = 'unverified' | 'reverification' | 'kycLookup';

export default function VerificationsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('unverified');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [unverifiedArtisans, setUnverifiedArtisans] = useState<UnverifiedArtisan[]>([]);
  const [reverificationNeeded, setReverificationNeeded] = useState<UnverifiedArtisan[]>([]);
  const [selectedArtisan, setSelectedArtisan] = useState<UnverifiedArtisan | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [kycUserId, setKycUserId] = useState('');
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);
  const [kycLoading, setKycLoading] = useState(false);
  const [reverifyingId, setReverifyingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [unverified, reverify] = await Promise.all([
        adminApi.getUnverifiedArtisans(),
        adminApi.getArtisansNeedingReverification(),
      ]);
      setUnverifiedArtisans(unverified);
      setReverificationNeeded(reverify);
      setError(null);
    } catch (err: any) {
      console.error('Error loading verification data:', err);
      if (err.response?.status === 403) {
        router.push('/');
      } else {
        setError(t('adminVerifications', 'errorLoad'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewStatus = async (artisan: UnverifiedArtisan) => {
    try {
      setSelectedArtisan(artisan);
      const status = await adminApi.getArtisanVerificationStatus(artisan.id);
      setVerificationStatus(status);
    } catch (err) {
      console.error('Error loading verification status:', err);
      setVerificationStatus(null);
    }
  };

  const handleReverify = async (artisanId: string) => {
    try {
      setReverifyingId(artisanId);
      await adminApi.reverifyArtisan(artisanId);
      // Refresh data after re-verification
      await loadData();
      setReverifyingId(null);
    } catch (err) {
      console.error('Error re-verifying artisan:', err);
      setReverifyingId(null);
    }
  };

  const handleKycLookup = async () => {
    if (!kycUserId.trim()) return;
    try {
      setKycLoading(true);
      const status = await adminApi.getKycStatus(kycUserId.trim());
      setKycStatus(status);
    } catch (err) {
      console.error('Error loading KYC status:', err);
      setKycStatus(null);
    } finally {
      setKycLoading(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'VERIFIED':
        return 'bg-green-100 text-green-700';
      case 'PENDING':
        return 'bg-amber-100 text-amber-800';
      case 'FAILED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-muted text-foreground';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">{t('common', 'loading')}</div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'unverified', label: t('adminVerifications', 'tabUnverified'), icon: '' },
    { id: 'reverification', label: t('adminVerifications', 'tabReverification'), icon: '' },
    { id: 'kycLookup', label: t('adminVerifications', 'tabKycLookup'), icon: '' },
  ];

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="text-muted-foreground hover:text-foreground"
            >
              {t('adminVerifications', 'back')}
            </button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t('adminVerifications', 'title')}</h1>
              <p className="text-muted-foreground mt-1">
                {t('adminVerifications', 'subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent"
          >
            {t('adminVerifications', 'refresh')}
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('adminVerifications', 'tabUnverified')}</p>
                  <p className="text-3xl font-bold text-foreground">{unverifiedArtisans.length}</p>
                </div>
                <span className="text-4xl"></span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('adminVerifications', 'tabReverification')}</p>
                  <p className="text-3xl font-bold text-foreground">
                    {reverificationNeeded.length}
                  </p>
                </div>
                <span className="text-4xl"></span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('adminVerifications', 'totalPending')}</p>
                  <p className="text-3xl font-bold text-foreground">
                    {unverifiedArtisans.length + reverificationNeeded.length}
                  </p>
                </div>
                <span className="text-4xl"></span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="border-b border-border mb-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'unverified' && (
          <Card>
            <CardHeader>
              <CardTitle>{t('adminVerifications', 'tabUnverified')}</CardTitle>
              <CardDescription>
                {t('adminVerifications', 'unverifiedDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {unverifiedArtisans.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-background">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {t('adminVerifications', 'colArtisan')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {t('adminVerifications', 'colBusiness')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {t('adminVerifications', 'colRegistration')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {t('adminVerifications', 'colJoined')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {t('adminVerifications', 'colStatus')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {t('adminVerifications', 'colActions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {unverifiedArtisans.map((artisan) => (
                        <tr key={artisan.id} className="hover:bg-accent">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="font-medium text-foreground">
                                {artisan.firstName} {artisan.lastName}
                              </div>
                              <div className="text-sm text-muted-foreground">{artisan.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {artisan.businessName || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-foreground">
                              {artisan.registrationNumber || 'N/A'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {artisan.registrationType || ''}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {formatDate(artisan.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                artisan.verificationStatus,
                              )}`}
                            >
                              {artisan.verificationStatus || 'UNVERIFIED'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleViewStatus(artisan)}
                                className="text-primary hover:text-primary"
                              >
                                {t('adminVerifications', 'view')}
                              </button>
                              <button
                                onClick={() => handleReverify(artisan.id)}
                                disabled={reverifyingId === artisan.id}
                                className="text-green-600 hover:text-green-700 disabled:opacity-50"
                              >
                                {reverifyingId === artisan.id ? t('adminVerifications', 'verifying') : t('adminVerifications', 'verify')}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <span className="text-4xl block mb-2"></span>
                  <p>{t('adminVerifications', 'allVerified')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'reverification' && (
          <Card>
            <CardHeader>
              <CardTitle>{t('adminVerifications', 'tabReverification')}</CardTitle>
              <CardDescription>
                {t('adminVerifications', 'reverificationDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reverificationNeeded.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-background">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {t('adminVerifications', 'colArtisan')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {t('adminVerifications', 'colBusiness')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {t('adminVerifications', 'colRegistration')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {t('adminVerifications', 'colStatus')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {t('adminVerifications', 'colActions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {reverificationNeeded.map((artisan) => (
                        <tr key={artisan.id} className="hover:bg-accent">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="font-medium text-foreground">
                                {artisan.firstName} {artisan.lastName}
                              </div>
                              <div className="text-sm text-muted-foreground">{artisan.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {artisan.businessName || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-foreground">
                              {artisan.registrationNumber || 'N/A'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {artisan.registrationType || ''}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                              {t('adminVerifications', 'needsReverification')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleViewStatus(artisan)}
                                className="text-primary hover:text-primary"
                              >
                                {t('adminVerifications', 'view')}
                              </button>
                              <button
                                onClick={() => handleReverify(artisan.id)}
                                disabled={reverifyingId === artisan.id}
                                className="text-green-600 hover:text-green-700 disabled:opacity-50"
                              >
                                {reverifyingId === artisan.id ? t('adminVerifications', 'verifying') : t('adminVerifications', 'reverify')}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <span className="text-4xl block mb-2"></span>
                  <p>{t('adminVerifications', 'noReverification')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'kycLookup' && (
          <Card>
            <CardHeader>
              <CardTitle>{t('adminVerifications', 'kycStatusLookup')}</CardTitle>
              <CardDescription>{t('adminVerifications', 'kycLookupDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={kycUserId}
                    onChange={(e) => setKycUserId(e.target.value)}
                    placeholder={t('adminVerifications', 'enterUserId')}
                    className="flex-1 px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  <button
                    onClick={handleKycLookup}
                    disabled={kycLoading || !kycUserId.trim()}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    {kycLoading ? t('common', 'loading') : t('adminVerifications', 'lookup')}
                  </button>
                </div>
              </div>

              {kycStatus && (
                <div className="border border-border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    {t('adminVerifications', 'kycStatusFor')} {kycStatus.userId}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-background rounded-lg">
                      <p className="text-sm text-muted-foreground">{t('adminVerifications', 'verificationStatus')}</p>
                      <p className="font-semibold">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            kycStatus.kycVerified
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {kycStatus.kycVerified ? t('adminVerifications', 'verified') : t('adminVerifications', 'notVerified')}
                        </span>
                      </p>
                    </div>
                    <div className="p-4 bg-background rounded-lg">
                      <p className="text-sm text-muted-foreground">{t('adminVerifications', 'kycLevel')}</p>
                      <p className="font-semibold text-foreground">{kycStatus.kycLevel || 'N/A'}</p>
                    </div>
                    <div className="p-4 bg-background rounded-lg">
                      <p className="text-sm text-muted-foreground">{t('adminVerifications', 'verificationDate')}</p>
                      <p className="font-semibold text-foreground">
                        {formatDate(kycStatus.verificationDate)}
                      </p>
                    </div>
                    <div className="p-4 bg-background rounded-lg">
                      <p className="text-sm text-muted-foreground">{t('adminVerifications', 'documents')}</p>
                      <p className="font-semibold text-foreground">
                        {kycStatus.documents?.length || 0} {t('adminVerifications', 'submitted')}
                      </p>
                    </div>
                  </div>

                  {kycStatus.documents && kycStatus.documents.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium text-foreground mb-3">{t('adminVerifications', 'submittedDocuments')}</h4>
                      <div className="space-y-2">
                        {kycStatus.documents.map((doc, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-background rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl"></span>
                              <div>
                                <p className="font-medium text-foreground">{doc.type}</p>
                                <p className="text-sm text-muted-foreground">
                                  {t('adminVerifications', 'uploaded')}: {formatDate(doc.uploadedAt)}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                doc.status === 'APPROVED'
                                  ? 'bg-green-100 text-green-700'
                                  : doc.status === 'PENDING'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {doc.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Verification Status Modal */}
        {selectedArtisan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-foreground">{t('adminVerifications', 'verificationDetails')}</h2>
                  <button
                    onClick={() => {
                      setSelectedArtisan(null);
                      setVerificationStatus(null);
                    }}
                    className="text-muted-foreground hover:text-muted-foreground"
                  >
                    X
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Artisan Info */}
                  <div className="border-b border-border pb-4">
                    <h3 className="font-medium text-foreground mb-3">{t('adminVerifications', 'artisanInformation')}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">{t('adminVerifications', 'fieldName')}</p>
                        <p className="font-medium">
                          {selectedArtisan.firstName} {selectedArtisan.lastName}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('adminVerifications', 'fieldEmail')}</p>
                        <p className="font-medium">{selectedArtisan.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('adminVerifications', 'businessName')}</p>
                        <p className="font-medium">{selectedArtisan.businessName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('adminVerifications', 'registrationNumber')}</p>
                        <p className="font-medium">{selectedArtisan.registrationNumber || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Verification Status */}
                  {verificationStatus ? (
                    <div>
                      <h3 className="font-medium text-foreground mb-3">{t('adminVerifications', 'verificationStatus')}</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-background rounded-lg">
                          <p className="text-sm text-muted-foreground">{t('adminVerifications', 'colStatus')}</p>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                              verificationStatus.status,
                            )}`}
                          >
                            {verificationStatus.status}
                          </span>
                        </div>
                        <div className="p-4 bg-background rounded-lg">
                          <p className="text-sm text-muted-foreground">{t('adminVerifications', 'verifiedLabel')}</p>
                          <p className="font-medium">
                            {verificationStatus.verified ? t('adminVerifications', 'yes') : t('adminVerifications', 'no')}
                          </p>
                        </div>
                        <div className="p-4 bg-background rounded-lg">
                          <p className="text-sm text-muted-foreground">{t('adminVerifications', 'verificationDate')}</p>
                          <p className="font-medium">
                            {formatDate(verificationStatus.verificationDate)}
                          </p>
                        </div>
                        <div className="p-4 bg-background rounded-lg">
                          <p className="text-sm text-muted-foreground">{t('adminVerifications', 'lastCheck')}</p>
                          <p className="font-medium">{formatDate(verificationStatus.lastCheck)}</p>
                        </div>
                        <div className="p-4 bg-background rounded-lg">
                          <p className="text-sm text-muted-foreground">{t('adminVerifications', 'nextCheckDue')}</p>
                          <p className="font-medium">
                            {formatDate(verificationStatus.nextCheckDue)}
                          </p>
                        </div>
                        <div className="p-4 bg-background rounded-lg">
                          <p className="text-sm text-muted-foreground">{t('adminVerifications', 'registrationType')}</p>
                          <p className="font-medium">
                            {verificationStatus.registrationType || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      {t('adminVerifications', 'loadingStatus')}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <button
                      onClick={() => {
                        setSelectedArtisan(null);
                        setVerificationStatus(null);
                      }}
                      className="px-4 py-2 text-foreground bg-muted rounded-lg hover:bg-accent"
                    >
                      {t('adminVerifications', 'close')}
                    </button>
                    <button
                      onClick={() => {
                        handleReverify(selectedArtisan.id);
                        setSelectedArtisan(null);
                        setVerificationStatus(null);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      {t('adminVerifications', 'triggerReverification')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
