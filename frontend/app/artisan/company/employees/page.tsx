'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  companyApi,
  Company,
  CompanyEmployee,
  EmployeeRole,
  PaymentModel,
} from '@/lib/api/company';
import { employeeApi, InviteEmployeeDto } from '@/lib/api/employee';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, Users, UserCheck, Clock, ShieldCheck, Trash2, X } from 'lucide-react';

const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-purple-100 text-purple-700',
  MANAGER: 'bg-primary/10 text-primary',
  SUPERVISOR: 'bg-primary/15 text-primary',
  TECHNICIAN: 'bg-green-100 text-green-700',
  CONTRACTOR: 'bg-muted text-foreground',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-muted text-foreground',
  TERMINATED: 'bg-red-100 text-red-700',
  PENDING_INVITATION: 'bg-amber-100 text-amber-800',
};

export default function EmployeesPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<CompanyEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'ACTIVE' | 'PENDING_INVITATION'>('all');
  const [inviteForm, setInviteForm] = useState<InviteEmployeeDto>({
    email: '',
    role: 'TECHNICIAN',
    paymentModel: 'COMMISSION',
    commissionRate: 50,
  });
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const companyData = await companyApi.getMyCompany();
      setCompany(companyData);

      if (companyData) {
        const employeesData = await employeeApi.getByCompany(companyData.id);
        setEmployees(employeesData.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!company || !inviteForm.email) {
      toast({
        title: t('common', 'error') || 'Error',
        description: t('company', 'emailRequired') || 'Email is required',
        variant: 'destructive',
      });
      return;
    }

    setInviting(true);
    try {
      await employeeApi.invite(company.id, inviteForm);
      toast({
        title: t('common', 'success') || 'Success',
        description: t('company', 'invitationSent') || 'Invitation sent successfully',
        variant: 'success',
      });
      setShowInviteModal(false);
      setInviteForm({
        email: '',
        role: 'TECHNICIAN',
        paymentModel: 'COMMISSION',
        commissionRate: 50,
      });
      loadData();
    } catch (error: any) {
      console.error('Error inviting employee:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description:
          error.response?.data?.message ||
          t('company', 'inviteError') ||
          'Failed to send invitation',
        variant: 'destructive',
      });
    } finally {
      setInviting(false);
    }
  };

  const handleResendInvitation = async (employeeId: string) => {
    try {
      await employeeApi.resendInvitation(employeeId);
      toast({
        title: t('common', 'success') || 'Success',
        description: t('company', 'invitationResent') || 'Invitation resent',
        variant: 'success',
      });
    } catch (error) {
      console.error('Error resending invitation:', error);
    }
  };

  const handleRemoveEmployee = async (employeeId: string) => {
    if (
      !confirm(t('company', 'confirmRemove') || 'Are you sure you want to remove this employee?')
    ) {
      return;
    }

    try {
      await employeeApi.remove(employeeId);
      toast({
        title: t('common', 'success') || 'Success',
        description: t('company', 'employeeRemoved') || 'Employee removed',
        variant: 'success',
      });
      loadData();
    } catch (error: any) {
      console.error('Error removing employee:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description:
          error.response?.data?.message ||
          t('company', 'removeError') ||
          'Failed to remove employee',
        variant: 'destructive',
      });
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    if (filter === 'all') return true;
    return emp.status === filter;
  });

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">{t('common', 'loading') || 'Loading...'}</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
            {t('company', 'employees') || 'Employees'}
          </h1>
          <p className="text-muted-foreground">
            {t('company', 'manageTeam') || 'Manage your team members'}
          </p>
        </div>
        <Button className="w-full sm:w-auto shrink-0" onClick={() => setShowInviteModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('company', 'inviteEmployee') || 'Invite Employee'}
        </Button>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <Users className="mb-3 h-5 w-5 text-muted-foreground" />
          <div className="font-display text-2xl font-extrabold text-foreground">
            {employees.length}
          </div>
          <div className="text-xs font-medium text-muted-foreground">
            {t('company', 'totalEmployees') || 'Total'}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <UserCheck className="mb-3 h-5 w-5 text-success" />
          <div className="font-display text-2xl font-extrabold text-foreground">
            {employees.filter((e) => e.status === 'ACTIVE').length}
          </div>
          <div className="text-xs font-medium text-muted-foreground">
            {t('company', 'activeEmployees') || 'Active'}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <Clock className="mb-3 h-5 w-5 text-warning" />
          <div className="font-display text-2xl font-extrabold text-foreground">
            {employees.filter((e) => e.status === 'PENDING_INVITATION').length}
          </div>
          <div className="text-xs font-medium text-muted-foreground">
            {t('company', 'pendingInvitations') || 'Pending'}
          </div>
        </div>
        <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
          <ShieldCheck className="mb-3 h-5 w-5 opacity-80" />
          <div className="font-display text-2xl font-extrabold">
            {employees.filter((e) => ['OWNER', 'MANAGER'].includes(e.role)).length}
          </div>
          <div className="text-xs font-medium opacity-80">
            {t('company', 'managers') || 'Managers'}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          className="rounded-full"
          onClick={() => setFilter('all')}
        >
          {t('common', 'all') || 'All'}
        </Button>
        <Button
          variant={filter === 'ACTIVE' ? 'default' : 'outline'}
          size="sm"
          className="rounded-full"
          onClick={() => setFilter('ACTIVE')}
        >
          {t('company', 'active') || 'Active'}
        </Button>
        <Button
          variant={filter === 'PENDING_INVITATION' ? 'default' : 'outline'}
          size="sm"
          className="rounded-full"
          onClick={() => setFilter('PENDING_INVITATION')}
        >
          {t('company', 'pending') || 'Pending'}
        </Button>
      </div>

      {/* Employees List */}
      {filteredEmployees.length === 0 ? (
        <Card className="rounded-2xl border-border">
          <CardContent className="flex flex-col items-center py-14 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Users className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              {t('company', 'noEmployeesFound') || 'No employees found'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEmployees.map((employee) => (
            <Card key={employee.id} className="rounded-2xl border-border">
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted font-display text-lg font-bold text-foreground shrink-0">
                      {employee.user?.firstName?.[0]}
                      {employee.user?.lastName?.[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="font-display font-bold text-foreground">
                        {employee.user?.firstName} {employee.user?.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">{employee.user?.email}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge className={ROLE_COLORS[employee.role]}>{employee.role}</Badge>
                        <Badge className={STATUS_COLORS[employee.status]}>
                          {employee.status.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {employee.paymentModel} • {employee.commissionRate}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {employee.status === 'PENDING_INVITATION' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        onClick={() => handleResendInvitation(employee.id)}
                      >
                        {t('company', 'resend') || 'Resend'}
                      </Button>
                    )}
                    {employee.role !== 'OWNER' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-xl text-destructive hover:text-destructive"
                        onClick={() => handleRemoveEmployee(employee.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {employee.specialties && employee.specialties.length > 0 && (
                  <div className="mt-3 ml-16 flex flex-wrap gap-1.5">
                    {employee.specialties.map((spec) => (
                      <Badge key={spec.id} variant="outline" className="text-xs">
                        {spec.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md rounded-2xl border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display text-lg font-bold">
                {t('company', 'inviteEmployee') || 'Invite Employee'}
              </CardTitle>
              <button
                onClick={() => setShowInviteModal(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={t('common', 'cancel') || 'Cancel'}
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {t('company', 'email') || 'Email'} *
                </label>
                <Input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="employee@example.com"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  {t('company', 'emailNote') || 'User must already have an artisan account'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {t('company', 'role') || 'Role'} *
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, role: e.target.value as EmployeeRole })
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="TECHNICIAN">{t('company', 'technician') || 'Technician'}</option>
                  <option value="SUPERVISOR">{t('company', 'supervisor') || 'Supervisor'}</option>
                  <option value="MANAGER">{t('company', 'manager') || 'Manager'}</option>
                  <option value="CONTRACTOR">{t('company', 'contractor') || 'Contractor'}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {t('company', 'paymentModel') || 'Payment Model'} *
                </label>
                <select
                  value={inviteForm.paymentModel}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, paymentModel: e.target.value as PaymentModel })
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="COMMISSION">
                    {t('company', 'commission') || 'Commission Only'}
                  </option>
                  <option value="SALARY">{t('company', 'salary') || 'Salary Only'}</option>
                  <option value="HYBRID">{t('company', 'hybrid') || 'Salary + Commission'}</option>
                </select>
              </div>

              {(inviteForm.paymentModel === 'COMMISSION' ||
                inviteForm.paymentModel === 'HYBRID') && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    {t('company', 'commissionRate') || 'Commission Rate (%)'} *
                  </label>
                  <Input
                    type="number"
                    value={inviteForm.commissionRate}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, commissionRate: parseInt(e.target.value) })
                    }
                    min="0"
                    max="100"
                  />
                </div>
              )}

              {(inviteForm.paymentModel === 'SALARY' || inviteForm.paymentModel === 'HYBRID') && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    {t('company', 'baseSalary') || 'Base Salary (€/month)'} *
                  </label>
                  <Input
                    type="number"
                    value={inviteForm.baseSalary || ''}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, baseSalary: parseInt(e.target.value) })
                    }
                    min="0"
                  />
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setShowInviteModal(false)}>
                  {t('common', 'cancel') || 'Cancel'}
                </Button>
                <Button onClick={handleInvite} disabled={inviting}>
                  {inviting
                    ? t('common', 'sending') || 'Sending...'
                    : t('company', 'sendInvitation') || 'Send Invitation'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
