'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { employeeApi, CompanyEmployee, EmployeeShift } from '@/lib/api/employee';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

interface ShiftFormData {
  date: string;
  startTime: string;
  endTime: string;
  type: string;
  notes?: string;
}

export default function EmployeeShiftsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const employeeId = params.id as string;

  const [employee, setEmployee] = useState<CompanyEmployee | null>(null);
  const [shifts, setShifts] = useState<EmployeeShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<Date>(getStartOfWeek(new Date()));
  const [shiftForm, setShiftForm] = useState<ShiftFormData>({
    date: '',
    startTime: '09:00',
    endTime: '17:00',
    type: 'REGULAR',
    notes: '',
  });

  useEffect(() => {
    if (employeeId) {
      loadData();
    }
  }, [employeeId, selectedWeek]);

  function getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  function getWeekDates(startDate: Date): Date[] {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  }

  const loadData = async () => {
    try {
      const [employeeData, shiftsData] = await Promise.all([
        employeeApi.getById(employeeId),
        employeeApi.getShifts(employeeId, {
          startDate: selectedWeek.toISOString().split('T')[0],
          endDate: new Date(selectedWeek.getTime() + 6 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
        }),
      ]);
      setEmployee(employeeData);
      setShifts(shiftsData || []);
    } catch (error) {
      console.error('Error loading shift data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddShift = async () => {
    if (!shiftForm.date || !shiftForm.startTime || !shiftForm.endTime) {
      toast({
        title: t('common', 'error') || 'Error',
        description: t('company', 'fillRequired') || 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      await employeeApi.createShift({
        employeeId,
        companyId: (employee as { companyId?: string })?.companyId,
        ...shiftForm,
      } as never);
      toast({
        title: t('common', 'success') || 'Success',
        description: t('company', 'shiftAdded') || 'Shift added successfully',
        variant: 'success',
      });
      loadData();
      setShowAddModal(false);
      setShiftForm({
        date: '',
        startTime: '09:00',
        endTime: '17:00',
        type: 'REGULAR',
        notes: '',
      });
      loadData();
    } catch (error) {
      console.error('Error adding shift:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('company', 'shiftError') || 'Failed to add shift',
        variant: 'destructive',
      });
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(selectedWeek);
    newWeek.setDate(selectedWeek.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedWeek(newWeek);
  };

  const weekDates = getWeekDates(selectedWeek);
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const getShiftsForDate = (date: Date): EmployeeShift[] => {
    const dateStr = date.toISOString().split('T')[0];
    return shifts.filter((shift) => shift.date === dateStr);
  };

  const getShiftTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      REGULAR: 'bg-primary/10 text-primary border-primary/20',
      OVERTIME: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
      ON_CALL: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
      TRAINING: 'bg-green-500/15 text-green-400 border-green-500/20',
    };
    return colors[type] || 'bg-muted text-foreground border-border';
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/artisan/company/employees/${employeeId}`)}
          >
            ← {t('common', 'back') || 'Back'}
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {t('company', 'shiftSchedule') || 'Shift Schedule'}
            </h1>
            <p className="text-muted-foreground">
              {employee?.user.firstName} {employee?.user.lastName}
            </p>
          </div>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          + {t('company', 'addShift') || 'Add Shift'}
        </Button>
      </div>

      {/* Week Navigation */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => navigateWeek('prev')}>
              ← {t('company', 'previousWeek') || 'Previous Week'}
            </Button>
            <div className="text-center">
              <div className="font-semibold text-lg">
                {selectedWeek.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedWeek.toLocaleDateString()} - {weekDates[6].toLocaleDateString()}
              </div>
            </div>
            <Button variant="outline" onClick={() => navigateWeek('next')}>
              {t('company', 'nextWeek') || 'Next Week'} →
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Calendar */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b">
            {dayNames.map((day, index) => (
              <div key={day} className="p-3 text-center border-r last:border-r-0 bg-background">
                <div className="font-medium text-foreground">{day}</div>
                <div className="text-sm text-muted-foreground">{weekDates[index].getDate()}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 min-h-[400px]">
            {weekDates.map((date, index) => {
              const dateShifts = getShiftsForDate(date);
              const isToday = date.toDateString() === new Date().toDateString();
              const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

              return (
                <div
                  key={index}
                  className={`border-r last:border-r-0 p-2 ${isToday ? 'bg-primary/10' : isPast ? 'bg-background' : ''}`}
                >
                  {dateShifts.length > 0 ? (
                    <div className="space-y-2">
                      {dateShifts.map((shift) => (
                        <div
                          key={shift.id}
                          className={`p-2 rounded border ${getShiftTypeColor(shift.type)} text-xs`}
                        >
                          <div className="font-medium">
                            {shift.startTime} - {shift.endTime}
                          </div>
                          <div className="text-xs opacity-75">{shift.type}</div>
                          {shift.notes && (
                            <div className="text-xs mt-1 truncate">{shift.notes}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                      {t('company', 'noShifts') || 'No shifts'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Shift Type Legend */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">{t('company', 'shiftTypes') || 'Shift Types'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-primary/10 border border-primary/20" />
              <span className="text-sm">{t('company', 'regular') || 'Regular'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-500/15 border border-orange-500/20" />
              <span className="text-sm">{t('company', 'overtime') || 'Overtime'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-purple-500/15 border border-purple-500/20" />
              <span className="text-sm">{t('company', 'onCall') || 'On Call'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500/15 border border-green-500/20" />
              <span className="text-sm">{t('company', 'training') || 'Training'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Shift Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{t('company', 'addShift') || 'Add Shift'}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('company', 'date') || 'Date'} *
                </label>
                <Input
                  type="date"
                  value={shiftForm.date}
                  onChange={(e) => setShiftForm({ ...shiftForm, date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t('company', 'startTime') || 'Start Time'} *
                  </label>
                  <Input
                    type="time"
                    value={shiftForm.startTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t('company', 'endTime') || 'End Time'} *
                  </label>
                  <Input
                    type="time"
                    value={shiftForm.endTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('company', 'shiftType') || 'Shift Type'}
                </label>
                <select
                  value={shiftForm.type}
                  onChange={(e) => setShiftForm({ ...shiftForm, type: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="REGULAR">{t('company', 'regular') || 'Regular'}</option>
                  <option value="OVERTIME">{t('company', 'overtime') || 'Overtime'}</option>
                  <option value="ON_CALL">{t('company', 'onCall') || 'On Call'}</option>
                  <option value="TRAINING">{t('company', 'training') || 'Training'}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('company', 'notes') || 'Notes'}
                </label>
                <textarea
                  value={shiftForm.notes}
                  onChange={(e) => setShiftForm({ ...shiftForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={
                    t('company', 'shiftNotesPlaceholder') || 'Optional notes about this shift...'
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                {t('common', 'cancel') || 'Cancel'}
              </Button>
              <Button onClick={handleAddShift}>{t('company', 'addShift') || 'Add Shift'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
