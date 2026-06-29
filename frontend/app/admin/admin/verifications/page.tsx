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
        setError('Failed to load verification data');
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
        return 'bg-green-500/15 text-green-400';
      case 'PENDING':
        return 'bg-yellow-500/15 text-yellow-400';
      case 'FAILED':
        return 'bg-red-500/15 text-red-400';
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
    { id: 'unverified', label: 'Unverified Artisans', icon: '❓' },
    { id: 'reverification', label: 'Re-verification Needed', icon: '🔄' },
    { id: 'kycLookup', label: 'KYC Lookup', icon: '🔍' },
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
              Back
            </button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">KYC & Verification Management</h1>
              <p className="text-muted-foreground mt-1">
                Manage artisan business verification and KYC compliance
              </p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent"
          >
            Refresh
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Unverified Artisans</p>
                  <p className="text-3xl font-bold text-yellow-600">{unverifiedArtisans.length}</p>
                </div>
                <span className="text-4xl">❓</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Re-verification Needed</p>
                  <p className="text-3xl font-bold text-yellow-600">
                    {reverificationNeeded.length}
                  </p>
                </div>
                <span className="text-4xl">🔄</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Pending</p>
                  <p className="text-3xl font-bold text-red-600">
                    {unverifiedArtisans.length + reverificationNeeded.length}
                  </p>
                </div>
                <span className="text-4xl">📋</span>
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
              <CardTitle>Unverified Artisans</CardTitle>
              <CardDescription>
                Artisans who have not completed business verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              {unverifiedArtisans.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-background">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Artisan
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Business
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Registration
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Joined
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Actions
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
                                View
                              </button>
                              <button
                                onClick={() => handleReverify(artisan.id)}
                                disabled={reverifyingId === artisan.id}
                                className="text-green-600 hover:text-green-400 disabled:opacity-50"
                              >
                                {reverifyingId === artisan.id ? 'Verifying...' : 'Verify'}
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
                  <span className="text-4xl block mb-2">✅</span>
                  <p>All artisans are verified!</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'reverification' && (
          <Card>
            <CardHeader>
              <CardTitle>Re-verification Needed</CardTitle>
              <CardDescription>
                Artisans whose verification has expired or needs renewal
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reverificationNeeded.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-background">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Artisan
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Business
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Registration
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Actions
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
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-500/15 text-yellow-400">
                              NEEDS REVERIFICATION
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleViewStatus(artisan)}
                                className="text-primary hover:text-primary"
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleReverify(artisan.id)}
                                disabled={reverifyingId === artisan.id}
                                className="text-green-600 hover:text-green-400 disabled:opacity-50"
                              >
                                {reverifyingId === artisan.id ? 'Verifying...' : 'Re-verify'}
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
                  <span className="text-4xl block mb-2">✅</span>
                  <p>No artisans need re-verification</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'kycLookup' && (
          <Card>
            <CardHeader>
              <CardTitle>KYC Status Lookup</CardTitle>
              <CardDescription>Look up KYC verification status for any user</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={kycUserId}
                    onChange={(e) => setKycUserId(e.target.value)}
                    placeholder="Enter User ID"
                    className="flex-1 px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  <button
                    onClick={handleKycLookup}
                    disabled={kycLoading || !kycUserId.trim()}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    {kycLoading ? 'Loading...' : 'Lookup'}
                  </button>
                </div>
              </div>

              {kycStatus && (
                <div className="border border-border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    KYC Status for {kycStatus.userId}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-background rounded-lg">
                      <p className="text-sm text-muted-foreground">Verification Status</p>
                      <p className="font-semibold">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            kycStatus.kycVerified
                              ? 'bg-green-500/15 text-green-400'
                              : 'bg-red-500/15 text-red-400'
                          }`}
                        >
                          {kycStatus.kycVerified ? 'VERIFIED' : 'NOT VERIFIED'}
                        </span>
                      </p>
                    </div>
                    <div className="p-4 bg-background rounded-lg">
                      <p className="text-sm text-muted-foreground">KYC Level</p>
                      <p className="font-semibold text-foreground">{kycStatus.kycLevel || 'N/A'}</p>
                    </div>
                    <div className="p-4 bg-background rounded-lg">
                      <p className="text-sm text-muted-foreground">Verification Date</p>
                      <p className="font-semibold text-foreground">
                        {formatDate(kycStatus.verificationDate)}
                      </p>
                    </div>
                    <div className="p-4 bg-background rounded-lg">
                      <p className="text-sm text-muted-foreground">Documents</p>
                      <p className="font-semibold text-foreground">
                        {kycStatus.documents?.length || 0} submitted
                      </p>
                    </div>
                  </div>

                  {kycStatus.documents && kycStatus.documents.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium text-foreground mb-3">Submitted Documents</h4>
                      <div className="space-y-2">
                        {kycStatus.documents.map((doc, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-background rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">📄</span>
                              <div>
                                <p className="font-medium text-foreground">{doc.type}</p>
                                <p className="text-sm text-muted-foreground">
                                  Uploaded: {formatDate(doc.uploadedAt)}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                doc.status === 'APPROVED'
                                  ? 'bg-green-500/15 text-green-400'
                                  : doc.status === 'PENDING'
                                    ? 'bg-yellow-500/15 text-yellow-400'
                                    : 'bg-red-500/15 text-red-400'
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
                  <h2 className="text-xl font-semibold text-foreground">Verification Details</h2>
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
                    <h3 className="font-medium text-foreground mb-3">Artisan Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">
                          {selectedArtisan.firstName} {selectedArtisan.lastName}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{selectedArtisan.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Business Name</p>
                        <p className="font-medium">{selectedArtisan.businessName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Registration #</p>
                        <p className="font-medium">{selectedArtisan.registrationNumber || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Verification Status */}
                  {verificationStatus ? (
                    <div>
                      <h3 className="font-medium text-foreground mb-3">Verification Status</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-background rounded-lg">
                          <p className="text-sm text-muted-foreground">Status</p>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                              verificationStatus.status,
                            )}`}
                          >
                            {verificationStatus.status}
                          </span>
                        </div>
                        <div className="p-4 bg-background rounded-lg">
                          <p className="text-sm text-muted-foreground">Verified</p>
                          <p className="font-medium">
                            {verificationStatus.verified ? 'Yes' : 'No'}
                          </p>
                        </div>
                        <div className="p-4 bg-background rounded-lg">
                          <p className="text-sm text-muted-foreground">Verification Date</p>
                          <p className="font-medium">
                            {formatDate(verificationStatus.verificationDate)}
                          </p>
                        </div>
                        <div className="p-4 bg-background rounded-lg">
                          <p className="text-sm text-muted-foreground">Last Check</p>
                          <p className="font-medium">{formatDate(verificationStatus.lastCheck)}</p>
                        </div>
                        <div className="p-4 bg-background rounded-lg">
                          <p className="text-sm text-muted-foreground">Next Check Due</p>
                          <p className="font-medium">
                            {formatDate(verificationStatus.nextCheckDue)}
                          </p>
                        </div>
                        <div className="p-4 bg-background rounded-lg">
                          <p className="text-sm text-muted-foreground">Registration Type</p>
                          <p className="font-medium">
                            {verificationStatus.registrationType || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      Loading verification status...
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
                      Close
                    </button>
                    <button
                      onClick={() => {
                        handleReverify(selectedArtisan.id);
                        setSelectedArtisan(null);
                        setVerificationStatus(null);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Trigger Re-verification
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
