'use client';

import { useEffect, useState } from 'react';
import { adminApi, UserWithStats } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

export default function AdminUsersPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    role: '',
    suspended: undefined as boolean | undefined,
    search: '',
  });

  useEffect(() => {
    loadUsers();
  }, [filters]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getUsers(filters);
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (userId: string) => {
    if (!confirm(t('admin', 'confirmSuspend'))) {
      return;
    }

    try {
      const reason = prompt(t('admin', 'suspensionReason'));
      if (!reason) return;

      await adminApi.suspendUser(userId, reason);
      toast({
        title: t('common', 'success'),
        description: t('admin', 'userSuspended'),
      });
      loadUsers();
    } catch (error) {
      console.error('Error suspending user:', error);
      toast({
        title: t('common', 'error'),
        description: t('admin', 'suspensionError'),
        variant: 'destructive',
      });
    }
  };

  const handleUnsuspend = async (userId: string) => {
    if (!confirm(t('admin', 'confirmReactivate'))) {
      return;
    }

    try {
      await adminApi.unsuspendUser(userId);
      toast({
        title: t('common', 'success'),
        description: t('admin', 'userReactivated'),
      });
      loadUsers();
    } catch (error) {
      console.error('Error unsuspending user:', error);
      toast({
        title: t('common', 'error'),
        description: t('admin', 'reactivationError'),
        variant: 'destructive',
      });
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: any = {
      ADMIN: 'error',
      ARTISAN: 'warning',
      CLIENT: 'info',
    };
    return variants[role] || 'default';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return t('admin', 'never');
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            {t('admin', 'userManagement')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('admin', 'manageModerateAccounts')}
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                placeholder={t('admin', 'searchByEmailOrName')}
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
              />

              <select
                className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                value={filters.role}
                onChange={(e) =>
                  setFilters({ ...filters, role: e.target.value })
                }
              >
                <option value="">{t('admin', 'allRoles')}</option>
                <option value="CLIENT">{t('admin', 'clients')}</option>
                <option value="ARTISAN">{t('admin', 'artisans')}</option>
                <option value="ADMIN">{t('admin', 'administrators')}</option>
              </select>

              <select
                className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                value={
                  filters.suspended === undefined
                    ? ''
                    : filters.suspended.toString()
                }
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    suspended:
                      e.target.value === ''
                        ? undefined
                        : e.target.value === 'true',
                  })
                }
              >
                <option value="">{t('admin', 'allStatuses')}</option>
                <option value="false">{t('admin', 'actives')}</option>
                <option value="true">{t('admin', 'suspended')}</option>
              </select>

              <Button onClick={loadUsers}>{t('admin', 'refresh')}</Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground">
                {users.length}
              </div>
              <div className="text-sm text-muted-foreground">{t('admin', 'users')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">
                {users.filter((u) => u.role === 'CLIENT').length}
              </div>
              <div className="text-sm text-muted-foreground">{t('admin', 'clients')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground">
                {users.filter((u) => u.role === 'ARTISAN').length}
              </div>
              <div className="text-sm text-muted-foreground">{t('admin', 'artisans')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground">
                {users.filter((u) => u.suspended).length}
              </div>
              <div className="text-sm text-muted-foreground">{t('admin', 'suspended')}</div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin', 'userList')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('common', 'loading')}
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('admin', 'noUsersFound')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-background border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        {t('admin', 'user')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        {t('admin', 'email')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        {t('admin', 'role')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        {t('admin', 'status')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        {t('admin', 'registration')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        {t('admin', 'actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-accent">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                              {user.firstName[0]}
                              {user.lastName[0]}
                            </div>
                            <div className="ml-3">
                              <div className="font-medium text-foreground">
                                {user.firstName} {user.lastName}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {user.email}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Badge variant={getRoleBadge(user.role)}>
                            {user.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {user.suspended ? (
                            <Badge variant="error">{t('admin', 'suspendedStatus')}</Badge>
                          ) : user.emailVerified ? (
                            <Badge variant="success">{t('admin', 'verifiedStatus')}</Badge>
                          ) : (
                            <Badge variant="warning">{t('admin', 'notVerifiedStatus')}</Badge>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          {user.suspended ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnsuspend(user.id)}
                            >
                              {t('admin', 'reactivate')}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleSuspend(user.id)}
                            >
                              {t('admin', 'suspend')}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
