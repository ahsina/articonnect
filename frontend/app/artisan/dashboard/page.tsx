'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { missionsApi } from '@/lib/api/missions';
import { artisanApi, EarningsSummary } from '@/lib/api/artisan';
import { useLanguage } from '@/contexts/LanguageContext';

interface Mission {
  id: string;
  title: string;
  status: string;
  city: string;
  category: string;
  clientBudget?: number;
  agreedPrice?: number;
  type?: string;
  client?: {
    firstName: string;
    lastName: string;
  };
  scheduledDate?: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function ArtisanDashboard() {
  const { t } = useLanguage();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [nearbyMissions, setNearbyMissions] = useState<Mission[]>([]);
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    inProgress: 0,
    completed: 0,
    pending: 0,
    rating: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      // Load artisan missions
      const data = await missionsApi.getAll();
      setMissions(data);

      // Load nearby missions (using geolocation)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          try {
            const nearby = await missionsApi.getNearby(
              position.coords.latitude,
              position.coords.longitude,
              20,
            );
            setNearbyMissions(nearby);
          } catch (err) {
            console.error('Error loading nearby missions:', err);
          }
        });
      }

      // Load earnings summary
      try {
        const earningsData = await artisanApi.getEarningsSummary();
        setEarnings(earningsData);
      } catch (err) {
        console.error('Error loading earnings:', err);
      }

      // Load real rating from dashboard stats
      let rating = 0;
      try {
        const dash = await artisanApi.getDashboardStats();
        rating = Number(dash?.averageRating ?? 0);
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      }

      // Calculate stats
      setStats({
        total: data.length,
        inProgress: data.filter((m: Mission) => m.status === 'IN_PROGRESS').length,
        completed: data.filter((m: Mission) => m.status === 'COMPLETED').length,
        pending: data.filter((m: Mission) => m.status === 'PENDING').length,
        rating,
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">{t('common', 'loading') || 'Loading...'}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('artisan', 'dashboard') || 'Dashboard'}
        </h1>
        <p className="text-gray-600">
          {t('artisan', 'welcomeBack') || "Welcome back! Here's your activity overview."}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-1">
              {t('artisan', 'totalMissions') || 'Total Missions'}
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-1">{t('artisan', 'pending') || 'Pending'}</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-1">
              {t('missions', 'inProgress') || 'In Progress'}
            </div>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-1">
              {t('missions', 'completed') || 'Completed'}
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-1">
              {t('artisan', 'averageRating') || 'Rating'}
            </div>
            <div className="text-2xl font-bold text-yellow-600">⭐ {stats.rating}</div>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Card */}
      {earnings && (
        <Card className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-800">
              {t('artisan', 'earningsOverview') || 'Earnings Overview'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-green-600">
                  {t('artisan', 'totalEarnings') || 'Total Earnings'}
                </div>
                <div className="text-2xl font-bold text-green-800">
                  {earnings.totalEarnings.toFixed(2)}€
                </div>
              </div>
              <div>
                <div className="text-sm text-green-600">
                  {t('artisan', 'pendingEarnings') || 'Pending'}
                </div>
                <div className="text-2xl font-bold text-yellow-600">
                  {earnings.pendingEarnings.toFixed(2)}€
                </div>
              </div>
              <div>
                <div className="text-sm text-green-600">
                  {t('artisan', 'thisMonth') || 'This Month'}
                </div>
                <div className="text-2xl font-bold text-green-800">
                  {earnings.thisMonthEarnings.toFixed(2)}€
                </div>
              </div>
              <div>
                <div className="text-sm text-green-600">
                  {t('artisan', 'avgPerMission') || 'Avg per Mission'}
                </div>
                <div className="text-2xl font-bold text-green-800">
                  {earnings.averagePerMission.toFixed(2)}€
                </div>
              </div>
            </div>
            <div className="mt-4">
              <Link href="/artisan/earnings">
                <Button
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-50"
                >
                  {t('artisan', 'viewAllEarnings') || 'View All Earnings'}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Nearby Missions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('artisan', 'availableNearby') || 'Available Nearby'}</CardTitle>
            <Link href="/artisan/missions?filter=available">
              <Button variant="ghost" size="sm">
                {t('common', 'viewAll') || 'View All'}
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {nearbyMissions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {t('artisan', 'noMissionsAvailable') || 'No missions available nearby'}
              </div>
            ) : (
              <div className="space-y-3">
                {nearbyMissions.slice(0, 5).map((mission) => (
                  <Link
                    key={mission.id}
                    href={`/artisan/missions/${mission.id}`}
                    className="block p-3 border rounded-lg hover:border-blue-500 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{mission.title}</h4>
                        <p className="text-sm text-gray-600">
                          📍 {mission.city} • {mission.category}
                        </p>
                        {mission.clientBudget && (
                          <p className="text-sm text-green-600 font-medium mt-1">
                            Budget: {mission.clientBudget}€
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {mission.type === 'EMERGENCY' && (
                          <Badge variant="destructive" className="text-xs">
                            🚨 Urgent
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Active Missions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('artisan', 'myActiveMissions') || 'My Active Missions'}</CardTitle>
            <Link href="/artisan/missions">
              <Button variant="ghost" size="sm">
                {t('common', 'viewAll') || 'View All'}
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {missions.filter((m) => ['ACCEPTED', 'IN_PROGRESS'].includes(m.status)).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {t('artisan', 'noActiveMissions') || 'No active missions'}
              </div>
            ) : (
              <div className="space-y-3">
                {missions
                  .filter((m) => ['ACCEPTED', 'IN_PROGRESS'].includes(m.status))
                  .slice(0, 5)
                  .map((mission) => (
                    <Link
                      key={mission.id}
                      href={`/artisan/missions/${mission.id}`}
                      className="block p-3 border rounded-lg hover:border-blue-500 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{mission.title}</h4>
                          <p className="text-sm text-gray-600">
                            {mission.client?.firstName} {mission.client?.lastName}
                          </p>
                          {mission.scheduledDate && (
                            <p className="text-sm text-gray-500 mt-1">
                              📅 {formatDate(mission.scheduledDate)}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge className={STATUS_COLORS[mission.status]}>
                            {mission.status === 'IN_PROGRESS' ? 'In Progress' : 'Accepted'}
                          </Badge>
                          {mission.agreedPrice && (
                            <p className="text-sm font-bold text-gray-900 mt-1">
                              {mission.agreedPrice}€
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t('artisan', 'quickActions') || 'Quick Actions'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/artisan/availability/calendar">
              <Button variant="outline">
                📅 {t('artisan', 'manageAvailability') || 'Manage Availability'}
              </Button>
            </Link>
            <Link href="/artisan/profile">
              <Button variant="outline">
                👤 {t('artisan', 'updateProfile') || 'Update Profile'}
              </Button>
            </Link>
            <Link href="/artisan/stripe">
              <Button variant="outline">
                💳 {t('artisan', 'paymentSettings') || 'Payment Settings'}
              </Button>
            </Link>
            <Link href="/artisan/quotations">
              <Button variant="outline">
                📄 {t('artisan', 'viewQuotations') || 'View Quotations'}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
