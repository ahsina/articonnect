'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import apiClient from '@/lib/api/client';
import { userApi } from '@/lib/api/user';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

interface ClientProfile {
  clientType: 'INDIVIDUAL' | 'PROFESSIONAL';
  companyName?: string;
  siret?: string;
  vatNumber?: string;
  industry?: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  missionId?: string;
  mission?: {
    title: string;
    purchaseOrderNumber?: string;
    internalReference?: string;
    billingCompanyName?: string;
    billingVatNumber?: string;
    artisan?: {
      firstName: string;
      lastName: string;
    };
  };
  orderId?: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  dueDate: string;
  paidAt?: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-muted text-foreground',
  PENDING: 'bg-amber-100 text-amber-800',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-muted text-foreground',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  PENDING: 'En attente',
  PAID: 'Payée',
  OVERDUE: 'En retard',
  CANCELLED: 'Annulée',
};

type StatusFilter = 'all' | 'PENDING' | 'PAID' | 'OVERDUE';

export default function ClientInvoicesPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [invoicesResponse, profileData] = await Promise.all([
        apiClient.get('/invoices'),
        userApi.getClientProfile().catch(() => null),
      ]);
      // Le back renvoie { invoices: [...], total, ... } — on extrait le tableau.
      const inv = invoicesResponse.data?.invoices ?? invoicesResponse.data?.data ?? invoicesResponse.data;
      setInvoices(Array.isArray(inv) ? inv : []);
      setClientProfile(profileData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const isProfessional = clientProfile?.clientType === 'PROFESSIONAL';

  const handleDownloadPDF = async (invoiceId: string) => {
    setDownloading(invoiceId);
    try {
      const response = await apiClient.get(`/invoices/${invoiceId}/pdf`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `facture-${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: t('common', 'success'),
        description: t('invoices', 'downloaded'),
      });
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast({
        title: t('common', 'error'),
        description: t('invoices', 'downloadError'),
        variant: 'destructive',
      });
    } finally {
      setDownloading(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const filteredInvoices =
    filter === 'all' ? invoices : invoices.filter((inv) => inv.status === filter);

  const totalPending = invoices
    .filter((inv) => inv.status === 'PENDING' || inv.status === 'OVERDUE')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const totalPaid = invoices
    .filter((inv) => inv.status === 'PAID')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">{t('common', 'loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          {t('common', 'back')}
        </Button>

        <div className="mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">{t('invoices', 'title')}</h1>
            {isProfessional && (
              <Badge variant="default" className="bg-primary">
                {t('client', 'professional') || 'Professionnel'}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">{t('invoices', 'subtitle')}</p>
          {isProfessional && clientProfile?.companyName && (
            <div className="mt-2 p-3 bg-primary/10 rounded-lg">
              <p className="font-semibold text-primary">{clientProfile.companyName}</p>
              <div className="text-sm text-primary flex flex-wrap gap-3">
                {clientProfile.siret && <span>SIRET: {clientProfile.siret}</span>}
                {clientProfile.vatNumber && <span>TVA: {clientProfile.vatNumber}</span>}
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">{t('invoices', 'total')}</div>
              <div className="text-2xl font-bold">{invoices.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">{t('invoices', 'pendingAmount')}</div>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(totalPending)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">{t('invoices', 'paidAmount')}</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalPaid)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">{t('invoices', 'overdue')}</div>
              <div className="text-2xl font-bold text-red-600">
                {invoices.filter((inv) => inv.status === 'OVERDUE').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(['all', 'PENDING', 'PAID', 'OVERDUE'] as StatusFilter[]).map((status) => (
            <Button
              key={status}
              variant={filter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(status)}
            >
              {status === 'all' ? t('common', 'all') : STATUS_LABELS[status]}
            </Button>
          ))}
        </div>

        {/* Invoices List */}
        {filteredInvoices.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4"></div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {t('invoices', 'noInvoices')}
              </h3>
              <p className="text-muted-foreground">{t('invoices', 'noInvoicesDesc')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredInvoices.map((invoice) => (
              <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {invoice.invoiceNumber}
                        </h3>
                        <Badge className={STATUS_COLORS[invoice.status]}>
                          {STATUS_LABELS[invoice.status]}
                        </Badge>
                      </div>

                      {invoice.mission && (
                        <div className="mb-2">
                          <p className="text-muted-foreground">
                            Mission: {invoice.mission.title}
                            {invoice.mission.artisan && (
                              <span className="text-muted-foreground">
                                {' '}
                                - {invoice.mission.artisan.firstName}{' '}
                                {invoice.mission.artisan.lastName}
                              </span>
                            )}
                          </p>

                          {/* B2B Info */}
                          {(invoice.mission.purchaseOrderNumber ||
                            invoice.mission.internalReference) && (
                            <div className="flex flex-wrap gap-3 text-sm mt-1">
                              {invoice.mission.purchaseOrderNumber && (
                                <span className="text-primary">
                                  BC: {invoice.mission.purchaseOrderNumber}
                                </span>
                              )}
                              {invoice.mission.internalReference && (
                                <span className="text-primary">
                                  Réf: {invoice.mission.internalReference}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Billing Company Info (if different) */}
                          {invoice.mission.billingCompanyName && (
                            <div className="text-sm text-muted-foreground mt-1">
                              Facturation: {invoice.mission.billingCompanyName}
                              {invoice.mission.billingVatNumber && (
                                <span> (TVA: {invoice.mission.billingVatNumber})</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                        <span>Émise le {formatDate(invoice.createdAt)}</span>
                        <span>•</span>
                        <span>Échéance: {formatDate(invoice.dueDate)}</span>
                        {invoice.paidAt && (
                          <>
                            <span>•</span>
                            <span className="text-green-600">
                              Payée le {formatDate(invoice.paidAt)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold text-foreground">
                        {formatCurrency(invoice.totalAmount)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        HT: {formatCurrency(invoice.subtotal)} | TVA:{' '}
                        {formatCurrency(invoice.taxAmount)}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPDF(invoice.id)}
                      disabled={downloading === invoice.id}
                    >
                      {downloading === invoice.id ? (
                        t('common', 'downloading')
                      ) : (
                        <>{t('invoices', 'downloadPDF')}</>
                      )}
                    </Button>

                    {(invoice.status === 'PENDING' || invoice.status === 'OVERDUE') && invoice.missionId ? (
                      <Button
                        size="sm"
                        onClick={() => router.push(`/client/payment/${invoice.missionId}`)}
                      >
                        {t('invoices', 'payNow')}
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
