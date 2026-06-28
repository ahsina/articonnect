'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface TimeStatus {
  isWorking: boolean;
  isOnBreak: boolean;
  clockedInAt: string | null;
  currentBreakStart: string | null;
  todayWorkedMinutes: number;
  todayBreakMinutes: number;
}

interface DailySummary {
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  breakDuration: number;
  workDuration: number;
  overtime: number;
  status: 'complete' | 'incomplete' | 'missing';
}

export function MobileTimeTracking() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<TimeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weekSummary, setWeekSummary] = useState<DailySummary[]>([]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch status on mount
  useEffect(() => {
    fetchStatus();
    fetchWeekSummary();
  }, []);

  // Get current location
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (err) => {
          console.warn('Geolocation error:', err);
        }
      );
    }
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/time-tracking/status', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const fetchWeekSummary = async () => {
    try {
      const response = await fetch('/api/time-tracking/weekly', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setWeekSummary(data.days || []);
      }
    } catch (err) {
      console.error('Failed to fetch week summary:', err);
    }
  };

  const clockIn = async () => {
    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/time-tracking/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ location }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erreur lors du pointage');
      }

      await fetchStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const clockOut = async () => {
    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/time-tracking/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ location }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erreur lors du pointage');
      }

      await fetchStatus();
      await fetchWeekSummary();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const startBreak = async () => {
    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/time-tracking/break/start', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erreur');
      }

      await fetchStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const endBreak = async () => {
    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/time-tracking/break/end', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erreur');
      }

      await fetchStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  };

  const formatClockTime = (date: Date): string => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getDayName = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { weekday: 'short' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-20">
      {/* Header with current time */}
      <div className="bg-gradient-to-b from-primary to-blue-800 px-4 py-8 text-center">
        <div className="text-6xl font-bold tracking-tight">
          {formatClockTime(currentTime)}
        </div>
        <div className="text-blue-200 mt-2">
          {currentTime.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </div>
      </div>

      {/* Status Card */}
      <div className="px-4 -mt-6">
        <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
          {/* Current Status */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-sm text-muted-foreground uppercase tracking-wide">Statut</div>
              <div className="text-2xl font-bold mt-1">
                {status?.isOnBreak ? (
                  <span className="text-yellow-400">En pause</span>
                ) : status?.isWorking ? (
                  <span className="text-green-400">En service</span>
                ) : (
                  <span className="text-muted-foreground">Hors service</span>
                )}
              </div>
            </div>
            <div className={`w-4 h-4 rounded-full ${
              status?.isOnBreak ? 'bg-yellow-400' :
              status?.isWorking ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
            }`} />
          </div>

          {/* Today's Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-700/50 rounded-xl p-4">
              <div className="text-sm text-muted-foreground">Travaille</div>
              <div className="text-2xl font-bold text-blue-400">
                {formatTime(status?.todayWorkedMinutes || 0)}
              </div>
            </div>
            <div className="bg-gray-700/50 rounded-xl p-4">
              <div className="text-sm text-muted-foreground">Pause</div>
              <div className="text-2xl font-bold text-yellow-400">
                {formatTime(status?.todayBreakMinutes || 0)}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {!status?.isWorking ? (
              // Clock In Button
              <button
                onClick={clockIn}
                disabled={actionLoading}
                className="w-full py-4 bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded-xl font-bold text-lg transition-all active:scale-98 flex items-center justify-center gap-3"
              >
                {actionLoading ? (
                  <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Pointer l'entree
                  </>
                )}
              </button>
            ) : (
              <>
                {/* Break Button */}
                {!status.isOnBreak ? (
                  <button
                    onClick={startBreak}
                    disabled={actionLoading}
                    className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 rounded-xl font-bold text-lg transition-all active:scale-98 flex items-center justify-center gap-3 text-foreground"
                  >
                    {actionLoading ? (
                      <div className="animate-spin w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Prendre une pause
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={endBreak}
                    disabled={actionLoading}
                    className="w-full py-4 bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-xl font-bold text-lg transition-all active:scale-98 flex items-center justify-center gap-3"
                  >
                    {actionLoading ? (
                      <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Fin de pause
                      </>
                    )}
                  </button>
                )}

                {/* Clock Out Button */}
                <button
                  onClick={clockOut}
                  disabled={actionLoading || status.isOnBreak}
                  className="w-full py-4 bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-xl font-bold text-lg transition-all active:scale-98 flex items-center justify-center gap-3"
                >
                  {actionLoading ? (
                    <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Pointer la sortie
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          {/* Location indicator */}
          {location && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Localisation activee
            </div>
          )}
        </div>
      </div>

      {/* Week Summary */}
      <div className="px-4 mt-6">
        <h3 className="text-lg font-semibold mb-3">Cette semaine</h3>
        <div className="grid grid-cols-7 gap-1">
          {weekSummary.map((day) => (
            <div
              key={day.date}
              className={`p-2 rounded-lg text-center ${
                day.status === 'complete'
                  ? 'bg-green-500/20'
                  : day.status === 'incomplete'
                  ? 'bg-yellow-500/20'
                  : 'bg-gray-700/50'
              }`}
            >
              <div className="text-xs text-muted-foreground">{getDayName(day.date)}</div>
              <div className="text-sm font-bold mt-1">
                {day.workDuration > 0 ? formatTime(day.workDuration) : '-'}
              </div>
              {day.overtime > 0 && (
                <div className="text-xs text-orange-400">+{formatTime(day.overtime)}</div>
              )}
            </div>
          ))}
        </div>

        {/* Week Total */}
        <div className="mt-4 bg-gray-800 rounded-xl p-4 flex justify-between items-center">
          <span className="text-muted-foreground">Total semaine</span>
          <span className="text-xl font-bold">
            {formatTime(weekSummary.reduce((sum, d) => sum + d.workDuration, 0))}
            <span className="text-sm text-muted-foreground ml-1">/ 35h</span>
          </span>
        </div>
      </div>

      {/* Clock In Time Info */}
      {status?.clockedInAt && (
        <div className="px-4 mt-6">
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Entree a</div>
                <div className="font-semibold">
                  {new Date(status.clockedInAt).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MobileTimeTracking;
