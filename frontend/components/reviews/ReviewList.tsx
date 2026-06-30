'use client';

import { useEffect, useState } from 'react';
import { ReviewCard } from './ReviewCard';
import { StarRating } from '../ui/star-rating';
import { reviewsApi, Review } from '@/lib/api/reviews';
import { ReviewSkeleton, Skeleton } from '../ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';

interface ReviewListProps {
  artisanId: string;
}

export function ReviewList({ artisanId }: ReviewListProps) {
  const { t } = useLanguage();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    average: 0,
    total: 0,
    distribution: {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    },
  });

  useEffect(() => {
    loadReviews();
  }, [artisanId]);

  const loadReviews = async () => {
    try {
      const data = await reviewsApi.getByArtisan(artisanId);
      setReviews(data);
      calculateStats(data);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (reviewsData: Review[]) => {
    if (reviewsData.length === 0) {
      return;
    }

    const total = reviewsData.length;
    const sum = reviewsData.reduce((acc, review) => acc + review.rating, 0);
    const average = sum / total;

    const distribution = {
      5: reviewsData.filter((r) => r.rating === 5).length,
      4: reviewsData.filter((r) => r.rating === 4).length,
      3: reviewsData.filter((r) => r.rating === 3).length,
      2: reviewsData.filter((r) => r.rating === 2).length,
      1: reviewsData.filter((r) => r.rating === 1).length,
    };

    setStats({ average, total, distribution });
  };

  const getPercentage = (count: number) => {
    if (stats.total === 0) return 0;
    return Math.round((count / stats.total) * 100);
  };

  if (loading) {
    return (
      <div className="space-y-6" role="status" aria-label={t('reviewList', 'loadingReviews')}>
        {/* Stats skeleton */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center md:text-left space-y-2">
              <Skeleton className="h-12 w-20 mx-auto md:mx-0" />
              <Skeleton className="h-5 w-32 mx-auto md:mx-0" />
              <Skeleton className="h-4 w-24 mx-auto md:mx-0" />
            </div>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-2 flex-1" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Reviews skeleton */}
        <ReviewSkeleton />
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12 bg-background rounded-lg">
        <p className="text-muted-foreground mb-2">{t('reviewList', 'noReviewsYet')}</p>
        <p className="text-sm text-muted-foreground">
          {t('reviewList', 'beTheFirst')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Average Rating */}
          <div className="text-center md:text-left">
            <div className="flex items-baseline gap-2 justify-center md:justify-start mb-2">
              <span className="text-5xl font-bold text-foreground">
                {stats.average.toFixed(1)}
              </span>
              <span className="text-2xl text-muted-foreground">/5</span>
            </div>
            <StarRating rating={stats.average} readonly size="lg" />
            <p className="text-sm text-muted-foreground mt-2">
              {t('reviewList', 'basedOn')} {stats.total} {t('reviewList', 'reviewsWord')}
            </p>
          </div>

          {/* Rating Distribution */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground w-8">
                  {rating} ★
                </span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 transition-all"
                    style={{
                      width: `${getPercentage(stats.distribution[rating as keyof typeof stats.distribution])}%`,
                    }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-12">
                  {getPercentage(stats.distribution[rating as keyof typeof stats.distribution])}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">
          {t('reviewList', 'allReviews')} ({stats.total})
        </h3>
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} showClient />
        ))}
      </div>
    </div>
  );
}
