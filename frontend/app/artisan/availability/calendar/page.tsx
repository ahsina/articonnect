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
        <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">
          {t('artisan', 'availabilityCalendar') || 'Availability Calendar'}
        </h1>
        <p className="text-muted-foreground">
          {t('artisan', 'manageAvailabilityDesc') || 'Manage your availability for missions'}
        </p>
      </div>

      {/* Calendar */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" size="icon" onClick={handlePrevMonth} aria-label="Mois précédent">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </Button>
            <CardTitle className="flex-1 text-center font-display">{formatMonthYear(currentMonth)}</CardTitle>
            <Button variant="outline" size="icon" onClick={handleNextMonth} aria-label="Mois suivant">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1.5">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="text-center text-[11px] sm:text-xs font-bold uppercase tracking-wide text-muted-foreground py-1 sm:py-2 truncate">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {getDaysInMonth().map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="h-16 sm:h-24 bg-muted/40 rounded-xl border border-border" />;
              }

              const daySlots = getSlotsForDate(date);
              const hasAvailable = daySlots.some((s) => s.isAvailable);
              const hasUnavailable = daySlots.some((s) => !s.isAvailable);

              return (
                <div
                  key={date.toISOString()}
                  onClick={() => !isPast(date) && handleDateClick(date)}
                  className={`h-16 sm:h-24 p-1.5 sm:p-2 rounded-xl border flex flex-col gap-1 transition-colors overflow-hidden ${
                    isPast(date)
                      ? 'bg-muted/40 text-muted-foreground border-border cursor-not-allowed'
                      : isToday(date)
                        ? 'border-primary ring-1 ring-primary bg-card cursor-pointer hover:bg-accent'
                        : 'border-border bg-card cursor-pointer hover:bg-accent'
                  }`}
                >
                  <div className={`text-xs sm:text-sm font-bold ${isToday(date) ? 'text-foreground' : 'text-foreground'}`}>
                    {date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {hasAvailable && (
                      <div className="w-full h-1 bg-success rounded-full" title="Available" />
                    )}
                    {hasUnavailable && (
                      <div className="w-full h-1 bg-destructive rounded-full" title="Unavailable" />
                    )}
                    {daySlots.length > 0 && (
                      <div className="text-[10px] sm:text-xs font-semibold text-muted-foreground truncate">
                        {daySlots.length} <span className="hidden sm:inline">slot(s)</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-2 bg-success rounded-full" />
              <span className="text-muted-foreground">{t('artisan', 'available') || 'Available'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-2 bg-destructive rounded-full" />
              <span className="text-muted-foreground">{t('artisan', 'unavailable') || 'Unavailable'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Slots */}
      {selectedDate && (
        <Card className="mt-6 rounded-2xl shadow-sm">
          <CardHeader className="border-b border-border">
            <CardTitle className="font-display">
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {getSlotsForDate(selectedDate).length === 0 ? (
              <p className="text-muted-foreground">
                {t('artisan', 'noSlotsForDate') || 'No availability slots for this date'}
              </p>
            ) : (
              <div className="space-y-1">
                {getSlotsForDate(selectedDate).map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge
                        className={
                          slot.isAvailable
                            ? 'bg-success/10 text-success hover:bg-success/10'
                            : 'bg-destructive/10 text-destructive hover:bg-destructive/10'
                        }
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${slot.isAvailable ? 'bg-success' : 'bg-destructive'}`} />
                        {slot.isAvailable ? 'Available' : 'Unavailable'}
                      </Badge>
                      <span className="font-semibold whitespace-nowrap">
                        {slot.startTime} - {slot.endTime}
                      </span>
                      {slot.notes && <span className="text-sm text-muted-foreground truncate">({slot.notes})</span>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteSlot(slot.id)} aria-label="Supprimer le créneau">
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13h10l1-13" />
                      </svg>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="font-display">{t('artisan', 'addAvailability') || 'Add Availability'}</CardTitle>
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
