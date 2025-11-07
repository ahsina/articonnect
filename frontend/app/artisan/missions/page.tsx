'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Mission {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  price: number;
  client: {
    firstName: string;
    lastName: string;
    avatar?: string;
    city: string;
  };
  address: string;
  city: string;
  scheduledDate?: string;
  createdAt: string;
  distance?: number;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  ACCEPTED: 'Acceptée',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function ArtisanMissionsPage() {
  const router = useRouter();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS'>('all');

  useEffect(() => {
    loadMissions();
  }, []);

  const loadMissions = async () => {
    try {
      // TODO: Replace with actual API call
      // const data = await missionsApi.getArtisanMissions();

      // Mock data
      const mockMissions: Mission[] = [
        {
          id: '1',
          title: 'Réparer fuite d\'eau',
          description: 'Fuite importante sous l\'évier de la cuisine',
          category: 'Plomberie',
          status: 'PENDING',
          price: 150,
          client: {
            firstName: 'Jean',
            lastName: 'Dupont',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jean',
            city: 'Luxembourg',
          },
          address: '10 Rue de la Gare',
          city: 'Luxembourg',
          scheduledDate: '2024-01-25T14:00:00Z',
          createdAt: '2024-01-20T10:00:00Z',
          distance: 2.5,
        },
        {
          id: '2',
          title: 'Installation chauffe-eau',
          description: 'Installer un nouveau chauffe-eau électrique 200L',
          category: 'Plomberie',
          status: 'ACCEPTED',
          price: 450,
          client: {
            firstName: 'Marie',
            lastName: 'Martin',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marie',
            city: 'Luxembourg',
          },
          address: '25 Avenue de la Liberté',
          city: 'Luxembourg',
          scheduledDate: '2024-01-22T10:00:00Z',
          createdAt: '2024-01-18T15:00:00Z',
          distance: 5.2,
        },
        {
          id: '3',
          title: 'Débouchage canalisation',
          description: 'Toilettes bouchées au 2ème étage',
          category: 'Plomberie',
          status: 'IN_PROGRESS',
          price: 120,
          client: {
            firstName: 'Sophie',
            lastName: 'Bernard',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie',
            city: 'Esch-sur-Alzette',
          },
          address: '15 Rue du Commerce',
          city: 'Esch-sur-Alzette',
          scheduledDate: '2024-01-21T09:00:00Z',
          createdAt: '2024-01-19T11:00:00Z',
          distance: 15.8,
        },
        {
          id: '4',
          title: 'Rénovation salle de bain',
          description: 'Remplacement lavabo et robinetterie',
          category: 'Plomberie',
          status: 'COMPLETED',
          price: 580,
          client: {
            firstName: 'Pierre',
            lastName: 'Dubois',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Pierre',
            city: 'Luxembourg',
          },
          address: '8 Boulevard Royal',
          city: 'Luxembourg',
          scheduledDate: '2024-01-15T14:00:00Z',
          createdAt: '2024-01-10T09:00:00Z',
          distance: 3.1,
        },
      ];

      setMissions(mockMissions);
    } catch (error) {
      console.error('Error loading missions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMissions = missions.filter(
    (mission) => filter === 'all' || mission.status === filter
  );

  const handleAcceptMission = async (missionId: string) => {
    try {
      // TODO: Replace with actual API call
      // await missionsApi.accept(missionId);

      setMissions(
        missions.map((m) =>
          m.id === missionId ? { ...m, status: 'ACCEPTED' as const } : m
        )
      );
    } catch (error) {
      console.error('Error accepting mission:', error);
    }
  };

  const handleStartMission = async (missionId: string) => {
    try {
      // TODO: Replace with actual API call
      // await missionsApi.start(missionId);

      setMissions(
        missions.map((m) =>
          m.id === missionId ? { ...m, status: 'IN_PROGRESS' as const } : m
        )
      );
    } catch (error) {
      console.error('Error starting mission:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes missions</h1>
          <p className="text-gray-600">
            Gérez vos missions et suivez leur avancement
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            Toutes ({missions.length})
          </Button>
          <Button
            variant={filter === 'PENDING' ? 'default' : 'outline'}
            onClick={() => setFilter('PENDING')}
          >
            En attente ({missions.filter((m) => m.status === 'PENDING').length})
          </Button>
          <Button
            variant={filter === 'ACCEPTED' ? 'default' : 'outline'}
            onClick={() => setFilter('ACCEPTED')}
          >
            Acceptées ({missions.filter((m) => m.status === 'ACCEPTED').length})
          </Button>
          <Button
            variant={filter === 'IN_PROGRESS' ? 'default' : 'outline'}
            onClick={() => setFilter('IN_PROGRESS')}
          >
            En cours ({missions.filter((m) => m.status === 'IN_PROGRESS').length})
          </Button>
        </div>

        {/* Missions List */}
        <div className="space-y-4">
          {filteredMissions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500 mb-4">Aucune mission trouvée</p>
                <Button onClick={() => router.push('/artisan/dashboard')}>
                  Retour au tableau de bord
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredMissions.map((mission) => (
              <Card key={mission.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        <img
                          src={mission.client.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                          alt={mission.client.firstName}
                          className="w-12 h-12 rounded-full"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-xl font-semibold text-gray-900">
                                {mission.title}
                              </h3>
                              <p className="text-sm text-gray-600">
                                Par {mission.client.firstName} {mission.client.lastName} • {mission.client.city}
                              </p>
                            </div>
                            <Badge className={STATUS_COLORS[mission.status]}>
                              {STATUS_LABELS[mission.status]}
                            </Badge>
                          </div>

                          <p className="text-gray-700 mb-3">{mission.description}</p>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <span className="text-gray-600">Catégorie:</span>
                              <p className="font-semibold">{mission.category}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Prix:</span>
                              <p className="font-semibold text-green-600">
                                {mission.price}€
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-600">Distance:</span>
                              <p className="font-semibold">{mission.distance} km</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Adresse:</span>
                              <p className="font-semibold">
                                {mission.address}, {mission.city}
                              </p>
                            </div>
                          </div>

                          {mission.scheduledDate && (
                            <div className="mt-3 text-sm">
                              <span className="text-gray-600">Date prévue:</span>
                              <p className="font-semibold">
                                📅 {formatDate(mission.scheduledDate)}
                              </p>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/artisan/missions/${mission.id}`)}
                            >
                              Voir détails
                            </Button>

                            {mission.status === 'PENDING' && (
                              <Button
                                size="sm"
                                onClick={() => handleAcceptMission(mission.id)}
                              >
                                Accepter la mission
                              </Button>
                            )}

                            {mission.status === 'ACCEPTED' && (
                              <Button
                                size="sm"
                                onClick={() => handleStartMission(mission.id)}
                              >
                                Démarrer la mission
                              </Button>
                            )}

                            {mission.status === 'IN_PROGRESS' && (
                              <Button
                                size="sm"
                                onClick={() => router.push(`/artisan/missions/${mission.id}`)}
                              >
                                Terminer la mission
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/client/messages?userId=${mission.client}`)}
                            >
                              💬 Contacter
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
