'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, Certification } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

type FilterType = 'all' | 'pending' | 'verified';

export default function CertificationsPage() {
  const { t } = useLanguage();
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
        setError(t('adminCertifications', 'loadError'));
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
      setError(t('adminCertifications', 'verifyError'));
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
      setError(t('adminCertifications', 'unverifyError'));
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
        <div className="text-muted-foreground">{t('adminCertifications', 'loading')}</div>
      </div>
    );
  }

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
              {t('adminCertifications', 'back')}
            </button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t('adminCertifications', 'title')}</h1>
              <p className="text-muted-foreground mt-1">{t('adminCertifications', 'subtitle')}</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent"
          >
            {t('adminCertifications', 'refresh')}
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('adminCertifications', 'total')}</p>
                  <p className="text-3xl font-bold text-primary">{certifications.length}</p>
                </div>
                <span className="text-4xl">📜</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('adminCertifications', 'pendingReview')}</p>
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
                  <p className="text-sm text-muted-foreground">{t('adminCertifications', 'verified')}</p>
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
                  <p className="text-sm text-muted-foreground">{t('adminCertifications', 'expired')}</p>
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
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-accent'
                }`}
              >
                {t('adminCertifications', `filter_${f}`)}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('adminCertifications', 'searchPlaceholder')}
            className="flex-1 min-w-[300px] px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Certifications List */}
        <Card>
          <CardHeader>
            <CardTitle>{t('adminCertifications', 'listTitle')} ({filteredCertifications.length})</CardTitle>
            <CardDescription>{t('adminCertifications', 'listDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredCertifications.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-background">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t('adminCertifications', 'colCertification')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t('adminCertifications', 'colArtisan')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t('adminCertifications', 'colIssuingOrg')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t('adminCertifications', 'colDates')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t('adminCertifications', 'colStatus')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t('adminCertifications', 'colActions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {filteredCertifications.map((cert) => (
                      <tr key={cert.id} className="hover:bg-accent">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-medium text-foreground">{cert.name}</div>
                            {cert.certificateNumber && (
                              <div className="text-sm text-muted-foreground">#{cert.certificateNumber}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-medium text-foreground">
                              {cert.artisan?.firstName} {cert.artisan?.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">{cert.artisan?.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {cert.issuingOrganization}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <div className="text-foreground">
                              {t('adminCertifications', 'issued')}: {formatDate(cert.issueDate)}
                            </div>
                            {cert.expiryDate && (
                              <div
                                className={
                                  isExpired(cert.expiryDate) ? 'text-red-600' : 'text-muted-foreground'
                                }
                              >
                                {t('adminCertifications', 'expires')}: {formatDate(cert.expiryDate)}
                                {isExpired(cert.expiryDate) && ` (${t('adminCertifications', 'expiredTag')})`}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              cert.verified
                                ? 'bg-green-500/15 text-green-400'
                                : 'bg-yellow-500/15 text-yellow-400'
                            }`}
                          >
                            {cert.verified ? t('adminCertifications', 'statusVerified') : t('adminCertifications', 'statusPending')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedCert(cert)}
                              className="text-primary hover:text-primary"
                            >
                              {t('adminCertifications', 'view')}
                            </button>
                            {cert.verified ? (
                              <button
                                onClick={() => handleUnverify(cert.id)}
                                disabled={processingId === cert.id}
                                className="text-red-600 hover:text-red-400 disabled:opacity-50"
                              >
                                {t('adminCertifications', 'unverify')}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleVerify(cert.id)}
                                disabled={processingId === cert.id}
                                className="text-green-600 hover:text-green-400 disabled:opacity-50"
                              >
                                {t('adminCertifications', 'verify')}
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
              <div className="text-center py-8 text-muted-foreground">
                <span className="text-4xl block mb-2">📜</span>
                <p>{t('adminCertifications', 'noneFound')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Modal */}
        {selectedCert && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-foreground">{t('adminCertifications', 'detailsTitle')}</h2>
                  <button
                    onClick={() => setSelectedCert(null)}
                    className="text-muted-foreground hover:text-muted-foreground"
                  >
                    X
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Certification Info */}
                  <div className="border-b border-border pb-4">
                    <h3 className="font-medium text-foreground mb-3">{t('adminCertifications', 'certInfo')}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">{t('adminCertifications', 'name')}</p>
                        <p className="font-medium">{selectedCert.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('adminCertifications', 'certificateNumber')}</p>
                        <p className="font-medium">{selectedCert.certificateNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('adminCertifications', 'issuingOrg')}</p>
                        <p className="font-medium">{selectedCert.issuingOrganization}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('adminCertifications', 'status')}</p>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            selectedCert.verified
                              ? 'bg-green-500/15 text-green-400'
                              : 'bg-yellow-500/15 text-yellow-400'
                          }`}
                        >
                          {selectedCert.verified ? t('adminCertifications', 'statusVerified') : t('adminCertifications', 'statusPending')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="border-b border-border pb-4">
                    <h3 className="font-medium text-foreground mb-3">{t('adminCertifications', 'dates')}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-background rounded-lg">
                        <p className="text-sm text-muted-foreground">{t('adminCertifications', 'issueDate')}</p>
                        <p className="font-medium">{formatDate(selectedCert.issueDate)}</p>
                      </div>
                      <div
                        className={`p-4 rounded-lg ${
                          isExpired(selectedCert.expiryDate) ? 'bg-red-500/10' : 'bg-background'
                        }`}
                      >
                        <p className="text-sm text-muted-foreground">{t('adminCertifications', 'expiryDate')}</p>
                        <p
                          className={`font-medium ${
                            isExpired(selectedCert.expiryDate) ? 'text-red-600' : ''
                          }`}
                        >
                          {formatDate(selectedCert.expiryDate)}
                          {isExpired(selectedCert.expiryDate) && ` (${t('adminCertifications', 'expiredTag')})`}
                        </p>
                      </div>
                      <div className="p-4 bg-background rounded-lg">
                        <p className="text-sm text-muted-foreground">{t('adminCertifications', 'submitted')}</p>
                        <p className="font-medium">{formatDate(selectedCert.createdAt)}</p>
                      </div>
                      {selectedCert.verifiedAt && (
                        <div className="p-4 bg-green-500/10 rounded-lg">
                          <p className="text-sm text-muted-foreground">{t('adminCertifications', 'verifiedOn')}</p>
                          <p className="font-medium">{formatDate(selectedCert.verifiedAt)}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Artisan Info */}
                  <div className="border-b border-border pb-4">
                    <h3 className="font-medium text-foreground mb-3">{t('adminCertifications', 'artisan')}</h3>
                    <div className="p-4 bg-primary/10 rounded-lg">
                      <p className="font-medium text-foreground">
                        {selectedCert.artisan?.firstName} {selectedCert.artisan?.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">{selectedCert.artisan?.email}</p>
                    </div>
                  </div>

                  {/* Document */}
                  {selectedCert.documentUrl && (
                    <div className="border-b border-border pb-4">
                      <h3 className="font-medium text-foreground mb-3">{t('adminCertifications', 'document')}</h3>
                      <a
                        href={selectedCert.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-blue-200"
                      >
                        <span>📄</span>
                        {t('adminCertifications', 'viewDocument')}
                      </a>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      onClick={() => setSelectedCert(null)}
                      className="px-4 py-2 text-foreground bg-muted rounded-lg hover:bg-accent"
                    >
                      {t('adminCertifications', 'close')}
                    </button>
                    {selectedCert.verified ? (
                      <button
                        onClick={() => handleUnverify(selectedCert.id)}
                        disabled={processingId === selectedCert.id}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        {processingId === selectedCert.id ? t('adminCertifications', 'processing') : t('adminCertifications', 'unverify')}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleVerify(selectedCert.id)}
                        disabled={processingId === selectedCert.id}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {processingId === selectedCert.id
                          ? t('adminCertifications', 'processing')
                          : t('adminCertifications', 'verifyCertification')}
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
