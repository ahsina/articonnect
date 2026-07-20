'use client';

import { useEffect, useState } from 'react';
import { adminApi, UserWithStats } from '@/lib/api/admin';
import apiClient from '@/lib/api/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Search } from 'lucide-react';

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

  const handleChangeRole = async (userId: string, newRole: string) => {
    if (!confirm(`Confirmer le changement de rôle vers ${newRole} ?`)) {
      return;
    }
    try {
      // Endpoint admin dédié : PUT /admin/users/:id/role { role } (audité côté back).
      await apiClient.put(`/admin/users/${userId}/role`, { role: newRole });
      toast({
        title: t('common', 'success'),
        description: `Rôle mis à jour: ${newRole}`,
      });
      loadUsers();
    } catch (error) {
      console.error('Error changing role:', error);
      toast({
        title: t('common', 'error'),
        description: 'Échec du changement de rôle',
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            {t('admin', 'userManagement')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('admin', 'manageModerateAccounts')}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('admin', 'users')}
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground">
            {users.length}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('admin', 'clients')}
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-primary">
            {users.filter((u) => u.role === 'CLIENT').length}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('admin', 'artisans')}
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-warning">
            {users.filter((u) => u.role === 'ARTISAN').length}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('admin', 'suspended')}
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-destructive">
            {users.filter((u) => u.suspended).length}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              {t('common', 'search')}
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={t('admin', 'searchByEmailOrName')}
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              {t('admin', 'role')}
            </label>
            <select
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-foreground"
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
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              {t('admin', 'status')}
            </label>
            <select
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-foreground"
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
          </div>

          <div className="flex items-end">
            <Button className="w-full" onClick={loadUsers}>
              {t('admin', 'refresh')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border p-5">
          <h2 className="font-display text-base font-bold text-foreground">
            {t('admin', 'userList')}
          </h2>
          <Badge variant="secondary">{users.length} résultats</Badge>
        </div>
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {t('common', 'loading')}
          </div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {t('admin', 'noUsersFound')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {t('admin', 'user')}
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {t('admin', 'email')}
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {t('admin', 'role')}
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {t('admin', 'status')}
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {t('admin', 'registration')}
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {t('admin', 'actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {user.firstName[0]}
                          {user.lastName[0]}
                        </div>
                        <div className="font-medium text-foreground whitespace-nowrap">
                          {user.firstName} {user.lastName}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle text-muted-foreground whitespace-nowrap">
                      {user.email}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <Badge variant={getRoleBadge(user.role)}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {user.suspended ? (
                        <Badge variant="error">{t('admin', 'suspendedStatus')}</Badge>
                      ) : user.emailVerified ? (
                        <Badge variant="success">{t('admin', 'verifiedStatus')}</Badge>
                      ) : (
                        <Badge variant="warning">{t('admin', 'notVerifiedStatus')}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-2">
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
                        {/* Changement de rôle (promotion / rétrogradation) */}
                        <select
                          aria-label="Changer le rôle"
                          className="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-foreground"
                          value={user.role}
                          onChange={(e) => {
                            if (e.target.value !== user.role) {
                              handleChangeRole(user.id, e.target.value);
                            }
                          }}
                        >
                          <option value="CLIENT">CLIENT</option>
                          <option value="ARTISAN">ARTISAN</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
