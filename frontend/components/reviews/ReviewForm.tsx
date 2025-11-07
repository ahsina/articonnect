'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/button';
import { StarRating } from '../ui/star-rating';
import { reviewsApi } from '@/lib/api/reviews';

interface ReviewFormProps {
  missionId: string;
  artisanName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ReviewForm({
  missionId,
  artisanName,
  onSuccess,
  onCancel,
}: ReviewFormProps) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (rating === 0) {
      setError('Veuillez sélectionner une note');
      return;
    }

    if (comment.trim().length < 10) {
      setError('Le commentaire doit contenir au moins 10 caractères');
      return;
    }

    setLoading(true);
    try {
      await reviewsApi.create({
        missionId,
        rating,
        comment,
      });

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/client/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la soumission de l\'avis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Évaluer {artisanName}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Note globale *
          </label>
          <div className="flex items-center gap-4">
            <StarRating rating={rating} onRatingChange={setRating} size="lg" />
            {rating > 0 && (
              <span className="text-2xl font-bold text-gray-900">{rating}/5</span>
            )}
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Cliquez sur les étoiles pour noter
          </p>
        </div>

        {/* Comment */}
        <div>
          <label
            htmlFor="comment"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Votre avis *
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Décrivez votre expérience avec cet artisan..."
          />
          <p className="mt-1 text-sm text-gray-500">
            Minimum 10 caractères ({comment.length}/10)
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Guidelines */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">
            Conseils pour un bon avis
          </h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✓ Soyez précis et objectif</li>
            <li>✓ Mentionnez les points positifs et négatifs</li>
            <li>✓ Décrivez la qualité du travail</li>
            <li>✓ Parlez de la ponctualité et du professionnalisme</li>
            <li>✗ N'utilisez pas de langage offensant</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
          )}
          <Button type="submit" disabled={loading || rating === 0}>
            {loading ? 'Envoi en cours...' : 'Publier l\'avis'}
          </Button>
        </div>
      </form>
    </div>
  );
}
