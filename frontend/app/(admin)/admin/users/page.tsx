'use client';

import { useEffect, useState } from 'react';
import { adminApi, UserWithStats } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AdminUsersPage() {
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
    if (!confirm('Êtes-vous sûr de vouloir suspendre cet utilisateur ?')) {
      return;
    }

    try {
      const reason = prompt('Raison de la suspension :');
      if (!reason) return;

      await adminApi.suspendUser(userId, reason);
      loadUsers();
    } catch (error) {
      console.error('Error suspending user:', error);
      alert('Erreur lors de la suspension');
    }
  };

  const handleUnsuspend = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir réactiver cet utilisateur ?')) {
      return;
    }

    try {
      await adminApi.unsuspendUser(userId);
      loadUsers();
    } catch (error) {
      console.error('Error unsuspending user:', error);
      alert('Erreur lors de la réactivation');
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
    if (!dateString) return 'Jamais';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Gestion des utilisateurs
          </h1>
          <p className="text-gray-600 mt-2">
            Gérer et modérer les comptes utilisateurs
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                placeholder="Rechercher par email ou nom..."
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
              />

              <select
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.role}
                onChange={(e) =>
                  setFilters({ ...filters, role: e.target.value })
                }
              >
                <option value="">Tous les rôles</option>
                <option value="CLIENT">Clients</option>
                <option value="ARTISAN">Artisans</option>
                <option value="ADMIN">Administrateurs</option>
              </select>

              <select
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <option value="">Tous les statuts</option>
                <option value="false">Actifs</option>
                <option value="true">Suspendus</option>
              </select>

              <Button onClick={loadUsers}>Rafraîchir</Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {users.length}
              </div>
              <div className="text-sm text-gray-600">Utilisateurs</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {users.filter((u) => u.role === 'CLIENT').length}
              </div>
              <div className="text-sm text-gray-600">Clients</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {users.filter((u) => u.role === 'ARTISAN').length}
              </div>
              <div className="text-sm text-gray-600">Artisans</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {users.filter((u) => u.suspended).length}
              </div>
              <div className="text-sm text-gray-600">Suspendus</div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des utilisateurs</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                Chargement...
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucun utilisateur trouvé
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Utilisateur
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Rôle
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Statut
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Inscription
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                              {user.firstName[0]}
                              {user.lastName[0]}
                            </div>
                            <div className="ml-3">
                              <div className="font-medium text-gray-900">
                                {user.firstName} {user.lastName}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {user.email}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Badge variant={getRoleBadge(user.role)}>
                            {user.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {user.suspended ? (
                            <Badge variant="error">Suspendu</Badge>
                          ) : user.emailVerified ? (
                            <Badge variant="success">Vérifié</Badge>
                          ) : (
                            <Badge variant="warning">Non vérifié</Badge>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          {user.suspended ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnsuspend(user.id)}
                            >
                              Réactiver
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleSuspend(user.id)}
                            >
                              Suspendre
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
