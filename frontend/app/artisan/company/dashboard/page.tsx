'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { companyApi, Company, CompanyStats } from '@/lib/api/company';
import { employeeApi } from '@/lib/api/employee';
import { useLanguage } from '@/contexts/LanguageContext';
import { translateEmployeeRole } from '@/lib/utils/enum-translations';

export default function CompanyDashboardPage() {
  const { t } = useLanguage();
  const [company, setCompany] = useState<Company | null>(null);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompanyData();
  }, []);

  const loadCompanyData = async () => {
    try {
      const companyData = await companyApi.getMyCompany();
      setCompany(companyData);

      if (companyData) {
        const statsData = await companyApi.getStats(companyData.id);
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error loading company data:', error);
    } finally {
      setLoading(false);
    }
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

  if (!company) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-5xl mb-4"></div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              {t('company', 'noCompany') || 'No Company Found'}
            </h2>
            <p className="text-muted-foreground mb-4">
              {t('company', 'noCompanyDesc') || 'You have not created a company yet.'}
            </p>
            <Link href="/artisan/company/create">
              <Button>{t('company', 'createCompany') || 'Create Company'}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{company.companyName}</h1>
          <p className="text-muted-foreground">{t('company', 'companyDashboard') || 'Company Dashboard'}</p>
        </div>
        <div className="flex gap-2">
          {company.businessVerified ? (
            <Badge className="bg-green-100 text-green-700">
              {t('company', 'verified') || 'Verified'}
            </Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-800">
              {t('company', 'pendingVerification') || 'Pending Verification'}
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-muted border-primary/20">
            <CardContent className="p-4">
              <div className="text-sm text-primary">
                {t('company', 'totalMissions') || 'Total Missions'}
              </div>
              <div className="text-2xl font-bold text-primary">{stats.totalMissions}</div>
            </CardContent>
          </Card>
          <Card className="bg-muted">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">
                {t('company', 'completedMissions') || 'Completed'}
              </div>
              <div className="text-2xl font-bold text-foreground">{stats.completedMissions}</div>
            </CardContent>
          </Card>
          <Card className="bg-muted">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">
                {t('company', 'totalRevenue') || 'Total Revenue'}
              </div>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(stats.totalRevenue)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-muted">
            <CardContent className="p-4">
              <div className="text-sm text-yellow-600">
                {t('company', 'employees') || 'Employees'}
              </div>
              <div className="text-2xl font-bold text-foreground">{stats.employeeCount}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Additional Stats Row */}
      {stats && (
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">
                {t('company', 'activeMissions') || 'Active Missions'}
              </div>
              <div className="text-2xl font-bold text-foreground">{stats.activeMissions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">
                {t('company', 'averageRating') || 'Average Rating'}
              </div>
              <div className="text-2xl font-bold text-foreground">
                {Number(stats.averageRating).toFixed(1)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">
                {t('company', 'totalReviews') || 'Total Reviews'}
              </div>
              <div className="text-2xl font-bold text-foreground">{stats.totalReviews}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('company', 'quickActions') || 'Quick Actions'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/artisan/company/employees">
                <Button variant="outline" className="w-full justify-start">
                  {t('company', 'manageEmployees') || 'Manage Employees'}
                </Button>
              </Link>
              <Link href="/artisan/company/assignments">
                <Button variant="outline" className="w-full justify-start">
                  {t('company', 'assignMissions') || 'Assign Missions'}
                </Button>
              </Link>
              <Link href="/artisan/company/reports">
                <Button variant="outline" className="w-full justify-start">
                  {t('company', 'viewReports') || 'View Reports'}
                </Button>
              </Link>
              <Link href="/artisan/company/settings">
                <Button variant="outline" className="w-full justify-start">
                  {t('company', 'companySettings') || 'Settings'}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('company', 'companyInfo') || 'Company Info'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('company', 'siret') || 'SIRET/RCS'}</span>
              <span className="font-medium">{company.siret}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('company', 'location') || 'Location'}</span>
              <span className="font-medium">
                {company.city}, {company.country}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('company', 'serviceRadius') || 'Service Radius'}
              </span>
              <span className="font-medium">{company.serviceRadius} km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('company', 'stripeStatus') || 'Stripe Status'}
              </span>
              {company.stripeOnboarded ? (
                <Badge className="bg-green-100 text-green-700">
                  {t('company', 'connected') || 'Connected'}
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-800">
                  {t('company', 'notConnected') || 'Not Connected'}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Employees */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('company', 'teamMembers') || 'Team Members'}</CardTitle>
          <Link href="/artisan/company/employees">
            <Button variant="ghost" size="sm">
              {t('common', 'viewAll') || 'View All'}
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {company.employees && company.employees.length > 0 ? (
            <div className="space-y-3">
              {company.employees.slice(0, 5).map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between p-3 bg-background rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                      {employee.user?.firstName?.[0]}
                      {employee.user?.lastName?.[0]}
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        {employee.user?.firstName} {employee.user?.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">{employee.user?.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{translateEmployeeRole(employee.role, t)}</Badge>
                    <Badge
                      className={
                        employee.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-800'
                      }
                    >
                      {employee.status === 'ACTIVE' ? t('status', 'active') || 'Actif' : t('status', 'inactive') || 'Inactif'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-4">{t('company', 'noEmployees') || 'No employees yet'}</p>
              <Link href="/artisan/company/employees">
                <Button>{t('company', 'inviteEmployee') || 'Invite First Employee'}</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
