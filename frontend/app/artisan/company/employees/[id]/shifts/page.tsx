'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
      // API may return either a raw array or an object { employee, period, summary, shifts: [] }
      const shiftsList = Array.isArray(shiftsData)
        ? shiftsData
        : ((shiftsData as { shifts?: EmployeeShift[] })?.shifts ?? []);
      setShifts(Array.isArray(shiftsList) ? shiftsList : []);
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
      OVERTIME: 'bg-amber-100 text-amber-800',
      ON_CALL: 'bg-purple-100 text-purple-700',
      TRAINING: 'bg-green-100 text-green-700',
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
    <div className="p-6 max-w-[1180px] mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/artisan/company/employees/${employeeId}`)}
          >
            ‹ {t('common', 'back') || 'Back'}
          </Button>
          <div>
            <h1 className="text-2xl font-display font-extrabold tracking-tight text-foreground">
              {t('company', 'shiftSchedule') || 'Shift Schedule'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {employee?.user.firstName} {employee?.user.lastName}
            </p>
          </div>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          + {t('company', 'addShift') || 'Add Shift'}
        </Button>
      </div>

      {/* Week Navigation */}
      <Card className="mb-6 rounded-2xl">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4">
            <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
              ‹ {t('company', 'previousWeek') || 'Previous Week'}
            </Button>
            <div className="text-center">
              <div className="font-display font-extrabold text-base tracking-tight text-foreground">
                {selectedWeek.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {selectedWeek.toLocaleDateString()} – {weekDates[6].toLocaleDateString()}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
              {t('company', 'nextWeek') || 'Next Week'} ›
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Calendar */}
      <Card className="rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b border-border">
            {dayNames.map((day, index) => (
              <div
                key={day}
                className="p-3 text-center border-r border-border last:border-r-0 bg-muted"
              >
                <div className="font-semibold text-[13px] text-foreground">{day}</div>
                <div className="text-xs text-muted-foreground">{weekDates[index].getDate()}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {weekDates.map((date, index) => {
              const dateShifts = getShiftsForDate(date);
              const isToday = date.toDateString() === new Date().toDateString();
              const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

              return (
                <div
                  key={index}
                  className={`border-r border-border last:border-r-0 p-2 min-h-[230px] flex flex-col gap-2 ${isToday ? 'bg-primary/5 ring-1 ring-inset ring-primary/40' : isPast ? 'bg-muted/40' : ''}`}
                >
                  {dateShifts.length > 0 ? (
                    dateShifts.map((shift) => (
                      <div
                        key={shift.id}
                        className={`px-2.5 py-2 rounded-lg border ${getShiftTypeColor(shift.type)}`}
                      >
                        <div className="font-bold text-xs">
                          {shift.startTime}–{shift.endTime}
                        </div>
                        <div className="text-[10.5px] opacity-80">{shift.type}</div>
                        {shift.notes && (
                          <div className="text-[10.5px] mt-1 truncate opacity-80">{shift.notes}</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="m-auto text-muted-foreground text-xs">—</div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Shift Type Legend */}
      <Card className="mt-6 rounded-2xl">
        <CardHeader className="border-b border-border py-4">
          <CardTitle className="text-base font-display font-extrabold tracking-tight">
            {t('company', 'shiftTypes') || 'Shift Types'}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-2 rounded-sm bg-primary" />
              <span>{t('company', 'regular') || 'Regular'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-2 rounded-sm bg-amber-500" />
              <span>{t('company', 'overtime') || 'Overtime'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-2 rounded-sm bg-purple-600" />
              <span>{t('company', 'onCall') || 'On Call'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-2 rounded-sm bg-success" />
              <span>{t('company', 'training') || 'Training'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Shift Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-display font-extrabold tracking-tight mb-4">
              {t('company', 'addShift') || 'Add Shift'}
            </h2>

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
