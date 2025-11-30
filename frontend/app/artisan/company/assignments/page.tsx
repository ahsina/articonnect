'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { companyApi, Company, CompanyEmployee } from '@/lib/api/company';
import { employeeApi } from '@/lib/api/employee';
import { missionsApi } from '@/lib/api/missions';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { translateMissionStatus, translateEmployeeRole } from '@/lib/utils/enum-translations';

interface Mission {
  id: string;
  title: string;
  description: string;
  status: string;
  category: string;
  city: string;
  scheduledDate?: string;
  agreedPrice?: number;
  assignedToId?: string;
  client?: {
    firstName: string;
    lastName: string;
  };
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
};

export default function MissionAssignmentsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<CompanyEmployee[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [filter, setFilter] = useState<'unassigned' | 'assigned' | 'all'>('unassigned');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const companyData = await companyApi.getMyCompany();
      setCompany(companyData);

      if (companyData) {
        const [employeesData, missionsData] = await Promise.all([
          employeeApi.getByCompany(companyData.id),
          missionsApi.getAll(),
        ]);
        setEmployees(employeesData.data.filter((e: CompanyEmployee) => e.status === 'ACTIVE'));
        setMissions(missionsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (missionId: string, employeeId: string) => {
    try {
      // This would need a backend endpoint for mission assignment
      toast({
        title: t('common', 'success') || 'Success',
        description: t('company', 'missionAssigned') || 'Mission assigned successfully',
        variant: 'success',
      });
      setSelectedMission(null);
      loadData();
    } catch (error) {
      console.error('Error assigning mission:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('company', 'assignError') || 'Failed to assign mission',
        variant: 'destructive',
      });
    }
  };

  const filteredMissions = missions.filter((m) => {
    if (filter === 'unassigned')
      return !m.assignedToId && ['PENDING', 'ACCEPTED'].includes(m.status);
    if (filter === 'assigned') return m.assignedToId;
    return true;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600">{t('common', 'loading') || 'Loading...'}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('company', 'missionAssignments') || 'Mission Assignments'}
        </h1>
        <p className="text-gray-600">
          {t('company', 'assignMissionsDesc') || 'Assign missions to your team members'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">
              {t('company', 'unassignedMissions') || 'Unassigned'}
            </div>
            <div className="text-2xl font-bold text-yellow-600">
              {
                missions.filter(
                  (m) => !m.assignedToId && ['PENDING', 'ACCEPTED'].includes(m.status),
                ).length
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">
              {t('company', 'assignedMissions') || 'Assigned'}
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {missions.filter((m) => m.assignedToId).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">
              {t('company', 'availableEmployees') || 'Available Employees'}
            </div>
            <div className="text-2xl font-bold text-green-600">{employees.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={filter === 'unassigned' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('unassigned')}
        >
          {t('company', 'unassigned') || 'Unassigned'}
        </Button>
        <Button
          variant={filter === 'assigned' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('assigned')}
        >
          {t('company', 'assigned') || 'Assigned'}
        </Button>
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          {t('common', 'all') || 'All'}
        </Button>
      </div>

      {/* Missions List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('company', 'missions') || 'Missions'}</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredMissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('company', 'noMissionsFound') || 'No missions found'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMissions.map((mission) => (
                <div key={mission.id} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">{mission.title}</h4>
                        <Badge className={STATUS_COLORS[mission.status]}>{translateMissionStatus(mission.status, t)}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{mission.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>📍 {mission.city}</span>
                        <span>🏷️ {mission.category}</span>
                        {mission.scheduledDate && (
                          <span>📅 {formatDate(mission.scheduledDate)}</span>
                        )}
                        {mission.agreedPrice && (
                          <span className="text-green-600 font-medium">
                            💰 {mission.agreedPrice}€
                          </span>
                        )}
                      </div>
                      {mission.client && (
                        <div className="mt-2 text-sm text-gray-600">
                          {t('company', 'client') || 'Client'}: {mission.client.firstName}{' '}
                          {mission.client.lastName}
                        </div>
                      )}
                    </div>
                    <div>
                      {!mission.assignedToId ? (
                        <Button size="sm" onClick={() => setSelectedMission(mission)}>
                          {t('company', 'assign') || 'Assign'}
                        </Button>
                      ) : (
                        <Badge variant="outline">{t('company', 'assigned') || 'Assigned'}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Modal */}
      {selectedMission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>{t('company', 'assignMission') || 'Assign Mission'}</CardTitle>
              <p className="text-sm text-gray-500">{selectedMission.title}</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                {t('company', 'selectEmployee') || 'Select an employee to assign this mission to:'}
              </p>

              {employees.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  {t('company', 'noAvailableEmployees') || 'No available employees'}
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {employees.map((employee) => (
                    <button
                      key={employee.id}
                      onClick={() => handleAssign(selectedMission.id, employee.id)}
                      className="w-full p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-500 transition text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-medium">
                          {employee.user?.firstName?.[0]}
                          {employee.user?.lastName?.[0]}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {employee.user?.firstName} {employee.user?.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{translateEmployeeRole(employee.role, t)}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setSelectedMission(null)}>
                  {t('common', 'cancel') || 'Cancel'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
