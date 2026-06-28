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
      await artisanApi.addCertification({
        name: newCert.name,
        issuer: newCert.issuer,
        issueDate: newCert.issueDate,
        expiryDate: newCert.expiryDate || undefined,
      });

      toast({
        title: t('common', 'success') || 'Success',
        description: t('artisan', 'certAdded') || 'Certification added',
        variant: 'success',
      });

      setShowModal(false);
      setNewCert({ name: '', issuer: '', issueDate: '', expiryDate: '' });
      loadCertifications();
    } catch (error) {
      console.error('Error adding certification:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('artisan', 'certError') || 'Failed to add certification',
        variant: 'destructive',
      });
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

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('artisan', 'certifications') || 'Certifications'}
          </h1>
          <p className="text-muted-foreground">
            {t('artisan', 'manageCerts') || 'Manage your professional certifications'}
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          + {t('artisan', 'addCertification') || 'Add Certification'}
        </Button>
      </div>

      {/* Certifications List */}
      {certifications.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-5xl mb-4">📜</div>
            <h3 className="text-lg font-medium text-foreground mb-2">
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
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-2xl">
                      📜
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-foreground">{cert.name}</h4>
                        {cert.verified && (
                          <Badge className="bg-green-500/15 text-green-400">✓ Verified</Badge>
                        )}
                        {isExpired(cert.expiryDate) && (
                          <Badge className="bg-red-500/15 text-red-400">Expired</Badge>
                        )}
                        {isExpiringSoon(cert.expiryDate) && !isExpired(cert.expiryDate) && (
                          <Badge className="bg-yellow-500/15 text-yellow-400">Expiring Soon</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{cert.issuer}</p>
                      <div className="text-sm text-muted-foreground mt-1">
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
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(cert.id)}>
                    🗑️
                  </Button>
                </div>
                {cert.document && (
                  <div className="mt-3 pt-3 border-t">
                    <a
                      href={cert.document}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      📄 {t('artisan', 'viewDocument') || 'View Document'}
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
              <CardTitle>{t('artisan', 'addCertification') || 'Add Certification'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('artisan', 'certName') || 'Certification Name'} *
                </label>
                <Input
                  value={newCert.name}
                  onChange={(e) => setNewCert({ ...newCert, name: e.target.value })}
                  placeholder="e.g., QualiPV Electricien"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('artisan', 'issuer') || 'Issuing Organization'} *
                </label>
                <Input
                  value={newCert.issuer}
                  onChange={(e) => setNewCert({ ...newCert, issuer: e.target.value })}
                  placeholder="e.g., Qualit'EnR"
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

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setShowModal(false)}>
                  {t('common', 'cancel') || 'Cancel'}
                </Button>
                <Button onClick={handleCreate}>{t('common', 'add') || 'Add'}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
