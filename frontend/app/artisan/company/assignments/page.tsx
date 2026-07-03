'use client';

import { CategoryLabel } from '@/components/shared/CategoryLabel';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { companyApi, Company, CompanyEmployee } from '@/lib/api/company';
import { employeeApi } from '@/lib/api/employee';
import { missionsApi } from '@/lib/api/missions';
import apiClient from '@/lib/api/client';
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
  PENDING: 'bg-amber-100 text-amber-800',
  ACCEPTED: 'bg-primary/10 text-primary',
  IN_PROGRESS: 'bg-purple-100 text-purple-700',
  COMPLETED: 'bg-green-100 text-green-700',
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
      await apiClient.post(`/missions/assignment/${missionId}/assign-to-employee`, {
        employeeId,
      });
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
        <div className="text-muted-foreground">{t('common', 'loading') || 'Loading...'}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          {t('company', 'missionAssignments') || 'Mission Assignments'}
        </h1>
        <p className="text-muted-foreground">
          {t('company', 'assignMissionsDesc') || 'Assign missions to your team members'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">
              {t('company', 'unassignedMissions') || 'Unassigned'}
            </div>
            <div className="text-2xl font-bold text-foreground">
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
            <div className="text-sm text-muted-foreground">
              {t('company', 'assignedMissions') || 'Assigned'}
            </div>
            <div className="text-2xl font-bold text-primary">
              {missions.filter((m) => m.assignedToId).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">
              {t('company', 'availableEmployees') || 'Available Employees'}
            </div>
            <div className="text-2xl font-bold text-foreground">{employees.length}</div>
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
            <div className="text-center py-8 text-muted-foreground">
              {t('company', 'noMissionsFound') || 'No missions found'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMissions.map((mission) => (
                <div key={mission.id} className="p-4 border rounded-lg hover:bg-accent">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-foreground">{mission.title}</h4>
                        <Badge className={STATUS_COLORS[mission.status]}>{translateMissionStatus(mission.status, t)}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{mission.description}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{mission.city}</span>
                        <span><CategoryLabel value={mission.category} /></span>
                        {mission.scheduledDate && (
                          <span>{formatDate(mission.scheduledDate)}</span>
                        )}
                        {mission.agreedPrice && (
                          <span className="text-green-600 font-medium">
                            {mission.agreedPrice}€
                          </span>
                        )}
                      </div>
                      {mission.client && (
                        <div className="mt-2 text-sm text-muted-foreground">
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
              <p className="text-sm text-muted-foreground">{selectedMission.title}</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {t('company', 'selectEmployee') || 'Select an employee to assign this mission to:'}
              </p>

              {employees.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  {t('company', 'noAvailableEmployees') || 'No available employees'}
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {employees.map((employee) => (
                    <button
                      key={employee.id}
                      onClick={() => handleAssign(selectedMission.id, employee.id)}
                      className="w-full p-3 border rounded-lg hover:bg-primary/10 hover:border-primary transition text-left"
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
                          <div className="text-sm text-muted-foreground">{translateEmployeeRole(employee.role, t)}</div>
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
