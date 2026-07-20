'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { artisanApi, WorkingHours } from '@/lib/api/artisan';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

const DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

interface WorkingHoursForm {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isEnabled: boolean;
}

export default function WorkingHoursPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [workingHours, setWorkingHours] = useState<WorkingHoursForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadWorkingHours();
  }, []);

  const loadWorkingHours = async () => {
    try {
      const data = await artisanApi.getWorkingHours();

      // Map existing data or create defaults
      const hoursMap = new Map(data.map((h) => [h.dayOfWeek, h]));
      const formData = DAYS.map((day) => {
        const existing = hoursMap.get(day.value);
        return {
          dayOfWeek: day.value,
          startTime: existing?.startTime || '09:00',
          endTime: existing?.endTime || '17:00',
          isEnabled: existing?.isEnabled ?? (day.value >= 1 && day.value <= 5), // Mon-Fri default
        };
      });

      setWorkingHours(formData);
    } catch (error) {
      console.error('Error loading working hours:', error);
      // Set defaults if no data
      setWorkingHours(
        DAYS.map((day) => ({
          dayOfWeek: day.value,
          startTime: '09:00',
          endTime: '17:00',
          isEnabled: day.value >= 1 && day.value <= 5,
        })),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDay = (dayOfWeek: number) => {
    setWorkingHours((hours) =>
      hours.map((h) => (h.dayOfWeek === dayOfWeek ? { ...h, isEnabled: !h.isEnabled } : h)),
    );
  };

  const handleTimeChange = (dayOfWeek: number, field: 'startTime' | 'endTime', value: string) => {
    setWorkingHours((hours) =>
      hours.map((h) => (h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h)),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await artisanApi.setWorkingHours(workingHours);
      toast({
        title: t('common', 'success') || 'Success',
        description: t('artisan', 'workingHoursSaved') || 'Working hours saved successfully',
        variant: 'success',
      });
    } catch (error) {
      console.error('Error saving working hours:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('artisan', 'workingHoursError') || 'Failed to save working hours',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleApplyToAll = (startTime: string, endTime: string) => {
    setWorkingHours((hours) => hours.map((h) => (h.isEnabled ? { ...h, startTime, endTime } : h)));
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
        <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">
          {t('artisan', 'workingHours') || 'Working Hours'}
        </h1>
        <p className="text-muted-foreground">
          {t('artisan', 'workingHoursDesc') ||
            'Set your regular working hours for each day of the week'}
        </p>
      </div>

      {/* Quick Actions */}
      <Card className="mb-6 rounded-2xl shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-lg font-display">
            {t('artisan', 'quickActions') || 'Quick Actions'}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setWorkingHours((hours) =>
                  hours.map((h) => ({
                    ...h,
                    isEnabled: h.dayOfWeek >= 1 && h.dayOfWeek <= 5,
                    startTime: '09:00',
                    endTime: '17:00',
                  })),
                );
              }}
            >
              {t('artisan', 'standardWeek') || 'Standard Week (Mon-Fri 9-17)'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setWorkingHours((hours) =>
                  hours.map((h) => ({
                    ...h,
                    isEnabled: h.dayOfWeek >= 1 && h.dayOfWeek <= 6,
                    startTime: '08:00',
                    endTime: '18:00',
                  })),
                );
              }}
            >
              {t('artisan', 'extendedWeek') || 'Extended Week (Mon-Sat 8-18)'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setWorkingHours((hours) =>
                  hours.map((h) => ({
                    ...h,
                    isEnabled: true,
                    startTime: '00:00',
                    endTime: '23:59',
                  })),
                );
              }}
            >
              {t('artisan', 'availableAlways') || 'Available 24/7'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Working Hours Grid */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="border-b border-border flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="font-display">{t('artisan', 'weeklySchedule') || 'Weekly Schedule'}</CardTitle>
            <CardDescription>
              {t('artisan', 'scheduleDesc') || 'Toggle days and set your available hours'}
            </CardDescription>
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12l5 5L20 6" />
            </svg>
            {saving
              ? t('common', 'saving') || 'Saving...'
              : t('common', 'saveChanges') || 'Save Changes'}
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-2">
            {DAYS.map((day) => {
              const hours = workingHours.find((h) => h.dayOfWeek === day.value);
              if (!hours) return null;

              return (
                <div
                  key={day.value}
                  className={`flex flex-wrap items-center gap-4 p-4 rounded-xl border transition-colors ${
                    hours.isEnabled ? 'bg-card border-border' : 'bg-muted/40 border-border'
                  }`}
                >
                  {/* Toggle */}
                  <button
                    onClick={() => handleToggleDay(day.value)}
                    aria-pressed={hours.isEnabled}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                      hours.isEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-card shadow transform transition-transform ${
                        hours.isEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>

                  {/* Day Name */}
                  <div className="w-24 font-semibold text-foreground">{day.label}</div>

                  {/* Time Inputs */}
                  {hours.isEnabled ? (
                    <div className="flex flex-wrap items-center gap-2 flex-1">
                      <Input
                        type="time"
                        value={hours.startTime}
                        onChange={(e) => handleTimeChange(day.value, 'startTime', e.target.value)}
                        className="w-32"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={hours.endTime}
                        onChange={(e) => handleTimeChange(day.value, 'endTime', e.target.value)}
                        className="w-32"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleApplyToAll(hours.startTime, hours.endTime)}
                        title={t('artisan', 'applyToAll') || 'Apply to all enabled days'}
                      >
                        {t('artisan', 'applyToAll') || 'Apply to all enabled days'}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex-1 text-muted-foreground">
                      {t('artisan', 'notWorking') || 'Not working'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="mt-6 rounded-2xl shadow-sm bg-muted/40 border-border">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-card flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            </div>
            <div>
              <h4 className="font-display font-bold text-foreground">{t('artisan', 'tip') || 'Tip'}</h4>
              <p className="text-sm text-muted-foreground">
                {t('artisan', 'workingHoursTip') ||
                  'Setting accurate working hours helps clients book appointments at convenient times and improves your visibility in search results.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
