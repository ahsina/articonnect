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
      OWNER: 'bg-purple-100 text-purple-800',
      MANAGER: 'bg-blue-100 text-blue-800',
      SUPERVISOR: 'bg-green-100 text-green-800',
      TECHNICIAN: 'bg-gray-100 text-gray-800',
      CONTRACTOR: 'bg-orange-100 text-orange-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      INACTIVE: 'bg-gray-100 text-gray-800',
      TERMINATED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600">{t('common', 'loading') || 'Loading...'}</div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">
            {t('company', 'employeeNotFound') || 'Employee not found'}
          </p>
          <Button onClick={() => router.push('/artisan/company/employees')} className="mt-4">
            {t('common', 'back') || 'Back'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/artisan/company/employees')}>
            ← {t('common', 'back') || 'Back'}
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {employee.user.firstName} {employee.user.lastName}
            </h1>
            <p className="text-gray-600">{employee.user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getRoleBadge(employee.role)}>{employee.role}</Badge>
          <Badge className={getStatusBadge(employee.status)}>{employee.status}</Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium ${activeTab === 'overview' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
        >
          {t('company', 'overview') || 'Overview'}
        </button>
        <button
          onClick={() => setActiveTab('edit')}
          className={`px-4 py-2 font-medium ${activeTab === 'edit' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
        >
          {t('company', 'edit') || 'Edit'}
        </button>
        <button
          onClick={() => setActiveTab('earnings')}
          className={`px-4 py-2 font-medium ${activeTab === 'earnings' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
        >
          {t('company', 'earnings') || 'Earnings'}
        </button>
        <button
          onClick={() => setActiveTab('shifts')}
          className={`px-4 py-2 font-medium ${activeTab === 'shifts' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
        >
          {t('company', 'shifts') || 'Shifts'}
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t('company', 'performance') || 'Performance'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats?.totalMissions || 0}
                  </div>
                  <div className="text-sm text-gray-600">
                    {t('company', 'totalMissions') || 'Total Missions'}
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {stats?.completedMissions || 0}
                  </div>
                  <div className="text-sm text-gray-600">
                    {t('company', 'completed') || 'Completed'}
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {stats?.activeMissions || 0}
                  </div>
                  <div className="text-sm text-gray-600">{t('company', 'active') || 'Active'}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {stats?.averageRating ? stats.averageRating.toFixed(1) : 'N/A'}
                  </div>
                  <div className="text-sm text-gray-600">{t('company', 'rating') || 'Rating'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Earnings Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t('company', 'earningsSummary') || 'Earnings Summary'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">
                    {t('company', 'totalEarnings') || 'Total Earnings'}
                  </span>
                  <span className="font-semibold">
                    €{stats?.totalEarnings?.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">
                    {t('company', 'pendingPayment') || 'Pending Payment'}
                  </span>
                  <span className="font-semibold">
                    €{stats?.pendingEarnings?.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">
                    {t('company', 'paymentModel') || 'Payment Model'}
                  </span>
                  <Badge variant="outline">{employee.paymentModel}</Badge>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">
                    {t('company', 'commissionRate') || 'Commission Rate'}
                  </span>
                  <span className="font-semibold">{employee.commissionRate || 0}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employee Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t('company', 'employeeInfo') || 'Employee Information'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">
                    {t('company', 'joinedDate') || 'Joined Date'}
                  </span>
                  <span>{new Date(employee.joinedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">{t('company', 'phone') || 'Phone'}</span>
                  <span>{employee.user.phone || 'N/A'}</span>
                </div>
                {employee.baseSalary && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">
                      {t('company', 'baseSalary') || 'Base Salary'}
                    </span>
                    <span>€{employee.baseSalary.toLocaleString()}/month</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Permissions Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t('company', 'permissions') || 'Permissions'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-gray-600">
                    {t('company', 'canAcceptMissions') || 'Can Accept Missions'}
                  </span>
                  <span className={employee.canAcceptMissions ? 'text-green-600' : 'text-red-600'}>
                    {employee.canAcceptMissions ? '✓ Yes' : '✗ No'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-gray-600">
                    {t('company', 'canViewFinancials') || 'Can View Financials'}
                  </span>
                  <span className={employee.canViewFinancials ? 'text-green-600' : 'text-red-600'}>
                    {employee.canViewFinancials ? '✓ Yes' : '✗ No'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600">
                    {t('company', 'canManageTeam') || 'Can Manage Team'}
                  </span>
                  <span className={employee.canManageTeam ? 'text-green-600' : 'text-red-600'}>
                    {employee.canManageTeam ? '✓ Yes' : '✗ No'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Tab */}
      {activeTab === 'edit' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('company', 'editEmployee') || 'Edit Employee'}</CardTitle>
            <CardDescription>
              {t('company', 'editEmployeeDesc') || 'Update employee role and payment settings'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('company', 'role') || 'Role'}
                </label>
                <select
                  value={editForm.role || employee.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TECHNICIAN">Technician</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="MANAGER">Manager</option>
                  <option value="CONTRACTOR">Contractor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('company', 'paymentModel') || 'Payment Model'}
                </label>
                <select
                  value={editForm.paymentModel || employee.paymentModel}
                  onChange={(e) => setEditForm({ ...editForm, paymentModel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="COMMISSION">Commission Only</option>
                  <option value="SALARY">Salary Only</option>
                  <option value="HYBRID">Hybrid (Salary + Commission)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">
                {t('company', 'permissions') || 'Permissions'}
              </h4>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={editForm.canAcceptMissions ?? employee.canAcceptMissions ?? true}
                    onChange={(e) =>
                      setEditForm({ ...editForm, canAcceptMissions: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    {t('company', 'canAcceptMissions') || 'Can accept and manage missions'}
                  </span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={editForm.canViewFinancials ?? employee.canViewFinancials ?? false}
                    onChange={(e) =>
                      setEditForm({ ...editForm, canViewFinancials: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    {t('company', 'canViewFinancials') || 'Can view financial reports'}
                  </span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={editForm.canManageTeam ?? employee.canManageTeam ?? false}
                    onChange={(e) => setEditForm({ ...editForm, canManageTeam: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    {t('company', 'canManageTeam') || 'Can manage team members'}
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="destructive" onClick={handleRemove}>
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
        <Card>
          <CardHeader>
            <CardTitle>{t('company', 'earningsHistory') || 'Earnings History'}</CardTitle>
            <CardDescription>
              {t('company', 'earningsHistoryDesc') || 'View all earnings for this employee'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {earnings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {t('company', 'noEarnings') || 'No earnings recorded yet'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">{t('company', 'date') || 'Date'}</th>
                      <th className="text-left py-3 px-4">
                        {t('company', 'mission') || 'Mission'}
                      </th>
                      <th className="text-right py-3 px-4">{t('company', 'amount') || 'Amount'}</th>
                      <th className="text-right py-3 px-4">
                        {t('company', 'commission') || 'Commission'}
                      </th>
                      <th className="text-center py-3 px-4">
                        {t('company', 'status') || 'Status'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {earnings.map((earning) => (
                      <tr key={earning.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          {new Date(earning.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">{earning.missionTitle}</td>
                        <td className="py-3 px-4 text-right">
                          €{earning.grossAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          €{earning.netAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            className={
                              earning.status === 'PAID'
                                ? 'bg-green-100 text-green-800'
                                : earning.status === 'PENDING'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
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
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('company', 'shiftSchedule') || 'Shift Schedule'}</CardTitle>
                <CardDescription>
                  {t('company', 'shiftScheduleDesc') || 'View and manage employee shifts'}
                </CardDescription>
              </div>
              <Button
                onClick={() => router.push(`/artisan/company/employees/${employeeId}/shifts`)}
              >
                {t('company', 'manageShifts') || 'Manage Shifts'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              {t('company', 'viewShiftsPage') ||
                'Click "Manage Shifts" to view and edit the shift schedule'}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
