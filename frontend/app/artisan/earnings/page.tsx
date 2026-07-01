'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { artisanApi, ArtisanEarning, EarningsSummary } from '@/lib/api/artisan';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { translatePaymentStatus } from '@/lib/utils/enum-translations';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  PROCESSING: 'bg-primary/10 text-primary',
  PAID: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

export default function ArtisanEarningsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [earnings, setEarnings] = useState<ArtisanEarning[]>([]);
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingFec, setExportingFec] = useState(false);
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'PAID'>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadEarnings();
    loadSummary();
  }, [filter, page]);

  const loadEarnings = async () => {
    try {
      const params: any = { page, limit: 20 };
      if (filter !== 'all') params.status = filter;
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;

      const response = await artisanApi.getEarnings(params);
      setEarnings(response.data);
      setTotalPages(response.meta.totalPages);
    } catch (error) {
      console.error('Error loading earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const data = await artisanApi.getEarningsSummary();
      setSummary(data);
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  };

  const handleExportFec = async () => {
    setExportingFec(true);
    try {
      // Determine fiscal year - default to current year
      const fiscalYear = new Date().getFullYear();

      // Call FEC export API
      const response = await fetch(`/api/accounting/fec/export?fiscalYear=${fiscalYear}`, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv',
        },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FEC_${fiscalYear}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: t('earnings', 'fecExportSuccess') || 'Export FEC Success',
        description: t('earnings', 'fecExportSuccessDesc') || 'Your FEC file has been downloaded',
        variant: 'success',
      });
    } catch (error) {
      console.error('FEC export error:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('earnings', 'fecExportError') || 'Failed to export FEC file',
        variant: 'destructive',
      });
    } finally {
      setExportingFec(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
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
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('artisan', 'earnings') || 'Earnings'}
          </h1>
          <p className="text-muted-foreground">
            {t('artisan', 'trackEarnings') || 'Track your earnings and payouts'}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleExportFec}
          disabled={exportingFec}
          className="flex items-center gap-2"
        >
          <span>📊</span>
          {exportingFec
            ? t('earnings', 'exporting') || 'Exporting...'
            : t('earnings', 'exportFec') || 'Export FEC'}
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-200">
            <CardContent className="p-4">
              <div className="text-sm text-green-600">
                {t('artisan', 'totalEarnings') || 'Total Earnings'}
              </div>
              <div className="text-2xl font-bold text-green-700">
                {formatCurrency(summary.totalEarnings)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-amber-200">
            <CardContent className="p-4">
              <div className="text-sm text-yellow-600">
                {t('artisan', 'pendingEarnings') || 'Pending'}
              </div>
              <div className="text-2xl font-bold text-amber-800">
                {formatCurrency(summary.pendingEarnings)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="text-sm text-primary">
                {t('artisan', 'thisMonth') || 'This Month'}
              </div>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(summary.thisMonthEarnings)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-200">
            <CardContent className="p-4">
              <div className="text-sm text-purple-600">
                {t('artisan', 'lastMonth') || 'Last Month'}
              </div>
              <div className="text-2xl font-bold text-purple-700">
                {formatCurrency(summary.lastMonthEarnings)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Additional Stats */}
      {summary && (
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">
                {t('artisan', 'totalMissions') || 'Total Missions'}
              </div>
              <div className="text-2xl font-bold text-foreground">{summary.totalMissions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">
                {t('artisan', 'avgPerMission') || 'Avg per Mission'}
              </div>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(summary.averagePerMission)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">
                {t('artisan', 'paidEarnings') || 'Paid Out'}
              </div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.paidEarnings)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex gap-2">
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
                variant={filter === 'PAID' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('PAID')}
              >
                {t('artisan', 'paid') || 'Paid'}
              </Button>
            </div>
            <div className="flex gap-2 items-center ml-auto">
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-40"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-40"
              />
              <Button variant="outline" size="sm" onClick={loadEarnings}>
                {t('common', 'apply') || 'Apply'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Earnings List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('artisan', 'earningsHistory') || 'Earnings History'}</CardTitle>
        </CardHeader>
        <CardContent>
          {earnings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('artisan', 'noEarningsFound') || 'No earnings found'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      {t('artisan', 'mission') || 'Mission'}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      {t('artisan', 'date') || 'Date'}
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                      {t('artisan', 'gross') || 'Gross'}
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                      {t('artisan', 'platformFee') || 'Platform Fee'}
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                      {t('artisan', 'net') || 'Net'}
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                      {t('artisan', 'status') || 'Status'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {earnings.map((earning) => (
                    <tr key={earning.id} className="border-b hover:bg-accent">
                      <td className="py-3 px-4">
                        <div className="font-medium text-foreground">{earning.missionTitle}</div>
                        <div className="text-sm text-muted-foreground">
                          ID: {earning.missionId.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{formatDate(earning.createdAt)}</td>
                      <td className="py-3 px-4 text-right text-foreground">
                        {formatCurrency(earning.grossAmount)}
                      </td>
                      <td className="py-3 px-4 text-right text-red-600">
                        -{formatCurrency(earning.platformFee)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-green-600">
                        {formatCurrency(earning.netAmount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={STATUS_COLORS[earning.status]}>
                          {translatePaymentStatus(earning.status, t)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                {t('common', 'previous') || 'Previous'}
              </Button>
              <span className="py-2 px-4 text-sm text-muted-foreground">
                {t('common', 'page') || 'Page'} {page} / {totalPages}
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
