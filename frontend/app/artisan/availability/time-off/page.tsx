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
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
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
        <div className="text-gray-600">{t('common', 'loading') || 'Loading...'}</div>
      </div>
    );
  }

  const upcomingTimeOffs = timeOffs.filter(
    (t) => isUpcoming(t.startDate) || (!isPast(t.endDate) && !isUpcoming(t.startDate)),
  );
  const pastTimeOffs = timeOffs.filter((t) => isPast(t.endDate));

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('artisan', 'timeOff') || 'Time Off'}
          </h1>
          <p className="text-gray-600">
            {t('artisan', 'timeOffDesc') || 'Manage your time off and vacation days'}
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          + {t('artisan', 'requestTimeOff') || 'Request Time Off'}
        </Button>
      </div>

      {/* Upcoming Time Off */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('artisan', 'upcomingTimeOff') || 'Upcoming & Current'}</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingTimeOffs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('artisan', 'noUpcomingTimeOff') || 'No upcoming time off scheduled'}
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingTimeOffs.map((timeOff) => (
                <div
                  key={timeOff.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
                      🏖️
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {formatDate(timeOff.startDate)} - {formatDate(timeOff.endDate)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {calculateDays(timeOff.startDate, timeOff.endDate)} day(s)
                        {timeOff.reason && <span> • {timeOff.reason}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
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
        <Card>
          <CardHeader>
            <CardTitle>{t('artisan', 'pastTimeOff') || 'Past Time Off'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pastTimeOffs.map((timeOff) => (
                <div
                  key={timeOff.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg opacity-60"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center text-2xl">
                      📅
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {formatDate(timeOff.startDate)} - {formatDate(timeOff.endDate)}
                      </div>
                      <div className="text-sm text-gray-600">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{t('artisan', 'requestTimeOff') || 'Request Time Off'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                  {t('artisan', 'duration') || 'Duration'}:{' '}
                  {calculateDays(newRequest.startDate, newRequest.endDate)} day(s)
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
