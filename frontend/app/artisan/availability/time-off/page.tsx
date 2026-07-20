'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { artisanApi, TimeOff } from '@/lib/api/artisan';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-warning/15 text-warning hover:bg-warning/15',
  APPROVED: 'bg-success/10 text-success hover:bg-success/10',
  REJECTED: 'bg-destructive/10 text-destructive hover:bg-destructive/10',
};

export default function TimeOffPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [timeOffs, setTimeOffs] = useState<TimeOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newRequest, setNewRequest] = useState({
    startDate: '',
    endDate: '',
    reason: '',
  });

  useEffect(() => {
    loadTimeOffs();
  }, []);

  const loadTimeOffs = async () => {
    try {
      const data = await artisanApi.getTimeOffs();
      setTimeOffs(data);
    } catch (error) {
      console.error('Error loading time offs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async () => {
    if (!newRequest.startDate || !newRequest.endDate) {
      toast({
        title: t('common', 'error') || 'Error',
        description: t('artisan', 'selectDates') || 'Please select start and end dates',
        variant: 'destructive',
      });
      return;
    }

    try {
      await artisanApi.requestTimeOff({
        startDate: newRequest.startDate,
        endDate: newRequest.endDate,
        reason: newRequest.reason || undefined,
      });

      toast({
        title: t('common', 'success') || 'Success',
        description: t('artisan', 'timeOffCreated') || 'Time off request created',
        variant: 'success',
      });

      setShowModal(false);
      setNewRequest({ startDate: '', endDate: '', reason: '' });
      loadTimeOffs();
    } catch (error) {
      console.error('Error creating time off:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('artisan', 'timeOffError') || 'Failed to create time off request',
        variant: 'destructive',
      });
    }
  };

  const handleCancelRequest = async (id: string) => {
    try {
      await artisanApi.cancelTimeOff(id);
      toast({
        title: t('common', 'success') || 'Success',
        description: t('artisan', 'timeOffCancelled') || 'Time off request cancelled',
        variant: 'success',
      });
      loadTimeOffs();
    } catch (error) {
      console.error('Error cancelling time off:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const isUpcoming = (startDate: string) => {
    return new Date(startDate) > new Date();
  };

  const isPast = (endDate: string) => {
    return new Date(endDate) < new Date();
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">{t('common', 'loading') || 'Loading...'}</div>
      </div>
    );
  }

  const upcomingTimeOffs = timeOffs.filter(
    (t) => isUpcoming(t.startDate) || (!isPast(t.endDate) && !isUpcoming(t.startDate)),
  );
  const pastTimeOffs = timeOffs.filter((t) => isPast(t.endDate));

  const CalendarIcon = ({ muted }: { muted?: boolean }) => (
    <div
      className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
        muted ? 'bg-muted' : 'bg-primary/10'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className={`w-5 h-5 ${muted ? 'text-muted-foreground' : 'text-primary'}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M3 9h18M8 2v4M16 2v4" />
      </svg>
    </div>
  );

  const pendingCount = timeOffs.filter((to) => to.status === 'PENDING').length;
  const approvedDaysThisYear = timeOffs
    .filter((to) => to.status === 'APPROVED' && new Date(to.startDate).getFullYear() === new Date().getFullYear())
    .reduce((sum, to) => sum + calculateDays(to.startDate, to.endDate), 0);
  const nextAbsence = [...upcomingTimeOffs].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  )[0];

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">
            {t('artisan', 'timeOff') || 'Time Off'}
          </h1>
          <p className="text-muted-foreground">
            {t('artisan', 'timeOffDesc') || 'Manage your time off and vacation days'}
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {t('artisan', 'requestTimeOff') || 'Request Time Off'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-5">
            <div className="text-sm font-semibold text-muted-foreground">Jours posés ({new Date().getFullYear()})</div>
            <div className="mt-2 text-3xl font-display font-bold tracking-tight text-foreground">{approvedDaysThisYear}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-5">
            <div className="text-sm font-semibold text-muted-foreground">En attente</div>
            <div className="mt-2 text-3xl font-display font-bold tracking-tight text-foreground">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-5">
            <div className="text-sm font-semibold text-muted-foreground">Prochaine absence</div>
            <div className="mt-2 text-2xl font-display font-bold tracking-tight text-foreground">
              {nextAbsence ? formatDate(nextAbsence.startDate) : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Time Off */}
      <Card className="mb-6 rounded-2xl shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="font-display">{t('artisan', 'upcomingTimeOff') || 'Upcoming & Current'}</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {upcomingTimeOffs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('artisan', 'noUpcomingTimeOff') || 'No upcoming time off scheduled'}
            </div>
          ) : (
            <div className="space-y-1">
              {upcomingTimeOffs.map((timeOff) => (
                <div
                  key={timeOff.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <CalendarIcon />
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground">
                        {formatDate(timeOff.startDate)} - {formatDate(timeOff.endDate)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {calculateDays(timeOff.startDate, timeOff.endDate)} day(s)
                        {timeOff.reason && <span> • {timeOff.reason}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Badge className={STATUS_COLORS[timeOff.status]}>{timeOff.status}</Badge>
                    {timeOff.status === 'PENDING' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelRequest(timeOff.id)}
                      >
                        {t('common', 'cancel') || 'Cancel'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Time Off */}
      {pastTimeOffs.length > 0 && (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="border-b border-border">
            <CardTitle className="font-display">{t('artisan', 'pastTimeOff') || 'Past Time Off'}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-1 opacity-70">
              {pastTimeOffs.map((timeOff) => (
                <div
                  key={timeOff.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <CalendarIcon muted />
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground">
                        {formatDate(timeOff.startDate)} - {formatDate(timeOff.endDate)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {calculateDays(timeOff.startDate, timeOff.endDate)} day(s)
                        {timeOff.reason && <span> • {timeOff.reason}</span>}
                      </div>
                    </div>
                  </div>
                  <Badge className={STATUS_COLORS[timeOff.status]}>{timeOff.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request Time Off Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="font-display">{t('artisan', 'requestTimeOff') || 'Request Time Off'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('artisan', 'startDate') || 'Start Date'}
                </label>
                <Input
                  type="date"
                  value={newRequest.startDate}
                  onChange={(e) => setNewRequest({ ...newRequest, startDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('artisan', 'endDate') || 'End Date'}
                </label>
                <Input
                  type="date"
                  value={newRequest.endDate}
                  onChange={(e) => setNewRequest({ ...newRequest, endDate: e.target.value })}
                  min={newRequest.startDate || new Date().toISOString().split('T')[0]}
                />
              </div>

              {newRequest.startDate && newRequest.endDate && (
                <div className="p-3 bg-primary/10 rounded-lg text-sm text-primary">
                  {t('artisan', 'duration') || 'Duration'}:{' '}
                  {calculateDays(newRequest.startDate, newRequest.endDate)} day(s)
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('artisan', 'reason') || 'Reason'} ({t('common', 'optional') || 'optional'})
                </label>
                <Input
                  value={newRequest.reason}
                  onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                  placeholder={
                    t('artisan', 'reasonPlaceholder') || 'e.g., Vacation, Personal, Medical'
                  }
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setShowModal(false)}>
                  {t('common', 'cancel') || 'Cancel'}
                </Button>
                <Button onClick={handleCreateRequest}>
                  {t('artisan', 'submitRequest') || 'Submit Request'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
