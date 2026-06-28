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

const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-purple-500/15 text-purple-400',
  MANAGER: 'bg-primary/10 text-primary',
  SUPERVISOR: 'bg-primary/15 text-primary',
  TECHNICIAN: 'bg-green-500/15 text-green-400',
  CONTRACTOR: 'bg-muted text-foreground',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-500/15 text-green-400',
  INACTIVE: 'bg-muted text-foreground',
  TERMINATED: 'bg-red-500/15 text-red-400',
  PENDING_INVITATION: 'bg-yellow-500/15 text-yellow-400',
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
    <div className="p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('company', 'employees') || 'Employees'}
          </h1>
          <p className="text-muted-foreground">
            {t('company', 'manageTeam') || 'Manage your team members'}
          </p>
        </div>
        <Button onClick={() => setShowInviteModal(true)}>
          + {t('company', 'inviteEmployee') || 'Invite Employee'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">{t('company', 'totalEmployees') || 'Total'}</div>
            <div className="text-2xl font-bold text-foreground">{employees.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">
              {t('company', 'activeEmployees') || 'Active'}
            </div>
            <div className="text-2xl font-bold text-green-600">
              {employees.filter((e) => e.status === 'ACTIVE').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">
              {t('company', 'pendingInvitations') || 'Pending'}
            </div>
            <div className="text-2xl font-bold text-yellow-600">
              {employees.filter((e) => e.status === 'PENDING_INVITATION').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">{t('company', 'managers') || 'Managers'}</div>
            <div className="text-2xl font-bold text-primary">
              {employees.filter((e) => ['OWNER', 'MANAGER'].includes(e.role)).length}
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
          variant={filter === 'ACTIVE' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('ACTIVE')}
        >
          {t('company', 'active') || 'Active'}
        </Button>
        <Button
          variant={filter === 'PENDING_INVITATION' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('PENDING_INVITATION')}
        >
          {t('company', 'pending') || 'Pending'}
        </Button>
      </div>

      {/* Employees List */}
      <Card>
        <CardContent className="p-0">
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('company', 'noEmployeesFound') || 'No employees found'}
            </div>
          ) : (
            <div className="divide-y">
              {filteredEmployees.map((employee) => (
                <div key={employee.id} className="p-4 hover:bg-accent">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {employee.user?.firstName?.[0]}
                        {employee.user?.lastName?.[0]}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {employee.user?.firstName} {employee.user?.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">{employee.user?.email}</div>
                        <div className="flex items-center gap-2 mt-1">
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
                          onClick={() => handleResendInvitation(employee.id)}
                        >
                          {t('company', 'resend') || 'Resend'}
                        </Button>
                      )}
                      {employee.role !== 'OWNER' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveEmployee(employee.id)}
                        >
                          🗑️
                        </Button>
                      )}
                    </div>
                  </div>
                  {employee.specialties && employee.specialties.length > 0 && (
                    <div className="mt-2 ml-16 flex gap-1 flex-wrap">
                      {employee.specialties.map((spec) => (
                        <Badge key={spec.id} variant="outline" className="text-xs">
                          {spec.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{t('company', 'inviteEmployee') || 'Invite Employee'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('company', 'email') || 'Email'} *
                </label>
                <Input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="employee@example.com"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('company', 'emailNote') || 'User must already have an artisan account'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('company', 'role') || 'Role'} *
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, role: e.target.value as EmployeeRole })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="TECHNICIAN">{t('company', 'technician') || 'Technician'}</option>
                  <option value="SUPERVISOR">{t('company', 'supervisor') || 'Supervisor'}</option>
                  <option value="MANAGER">{t('company', 'manager') || 'Manager'}</option>
                  <option value="CONTRACTOR">{t('company', 'contractor') || 'Contractor'}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('company', 'paymentModel') || 'Payment Model'} *
                </label>
                <select
                  value={inviteForm.paymentModel}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, paymentModel: e.target.value as PaymentModel })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                  <label className="block text-sm font-medium text-foreground mb-1">
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
                  <label className="block text-sm font-medium text-foreground mb-1">
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

              <div className="flex gap-2 justify-end pt-4">
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
