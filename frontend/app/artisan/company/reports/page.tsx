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
    <div className="p-6 max-w-[1180px] mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-extrabold tracking-tight text-foreground">
            {t('company', 'reports') || 'Reports & Analytics'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('company', 'reportsDesc') || 'View your company performance metrics'}
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          {t('company', 'exportReport') || 'Export Report'}
        </Button>
      </div>

      {/* Date Range Filter */}
      <Card className="mb-6 rounded-2xl">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-foreground">
              {t('company', 'dateRange') || 'Date Range'} :
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
            <Button size="sm" onClick={() => loadData()}>
              {t('common', 'apply') || 'Apply'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      {stats && (
        <>
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card className="rounded-2xl">
              <CardContent className="p-[18px]">
                <div className="text-[12.5px] font-semibold text-muted-foreground">
                  {t('company', 'totalRevenue') || 'Total Revenue'}
                </div>
                <div className="text-[28px] font-display font-extrabold tracking-tight text-foreground mt-2">
                  {formatCurrency(stats.totalRevenue)}
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardContent className="p-[18px]">
                <div className="text-[12.5px] font-semibold text-muted-foreground">
                  {t('company', 'completedMissions') || 'Completed Missions'}
                </div>
                <div className="text-[28px] font-display font-extrabold tracking-tight text-foreground mt-2">
                  {stats.completedMissions}
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardContent className="p-[18px]">
                <div className="text-[12.5px] font-semibold text-muted-foreground">
                  {t('company', 'averageRating') || 'Average Rating'}
                </div>
                <div className="text-[28px] font-display font-extrabold tracking-tight text-foreground mt-2">
                  {Number(stats.averageRating).toFixed(1)} ★
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardContent className="p-[18px]">
                <div className="text-[12.5px] font-semibold text-muted-foreground">
                  {t('company', 'totalReviews') || 'Total Reviews'}
                </div>
                <div className="text-[28px] font-display font-extrabold tracking-tight text-foreground mt-2">
                  {stats.totalReviews}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <Card className="rounded-2xl">
              <CardHeader className="border-b border-border py-4">
                <CardTitle className="text-base font-display font-extrabold tracking-tight">
                  {t('company', 'missionMetrics') || 'Mission Metrics'}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 py-2">
                <div className="flex justify-between items-center py-2.5 border-b border-border">
                  <span className="text-muted-foreground">
                    {t('company', 'totalMissions') || 'Total Missions'}
                  </span>
                  <span className="font-semibold text-foreground">{stats.totalMissions}</span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-border">
                  <span className="text-muted-foreground">
                    {t('company', 'completedMissions') || 'Completed'}
                  </span>
                  <span className="font-semibold text-success">{stats.completedMissions}</span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-border">
                  <span className="text-muted-foreground">
                    {t('company', 'activeMissions') || 'Active'}
                  </span>
                  <span className="font-semibold text-primary">{stats.activeMissions}</span>
                </div>
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-muted-foreground">
                    {t('company', 'completionRate') || 'Completion Rate'}
                  </span>
                  <span className="font-semibold text-foreground">
                    {stats.totalMissions > 0
                      ? ((stats.completedMissions / stats.totalMissions) * 100).toFixed(1)
                      : 0}
                    %
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="border-b border-border py-4">
                <CardTitle className="text-base font-display font-extrabold tracking-tight">
                  {t('company', 'revenueMetrics') || 'Revenue Metrics'}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 py-2">
                <div className="flex justify-between items-center py-2.5 border-b border-border">
                  <span className="text-muted-foreground">
                    {t('company', 'totalRevenue') || 'Total Revenue'}
                  </span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(stats.totalRevenue)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-border">
                  <span className="text-muted-foreground">
                    {t('company', 'avgPerMission') || 'Avg per Mission'}
                  </span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(
                      stats.completedMissions > 0
                        ? stats.totalRevenue / stats.completedMissions
                        : 0,
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-border">
                  <span className="text-muted-foreground">
                    {t('company', 'employees') || 'Employees'}
                  </span>
                  <span className="font-semibold text-foreground">{stats.employeeCount}</span>
                </div>
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-muted-foreground">
                    {t('company', 'revenuePerEmployee') || 'Revenue per Employee'}
                  </span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(
                      stats.employeeCount > 0 ? stats.totalRevenue / stats.employeeCount : 0,
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Placeholder */}
          <Card className="rounded-2xl">
            <CardHeader className="border-b border-border py-4">
              <CardTitle className="text-base font-display font-extrabold tracking-tight">
                {t('company', 'revenueChart') || 'Revenue Over Time'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="h-64 bg-muted rounded-xl flex items-center justify-center">
                <div className="text-center text-muted-foreground px-6">
                  <p className="font-semibold text-foreground">
                    {t('company', 'chartPlaceholder') || 'Chart visualization would appear here'}
                  </p>
                  <p className="text-sm mt-1">
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
