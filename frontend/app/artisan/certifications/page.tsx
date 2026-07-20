'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { artisanApi, Certification } from '@/lib/api/artisan';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

export default function CertificationsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [newCert, setNewCert] = useState({
    name: '',
    issuer: '',
    issueDate: '',
    expiryDate: '',
  });

  useEffect(() => {
    loadCertifications();
  }, []);

  const loadCertifications = async () => {
    try {
      const data = await artisanApi.getCertifications();
      setCertifications(data);
    } catch (error) {
      console.error('Error loading certifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newCert.name || !newCert.issuer || !newCert.issueDate) {
      toast({
        title: t('common', 'error') || 'Error',
        description: t('artisan', 'fillRequired') || 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      const created = await artisanApi.addCertification({
        name: newCert.name,
        issuer: newCert.issuer,
        issueDate: newCert.issueDate,
        expiryDate: newCert.expiryDate || undefined,
      });

      // Upload optionnel du document justificatif (PDF ou image) → attaché au certif.
      // Le badge « vérifié » reste conditionné à une validation admin.
      if (certFile && created?.id) {
        await artisanApi.uploadCertificationDocument(created.id, certFile);
      }

      toast({
        title: t('common', 'success') || 'Success',
        description: t('artisan', 'certAdded') || 'Certification added',
        variant: 'success',
      });

      setShowModal(false);
      setNewCert({ name: '', issuer: '', issueDate: '', expiryDate: '' });
      setCertFile(null);
      loadCertifications();
    } catch (error) {
      console.error('Error adding certification:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('artisan', 'certError') || 'Failed to add certification',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        t('artisan', 'confirmDelete') || 'Are you sure you want to delete this certification?',
      )
    ) {
      return;
    }

    try {
      await artisanApi.deleteCertification(id);
      toast({
        title: t('common', 'success') || 'Success',
        description: t('artisan', 'certDeleted') || 'Certification deleted',
        variant: 'success',
      });
      loadCertifications();
    } catch (error) {
      console.error('Error deleting certification:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return expiry > now && expiry < monthFromNow;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">{t('common', 'loading') || 'Loading...'}</div>
      </div>
    );
  }

  const verifiedCount = certifications.filter((c) => c.verified).length;
  const expiredCount = certifications.filter((c) => isExpired(c.expiryDate)).length;
  const expiringCount = certifications.filter(
    (c) => isExpiringSoon(c.expiryDate) && !isExpired(c.expiryDate),
  ).length;

  return (
    <div className="p-6 max-w-[1180px] mx-auto">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-extrabold tracking-tight text-foreground">
            {t('artisan', 'certifications') || 'Certifications'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('artisan', 'manageCerts') || 'Manage your professional certifications'}
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {t('artisan', 'addCertification') || 'Add Certification'}
        </Button>
      </div>

      {/* KPI tiles */}
      {certifications.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-[18px]">
              <div className="text-xs font-semibold text-muted-foreground">{t('artisan', 'certifications') || 'Certifications'}</div>
              <div className="text-[28px] leading-none font-display font-extrabold tracking-tight text-foreground mt-2">{certifications.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-[18px]">
              <div className="text-xs font-semibold text-muted-foreground">{t('artisanCertifications', 'verified') || 'Verified'}</div>
              <div className="text-[28px] leading-none font-display font-extrabold tracking-tight text-foreground mt-2">{verifiedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-[18px]">
              <div className="text-xs font-semibold text-muted-foreground">{t('artisanCertifications', 'expiringSoon') || 'Expiring Soon'}</div>
              <div className="text-[28px] leading-none font-display font-extrabold tracking-tight text-foreground mt-2">{expiringCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-[18px]">
              <div className="text-xs font-semibold text-muted-foreground">{t('artisanCertifications', 'expired') || 'Expired'}</div>
              <div className="text-[28px] leading-none font-display font-extrabold tracking-tight text-foreground mt-2">{expiredCount}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Certifications List */}
      {certifications.length === 0 ? (
        <Card>
          <CardContent className="p-11 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted mx-auto mb-3 flex items-center justify-center">
              <svg className="w-6 h-6 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="9" r="5.5" />
                <path d="M8.5 13.5 7 22l5-3 5 3-1.5-8.5" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold font-display text-foreground mb-2">
              {t('artisan', 'noCertifications') || 'No Certifications'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t('artisan', 'addFirstCert') ||
                'Add your first certification to build trust with clients'}
            </p>
            <Button onClick={() => setShowModal(true)}>
              {t('artisan', 'addCertification') || 'Add Certification'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {certifications.map((cert) => (
            <Card key={cert.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="9" r="5.5" />
                        <path d="M8.5 13.5 7 22l5-3 5 3-1.5-8.5" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-foreground">{cert.name}</h4>
                        {cert.verified && (
                          <Badge className="bg-success/10 text-success">{t('artisanCertifications', 'verified') || 'Verified'}</Badge>
                        )}
                        {isExpired(cert.expiryDate) && (
                          <Badge className="bg-destructive/10 text-destructive">{t('artisanCertifications', 'expired') || 'Expired'}</Badge>
                        )}
                        {isExpiringSoon(cert.expiryDate) && !isExpired(cert.expiryDate) && (
                          <Badge className="bg-warning/15 text-warning">{t('artisanCertifications', 'expiringSoon') || 'Expiring Soon'}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{cert.issuer}</p>
                      <div className="text-xs text-muted-foreground mt-1">
                        {t('artisan', 'issued') || 'Issued'}: {formatDate(cert.issueDate)}
                        {cert.expiryDate && (
                          <span>
                            {' '}
                            • {t('artisan', 'expires') || 'Expires'}: {formatDate(cert.expiryDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(cert.id)} aria-label={t('common', 'delete') || 'Delete'}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13h10l1-13" />
                    </svg>
                  </Button>
                </div>
                {cert.document && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <a
                      href={cert.document}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {t('artisan', 'viewDocument') || 'View Document'}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Certification Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-lg font-display">{t('artisan', 'addCertification') || 'Add Certification'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('artisan', 'certName') || 'Certification Name'} *
                </label>
                <Input
                  value={newCert.name}
                  onChange={(e) => setNewCert({ ...newCert, name: e.target.value })}
                  placeholder={t('artisanCertifications', 'namePlaceholder') || 'e.g., QualiPV Electricien'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('artisan', 'issuer') || 'Issuing Organization'} *
                </label>
                <Input
                  value={newCert.issuer}
                  onChange={(e) => setNewCert({ ...newCert, issuer: e.target.value })}
                  placeholder={t('artisanCertifications', 'issuerPlaceholder') || "e.g., Qualit'EnR"}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t('artisan', 'issueDate') || 'Issue Date'} *
                  </label>
                  <Input
                    type="date"
                    value={newCert.issueDate}
                    onChange={(e) => setNewCert({ ...newCert, issueDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t('artisan', 'expiryDate') || 'Expiry Date'}
                  </label>
                  <Input
                    type="date"
                    value={newCert.expiryDate}
                    onChange={(e) => setNewCert({ ...newCert, expiryDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('artisan', 'certDocument') || 'Supporting document (PDF or image)'}
                </label>
                <Input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp,image/gif"
                  onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('artisan', 'certDocumentHint') ||
                    'Optional. An admin reviews it before the "verified" badge appears.'}
                </p>
                {certFile && (
                  <p className="text-xs text-foreground mt-1 truncate">{certFile.name}</p>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowModal(false);
                    setCertFile(null);
                  }}
                  disabled={submitting}
                >
                  {t('common', 'cancel') || 'Cancel'}
                </Button>
                <Button onClick={handleCreate} disabled={submitting}>
                  {submitting ? t('common', 'loading') || 'Loading...' : t('common', 'add') || 'Add'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
