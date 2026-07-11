'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { artisanApi, AvailabilitySlot } from '@/lib/api/artisan';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AvailabilityCalendarPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newSlot, setNewSlot] = useState({
    startTime: '09:00',
    endTime: '17:00',
    isAvailable: true,
    notes: '',
  });

  useEffect(() => {
    loadSlots();
  }, [currentMonth]);

  const loadSlots = async () => {
    try {
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const data = await artisanApi.getAvailabilitySlots({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });
      setSlots(data);
    } catch (error) {
      console.error('Error loading slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty slots for days before the first of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getSlotsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return slots.filter((slot) => slot.date.startsWith(dateStr));
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowModal(true);
  };

  const handleCreateSlot = async () => {
    if (!selectedDate) return;

    try {
      await artisanApi.createAvailabilitySlot({
        date: selectedDate.toISOString().split('T')[0],
        startTime: newSlot.startTime,
        endTime: newSlot.endTime,
        isAvailable: newSlot.isAvailable,
        notes: newSlot.notes || undefined,
      });

      toast({
        title: t('common', 'success') || 'Success',
        description: t('artisan', 'slotCreated') || 'Availability slot created',
        variant: 'success',
      });

      setShowModal(false);
      setNewSlot({ startTime: '09:00', endTime: '17:00', isAvailable: true, notes: '' });
      loadSlots();
    } catch (error) {
      console.error('Error creating slot:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('artisan', 'slotCreateError') || 'Failed to create slot',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    try {
      await artisanApi.deleteAvailabilitySlot(slotId);
      toast({
        title: t('common', 'success') || 'Success',
        description: t('artisan', 'slotDeleted') || 'Availability slot deleted',
        variant: 'success',
      });
      loadSlots();
    } catch (error) {
      console.error('Error deleting slot:', error);
    }
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">{t('common', 'loading') || 'Loading...'}</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          {t('artisan', 'availabilityCalendar') || 'Availability Calendar'}
        </h1>
        <p className="text-muted-foreground">
          {t('artisan', 'manageAvailabilityDesc') || 'Manage your availability for missions'}
        </p>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={handlePrevMonth}>
              
            </Button>
            <CardTitle>{formatMonthYear(currentMonth)}</CardTitle>
            <Button variant="outline" onClick={handleNextMonth}>
              
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="text-center text-xs sm:text-sm font-medium text-muted-foreground py-1 sm:py-2 truncate">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {getDaysInMonth().map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="h-16 sm:h-24 bg-background rounded-lg" />;
              }

              const daySlots = getSlotsForDate(date);
              const hasAvailable = daySlots.some((s) => s.isAvailable);
              const hasUnavailable = daySlots.some((s) => !s.isAvailable);

              return (
                <div
                  key={date.toISOString()}
                  onClick={() => !isPast(date) && handleDateClick(date)}
                  className={`h-16 sm:h-24 p-1 sm:p-2 rounded-lg border transition-colors overflow-hidden ${
                    isPast(date)
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : isToday(date)
                        ? 'border-primary bg-primary/10 cursor-pointer hover:bg-primary/10'
                        : 'border-border bg-card cursor-pointer hover:bg-accent'
                  }`}
                >
                  <div className={`text-xs sm:text-sm font-medium ${isToday(date) ? 'text-primary' : ''}`}>
                    {date.getDate()}
                  </div>
                  <div className="mt-1 space-y-1">
                    {hasAvailable && (
                      <div className="w-full h-1 bg-green-400 rounded" title="Available" />
                    )}
                    {hasUnavailable && (
                      <div className="w-full h-1 bg-red-400 rounded" title="Unavailable" />
                    )}
                    {daySlots.length > 0 && (
                      <div className="text-[10px] sm:text-xs text-muted-foreground truncate">
                        {daySlots.length} <span className="hidden sm:inline">slot(s)</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 bg-green-400 rounded" />
              <span className="text-muted-foreground">{t('artisan', 'available') || 'Available'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 bg-red-400 rounded" />
              <span className="text-muted-foreground">{t('artisan', 'unavailable') || 'Unavailable'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Slots */}
      {selectedDate && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getSlotsForDate(selectedDate).length === 0 ? (
              <p className="text-muted-foreground">
                {t('artisan', 'noSlotsForDate') || 'No availability slots for this date'}
              </p>
            ) : (
              <div className="space-y-2">
                {getSlotsForDate(selectedDate).map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between p-3 bg-background rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        className={
                          slot.isAvailable
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }
                      >
                        {slot.isAvailable ? 'Available' : 'Unavailable'}
                      </Badge>
                      <span className="font-medium">
                        {slot.startTime} - {slot.endTime}
                      </span>
                      {slot.notes && <span className="text-sm text-muted-foreground">({slot.notes})</span>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteSlot(slot.id)}>
                      
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Slot Modal */}
      {showModal && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{t('artisan', 'addAvailability') || 'Add Availability'}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t('artisan', 'startTime') || 'Start Time'}
                  </label>
                  <Input
                    type="time"
                    value={newSlot.startTime}
                    onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t('artisan', 'endTime') || 'End Time'}
                  </label>
                  <Input
                    type="time"
                    value={newSlot.endTime}
                    onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('artisan', 'status') || 'Status'}
                </label>
                <div className="flex gap-2">
                  <Button
                    variant={newSlot.isAvailable ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewSlot({ ...newSlot, isAvailable: true })}
                  >
                    {t('artisan', 'available') || 'Available'}
                  </Button>
                  <Button
                    variant={!newSlot.isAvailable ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewSlot({ ...newSlot, isAvailable: false })}
                  >
                    {t('artisan', 'unavailable') || 'Unavailable'}
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('artisan', 'notes') || 'Notes'} ({t('common', 'optional') || 'optional'})
                </label>
                <Input
                  value={newSlot.notes}
                  onChange={(e) => setNewSlot({ ...newSlot, notes: e.target.value })}
                  placeholder={t('artisan', 'notesPlaceholder') || 'e.g., Emergency calls only'}
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setShowModal(false)}>
                  {t('common', 'cancel') || 'Cancel'}
                </Button>
                <Button onClick={handleCreateSlot}>{t('common', 'save') || 'Save'}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
