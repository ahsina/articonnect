'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { artisanApi } from '@/lib/api/artisan';
import { useLanguage } from '@/contexts/LanguageContext';

interface Quotation {
  id: string;
  missionId: string;
  amount: number;
  description: string;
  validUntil: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  mission?: {
    id: string;
    title: string;
    client: {
      firstName: string;
      lastName: string;
    };
  };
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-100 text-gray-800',
};

export default function QuotationsPage() {
  const { t } = useLanguage();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'ACCEPTED'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadQuotations();
  }, [filter, page]);

  const loadQuotations = async () => {
    try {
      const params: any = { page, limit: 20 };
      if (filter !== 'all') params.status = filter;

      const response = await artisanApi.getQuotations(params);
      setQuotations(response.data || []);
      setTotalPages(response.meta?.totalPages || 1);
    } catch (error) {
      console.error('Error loading quotations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const isExpiringSoon = (validUntil: string) => {
    const expiry = new Date(validUntil);
    const now = new Date();
    const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    return expiry > now && expiry < threeDays;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600">{t('common', 'loading') || 'Loading...'}</div>
      </div>
    );
  }

  const stats = {
    total: quotations.length,
    pending: quotations.filter((q) => q.status === 'PENDING').length,
    accepted: quotations.filter((q) => q.status === 'ACCEPTED').length,
    totalValue: quotations
      .filter((q) => q.status === 'ACCEPTED')
      .reduce((sum, q) => sum + q.amount, 0),
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('artisan', 'quotations') || 'Quotations'}
        </h1>
        <p className="text-gray-600">
          {t('artisan', 'manageQuotations') || 'Manage your quotations and proposals'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">
              {t('artisan', 'totalQuotations') || 'Total'}
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">{t('artisan', 'pending') || 'Pending'}</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">{t('artisan', 'accepted') || 'Accepted'}</div>
            <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">
              {t('artisan', 'totalValue') || 'Total Value'}
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(stats.totalValue)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          {t('common', 'all') || 'All'}
        </Button>
        <Button
          variant={filter === 'PENDING' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('PENDING')}
        >
          {t('artisan', 'pending') || 'Pending'}
        </Button>
        <Button
          variant={filter === 'ACCEPTED' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('ACCEPTED')}
        >
          {t('artisan', 'accepted') || 'Accepted'}
        </Button>
      </div>

      {/* Quotations List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('artisan', 'quotationsList') || 'Quotations List'}</CardTitle>
        </CardHeader>
        <CardContent>
          {quotations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📄</div>
              <p>{t('artisan', 'noQuotations') || 'No quotations found'}</p>
              <p className="text-sm mt-2">
                {t('artisan', 'createQuotationHint') || 'Create quotations from mission requests'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {quotations.map((quotation) => (
                <div
                  key={quotation.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">
                          {quotation.mission?.title || `Quotation #${quotation.id.slice(0, 8)}`}
                        </h4>
                        <Badge className={STATUS_COLORS[quotation.status]}>
                          {quotation.status}
                        </Badge>
                        {quotation.status === 'PENDING' && isExpiringSoon(quotation.validUntil) && (
                          <Badge className="bg-orange-100 text-orange-800">
                            ⏰ {t('artisan', 'expiringSoon') || 'Expiring Soon'}
                          </Badge>
                        )}
                      </div>
                      {quotation.mission?.client && (
                        <p className="text-sm text-gray-600 mb-2">
                          {t('artisan', 'client') || 'Client'}: {quotation.mission.client.firstName}{' '}
                          {quotation.mission.client.lastName}
                        </p>
                      )}
                      <p className="text-sm text-gray-500">{quotation.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>
                          {t('artisan', 'created') || 'Created'}: {formatDate(quotation.createdAt)}
                        </span>
                        <span>
                          {t('artisan', 'validUntil') || 'Valid until'}:{' '}
                          {formatDate(quotation.validUntil)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900">
                        {formatCurrency(quotation.amount)}
                      </div>
                      {quotation.mission && (
                        <Link href={`/artisan/missions/${quotation.missionId}`}>
                          <Button variant="outline" size="sm" className="mt-2">
                            {t('artisan', 'viewMission') || 'View Mission'}
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                {t('common', 'previous') || 'Previous'}
              </Button>
              <span className="py-2 px-4 text-sm text-gray-600">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                {t('common', 'next') || 'Next'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
