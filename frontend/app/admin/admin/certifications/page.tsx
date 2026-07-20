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
    <div className="bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/admin/dashboard')}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {t('adminCertifications', 'back')}
            </button>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">{t('adminCertifications', 'title')}</h1>
              <p className="text-sm text-muted-foreground mt-1">{t('adminCertifications', 'subtitle')}</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="border border-border bg-card text-foreground rounded-xl px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            {t('adminCertifications', 'refresh')}
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('adminCertifications', 'total')}</p>
            <p className="font-display text-3xl font-bold text-foreground mt-2">{certifications.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('adminCertifications', 'pendingReview')}</p>
            <p className="font-display text-3xl font-bold text-warning mt-2">{pendingCount}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('adminCertifications', 'verified')}</p>
            <p className="font-display text-3xl font-bold text-success mt-2">{verifiedCount}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('adminCertifications', 'expired')}</p>
            <p className="font-display text-3xl font-bold text-destructive mt-2">{expiredCount}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-border bg-card p-5 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex gap-2">
              {(['all', 'pending', 'verified'] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize ${
                    filter === f
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-card text-foreground hover:bg-muted'
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
              className="flex-1 min-w-[280px] h-10 px-4 border border-border rounded-xl bg-card text-sm text-foreground focus:outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10"
            />
          </div>
        </div>

        {/* Certifications List */}
        <Card className="rounded-2xl border border-border bg-card overflow-hidden">
          <CardHeader className="border-b border-border">
            <CardTitle className="font-display">{t('adminCertifications', 'listTitle')} ({filteredCertifications.length})</CardTitle>
            <CardDescription>{t('adminCertifications', 'listDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {filteredCertifications.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-muted">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {t('adminCertifications', 'colCertification')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {t('adminCertifications', 'colArtisan')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {t('adminCertifications', 'colIssuingOrg')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {t('adminCertifications', 'colDates')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {t('adminCertifications', 'colStatus')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {t('adminCertifications', 'colActions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCertifications.map((cert) => (
                      <tr key={cert.id} className="hover:bg-muted/50">
                        <td className="px-6 py-4 whitespace-nowrap border-b border-border">
                          <div>
                            <div className="font-semibold text-foreground">{cert.name}</div>
                            {cert.certificateNumber && (
                              <div className="text-xs text-muted-foreground">#{cert.certificateNumber}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap border-b border-border">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                              {(cert.artisan?.firstName?.[0] || '') + (cert.artisan?.lastName?.[0] || '') || '?'}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">
                                {cert.artisan?.firstName} {cert.artisan?.lastName}
                              </div>
                              <div className="text-xs text-muted-foreground">{cert.artisan?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground border-b border-border">
                          {cert.issuingOrganization}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap border-b border-border">
                          <div className="text-sm">
                            <div className="text-foreground">
                              {t('adminCertifications', 'issued')}: {formatDate(cert.issueDate)}
                            </div>
                            {cert.expiryDate && (
                              <div
                                className={
                                  isExpired(cert.expiryDate) ? 'text-destructive' : 'text-muted-foreground'
                                }
                              >
                                {t('adminCertifications', 'expires')}: {formatDate(cert.expiryDate)}
                                {isExpired(cert.expiryDate) && ` (${t('adminCertifications', 'expiredTag')})`}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap border-b border-border">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              cert.verified
                                ? 'bg-success/10 text-success'
                                : 'bg-warning/10 text-warning'
                            }`}
                          >
                            {cert.verified ? t('adminCertifications', 'statusVerified') : t('adminCertifications', 'statusPending')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm border-b border-border">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedCert(cert)}
                              className="border border-border bg-card text-foreground rounded-xl px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                            >
                              {t('adminCertifications', 'view')}
                            </button>
                            {cert.verified ? (
                              <button
                                onClick={() => handleUnverify(cert.id)}
                                disabled={processingId === cert.id}
                                className="text-destructive border border-destructive/30 rounded-xl px-3 py-1.5 text-xs font-semibold hover:bg-destructive/10 disabled:opacity-50"
                              >
                                {t('adminCertifications', 'unverify')}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleVerify(cert.id)}
                                disabled={processingId === cert.id}
                                className="bg-primary text-primary-foreground rounded-xl px-3 py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-50"
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
              <div className="text-center py-12 text-muted-foreground">
                <p>{t('adminCertifications', 'noneFound')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Modal */}
        {selectedCert && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-2xl border border-border shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="font-display text-lg font-bold text-foreground">{t('adminCertifications', 'detailsTitle')}</h2>
                <button
                  onClick={() => setSelectedCert(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  X
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Certification Info */}
                <div className="border-b border-border pb-4">
                  <h3 className="font-display font-semibold text-foreground mb-3">{t('adminCertifications', 'certInfo')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('adminCertifications', 'name')}</p>
                      <p className="font-semibold text-foreground mt-1">{selectedCert.name}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('adminCertifications', 'certificateNumber')}</p>
                      <p className="font-semibold text-foreground mt-1">{selectedCert.certificateNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('adminCertifications', 'issuingOrg')}</p>
                      <p className="font-semibold text-foreground mt-1">{selectedCert.issuingOrganization}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('adminCertifications', 'status')}</p>
                      <span
                        className={`inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          selectedCert.verified
                            ? 'bg-success/10 text-success'
                            : 'bg-warning/10 text-warning'
                        }`}
                      >
                        {selectedCert.verified ? t('adminCertifications', 'statusVerified') : t('adminCertifications', 'statusPending')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="border-b border-border pb-4">
                  <h3 className="font-display font-semibold text-foreground mb-3">{t('adminCertifications', 'dates')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-border bg-muted">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('adminCertifications', 'issueDate')}</p>
                      <p className="font-semibold text-foreground mt-1">{formatDate(selectedCert.issueDate)}</p>
                    </div>
                    <div
                      className={`p-4 rounded-xl border ${
                        isExpired(selectedCert.expiryDate)
                          ? 'border-destructive/30 bg-destructive/10'
                          : 'border-border bg-muted'
                      }`}
                    >
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('adminCertifications', 'expiryDate')}</p>
                      <p
                        className={`font-semibold mt-1 ${
                          isExpired(selectedCert.expiryDate) ? 'text-destructive' : 'text-foreground'
                        }`}
                      >
                        {formatDate(selectedCert.expiryDate)}
                        {isExpired(selectedCert.expiryDate) && ` (${t('adminCertifications', 'expiredTag')})`}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl border border-border bg-muted">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('adminCertifications', 'submitted')}</p>
                      <p className="font-semibold text-foreground mt-1">{formatDate(selectedCert.createdAt)}</p>
                    </div>
                    {selectedCert.verifiedAt && (
                      <div className="p-4 rounded-xl border border-success/30 bg-success/10">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('adminCertifications', 'verifiedOn')}</p>
                        <p className="font-semibold text-foreground mt-1">{formatDate(selectedCert.verifiedAt)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Artisan Info */}
                <div className="border-b border-border pb-4">
                  <h3 className="font-display font-semibold text-foreground mb-3">{t('adminCertifications', 'artisan')}</h3>
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-muted">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                      {(selectedCert.artisan?.firstName?.[0] || '') + (selectedCert.artisan?.lastName?.[0] || '') || '?'}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {selectedCert.artisan?.firstName} {selectedCert.artisan?.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">{selectedCert.artisan?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Document */}
                {selectedCert.documentUrl && (
                  <div className="border-b border-border pb-4">
                    <h3 className="font-display font-semibold text-foreground mb-3">{t('adminCertifications', 'document')}</h3>
                    <a
                      href={selectedCert.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-card text-foreground rounded-xl text-sm font-semibold hover:bg-muted"
                    >
                      {t('adminCertifications', 'viewDocument')}
                    </a>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setSelectedCert(null)}
                    className="px-4 py-2 border border-border bg-card text-foreground rounded-xl text-sm font-semibold hover:bg-muted"
                  >
                    {t('adminCertifications', 'close')}
                  </button>
                  {selectedCert.verified ? (
                    <button
                      onClick={() => handleUnverify(selectedCert.id)}
                      disabled={processingId === selectedCert.id}
                      className="px-4 py-2 text-destructive border border-destructive/30 rounded-xl text-sm font-semibold hover:bg-destructive/10 disabled:opacity-50"
                    >
                      {processingId === selectedCert.id ? t('adminCertifications', 'processing') : t('adminCertifications', 'unverify')}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleVerify(selectedCert.id)}
                      disabled={processingId === selectedCert.id}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50"
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
        )}
      </div>
    </div>
  );
}
