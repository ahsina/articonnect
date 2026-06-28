'use client';

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isToday,
  isPast,
  parseISO,
  setHours,
  setMinutes,
} from 'date-fns';
import { fr, enUS, de } from 'date-fns/locale';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'available' | 'unavailable' | 'booked' | 'mission' | 'time-off';
  color?: string;
  missionId?: string;
  notes?: string;
}

interface InteractiveCalendarProps {
  events: CalendarEvent[];
  onDateSelect?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onSlotCreate?: (start: Date, end: Date) => void;
  onEventDrop?: (eventId: string, newStart: Date, newEnd: Date) => void;
  readOnly?: boolean;
  showWeekView?: boolean;
  holidays?: Date[];
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minutes = (i % 2) * 30;
  return { hour, minutes, label: `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}` };
});

const EVENT_COLORS = {
  available: 'bg-green-500',
  unavailable: 'bg-red-500',
  booked: 'bg-primary',
  mission: 'bg-purple-500',
  'time-off': 'bg-yellow-500',
};

export default function InteractiveCalendar({
  events,
  onDateSelect,
  onEventClick,
  onSlotCreate,
  onEventDrop,
  readOnly = false,
  showWeekView = true,
  holidays = [],
}: InteractiveCalendarProps) {
  const { t, language } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dragStart, setDragStart] = useState<{ date: Date; hour: number; minutes: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ date: Date; hour: number; minutes: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const locale = language === 'fr' ? fr : language === 'de' ? de : enUS;

  const getDaysInView = useMemo(() => {
    if (view === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calendarStart = startOfWeek(monthStart, { locale });
      const calendarEnd = endOfWeek(monthEnd, { locale });
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    } else {
      const weekStart = startOfWeek(currentDate, { locale });
      const weekEnd = endOfWeek(currentDate, { locale });
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    }
  }, [currentDate, view, locale]);

  const getEventsForDate = useCallback((date: Date) => {
    return events.filter(event => isSameDay(event.start, date));
  }, [events]);

  const isHoliday = useCallback((date: Date) => {
    return holidays.some(holiday => isSameDay(holiday, date));
  }, [holidays]);

  const handlePrev = () => {
    if (view === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (view === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const handleDateClick = (date: Date) => {
    if (isPast(date) && !isToday(date)) return;
    setSelectedDate(date);
    onDateSelect?.(date);
  };

  const handleDragStart = (date: Date, hour: number, minutes: number) => {
    if (readOnly || isPast(date)) return;
    setIsDragging(true);
    setDragStart({ date, hour, minutes });
    setDragEnd({ date, hour, minutes });
  };

  const handleDragMove = (date: Date, hour: number, minutes: number) => {
    if (!isDragging || !dragStart) return;
    setDragEnd({ date, hour, minutes });
  };

  const handleDragEnd = () => {
    if (!isDragging || !dragStart || !dragEnd) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    const startTime = setMinutes(setHours(dragStart.date, dragStart.hour), dragStart.minutes);
    const endTime = setMinutes(setHours(dragEnd.date, dragEnd.hour), dragEnd.minutes);

    if (startTime < endTime) {
      onSlotCreate?.(startTime, endTime);
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const isInDragRange = (date: Date, hour: number, minutes: number) => {
    if (!isDragging || !dragStart || !dragEnd) return false;

    const slotTime = setMinutes(setHours(date, hour), minutes);
    const startTime = setMinutes(setHours(dragStart.date, dragStart.hour), dragStart.minutes);
    const endTime = setMinutes(setHours(dragEnd.date, dragEnd.hour), dragEnd.minutes);

    return slotTime >= startTime && slotTime <= endTime;
  };

  const renderMonthView = () => (
    <div className="grid grid-cols-7 gap-1">
      {/* Day headers */}
      {getDaysInView.slice(0, 7).map((day, idx) => (
        <div key={idx} className="text-center text-sm font-medium text-muted-foreground py-2">
          {format(day, 'EEE', { locale })}
        </div>
      ))}

      {/* Calendar cells */}
      {getDaysInView.map((day, idx) => {
        const dayEvents = getEventsForDate(day);
        const isCurrentMonth = isSameMonth(day, currentDate);
        const isSelected = selectedDate && isSameDay(day, selectedDate);
        const isPastDay = isPast(day) && !isToday(day);
        const isHolidayDay = isHoliday(day);

        return (
          <div
            key={idx}
            onClick={() => handleDateClick(day)}
            className={`
              min-h-[100px] p-2 rounded-lg border transition-all cursor-pointer
              ${!isCurrentMonth ? 'bg-background text-muted-foreground' : ''}
              ${isToday(day) ? 'border-primary bg-primary/10' : 'border-border'}
              ${isSelected ? 'ring-2 ring-primary' : ''}
              ${isPastDay ? 'bg-muted cursor-not-allowed opacity-60' : 'hover:bg-accent'}
              ${isHolidayDay ? 'bg-yellow-500/10 border-yellow-500/20' : ''}
            `}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-sm font-medium ${isToday(day) ? 'text-primary' : ''}`}>
                {format(day, 'd')}
              </span>
              {isHolidayDay && (
                <Badge variant="outline" className="text-xs bg-yellow-500/15 text-yellow-400 border-yellow-500/20">
                  {t('calendar', 'holiday') || 'Holiday'}
                </Badge>
              )}
            </div>

            <div className="space-y-1">
              {dayEvents.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick?.(event);
                  }}
                  className={`
                    text-xs p-1 rounded truncate text-white
                    ${EVENT_COLORS[event.type]}
                    hover:opacity-80 cursor-pointer
                  `}
                  title={event.title}
                >
                  {format(event.start, 'HH:mm')} {event.title}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  +{dayEvents.length - 3} {t('calendar', 'more') || 'more'}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderWeekView = () => (
    <div className="overflow-auto max-h-[600px]">
      <div className="grid grid-cols-8 min-w-[800px]">
        {/* Time column header */}
        <div className="sticky top-0 bg-card z-10 border-b p-2"></div>

        {/* Day headers */}
        {getDaysInView.map((day, idx) => (
          <div
            key={idx}
            className={`
              sticky top-0 bg-card z-10 border-b p-2 text-center
              ${isToday(day) ? 'bg-primary/10' : ''}
            `}
          >
            <div className="text-sm font-medium text-muted-foreground">
              {format(day, 'EEE', { locale })}
            </div>
            <div className={`text-lg font-bold ${isToday(day) ? 'text-primary' : ''}`}>
              {format(day, 'd')}
            </div>
          </div>
        ))}

        {/* Time slots */}
        {TIME_SLOTS.map((slot, slotIdx) => (
          <>
            {/* Time label */}
            <div
              key={`time-${slotIdx}`}
              className="border-r border-b p-1 text-xs text-muted-foreground bg-background"
            >
              {slot.minutes === 0 && slot.label}
            </div>

            {/* Day cells */}
            {getDaysInView.map((day, dayIdx) => {
              const slotTime = setMinutes(setHours(day, slot.hour), slot.minutes);
              const slotEvents = events.filter(
                (event) =>
                  isSameDay(event.start, day) &&
                  event.start <= slotTime &&
                  event.end > slotTime
              );
              const inDragRange = isInDragRange(day, slot.hour, slot.minutes);
              const isPastSlot = isPast(slotTime);

              return (
                <div
                  key={`${dayIdx}-${slotIdx}`}
                  onMouseDown={() => handleDragStart(day, slot.hour, slot.minutes)}
                  onMouseEnter={() => handleDragMove(day, slot.hour, slot.minutes)}
                  onMouseUp={handleDragEnd}
                  className={`
                    border-b border-r h-6 relative
                    ${slot.minutes === 0 ? 'border-t border-border' : 'border-border'}
                    ${inDragRange ? 'bg-primary/10' : ''}
                    ${isPastSlot ? 'bg-background' : 'hover:bg-primary/10'}
                    ${!readOnly && !isPastSlot ? 'cursor-crosshair' : ''}
                  `}
                >
                  {slotEvents.map((event) =>
                    slot.minutes === 0 || isSameDay(event.start, slotTime) && event.start.getMinutes() === slot.minutes ? (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick?.(event);
                        }}
                        className={`
                          absolute left-0 right-0 mx-1 text-xs p-1 rounded text-white z-10
                          ${EVENT_COLORS[event.type]}
                          hover:opacity-80 cursor-pointer truncate
                        `}
                        style={{
                          top: 0,
                          height: `${Math.min(((event.end.getTime() - event.start.getTime()) / (30 * 60 * 1000)) * 24, 144)}px`,
                        }}
                      >
                        {event.title}
                      </div>
                    ) : null
                  )}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrev}>
              ←
            </Button>
            <CardTitle className="text-lg min-w-[200px] text-center">
              {view === 'month'
                ? format(currentDate, 'MMMM yyyy', { locale })
                : `${format(getDaysInView[0], 'd MMM', { locale })} - ${format(getDaysInView[6], 'd MMM yyyy', { locale })}`}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleNext}>
              →
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              {t('calendar', 'today') || 'Today'}
            </Button>

            {showWeekView && (
              <Select value={view} onValueChange={(v: 'month' | 'week') => setView(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">{t('calendar', 'month') || 'Month'}</SelectItem>
                  <SelectItem value="week">{t('calendar', 'week') || 'Week'}</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {view === 'month' ? renderMonthView() : renderWeekView()}

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm border-t pt-4">
          <div className="flex items-center gap-2">
            <div className={`w-4 h-3 rounded ${EVENT_COLORS.available}`} />
            <span className="text-muted-foreground">{t('calendar', 'available') || 'Available'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-4 h-3 rounded ${EVENT_COLORS.unavailable}`} />
            <span className="text-muted-foreground">{t('calendar', 'unavailable') || 'Unavailable'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-4 h-3 rounded ${EVENT_COLORS.booked}`} />
            <span className="text-muted-foreground">{t('calendar', 'booked') || 'Booked'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-4 h-3 rounded ${EVENT_COLORS.mission}`} />
            <span className="text-muted-foreground">{t('calendar', 'mission') || 'Mission'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-4 h-3 rounded ${EVENT_COLORS['time-off']}`} />
            <span className="text-muted-foreground">{t('calendar', 'timeOff') || 'Time Off'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
