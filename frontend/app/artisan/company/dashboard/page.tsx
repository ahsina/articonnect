'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { companyApi, Company, CompanyStats } from '@/lib/api/company';
import { useLanguage } from '@/contexts/LanguageContext';
import { translateEmployeeRole } from '@/lib/utils/enum-translations';
import {
  Building2,
  ShieldCheck,
  Clock,
  Briefcase,
  CheckCircle2,
  Wallet,
  Users,
  Activity,
  Star,
  MessageSquare,
  ClipboardList,
  BarChart3,
  Settings,
  MapPin,
  CreditCard,
  ArrowRight,
} from 'lucide-react';

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
      <div className="p-6 max-w-6xl mx-auto">
        <Card className="rounded-2xl border-border">
          <CardContent className="flex flex-col items-center p-12 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="font-display text-xl font-extrabold text-foreground mb-2">
              {t('company', 'noCompany') || 'No Company Found'}
            </h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
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
    <div className="p-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shrink-0">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
              {company.companyName}
            </h1>
            <p className="text-muted-foreground">
              {t('company', 'companyDashboard') || 'Company Dashboard'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {company.businessVerified ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-sm font-semibold text-success">
              <ShieldCheck className="h-4 w-4" />
              {t('company', 'verified') || 'Verified'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1 text-sm font-semibold text-warning">
              <Clock className="h-4 w-4" />
              {t('company', 'pendingVerification') || 'Pending Verification'}
            </span>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
            <Briefcase className="mb-3 h-5 w-5 opacity-80" />
            <div className="font-display text-2xl font-extrabold">{stats.totalMissions}</div>
            <div className="text-xs font-medium opacity-80">
              {t('company', 'totalMissions') || 'Total Missions'}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <CheckCircle2 className="mb-3 h-5 w-5 text-success" />
            <div className="font-display text-2xl font-extrabold text-foreground">
              {stats.completedMissions}
            </div>
            <div className="text-xs font-medium text-muted-foreground">
              {t('company', 'completedMissions') || 'Completed'}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <Wallet className="mb-3 h-5 w-5 text-muted-foreground" />
            <div className="font-display text-2xl font-extrabold text-foreground">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <div className="text-xs font-medium text-muted-foreground">
              {t('company', 'totalRevenue') || 'Total Revenue'}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <Users className="mb-3 h-5 w-5 text-muted-foreground" />
            <div className="font-display text-2xl font-extrabold text-foreground">
              {stats.employeeCount}
            </div>
            <div className="text-xs font-medium text-muted-foreground">
              {t('company', 'employees') || 'Employees'}
            </div>
          </div>
        </div>
      )}

      {/* Additional Stats Row */}
      {stats && (
        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Activity className="h-4 w-4" />
              <span className="text-xs font-medium">
                {t('company', 'activeMissions') || 'Active Missions'}
              </span>
            </div>
            <div className="mt-2 font-display text-2xl font-extrabold text-foreground">
              {stats.activeMissions}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Star className="h-4 w-4 text-warning" />
              <span className="text-xs font-medium">
                {t('company', 'averageRating') || 'Average Rating'}
              </span>
            </div>
            <div className="mt-2 font-display text-2xl font-extrabold text-foreground">
              {Number(stats.averageRating).toFixed(1)}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              <span className="text-xs font-medium">
                {t('company', 'totalReviews') || 'Total Reviews'}
              </span>
            </div>
            <div className="mt-2 font-display text-2xl font-extrabold text-foreground">
              {stats.totalReviews}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions + Company Info */}
      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border-border">
          <CardHeader>
            <CardTitle className="font-display text-lg font-bold">
              {t('company', 'quickActions') || 'Quick Actions'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/artisan/company/employees">
                <Button variant="outline" className="w-full justify-start rounded-xl">
                  <Users className="mr-2 h-4 w-4" />
                  {t('company', 'manageEmployees') || 'Manage Employees'}
                </Button>
              </Link>
              <Link href="/artisan/company/assignments">
                <Button variant="outline" className="w-full justify-start rounded-xl">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  {t('company', 'assignMissions') || 'Assign Missions'}
                </Button>
              </Link>
              <Link href="/artisan/company/reports">
                <Button variant="outline" className="w-full justify-start rounded-xl">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  {t('company', 'viewReports') || 'View Reports'}
                </Button>
              </Link>
              <Link href="/artisan/company/settings">
                <Button variant="outline" className="w-full justify-start rounded-xl">
                  <Settings className="mr-2 h-4 w-4" />
                  {t('company', 'companySettings') || 'Settings'}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border">
          <CardHeader>
            <CardTitle className="font-display text-lg font-bold">
              {t('company', 'companyInfo') || 'Company Info'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-center justify-between py-2.5">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                {t('company', 'siret') || 'SIRET/RCS'}
              </span>
              <span className="font-medium text-foreground">{company.siret}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border py-2.5">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {t('company', 'location') || 'Location'}
              </span>
              <span className="font-medium text-foreground">
                {company.city}, {company.country}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-border py-2.5">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4" />
                {t('company', 'serviceRadius') || 'Service Radius'}
              </span>
              <span className="font-medium text-foreground">{company.serviceRadius} km</span>
            </div>
            <div className="flex items-center justify-between border-t border-border py-2.5">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="h-4 w-4" />
                {t('company', 'stripeStatus') || 'Stripe Status'}
              </span>
              {company.stripeOnboarded ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t('company', 'connected') || 'Connected'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-semibold text-warning">
                  <Clock className="h-3.5 w-3.5" />
                  {t('company', 'notConnected') || 'Not Connected'}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Employees */}
      <Card className="rounded-2xl border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display text-lg font-bold">
            {t('company', 'teamMembers') || 'Team Members'}
          </CardTitle>
          <Link href="/artisan/company/employees">
            <Button variant="ghost" size="sm" className="rounded-xl">
              {t('common', 'viewAll') || 'View All'}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {company.employees && company.employees.length > 0 ? (
            <div className="space-y-2">
              {company.employees.slice(0, 5).map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between rounded-2xl border border-border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted font-display font-bold text-foreground">
                      {employee.user?.firstName?.[0]}
                      {employee.user?.lastName?.[0]}
                    </div>
                    <div>
                      <div className="font-display font-bold text-foreground">
                        {employee.user?.firstName} {employee.user?.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">{employee.user?.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{translateEmployeeRole(employee.role, t)}</Badge>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        employee.status === 'ACTIVE'
                          ? 'bg-success/10 text-success'
                          : 'bg-warning/10 text-warning'
                      }`}
                    >
                      ● {employee.status === 'ACTIVE' ? t('status', 'active') || 'Actif' : t('status', 'inactive') || 'Inactif'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <Users className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="mb-4 text-muted-foreground">
                {t('company', 'noEmployees') || 'No employees yet'}
              </p>
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
