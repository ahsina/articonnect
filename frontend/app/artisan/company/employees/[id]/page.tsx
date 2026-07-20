'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  employeeApi,
  CompanyEmployee,
  UpdateEmployeeDto,
  EmployeeStats,
  EmployeeEarning,
} from '@/lib/api/employee';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Activity,
  Star,
  Wallet,
  Phone,
  Calendar,
  Trash2,
  CalendarClock,
} from 'lucide-react';

export default function EmployeeDetailPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const employeeId = params.id as string;

  const [employee, setEmployee] = useState<CompanyEmployee | null>(null);
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [earnings, setEarnings] = useState<EmployeeEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'edit' | 'earnings' | 'shifts'>(
    'overview',
  );

  const [editForm, setEditForm] = useState<UpdateEmployeeDto>({});

  useEffect(() => {
    if (employeeId) {
      loadData();
    }
  }, [employeeId]);

  const loadData = async () => {
    try {
      const [employeeData, statsData, earningsData] = await Promise.all([
        employeeApi.getById(employeeId),
        employeeApi.getStats(employeeId),
        employeeApi.getEarnings(employeeId),
      ]);
      setEmployee(employeeData);
      setStats(statsData);
      setEarnings(earningsData.data || []);
      setEditForm({
        role: employeeData.role,
        paymentModel: employeeData.paymentModel,
        commissionRate: employeeData.commissionRate,
        baseSalary: employeeData.baseSalary,
        canAcceptMissions: employeeData.canAcceptMissions,
        canViewFinancials: employeeData.canViewFinancials,
        canManageTeam: employeeData.canManageTeam,
      });
    } catch (error) {
      console.error('Error loading employee data:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('company', 'loadError') || 'Failed to load employee data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!employee) return;
    setSaving(true);
    try {
      await employeeApi.update(employeeId, editForm);
      toast({
        title: t('common', 'success') || 'Success',
        description: t('company', 'employeeUpdated') || 'Employee updated successfully',
        variant: 'success',
      });
      loadData();
      setActiveTab('overview');
    } catch (error) {
      console.error('Error updating employee:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('company', 'updateError') || 'Failed to update employee',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (
      !employee ||
      !confirm(t('company', 'confirmRemove') || 'Are you sure you want to remove this employee?')
    )
      return;
    try {
      await employeeApi.remove(employeeId);
      toast({
        title: t('common', 'success') || 'Success',
        description: t('company', 'employeeRemoved') || 'Employee removed successfully',
        variant: 'success',
      });
      router.push('/artisan/company/employees');
    } catch (error) {
      console.error('Error removing employee:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('company', 'removeError') || 'Failed to remove employee',
        variant: 'destructive',
      });
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      OWNER: 'bg-purple-100 text-purple-700',
      MANAGER: 'bg-primary/10 text-primary',
      SUPERVISOR: 'bg-green-100 text-green-700',
      TECHNICIAN: 'bg-muted text-foreground',
      CONTRACTOR: 'bg-amber-100 text-amber-800',
    };
    return colors[role] || 'bg-muted text-foreground';
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-700',
      PENDING: 'bg-amber-100 text-amber-800',
      INACTIVE: 'bg-muted text-foreground',
      TERMINATED: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-muted text-foreground';
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">{t('common', 'loading') || 'Loading...'}</div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex flex-col items-center py-16 text-center">
          <p className="text-muted-foreground">
            {t('company', 'employeeNotFound') || 'Employee not found'}
          </p>
          <Button onClick={() => router.push('/artisan/company/employees')} className="mt-4">
            {t('common', 'back') || 'Back'}
          </Button>
        </div>
      </div>
    );
  }

  const tabs: Array<{ key: 'overview' | 'edit' | 'earnings' | 'shifts'; label: string }> = [
    { key: 'overview', label: t('company', 'overview') || 'Overview' },
    { key: 'edit', label: t('company', 'edit') || 'Edit' },
    { key: 'earnings', label: t('company', 'earnings') || 'Earnings' },
    { key: 'shifts', label: t('company', 'shifts') || 'Shifts' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 -ml-2 rounded-xl text-muted-foreground"
        onClick={() => router.push('/artisan/company/employees')}
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        {t('common', 'back') || 'Back'}
      </Button>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary font-display text-xl font-extrabold text-primary-foreground shrink-0">
            {employee.user.firstName?.[0]}
            {employee.user.lastName?.[0]}
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
              {employee.user.firstName} {employee.user.lastName}
            </h1>
            <p className="text-muted-foreground">{employee.user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getRoleBadge(employee.role)}>{employee.role}</Badge>
          <Badge className={getStatusBadge(employee.status)}>{employee.status}</Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-2xl border border-border bg-muted p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Stats Card */}
          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="font-display text-lg font-bold">
                {t('company', 'performance') || 'Performance'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-primary p-4 text-primary-foreground">
                  <Briefcase className="mb-2 h-5 w-5 opacity-80" />
                  <div className="font-display text-2xl font-extrabold">
                    {Number(stats?.totalMissions ?? 0)}
                  </div>
                  <div className="text-xs font-medium opacity-80">
                    {t('company', 'totalMissions') || 'Total Missions'}
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <CheckCircle2 className="mb-2 h-5 w-5 text-success" />
                  <div className="font-display text-2xl font-extrabold text-foreground">
                    {Number(stats?.completedMissions ?? 0)}
                  </div>
                  <div className="text-xs font-medium text-muted-foreground">
                    {t('company', 'completed') || 'Completed'}
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <Activity className="mb-2 h-5 w-5 text-warning" />
                  <div className="font-display text-2xl font-extrabold text-foreground">
                    {Number(stats?.activeMissions ?? 0)}
                  </div>
                  <div className="text-xs font-medium text-muted-foreground">
                    {t('company', 'active') || 'Active'}
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <Star className="mb-2 h-5 w-5 text-warning" />
                  <div className="font-display text-2xl font-extrabold text-foreground">
                    {stats?.averageRating != null ? Number(stats.averageRating).toFixed(1) : 'N/A'}
                  </div>
                  <div className="text-xs font-medium text-muted-foreground">
                    {t('company', 'rating') || 'Rating'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Earnings Card */}
          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="font-display text-lg font-bold">
                {t('company', 'earningsSummary') || 'Earnings Summary'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-muted-foreground">
                    {t('company', 'totalEarnings') || 'Total Earnings'}
                  </span>
                  <span className="font-display font-bold text-foreground">
                    €{(Number(stats?.totalEarnings ?? 0) || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-border py-2.5">
                  <span className="text-sm text-muted-foreground">
                    {t('company', 'pendingPayment') || 'Pending Payment'}
                  </span>
                  <span className="font-display font-bold text-warning">
                    €{(Number(stats?.pendingEarnings ?? 0) || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-border py-2.5">
                  <span className="text-sm text-muted-foreground">
                    {t('company', 'paymentModel') || 'Payment Model'}
                  </span>
                  <Badge variant="outline">{employee.paymentModel}</Badge>
                </div>
                <div className="flex items-center justify-between border-t border-border py-2.5">
                  <span className="text-sm text-muted-foreground">
                    {t('company', 'commissionRate') || 'Commission Rate'}
                  </span>
                  <span className="font-display font-bold text-foreground">
                    {employee.commissionRate || 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employee Info Card */}
          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="font-display text-lg font-bold">
                {t('company', 'employeeInfo') || 'Employee Information'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {t('company', 'joinedDate') || 'Joined Date'}
                  </span>
                  <span className="font-medium text-foreground">{(() => { const d = new Date((employee as any).startDate || employee.joinedAt); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(); })()}</span>
                </div>
                <div className="flex items-center justify-between border-t border-border py-2.5">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {t('company', 'phone') || 'Phone'}
                  </span>
                  <span className="font-medium text-foreground">{employee.user.phone || 'N/A'}</span>
                </div>
                {employee.baseSalary && (
                  <div className="flex items-center justify-between border-t border-border py-2.5">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Wallet className="h-4 w-4" />
                      {t('company', 'baseSalary') || 'Base Salary'}
                    </span>
                    <span className="font-medium text-foreground">€{(Number(employee.baseSalary) || 0).toLocaleString()}{t('companyEmployeeDetail', 'perMonth')}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Permissions Card */}
          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="font-display text-lg font-bold">
                {t('company', 'permissions') || 'Permissions'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-muted-foreground">
                    {t('company', 'canAcceptMissions') || 'Can Accept Missions'}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      employee.canAcceptMissions
                        ? 'bg-success/10 text-success'
                        : 'bg-destructive/10 text-destructive'
                    }`}
                  >
                    ● {employee.canAcceptMissions ? `${t('companyEmployeeDetail', 'yes')}` : `${t('companyEmployeeDetail', 'no')}`}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-border py-2.5">
                  <span className="text-sm text-muted-foreground">
                    {t('company', 'canViewFinancials') || 'Can View Financials'}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      employee.canViewFinancials
                        ? 'bg-success/10 text-success'
                        : 'bg-destructive/10 text-destructive'
                    }`}
                  >
                    ● {employee.canViewFinancials ? `${t('companyEmployeeDetail', 'yes')}` : `${t('companyEmployeeDetail', 'no')}`}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-border py-2.5">
                  <span className="text-sm text-muted-foreground">
                    {t('company', 'canManageTeam') || 'Can Manage Team'}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      employee.canManageTeam
                        ? 'bg-success/10 text-success'
                        : 'bg-destructive/10 text-destructive'
                    }`}
                  >
                    ● {employee.canManageTeam ? `${t('companyEmployeeDetail', 'yes')}` : `${t('companyEmployeeDetail', 'no')}`}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Tab */}
      {activeTab === 'edit' && (
        <Card className="rounded-2xl border-border">
          <CardHeader>
            <CardTitle className="font-display text-lg font-bold">
              {t('company', 'editEmployee') || 'Edit Employee'}
            </CardTitle>
            <CardDescription>
              {t('company', 'editEmployeeDesc') || 'Update employee role and payment settings'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {t('company', 'role') || 'Role'}
                </label>
                <select
                  value={editForm.role || employee.role}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      role: e.target.value as
                        | 'OWNER'
                        | 'MANAGER'
                        | 'SUPERVISOR'
                        | 'TECHNICIAN'
                        | 'CONTRACTOR',
                    })
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="TECHNICIAN">{t('companyEmployeeDetail', 'roleTechnician')}</option>
                  <option value="SUPERVISOR">{t('companyEmployeeDetail', 'roleSupervisor')}</option>
                  <option value="MANAGER">{t('companyEmployeeDetail', 'roleManager')}</option>
                  <option value="CONTRACTOR">{t('companyEmployeeDetail', 'roleContractor')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {t('company', 'paymentModel') || 'Payment Model'}
                </label>
                <select
                  value={editForm.paymentModel || employee.paymentModel}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      paymentModel: e.target.value as 'SALARY' | 'COMMISSION' | 'HYBRID',
                    })
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="COMMISSION">{t('companyEmployeeDetail', 'paymentCommission')}</option>
                  <option value="SALARY">{t('companyEmployeeDetail', 'paymentSalary')}</option>
                  <option value="HYBRID">{t('companyEmployeeDetail', 'paymentHybrid')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {t('company', 'commissionRate') || 'Commission Rate (%)'}
                </label>
                <Input
                  type="number"
                  value={editForm.commissionRate ?? employee.commissionRate ?? 50}
                  onChange={(e) =>
                    setEditForm({ ...editForm, commissionRate: parseInt(e.target.value) })
                  }
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {t('company', 'baseSalary') || 'Base Salary (€/month)'}
                </label>
                <Input
                  type="number"
                  value={editForm.baseSalary ?? employee.baseSalary ?? 0}
                  onChange={(e) =>
                    setEditForm({ ...editForm, baseSalary: parseInt(e.target.value) })
                  }
                  min="0"
                />
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <h4 className="font-display font-bold text-foreground mb-3">
                {t('company', 'permissions') || 'Permissions'}
              </h4>
              <div className="space-y-2">
                <label className="flex items-center gap-3 rounded-xl border border-border p-3 cursor-pointer hover:bg-muted">
                  <input
                    type="checkbox"
                    checked={editForm.canAcceptMissions ?? employee.canAcceptMissions ?? true}
                    onChange={(e) =>
                      setEditForm({ ...editForm, canAcceptMissions: e.target.checked })
                    }
                    className="h-4 w-4 rounded accent-primary"
                  />
                  <span className="text-sm text-foreground">
                    {t('company', 'canAcceptMissions') || 'Can accept and manage missions'}
                  </span>
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-border p-3 cursor-pointer hover:bg-muted">
                  <input
                    type="checkbox"
                    checked={editForm.canViewFinancials ?? employee.canViewFinancials ?? false}
                    onChange={(e) =>
                      setEditForm({ ...editForm, canViewFinancials: e.target.checked })
                    }
                    className="h-4 w-4 rounded accent-primary"
                  />
                  <span className="text-sm text-foreground">
                    {t('company', 'canViewFinancials') || 'Can view financial reports'}
                  </span>
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-border p-3 cursor-pointer hover:bg-muted">
                  <input
                    type="checkbox"
                    checked={editForm.canManageTeam ?? employee.canManageTeam ?? false}
                    onChange={(e) => setEditForm({ ...editForm, canManageTeam: e.target.checked })}
                    className="h-4 w-4 rounded accent-primary"
                  />
                  <span className="text-sm text-foreground">
                    {t('company', 'canManageTeam') || 'Can manage team members'}
                  </span>
                </label>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-between">
              <Button variant="destructive" onClick={handleRemove}>
                <Trash2 className="mr-2 h-4 w-4" />
                {t('company', 'removeEmployee') || 'Remove Employee'}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving
                  ? t('common', 'saving') || 'Saving...'
                  : t('common', 'saveChanges') || 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Earnings Tab */}
      {activeTab === 'earnings' && (
        <Card className="rounded-2xl border-border">
          <CardHeader>
            <CardTitle className="font-display text-lg font-bold">
              {t('company', 'earningsHistory') || 'Earnings History'}
            </CardTitle>
            <CardDescription>
              {t('company', 'earningsHistoryDesc') || 'View all earnings for this employee'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {earnings.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                  <Wallet className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  {t('company', 'noEarnings') || 'No earnings recorded yet'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-3 px-4 text-left font-semibold">
                        {t('company', 'date') || 'Date'}
                      </th>
                      <th className="py-3 px-4 text-left font-semibold">
                        {t('company', 'mission') || 'Mission'}
                      </th>
                      <th className="py-3 px-4 text-right font-semibold">
                        {t('company', 'amount') || 'Amount'}
                      </th>
                      <th className="py-3 px-4 text-right font-semibold">
                        {t('company', 'commission') || 'Commission'}
                      </th>
                      <th className="py-3 px-4 text-center font-semibold">
                        {t('company', 'status') || 'Status'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {earnings.map((earning) => (
                      <tr key={earning.id} className="border-b border-border hover:bg-muted">
                        <td className="py-3 px-4 text-foreground">
                          {new Date(earning.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-foreground">{earning.missionTitle}</td>
                        <td className="py-3 px-4 text-right font-medium text-foreground">
                          €{(Number(earning.grossAmount) || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-foreground">
                          €{(Number(earning.netAmount) || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            className={
                              earning.status === 'PAID'
                                ? 'bg-green-100 text-green-700'
                                : earning.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-muted text-foreground'
                            }
                          >
                            {earning.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Shifts Tab */}
      {activeTab === 'shifts' && (
        <Card className="rounded-2xl border-border">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="font-display text-lg font-bold">
                  {t('company', 'shiftSchedule') || 'Shift Schedule'}
                </CardTitle>
                <CardDescription>
                  {t('company', 'shiftScheduleDesc') || 'View and manage employee shifts'}
                </CardDescription>
              </div>
              <Button
                className="shrink-0"
                onClick={() => router.push(`/artisan/company/employees/${employeeId}/shifts`)}
              >
                {t('company', 'manageShifts') || 'Manage Shifts'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center py-12 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <CalendarClock className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                {t('company', 'viewShiftsPage') ||
                  'Click "Manage Shifts" to view and edit the shift schedule'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
