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
        return 'bg-green-100 text-green-700';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700';
      case 'FAILED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
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
        <div className="text-gray-500">{t('common', 'loading')}</div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'unverified', label: 'Unverified Artisans', icon: '❓' },
    { id: 'reverification', label: 'Re-verification Needed', icon: '🔄' },
    { id: 'kycLookup', label: 'KYC Lookup', icon: '🔍' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              Back
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">KYC & Verification Management</h1>
              <p className="text-gray-600 mt-1">
                Manage artisan business verification and KYC compliance
              </p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Refresh
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Unverified Artisans</p>
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
                  <p className="text-sm text-gray-600">Re-verification Needed</p>
                  <p className="text-3xl font-bold text-orange-600">
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
                  <p className="text-sm text-gray-600">Total Pending</p>
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
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Artisan
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Business
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Registration
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Joined
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {unverifiedArtisans.map((artisan) => (
                        <tr key={artisan.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="font-medium text-gray-900">
                                {artisan.firstName} {artisan.lastName}
                              </div>
                              <div className="text-sm text-gray-500">{artisan.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {artisan.businessName || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {artisan.registrationNumber || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {artisan.registrationType || ''}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
                                className="text-blue-600 hover:text-blue-800"
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleReverify(artisan.id)}
                                disabled={reverifyingId === artisan.id}
                                className="text-green-600 hover:text-green-800 disabled:opacity-50"
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
                <div className="text-center py-8 text-gray-500">
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
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Artisan
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Business
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Registration
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reverificationNeeded.map((artisan) => (
                        <tr key={artisan.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="font-medium text-gray-900">
                                {artisan.firstName} {artisan.lastName}
                              </div>
                              <div className="text-sm text-gray-500">{artisan.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {artisan.businessName || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {artisan.registrationNumber || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {artisan.registrationType || ''}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                              NEEDS REVERIFICATION
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleViewStatus(artisan)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleReverify(artisan.id)}
                                disabled={reverifyingId === artisan.id}
                                className="text-green-600 hover:text-green-800 disabled:opacity-50"
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
                <div className="text-center py-8 text-gray-500">
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
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleKycLookup}
                    disabled={kycLoading || !kycUserId.trim()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {kycLoading ? 'Loading...' : 'Lookup'}
                  </button>
                </div>
              </div>

              {kycStatus && (
                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    KYC Status for {kycStatus.userId}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Verification Status</p>
                      <p className="font-semibold">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            kycStatus.kycVerified
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {kycStatus.kycVerified ? 'VERIFIED' : 'NOT VERIFIED'}
                        </span>
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">KYC Level</p>
                      <p className="font-semibold text-gray-900">{kycStatus.kycLevel || 'N/A'}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Verification Date</p>
                      <p className="font-semibold text-gray-900">
                        {formatDate(kycStatus.verificationDate)}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Documents</p>
                      <p className="font-semibold text-gray-900">
                        {kycStatus.documents?.length || 0} submitted
                      </p>
                    </div>
                  </div>

                  {kycStatus.documents && kycStatus.documents.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium text-gray-900 mb-3">Submitted Documents</h4>
                      <div className="space-y-2">
                        {kycStatus.documents.map((doc, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">📄</span>
                              <div>
                                <p className="font-medium text-gray-900">{doc.type}</p>
                                <p className="text-sm text-gray-500">
                                  Uploaded: {formatDate(doc.uploadedAt)}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                doc.status === 'APPROVED'
                                  ? 'bg-green-100 text-green-700'
                                  : doc.status === 'PENDING'
                                    ? 'bg-yellow-100 text-yellow-700'
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
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Verification Details</h2>
                  <button
                    onClick={() => {
                      setSelectedArtisan(null);
                      setVerificationStatus(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    X
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Artisan Info */}
                  <div className="border-b border-gray-200 pb-4">
                    <h3 className="font-medium text-gray-900 mb-3">Artisan Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Name</p>
                        <p className="font-medium">
                          {selectedArtisan.firstName} {selectedArtisan.lastName}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium">{selectedArtisan.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Business Name</p>
                        <p className="font-medium">{selectedArtisan.businessName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Registration #</p>
                        <p className="font-medium">{selectedArtisan.registrationNumber || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Verification Status */}
                  {verificationStatus ? (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">Verification Status</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">Status</p>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                              verificationStatus.status,
                            )}`}
                          >
                            {verificationStatus.status}
                          </span>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">Verified</p>
                          <p className="font-medium">
                            {verificationStatus.verified ? 'Yes' : 'No'}
                          </p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">Verification Date</p>
                          <p className="font-medium">
                            {formatDate(verificationStatus.verificationDate)}
                          </p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">Last Check</p>
                          <p className="font-medium">{formatDate(verificationStatus.lastCheck)}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">Next Check Due</p>
                          <p className="font-medium">
                            {formatDate(verificationStatus.nextCheckDue)}
                          </p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">Registration Type</p>
                          <p className="font-medium">
                            {verificationStatus.registrationType || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      Loading verification status...
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setSelectedArtisan(null);
                        setVerificationStatus(null);
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
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
