'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { companyApi, Company, CompanyStats } from '@/lib/api/company';
import apiClient from '@/lib/api/client';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CompanyReportsPage() {
  const { t } = useLanguage();
  const [company, setCompany] = useState<Company | null>(null);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const companyData = await companyApi.getMyCompany();
      setCompany(companyData);

      if (companyData) {
        const statsData = await companyApi.getStats(companyData.id);
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!company) return;
    const { data } = await apiClient.get(`/reports/company/${company.id}/financial-summary`, {
      params: { startDate: dateRange.start, endDate: dateRange.end },
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-${company.id}-${dateRange.start}_${dateRange.end}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('company', 'reports') || 'Reports & Analytics'}
          </h1>
          <p className="text-muted-foreground">
            {t('company', 'reportsDesc') || 'View your company performance metrics'}
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>📥 {t('company', 'exportReport') || 'Export Report'}</Button>
      </div>

      {/* Date Range Filter */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-foreground">
              {t('company', 'dateRange') || 'Date Range'}:
            </span>
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
            <Button size="sm" onClick={() => loadData()}>{t('common', 'apply') || 'Apply'}</Button>
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      {stats && (
        <>
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="text-sm text-primary">
                  {t('company', 'totalRevenue') || 'Total Revenue'}
                </div>
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(stats.totalRevenue)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
              <CardContent className="p-4">
                <div className="text-sm text-green-600">
                  {t('company', 'completedMissions') || 'Completed Missions'}
                </div>
                <div className="text-2xl font-bold text-green-400">{stats.completedMissions}</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
              <CardContent className="p-4">
                <div className="text-sm text-yellow-600">
                  {t('company', 'averageRating') || 'Average Rating'}
                </div>
                <div className="text-2xl font-bold text-yellow-400">
                  ⭐ {Number(stats.averageRating).toFixed(1)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
              <CardContent className="p-4">
                <div className="text-sm text-purple-600">
                  {t('company', 'totalReviews') || 'Total Reviews'}
                </div>
                <div className="text-2xl font-bold text-purple-400">{stats.totalReviews}</div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('company', 'missionMetrics') || 'Mission Metrics'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">
                      {t('company', 'totalMissions') || 'Total Missions'}
                    </span>
                    <span className="font-bold text-foreground">{stats.totalMissions}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">
                      {t('company', 'completedMissions') || 'Completed'}
                    </span>
                    <span className="font-bold text-green-600">{stats.completedMissions}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">
                      {t('company', 'activeMissions') || 'Active'}
                    </span>
                    <span className="font-bold text-primary">{stats.activeMissions}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">
                      {t('company', 'completionRate') || 'Completion Rate'}
                    </span>
                    <span className="font-bold text-foreground">
                      {stats.totalMissions > 0
                        ? ((stats.completedMissions / stats.totalMissions) * 100).toFixed(1)
                        : 0}
                      %
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('company', 'revenueMetrics') || 'Revenue Metrics'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">
                      {t('company', 'totalRevenue') || 'Total Revenue'}
                    </span>
                    <span className="font-bold text-foreground">
                      {formatCurrency(stats.totalRevenue)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">
                      {t('company', 'avgPerMission') || 'Avg per Mission'}
                    </span>
                    <span className="font-bold text-foreground">
                      {formatCurrency(
                        stats.completedMissions > 0
                          ? stats.totalRevenue / stats.completedMissions
                          : 0,
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">
                      {t('company', 'employees') || 'Employees'}
                    </span>
                    <span className="font-bold text-foreground">{stats.employeeCount}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">
                      {t('company', 'revenuePerEmployee') || 'Revenue per Employee'}
                    </span>
                    <span className="font-bold text-foreground">
                      {formatCurrency(
                        stats.employeeCount > 0 ? stats.totalRevenue / stats.employeeCount : 0,
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>{t('company', 'revenueChart') || 'Revenue Over Time'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <div className="text-4xl mb-2">📊</div>
                  <p>
                    {t('company', 'chartPlaceholder') || 'Chart visualization would appear here'}
                  </p>
                  <p className="text-sm">
                    {t('company', 'integrateCharts') ||
                      'Integrate with a charting library for interactive graphs'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
