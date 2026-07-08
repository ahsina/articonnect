'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { artisanApi } from '@/lib/api/artisan';
import apiClient from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { translateTimeEntryStatus } from '@/lib/utils/enum-translations';

interface TimeEntry {
  id: string;
  date: string;
  missionId?: string;
  missionTitle?: string;
  clientName?: string;
  startTime: string;
  endTime?: string;
  breakMinutes: number;
  totalHours: number;
  notes?: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'APPROVED';
}

interface DailySummary {
  date: string;
  totalHours: number;
  totalBreak: number;
  entriesCount: number;
  earnings: number;
}

export default function ArtisanTimeTrackingPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [summary, setSummary] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second when tracking
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadTimeEntries();
  }, [dateRange]);

  const loadTimeEntries = async () => {
    setLoading(true);
    try {
      // Données réelles du pointage (vide si aucune saisie — plus de données fictives)
      const [todayRes, weeklyRes] = await Promise.all([
        apiClient.get('/time-tracking/today').catch(() => ({ data: null })),
        apiClient.get('/time-tracking/weekly').catch(() => ({ data: null })),
      ]);
      const todayEntries = (todayRes.data?.entries ?? todayRes.data ?? []) as TimeEntry[];
      setEntries(Array.isArray(todayEntries) ? todayEntries : []);
      const days = (weeklyRes.data?.days ?? weeklyRes.data?.summary ?? []) as DailySummary[];
      setSummary(Array.isArray(days) ? days : []);
    } catch (error) {
      console.error('Error loading time entries:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('timeTracking', 'loadError') || 'Failed to load time entries',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartTimer = async () => {
    try {
      const newEntry: TimeEntry = {
        id: `temp-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        startTime: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        breakMinutes: 0,
        totalHours: 0,
        status: 'IN_PROGRESS',
      };
      setActiveEntry(newEntry);
      toast({
        title: t('timeTracking', 'timerStarted') || 'Timer Started',
        description: t('timeTracking', 'trackingTime') || 'Time tracking in progress',
      });
    } catch (error) {
      console.error('Error starting timer:', error);
    }
  };

  const handleStopTimer = async () => {
    if (!activeEntry) return;
    try {
      const endTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const completedEntry: TimeEntry = {
        ...activeEntry,
        endTime,
        status: 'COMPLETED',
        totalHours: calculateHours(activeEntry.startTime, endTime, activeEntry.breakMinutes),
      };
      setEntries([completedEntry, ...entries]);
      setActiveEntry(null);
      toast({
        title: t('timeTracking', 'timerStopped') || 'Timer Stopped',
        description: `${(Number(completedEntry.totalHours) || 0).toFixed(2)} ${t('timeTracking', 'hoursRecorded') || 'hours recorded'}`,
      });
    } catch (error) {
      console.error('Error stopping timer:', error);
    }
  };

  const calculateHours = (start: string, end: string, breakMinutes: number): number => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM) - breakMinutes;
    return Math.max(0, totalMinutes / 60);
  };

  const formatDuration = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const getElapsedTime = (): string => {
    if (!activeEntry) return '0:00:00';
    const [h, m] = activeEntry.startTime.split(':').map(Number);
    const start = new Date();
    start.setHours(h, m, 0);
    const elapsed = Math.floor((currentTime.getTime() - start.getTime()) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const totalWeekHours = summary.reduce((sum, s) => sum + (Number(s.totalHours) || 0), 0);
  const totalWeekEarnings = summary.reduce((sum, s) => sum + (Number(s.earnings) || 0), 0);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">{t('common', 'loading') || 'Loading...'}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('timeTracking', 'title') || 'Time Tracking'}
          </h1>
          <p className="text-muted-foreground">
            {t('timeTracking', 'subtitle') || 'Track your working hours and earnings'}
          </p>
        </div>
      </div>

      {/* Active Timer Card */}
      <Card className={`${activeEntry ? 'bg-green-100 border-green-500/30' : 'bg-background'}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {activeEntry
                  ? t('timeTracking', 'currentlyTracking') || 'Currently Tracking'
                  : t('timeTracking', 'startTracking') || 'Start Tracking'}
              </h3>
              {activeEntry ? (
                <div className="mt-2">
                  <div className="text-4xl font-mono font-bold text-green-600">
                    {getElapsedTime()}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('timeTracking', 'startedAt') || 'Started at'}: {activeEntry.startTime}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground mt-1">
                  {t('timeTracking', 'clickToStart') || 'Click the button to start tracking your time'}
                </p>
              )}
            </div>
            <div>
              {activeEntry ? (
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={handleStopTimer}
                  className="px-8"
                >
                  {t('timeTracking', 'stop') || 'Stop'}
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 px-8"
                  onClick={handleStartTimer}
                >
                  {t('timeTracking', 'start') || 'Start'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-muted border-primary/20">
          <CardContent className="p-4">
            <div className="text-sm text-primary">{t('timeTracking', 'todayHours') || "Today's Hours"}</div>
            <div className="text-2xl font-bold text-primary">
              {formatDuration(summary.find(s => s.date === new Date().toISOString().split('T')[0])?.totalHours || 0)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">{t('timeTracking', 'weekHours') || 'This Week'}</div>
            <div className="text-2xl font-bold text-foreground">{formatDuration(totalWeekHours)}</div>
          </CardContent>
        </Card>
        <Card className="bg-muted">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">{t('timeTracking', 'weekEarnings') || 'Week Earnings'}</div>
            <div className="text-2xl font-bold text-foreground">{(Number(totalWeekEarnings) || 0).toFixed(2)} €</div>
          </CardContent>
        </Card>
        <Card className="bg-muted">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">{t('timeTracking', 'avgHourly') || 'Avg Hourly Rate'}</div>
            <div className="text-2xl font-bold text-foreground">
              {totalWeekHours > 0 ? (totalWeekEarnings / totalWeekHours).toFixed(2) : 0} €/h
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-foreground">
              {t('timeTracking', 'dateRange') || 'Date Range'}:
            </span>
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-40"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-40"
            />
            <Button variant="outline" onClick={loadTimeEntries}>
              {t('common', 'apply') || 'Apply'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Time Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('timeTracking', 'entries') || 'Time Entries'}</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('timeTracking', 'noEntries') || 'No time entries found for this period'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      {t('timeTracking', 'date') || 'Date'}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      {t('timeTracking', 'mission') || 'Mission'}
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                      {t('timeTracking', 'time') || 'Time'}
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                      {t('timeTracking', 'break') || 'Break'}
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                      {t('timeTracking', 'total') || 'Total'}
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                      {t('timeTracking', 'status') || 'Status'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b hover:bg-accent">
                      <td className="py-3 px-4">
                        <div className="font-medium text-foreground">
                          {new Date(entry.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {entry.missionTitle ? (
                          <div>
                            <div className="font-medium text-foreground">{entry.missionTitle}</div>
                            {entry.clientName && (
                              <div className="text-sm text-muted-foreground">{entry.clientName}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-foreground">
                        {entry.startTime} - {entry.endTime || 'In progress'}
                      </td>
                      <td className="py-3 px-4 text-center text-muted-foreground">
                        {entry.breakMinutes}min
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-foreground">
                        {formatDuration(entry.totalHours)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          className={
                            entry.status === 'APPROVED'
                              ? 'bg-green-100 text-green-700'
                              : entry.status === 'COMPLETED'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-amber-100 text-amber-800'
                          }
                        >
                          {translateTimeEntryStatus(entry.status, t)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
