'use client';

import { StarRating } from '../ui/star-rating';
import { Review } from '@/lib/api/reviews';

interface ReviewCardProps {
  review: Review;
  showArtisan?: boolean;
  showClient?: boolean;
}

export function ReviewCard({ review, showArtisan = false, showClient = true }: ReviewCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const getName = () => {
    if (showArtisan && review.artisan) {
      return `${review.artisan.firstName} ${review.artisan.lastName}`;
    }
    if (showClient && review.client) {
      return `${review.client.firstName} ${review.client.lastName}`;
    }
    return 'Utilisateur';
  };

  const initials = () => {
    if (showArtisan && review.artisan) {
      return getInitials(review.artisan.firstName, review.artisan.lastName);
    }
    if (showClient && review.client) {
      return getInitials(review.client.firstName, review.client.lastName);
    }
    return 'U';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
            {initials()}
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{getName()}</h4>
            <p className="text-sm text-gray-500">{formatDate(review.createdAt)}</p>
          </div>
        </div>
        <div>
          <StarRating rating={review.rating} readonly size="sm" />
        </div>
      </div>

      <p className="text-gray-700 leading-relaxed">{review.comment}</p>

      {/* Rating breakdown for visual appeal */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-blue-600">{review.rating}</span>
          <div className="flex-1">
            <StarRating rating={review.rating} readonly size="sm" showValue />
          </div>
        </div>
      </div>
    </div>
  );
}
