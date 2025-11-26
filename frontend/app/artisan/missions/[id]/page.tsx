'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/api/client';

interface Mission {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  budget: number;
  estimatedDuration: number;
  scheduledDate?: string;
  scheduledTime?: string;
  address: string;
  city: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  distance?: number;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    avatar?: string;
  };
  artisan?: {
    id: string;
    companyName: string;
    rating: number;
  };
  quotation?: {
    id: string;
    amount: number;
    status: string;
    validUntil: string;
  };
  images?: string[];
  notes?: string;
  completionNotes?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

interface TimelineEvent {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
  };
}

export default function MissionDetailPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const missionId = params.id as string;

  const [mission, setMission] = useState<Mission | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'quotation'>('details');
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [quotationForm, setQuotationForm] = useState({
    amount: '',
    description: '',
    validDays: '7',
    items: [] as { description: string; quantity: number; unitPrice: number }[],
  });
  const [completionNotes, setCompletionNotes] = useState('');

  useEffect(() => {
    if (missionId) {
      loadMission();
    }
  }, [missionId]);

  const loadMission = async () => {
    try {
      const [missionResponse, timelineResponse] = await Promise.all([
        apiClient.get(`/missions/${missionId}`),
        apiClient.get(`/missions/${missionId}/timeline`).catch(() => ({ data: [] })),
      ]);
      setMission(missionResponse.data);
      setTimeline(timelineResponse.data || []);
    } catch (error) {
      console.error('Error loading mission:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('artisan', 'missionLoadError') || 'Failed to load mission details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptMission = async () => {
    setActionLoading(true);
    try {
      await apiClient.post(`/missions/${missionId}/accept`);
      toast({
        title: t('common', 'success') || 'Success',
        description: t('artisan', 'missionAccepted') || 'Mission accepted successfully',
        variant: 'success',
      });
      loadMission();
    } catch (error) {
      console.error('Error accepting mission:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('artisan', 'acceptError') || 'Failed to accept mission',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineMission = async () => {
    if (
      !confirm(t('artisan', 'confirmDecline') || 'Are you sure you want to decline this mission?')
    )
      return;
    setActionLoading(true);
    try {
      await apiClient.post(`/missions/${missionId}/decline`);
      toast({
        title: t('common', 'success') || 'Success',
        description: t('artisan', 'missionDeclined') || 'Mission declined',
        variant: 'success',
      });
      router.push('/artisan/missions');
    } catch (error) {
      console.error('Error declining mission:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('artisan', 'declineError') || 'Failed to decline mission',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartMission = async () => {
    setActionLoading(true);
    try {
      await apiClient.post(`/missions/${missionId}/start`);
      toast({
        title: t('common', 'success') || 'Success',
        description: t('artisan', 'missionStarted') || 'Mission started',
        variant: 'success',
      });
      loadMission();
    } catch (error) {
      console.error('Error starting mission:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('artisan', 'startError') || 'Failed to start mission',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteMission = async () => {
    setActionLoading(true);
    try {
      await apiClient.post(`/missions/${missionId}/complete`, { notes: completionNotes });
      toast({
        title: t('common', 'success') || 'Success',
        description: t('artisan', 'missionCompleted') || 'Mission marked as completed',
        variant: 'success',
      });
      loadMission();
    } catch (error) {
      console.error('Error completing mission:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('artisan', 'completeError') || 'Failed to complete mission',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitQuotation = async () => {
    if (!quotationForm.amount || !quotationForm.description) {
      toast({
        title: t('common', 'error') || 'Error',
        description: t('artisan', 'fillRequired') || 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setActionLoading(true);
    try {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + parseInt(quotationForm.validDays));

      await apiClient.post(`/missions/${missionId}/quotation`, {
        amount: parseFloat(quotationForm.amount),
        description: quotationForm.description,
        validUntil: validUntil.toISOString(),
        items: quotationForm.items.length > 0 ? quotationForm.items : undefined,
      });

      toast({
        title: t('common', 'success') || 'Success',
        description: t('artisan', 'quotationSubmitted') || 'Quotation submitted successfully',
        variant: 'success',
      });
      setShowQuotationModal(false);
      setQuotationForm({
        amount: '',
        description: '',
        validDays: '7',
        items: [],
      });
      loadMission();
    } catch (error) {
      console.error('Error submitting quotation:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('artisan', 'quotationError') || 'Failed to submit quotation',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      OPEN: 'bg-blue-100 text-blue-800',
      ASSIGNED: 'bg-purple-100 text-purple-800',
      ACCEPTED: 'bg-indigo-100 text-indigo-800',
      IN_PROGRESS: 'bg-orange-100 text-orange-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      DISPUTED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      LOW: 'bg-gray-100 text-gray-800',
      NORMAL: 'bg-blue-100 text-blue-800',
      HIGH: 'bg-orange-100 text-orange-800',
      URGENT: 'bg-red-100 text-red-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600">{t('common', 'loading') || 'Loading...'}</div>
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">{t('artisan', 'missionNotFound') || 'Mission not found'}</p>
          <Button onClick={() => router.push('/artisan/missions')} className="mt-4">
            {t('common', 'back') || 'Back to Missions'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/artisan/missions')}>
            ← {t('common', 'back') || 'Back'}
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{mission.title}</h1>
            <p className="text-gray-600">{mission.category}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getPriorityBadge(mission.priority)}>{mission.priority}</Badge>
          <Badge className={getStatusBadge(mission.status)}>{mission.status}</Badge>
        </div>
      </div>

      {/* Action Buttons based on status */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {mission.status === 'OPEN' &&
                (t('artisan', 'openMissionHint') ||
                  'This mission is available. Submit a quotation or accept it.')}
              {mission.status === 'ASSIGNED' &&
                (t('artisan', 'assignedMissionHint') ||
                  'You have been assigned to this mission. Accept or decline.')}
              {mission.status === 'ACCEPTED' &&
                (t('artisan', 'acceptedMissionHint') || 'Mission accepted. Start when ready.')}
              {mission.status === 'IN_PROGRESS' &&
                (t('artisan', 'inProgressMissionHint') ||
                  'Mission in progress. Complete when finished.')}
              {mission.status === 'COMPLETED' &&
                (t('artisan', 'completedMissionHint') || 'Mission completed successfully!')}
            </div>
            <div className="flex gap-2">
              {mission.status === 'OPEN' && !mission.quotation && (
                <Button onClick={() => setShowQuotationModal(true)}>
                  {t('artisan', 'submitQuotation') || 'Submit Quotation'}
                </Button>
              )}
              {mission.status === 'ASSIGNED' && (
                <>
                  <Button variant="outline" onClick={handleDeclineMission} disabled={actionLoading}>
                    {t('artisan', 'decline') || 'Decline'}
                  </Button>
                  <Button onClick={handleAcceptMission} disabled={actionLoading}>
                    {t('artisan', 'accept') || 'Accept'}
                  </Button>
                </>
              )}
              {mission.status === 'ACCEPTED' && (
                <Button
                  onClick={handleStartMission}
                  disabled={actionLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {t('artisan', 'startMission') || 'Start Mission'}
                </Button>
              )}
              {mission.status === 'IN_PROGRESS' && (
                <Button
                  onClick={handleCompleteMission}
                  disabled={actionLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {t('artisan', 'completeMission') || 'Complete Mission'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('details')}
          className={`px-4 py-2 font-medium ${activeTab === 'details' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
        >
          {t('artisan', 'details') || 'Details'}
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2 font-medium ${activeTab === 'timeline' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
        >
          {t('artisan', 'timeline') || 'Timeline'}
        </button>
        {mission.quotation && (
          <button
            onClick={() => setActiveTab('quotation')}
            className={`px-4 py-2 font-medium ${activeTab === 'quotation' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
          >
            {t('artisan', 'quotation') || 'Quotation'}
          </button>
        )}
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Mission Info */}
          <Card>
            <CardHeader>
              <CardTitle>{t('artisan', 'missionInfo') || 'Mission Information'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-gray-500">
                  {t('artisan', 'description') || 'Description'}
                </div>
                <p className="text-gray-900 whitespace-pre-wrap">{mission.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">{t('artisan', 'budget') || 'Budget'}</div>
                  <div className="font-semibold text-lg">EUR {mission.budget.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">
                    {t('artisan', 'duration') || 'Est. Duration'}
                  </div>
                  <div className="font-semibold">{mission.estimatedDuration} hours</div>
                </div>
              </div>
              {mission.scheduledDate && (
                <div>
                  <div className="text-sm text-gray-500">
                    {t('artisan', 'scheduledDate') || 'Scheduled Date'}
                  </div>
                  <div className="font-medium">
                    {new Date(mission.scheduledDate).toLocaleDateString()}
                    {mission.scheduledTime && ` at ${mission.scheduledTime}`}
                  </div>
                </div>
              )}
              {mission.notes && (
                <div>
                  <div className="text-sm text-gray-500">
                    {t('artisan', 'notes') || 'Additional Notes'}
                  </div>
                  <p className="text-gray-700">{mission.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle>{t('artisan', 'location') || 'Location'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-500">
                    {t('artisan', 'address') || 'Address'}
                  </div>
                  <div className="font-medium">{mission.address}</div>
                  <div className="text-gray-600">
                    {mission.postalCode} {mission.city}
                  </div>
                </div>
                {mission.distance && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <span className="text-2xl">📍</span>
                    <div>
                      <div className="font-medium text-blue-900">
                        {mission.distance.toFixed(1)} km away
                      </div>
                      <div className="text-sm text-blue-700">
                        {t('artisan', 'fromYourLocation') || 'from your location'}
                      </div>
                    </div>
                  </div>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    window.open(
                      `https://maps.google.com/?q=${mission.latitude},${mission.longitude}`,
                      '_blank',
                    );
                  }}
                >
                  {t('artisan', 'openInMaps') || 'Open in Maps'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle>{t('artisan', 'clientInfo') || 'Client Information'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold">
                  {mission.client.firstName[0]}
                  {mission.client.lastName[0]}
                </div>
                <div>
                  <div className="font-medium">
                    {mission.client.firstName} {mission.client.lastName}
                  </div>
                  {mission.client.email && (
                    <div className="text-sm text-gray-500">{mission.client.email}</div>
                  )}
                </div>
              </div>
              {mission.status !== 'OPEN' && mission.client.phone && (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(`tel:${mission.client.phone}`)}
                  >
                    {t('artisan', 'callClient') || 'Call Client'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mission Images */}
          {mission.images && mission.images.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('artisan', 'photos') || 'Photos'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {mission.images.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`Mission photo ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90"
                      onClick={() => window.open(image, '_blank')}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completion Notes (for IN_PROGRESS status) */}
          {mission.status === 'IN_PROGRESS' && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>{t('artisan', 'completionNotes') || 'Completion Notes'}</CardTitle>
                <CardDescription>
                  {t('artisan', 'completionNotesDesc') ||
                    'Add notes about the work done before completing the mission'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <textarea
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={
                    t('artisan', 'completionNotesPlaceholder') ||
                    'Describe the work completed, any issues encountered, etc.'
                  }
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Timeline Tab */}
      {activeTab === 'timeline' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('artisan', 'missionTimeline') || 'Mission Timeline'}</CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {t('artisan', 'noTimeline') || 'No timeline events yet'}
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                <div className="space-y-6">
                  {timeline.map((event) => (
                    <div key={event.id} className="relative pl-10">
                      <div className="absolute left-2 w-4 h-4 rounded-full bg-blue-600 border-2 border-white" />
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900">{event.type}</span>
                          <span className="text-sm text-gray-500">
                            {new Date(event.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-600">{event.description}</p>
                        {event.user && (
                          <p className="text-sm text-gray-500 mt-1">
                            by {event.user.firstName} {event.user.lastName}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quotation Tab */}
      {activeTab === 'quotation' && mission.quotation && (
        <Card>
          <CardHeader>
            <CardTitle>{t('artisan', 'quotationDetails') || 'Quotation Details'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <span className="text-gray-600">{t('artisan', 'amount') || 'Amount'}</span>
                <span className="text-2xl font-bold text-green-600">
                  EUR {mission.quotation.amount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b">
                <span className="text-gray-600">{t('artisan', 'status') || 'Status'}</span>
                <Badge
                  className={
                    mission.quotation.status === 'ACCEPTED'
                      ? 'bg-green-100 text-green-800'
                      : mission.quotation.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-800'
                        : mission.quotation.status === 'REJECTED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                  }
                >
                  {mission.quotation.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-gray-600">{t('artisan', 'validUntil') || 'Valid Until'}</span>
                <span>{new Date(mission.quotation.validUntil).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quotation Modal */}
      {showQuotationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {t('artisan', 'submitQuotation') || 'Submit Quotation'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('artisan', 'amount') || 'Amount (EUR)'} *
                </label>
                <Input
                  type="number"
                  value={quotationForm.amount}
                  onChange={(e) => setQuotationForm({ ...quotationForm, amount: e.target.value })}
                  min="0"
                  placeholder={mission.budget.toString()}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('artisan', 'clientBudget') || 'Client budget'}: EUR{' '}
                  {mission.budget.toLocaleString()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('artisan', 'description') || 'Description'} *
                </label>
                <textarea
                  value={quotationForm.description}
                  onChange={(e) =>
                    setQuotationForm({ ...quotationForm, description: e.target.value })
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={
                    t('artisan', 'quotationDescPlaceholder') ||
                    'Describe what is included in your quotation...'
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('artisan', 'validFor') || 'Valid For (days)'}
                </label>
                <select
                  value={quotationForm.validDays}
                  onChange={(e) =>
                    setQuotationForm({ ...quotationForm, validDays: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="3">3 days</option>
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowQuotationModal(false)}>
                {t('common', 'cancel') || 'Cancel'}
              </Button>
              <Button onClick={handleSubmitQuotation} disabled={actionLoading}>
                {actionLoading
                  ? t('common', 'submitting') || 'Submitting...'
                  : t('artisan', 'submitQuotation') || 'Submit Quotation'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
