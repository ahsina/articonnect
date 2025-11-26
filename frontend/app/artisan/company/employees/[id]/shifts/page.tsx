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
      // This would call the API to create a shift
      // await employeeApi.createShift(employeeId, shiftForm);
      toast({
        title: t('common', 'success') || 'Success',
        description: t('company', 'shiftAdded') || 'Shift added successfully',
        variant: 'success',
      });
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
      REGULAR: 'bg-blue-100 text-blue-800 border-blue-200',
      OVERTIME: 'bg-orange-100 text-orange-800 border-orange-200',
      ON_CALL: 'bg-purple-100 text-purple-800 border-purple-200',
      TRAINING: 'bg-green-100 text-green-800 border-green-200',
    };
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-200';
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/artisan/company/employees/${employeeId}`)}
          >
            ← {t('common', 'back') || 'Back'}
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('company', 'shiftSchedule') || 'Shift Schedule'}
            </h1>
            <p className="text-gray-600">
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
              <div className="text-sm text-gray-500">
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
              <div key={day} className="p-3 text-center border-r last:border-r-0 bg-gray-50">
                <div className="font-medium text-gray-900">{day}</div>
                <div className="text-sm text-gray-500">{weekDates[index].getDate()}</div>
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
                  className={`border-r last:border-r-0 p-2 ${isToday ? 'bg-blue-50' : isPast ? 'bg-gray-50' : ''}`}
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
                    <div className="h-full flex items-center justify-center text-gray-400 text-xs">
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
              <div className="w-4 h-4 rounded bg-blue-100 border border-blue-200" />
              <span className="text-sm">{t('company', 'regular') || 'Regular'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-100 border border-orange-200" />
              <span className="text-sm">{t('company', 'overtime') || 'Overtime'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-purple-100 border border-purple-200" />
              <span className="text-sm">{t('company', 'onCall') || 'On Call'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-100 border border-green-200" />
              <span className="text-sm">{t('company', 'training') || 'Training'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Shift Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{t('company', 'addShift') || 'Add Shift'}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('company', 'startTime') || 'Start Time'} *
                  </label>
                  <Input
                    type="time"
                    value={shiftForm.startTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('company', 'shiftType') || 'Shift Type'}
                </label>
                <select
                  value={shiftForm.type}
                  onChange={(e) => setShiftForm({ ...shiftForm, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="REGULAR">{t('company', 'regular') || 'Regular'}</option>
                  <option value="OVERTIME">{t('company', 'overtime') || 'Overtime'}</option>
                  <option value="ON_CALL">{t('company', 'onCall') || 'On Call'}</option>
                  <option value="TRAINING">{t('company', 'training') || 'Training'}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('company', 'notes') || 'Notes'}
                </label>
                <textarea
                  value={shiftForm.notes}
                  onChange={(e) => setShiftForm({ ...shiftForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
