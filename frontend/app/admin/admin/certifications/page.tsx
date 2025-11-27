'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, Certification } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

type FilterType = 'all' | 'pending' | 'verified';

export default function CertificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [selectedCert, setSelectedCert] = useState<Certification | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getCertifications();
      setCertifications(data);
      setError(null);
    } catch (err: unknown) {
      console.error('Error loading certifications:', err);
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 403) {
        router.push('/');
      } else {
        setError('Failed to load certifications');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (certId: string) => {
    try {
      setProcessingId(certId);
      await adminApi.verifyCertification(certId);
      await loadData();
      setSelectedCert(null);
    } catch (err) {
      console.error('Error verifying certification:', err);
      setError('Failed to verify certification');
    } finally {
      setProcessingId(null);
    }
  };

  const handleUnverify = async (certId: string) => {
    try {
      setProcessingId(certId);
      await adminApi.unverifyCertification(certId);
      await loadData();
      setSelectedCert(null);
    } catch (err) {
      console.error('Error unverifying certification:', err);
      setError('Failed to unverify certification');
    } finally {
      setProcessingId(null);
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

  const isExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  // Filter certifications
  const filteredCertifications = certifications.filter((cert) => {
    // Apply status filter
    if (filter === 'pending' && cert.verified) return false;
    if (filter === 'verified' && !cert.verified) return false;

    // Apply search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        cert.name.toLowerCase().includes(search) ||
        cert.issuingOrganization.toLowerCase().includes(search) ||
        cert.artisan?.firstName?.toLowerCase().includes(search) ||
        cert.artisan?.lastName?.toLowerCase().includes(search) ||
        cert.artisan?.email?.toLowerCase().includes(search)
      );
    }

    return true;
  });

  // Stats
  const pendingCount = certifications.filter((c) => !c.verified).length;
  const verifiedCount = certifications.filter((c) => c.verified).length;
  const expiredCount = certifications.filter((c) => isExpired(c.expiryDate)).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

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
              <h1 className="text-3xl font-bold text-gray-900">Certification Management</h1>
              <p className="text-gray-600 mt-1">Verify and manage artisan certifications</p>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-3xl font-bold text-blue-600">{certifications.length}</p>
                </div>
                <span className="text-4xl">📜</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Review</p>
                  <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
                </div>
                <span className="text-4xl">⏳</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Verified</p>
                  <p className="text-3xl font-bold text-green-600">{verifiedCount}</p>
                </div>
                <span className="text-4xl">✅</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Expired</p>
                  <p className="text-3xl font-bold text-red-600">{expiredCount}</p>
                </div>
                <span className="text-4xl">⚠️</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="flex gap-2">
            {(['all', 'pending', 'verified'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg capitalize ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, organization, or artisan..."
            className="flex-1 min-w-[300px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Certifications List */}
        <Card>
          <CardHeader>
            <CardTitle>Certifications ({filteredCertifications.length})</CardTitle>
            <CardDescription>Review and verify artisan professional certifications</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredCertifications.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Certification
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Artisan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Issuing Organization
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dates
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
                    {filteredCertifications.map((cert) => (
                      <tr key={cert.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-medium text-gray-900">{cert.name}</div>
                            {cert.certificateNumber && (
                              <div className="text-sm text-gray-500">#{cert.certificateNumber}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-medium text-gray-900">
                              {cert.artisan?.firstName} {cert.artisan?.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{cert.artisan?.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {cert.issuingOrganization}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <div className="text-gray-900">
                              Issued: {formatDate(cert.issueDate)}
                            </div>
                            {cert.expiryDate && (
                              <div
                                className={
                                  isExpired(cert.expiryDate) ? 'text-red-600' : 'text-gray-500'
                                }
                              >
                                Expires: {formatDate(cert.expiryDate)}
                                {isExpired(cert.expiryDate) && ' (EXPIRED)'}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              cert.verified
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {cert.verified ? 'VERIFIED' : 'PENDING'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedCert(cert)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              View
                            </button>
                            {cert.verified ? (
                              <button
                                onClick={() => handleUnverify(cert.id)}
                                disabled={processingId === cert.id}
                                className="text-red-600 hover:text-red-800 disabled:opacity-50"
                              >
                                Unverify
                              </button>
                            ) : (
                              <button
                                onClick={() => handleVerify(cert.id)}
                                disabled={processingId === cert.id}
                                className="text-green-600 hover:text-green-800 disabled:opacity-50"
                              >
                                Verify
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <span className="text-4xl block mb-2">📜</span>
                <p>No certifications found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Modal */}
        {selectedCert && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Certification Details</h2>
                  <button
                    onClick={() => setSelectedCert(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    X
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Certification Info */}
                  <div className="border-b border-gray-200 pb-4">
                    <h3 className="font-medium text-gray-900 mb-3">Certification Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Name</p>
                        <p className="font-medium">{selectedCert.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Certificate Number</p>
                        <p className="font-medium">{selectedCert.certificateNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Issuing Organization</p>
                        <p className="font-medium">{selectedCert.issuingOrganization}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            selectedCert.verified
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {selectedCert.verified ? 'VERIFIED' : 'PENDING'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="border-b border-gray-200 pb-4">
                    <h3 className="font-medium text-gray-900 mb-3">Dates</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Issue Date</p>
                        <p className="font-medium">{formatDate(selectedCert.issueDate)}</p>
                      </div>
                      <div
                        className={`p-4 rounded-lg ${
                          isExpired(selectedCert.expiryDate) ? 'bg-red-50' : 'bg-gray-50'
                        }`}
                      >
                        <p className="text-sm text-gray-600">Expiry Date</p>
                        <p
                          className={`font-medium ${
                            isExpired(selectedCert.expiryDate) ? 'text-red-600' : ''
                          }`}
                        >
                          {formatDate(selectedCert.expiryDate)}
                          {isExpired(selectedCert.expiryDate) && ' (EXPIRED)'}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Submitted</p>
                        <p className="font-medium">{formatDate(selectedCert.createdAt)}</p>
                      </div>
                      {selectedCert.verifiedAt && (
                        <div className="p-4 bg-green-50 rounded-lg">
                          <p className="text-sm text-gray-600">Verified On</p>
                          <p className="font-medium">{formatDate(selectedCert.verifiedAt)}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Artisan Info */}
                  <div className="border-b border-gray-200 pb-4">
                    <h3 className="font-medium text-gray-900 mb-3">Artisan</h3>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="font-medium text-gray-900">
                        {selectedCert.artisan?.firstName} {selectedCert.artisan?.lastName}
                      </p>
                      <p className="text-sm text-gray-600">{selectedCert.artisan?.email}</p>
                    </div>
                  </div>

                  {/* Document */}
                  {selectedCert.documentUrl && (
                    <div className="border-b border-gray-200 pb-4">
                      <h3 className="font-medium text-gray-900 mb-3">Document</h3>
                      <a
                        href={selectedCert.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                      >
                        <span>📄</span>
                        View Document
                      </a>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      onClick={() => setSelectedCert(null)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      Close
                    </button>
                    {selectedCert.verified ? (
                      <button
                        onClick={() => handleUnverify(selectedCert.id)}
                        disabled={processingId === selectedCert.id}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        {processingId === selectedCert.id ? 'Processing...' : 'Unverify'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleVerify(selectedCert.id)}
                        disabled={processingId === selectedCert.id}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {processingId === selectedCert.id
                          ? 'Processing...'
                          : 'Verify Certification'}
                      </button>
                    )}
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
