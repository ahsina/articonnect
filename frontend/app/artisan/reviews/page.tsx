'use client';

import { Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { artisanApi, Review } from '@/lib/api/artisan';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

export default function ReviewsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [stats, setStats] = useState({
    average: 0,
    total: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });

  useEffect(() => {
    loadReviews();
  }, [page]);

  const loadReviews = async () => {
    try {
      const response = await artisanApi.getMyReviews({ page, limit: 10 });
      setReviews(response.data);
      setTotalPages(response.meta.totalPages);

      // Calculate stats
      const total = response.data.length;
      const sum = response.data.reduce((acc: number, r: Review) => acc + (Number(r.rating) || 0), 0);
      const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      response.data.forEach((r: Review) => {
        distribution[r.rating as keyof typeof distribution]++;
      });

      setStats({
        average: total > 0 ? sum / total : 0,
        total,
        distribution,
      });
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (reviewId: string) => {
    if (!responseText.trim()) {
      toast({
        title: t('common', 'error') || 'Error',
        description: t('artisan', 'responseRequired') || 'Please enter a response',
        variant: 'destructive',
      });
      return;
    }

    try {
      await artisanApi.respondToReview(reviewId, responseText);
      toast({
        title: t('common', 'success') || 'Success',
        description: t('artisan', 'responseAdded') || 'Response added',
        variant: 'success',
      });
      setRespondingTo(null);
      setResponseText('');
      loadReviews();
    } catch (error) {
      console.error('Error responding to review:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('artisan', 'responseError') || 'Failed to add response',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderStars = (rating: number) => {
    const n = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    return (
      <span className="inline-flex items-center gap-0.5 align-middle">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className={`h-4 w-4 ${i <= n ? 'fill-foreground text-foreground' : 'text-muted-foreground'}`} strokeWidth={1.75} />
        ))}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">{t('common', 'loading') || 'Loading...'}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">{t('artisan', 'reviews') || 'Reviews'}</h1>
        <p className="text-muted-foreground">
          {t('artisan', 'reviewsDesc') || 'See what clients say about your work'}
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-2 gap-5 mb-5">
        <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="text-center">
              <div className="font-display text-5xl font-extrabold text-foreground leading-none">{(stats.average || 0).toFixed(1)}</div>
              <div className="text-lg text-foreground mt-2">
                {renderStars(Math.round(stats.average))}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {stats.total} {t('artisan', 'reviews') || 'reviews'}
              </div>
            </div>
            <div className="flex-1 min-w-[180px] space-y-2">
              {[5, 4, 3, 2, 1].map((star) => (
                <div key={star} className="flex items-center gap-2.5">
                  <span className="text-sm text-muted-foreground w-8 flex items-center gap-0.5">
                    {star} <Star className="h-3 w-3 fill-foreground text-foreground" />
                  </span>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div
                      className="bg-foreground rounded-full h-2"
                      style={{
                        width: `${stats.total > 0 ? (stats.distribution[star as keyof typeof stats.distribution] / stats.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-8 text-right">
                    {stats.distribution[star as keyof typeof stats.distribution]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
          <h3 className="font-display font-bold text-foreground mb-4">
            {t('artisan', 'quickStats') || 'Quick Stats'}
          </h3>
          <div className="divide-y divide-border">
            <div className="flex justify-between py-2.5">
              <span className="text-muted-foreground">
                {t('artisan', 'totalReviews') || 'Total Reviews'}
              </span>
              <span className="font-bold">{stats.total}</span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-muted-foreground">
                {t('artisan', 'fiveStarReviews') || '5-Star Reviews'}
              </span>
              <span className="font-bold text-foreground">{stats.distribution[5]}</span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-muted-foreground">
                {t('artisan', 'responseRate') || 'Response Rate'}
              </span>
              <span className="font-bold">
                {stats.total > 0
                  ? Math.round((reviews.filter((r) => r.response).length / stats.total) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-muted-foreground">Note moyenne</span>
              <span className="font-bold">{(stats.average || 0).toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="bg-card border border-border rounded-2xl shadow-sm">
        <div className="px-6 pt-5 pb-2">
          <h3 className="font-display text-lg font-bold text-foreground">{t('artisan', 'allReviews') || 'All Reviews'}</h3>
        </div>
        <div className="px-5 pb-5">
          {reviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('artisan', 'noReviews') || 'No reviews yet'}
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="p-5 border border-border rounded-xl">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                        {review.reviewer?.avatar ? (
                          <img
                            src={review.reviewer?.avatar}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-muted-foreground font-semibold text-sm">
                            {review.reviewer?.firstName?.[0]}
                            {review.reviewer?.lastName?.[0]}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">
                          {review.reviewer?.firstName} {review.reviewer?.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</div>
                      </div>
                    </div>
                    <div className="text-foreground">{renderStars(review.rating)}</div>
                  </div>

                  {review.comment && <p className="text-foreground/90 mb-2">{review.comment}</p>}

                  <div className="text-xs text-muted-foreground mb-3">
                    {t('artisan', 'forMission') || 'For'} : {review.mission.title}
                  </div>

                  {/* Response */}
                  {review.response ? (
                    <div className="bg-muted/60 border border-border border-l-2 border-l-foreground rounded-lg p-3.5 mt-3">
                      <div className="text-xs font-bold text-foreground mb-1">
                        {t('artisan', 'yourResponse') || 'Your Response'}
                      </div>
                      <p className="text-sm text-foreground/80">{review.response.content}</p>
                      <div className="text-xs text-muted-foreground mt-1.5">
                        {formatDate(review.response.createdAt)}
                      </div>
                    </div>
                  ) : respondingTo === review.id ? (
                    <div className="mt-3 space-y-2">
                      <textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        className="w-full px-3 py-2 border border-border bg-background rounded-lg text-sm"
                        rows={3}
                        placeholder={t('artisan', 'writeResponse') || 'Write your response...'}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleRespond(review.id)}>
                          {t('common', 'submit') || 'Submit'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setRespondingTo(null)}>
                          {t('common', 'cancel') || 'Cancel'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setRespondingTo(review.id)}>
                      {t('artisan', 'respond') || 'Respond'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                {t('common', 'previous') || 'Previous'}
              </Button>
              <span className="py-2 px-4 text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                {t('common', 'next') || 'Next'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
