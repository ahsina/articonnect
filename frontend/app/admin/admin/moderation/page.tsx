'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, Report } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ModerationPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [resolution, setResolution] = useState('');
  const [action, setAction] = useState('');

  useEffect(() => {
    loadReports();
  }, [filter]);

  const loadReports = async () => {
    try {
      const filterParams =
        filter === 'all' ? {} : { status: filter.toUpperCase() };
      const data = await adminApi.getReports(filterParams);
      setReports(data);
    } catch (error: any) {
      console.error('Error loading reports:', error);
      if (error.response?.status === 403) {
        router.push('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedReport || !action || !resolution) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    try {
      await adminApi.resolveReport(selectedReport.id, action, resolution);
      alert('Signalement résolu avec succès');
      setSelectedReport(null);
      setResolution('');
      setAction('');
      loadReports();
    } catch (error) {
      console.error('Error resolving report:', error);
      alert('Erreur lors de la résolution du signalement');
    }
  };

  const handleDelete = async (reportId: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce signalement ?')) {
      return;
    }

    try {
      await adminApi.deleteReport(reportId);
      alert('Signalement supprimé');
      loadReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      PENDING: { label: 'En attente', variant: 'default' },
      REVIEWING: { label: 'En cours', variant: 'default' },
      RESOLVED: { label: 'Résolu', variant: 'default' },
      DISMISSED: { label: 'Rejeté', variant: 'default' },
    };

    const config = statusMap[status] || { label: status, variant: 'default' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getReasonIcon = (reason: string) => {
    const iconMap: Record<string, string> = {
      SPAM: '⚠️',
      INAPPROPRIATE: '🚫',
      FRAUD: '🔴',
      OFFENSIVE: '😡',
      OTHER: '❓',
    };
    return iconMap[reason] || '📝';
  };

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      REVIEW: 'Avis',
      PRODUCT: 'Produit',
      USER: 'Utilisateur',
      MISSION: 'Mission',
    };
    return typeMap[type] || type;
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Modération</h1>
          <p className="text-gray-600 mt-2">
            Gérer les signalements et le contenu de la plateforme
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-2">
          {['all', 'pending', 'reviewing', 'resolved', 'dismissed'].map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border'
                }`}
              >
                {status === 'all' ? 'Tous' : status}
              </button>
            ),
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600">Total signalements</p>
              <p className="text-3xl font-bold">{reports.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600">En attente</p>
              <p className="text-3xl font-bold text-yellow-600">
                {reports.filter((r) => r.status === 'PENDING').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600">En cours</p>
              <p className="text-3xl font-bold text-blue-600">
                {reports.filter((r) => r.status === 'REVIEWING').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600">Résolus</p>
              <p className="text-3xl font-bold text-green-600">
                {reports.filter((r) => r.status === 'RESOLVED').length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Reports List */}
        <Card>
          <CardHeader>
            <CardTitle>Signalements</CardTitle>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucun signalement trouvé
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedReport(report)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">
                            {getReasonIcon(report.reason)}
                          </span>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {report.reason}
                            </p>
                            <p className="text-sm text-gray-600">
                              Type: {getTypeLabel(report.reportedType)} • Par:{' '}
                              {report.reporter.firstName}{' '}
                              {report.reporter.lastName}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">
                          {report.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(report.createdAt), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(report.status)}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(report.id);
                          }}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resolution Modal */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold">Résoudre le signalement</h2>
                  <button
                    onClick={() => {
                      setSelectedReport(null);
                      setResolution('');
                      setAction('');
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="font-semibold mb-1">Type de signalement:</p>
                    <p>{selectedReport.reason}</p>
                  </div>

                  <div>
                    <p className="font-semibold mb-1">Description:</p>
                    <p className="text-gray-700">{selectedReport.description}</p>
                  </div>

                  <div>
                    <p className="font-semibold mb-1">Signalé par:</p>
                    <p>
                      {selectedReport.reporter.firstName}{' '}
                      {selectedReport.reporter.lastName} (
                      {selectedReport.reporter.email})
                    </p>
                  </div>

                  <div>
                    <p className="font-semibold mb-1">Type de contenu:</p>
                    <p>{getTypeLabel(selectedReport.reportedType)}</p>
                  </div>

                  <div>
                    <label className="block font-semibold mb-2">
                      Action à prendre:
                    </label>
                    <select
                      value={action}
                      onChange={(e) => setAction(e.target.value)}
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value="">Sélectionner une action...</option>
                      <option value="DISMISS">Rejeter</option>
                      <option value="WARNING">Avertissement</option>
                      <option value="CONTENT_REMOVED">Supprimer le contenu</option>
                      <option value="USER_SUSPENDED">Suspendre l'utilisateur</option>
                      <option value="ACCOUNT_TERMINATED">
                        Bannir le compte
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-2">
                      Résolution:
                    </label>
                    <textarea
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      placeholder="Expliquez la décision prise..."
                      className="w-full p-3 border rounded-lg h-32"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleResolve}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                    >
                      Résoudre
                    </button>
                    <button
                      onClick={() => {
                        setSelectedReport(null);
                        setResolution('');
                        setAction('');
                      }}
                      className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
