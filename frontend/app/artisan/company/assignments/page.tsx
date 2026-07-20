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
    <div className="p-6 max-w-[1180px] mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-display font-extrabold tracking-tight text-foreground">
          {t('company', 'missionAssignments') || 'Mission Assignments'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('company', 'assignMissionsDesc') || 'Assign missions to your team members'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card className="rounded-2xl">
          <CardContent className="p-[18px]">
            <div className="text-[12.5px] font-semibold text-muted-foreground">
              {t('company', 'unassignedMissions') || 'Unassigned'}
            </div>
            <div className="text-[28px] font-display font-extrabold tracking-tight text-foreground mt-2">
              {
                missions.filter(
                  (m) => !m.assignedToId && ['PENDING', 'ACCEPTED'].includes(m.status),
                ).length
              }
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-[18px]">
            <div className="text-[12.5px] font-semibold text-muted-foreground">
              {t('company', 'assignedMissions') || 'Assigned'}
            </div>
            <div className="text-[28px] font-display font-extrabold tracking-tight text-primary mt-2">
              {missions.filter((m) => m.assignedToId).length}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-[18px]">
            <div className="text-[12.5px] font-semibold text-muted-foreground">
              {t('company', 'availableEmployees') || 'Available Employees'}
            </div>
            <div className="text-[28px] font-display font-extrabold tracking-tight text-foreground mt-2">
              {employees.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter('unassigned')}
          className={`px-3.5 py-2 rounded-full border text-[13px] font-semibold transition-colors ${filter === 'unassigned' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:bg-muted'}`}
        >
          {t('company', 'unassigned') || 'Unassigned'}
        </button>
        <button
          onClick={() => setFilter('assigned')}
          className={`px-3.5 py-2 rounded-full border text-[13px] font-semibold transition-colors ${filter === 'assigned' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:bg-muted'}`}
        >
          {t('company', 'assigned') || 'Assigned'}
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-2 rounded-full border text-[13px] font-semibold transition-colors ${filter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:bg-muted'}`}
        >
          {t('common', 'all') || 'All'}
        </button>
      </div>

      {/* Missions List */}
      {filteredMissions.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="text-center py-12 text-muted-foreground">
            {t('company', 'noMissionsFound') || 'No missions found'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3.5">
          {filteredMissions.map((mission) => (
            <Card key={mission.id} className="rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <h4 className="font-display font-extrabold tracking-tight text-[15px] text-foreground">
                        {mission.title}
                      </h4>
                      <Badge className={STATUS_COLORS[mission.status]}>
                        {translateMissionStatus(mission.status, t)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{mission.description}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <svg
                          className="w-3.5 h-3.5 stroke-current fill-none"
                          strokeWidth="1.8"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 21s7-6.3 7-12a7 7 0 1 0-14 0c0 5.7 7 12 7 12Z" />
                          <circle cx="12" cy="9" r="2.5" />
                        </svg>
                        {mission.city}
                      </span>
                      <span>
                        <CategoryLabel value={mission.category} />
                      </span>
                      {mission.scheduledDate && <span>{formatDate(mission.scheduledDate)}</span>}
                      {mission.agreedPrice && (
                        <span className="text-success font-semibold">{mission.agreedPrice}€</span>
                      )}
                    </div>
                    {mission.client && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        {t('company', 'client') || 'Client'}: {mission.client.firstName}{' '}
                        {mission.client.lastName}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0">
                    {!mission.assignedToId ? (
                      <Button size="sm" onClick={() => setSelectedMission(mission)}>
                        + {t('company', 'assign') || 'Assign'}
                      </Button>
                    ) : (
                      <Badge variant="outline">{t('company', 'assigned') || 'Assigned'}</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Assign Modal */}
      {selectedMission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg rounded-2xl shadow-xl">
            <CardHeader className="border-b border-border py-4">
              <CardTitle className="text-base font-display font-extrabold tracking-tight">
                {t('company', 'assignMission') || 'Assign Mission'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{selectedMission.title}</p>
            </CardHeader>
            <CardContent className="pt-5">
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
                      className="w-full p-3 border border-border rounded-xl hover:bg-primary/5 hover:border-primary transition text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground font-semibold">
                          {employee.user?.firstName?.[0]}
                          {employee.user?.lastName?.[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">
                            {employee.user?.firstName} {employee.user?.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {translateEmployeeRole(employee.role, t)}
                          </div>
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
