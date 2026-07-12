'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StarRating } from '@/components/ui/star-rating';
import { marketplaceApi, Product, ProductReview } from '@/lib/api/marketplace';
import { useLanguage } from '@/contexts/LanguageContext';
import { X, Loader2, MessageSquare } from 'lucide-react';

interface ProductReviewsModalProps {
  product: Product;
  onClose: () => void;
}

export default function ProductReviewsModal({ product, onClose }: ProductReviewsModalProps) {
  const { t } = useLanguage();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await marketplaceApi.getProductReviews(product.id);
      setReviews(data);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const startReply = (r: ProductReview) => {
    setReplyingId(r.id);
    setReplyText(r.sellerReply || '');
    setError(null);
  };

  const submitReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setSavingId(reviewId);
    setError(null);
    try {
      const updated = await marketplaceApi.replyToReview(product.id, reviewId, replyText.trim());
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? {
                ...r,
                sellerReply: updated?.sellerReply ?? replyText.trim(),
                sellerReplyAt: updated?.sellerReplyAt ?? new Date().toISOString(),
              }
            : r,
        ),
      );
      setReplyingId(null);
      setReplyText('');
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          (t('artisan', 'replyError') || "La réponse n'a pas pu être enregistrée."),
      );
    } finally {
      setSavingId(null);
    }
  };

  const avg =
    reviews.length > 0 ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-card border border-border shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {t('artisan', 'productReviews') || 'Avis produit'}
            </h2>
            <p className="text-sm text-muted-foreground truncate max-w-xs">{product.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={t('common', 'close') || 'Fermer'}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              {t('common', 'loading') || 'Chargement…'}
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              {t('artisan', 'noReviews') || 'Aucun avis pour ce produit.'}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <StarRating rating={Math.round(avg)} readonly size="sm" />
                <span className="text-sm text-muted-foreground">
                  {avg.toFixed(1)} · {reviews.length} {t('artisan', 'reviewsCount') || 'avis'}
                </span>
              </div>

              {error && (
                <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                {reviews.map((r) => {
                  const author = r.reviewer || r.client;
                  return (
                    <div key={r.id} className="rounded-lg border border-border p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-foreground text-sm">
                          {author ? `${author.firstName} ${author.lastName}` : t('common', 'client') || 'Client'}
                        </span>
                        <StarRating rating={r.rating} readonly size="sm" />
                      </div>
                      {r.comment && <p className="text-sm text-foreground mb-2">{r.comment}</p>}
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString('fr-FR')}
                      </p>

                      {/* Réponse vendeur existante */}
                      {r.sellerReply && replyingId !== r.id && (
                        <div className="mt-3 rounded-lg bg-accent/50 border-l-2 border-primary p-3">
                          <div className="flex items-center gap-1 text-xs font-medium text-primary mb-1">
                            <MessageSquare className="h-3 w-3" />
                            {t('artisan', 'yourReply') || 'Votre réponse'}
                          </div>
                          <p className="text-sm text-foreground">{r.sellerReply}</p>
                        </div>
                      )}

                      {/* Formulaire de réponse */}
                      {replyingId === r.id ? (
                        <div className="mt-3 space-y-2">
                          <Textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            rows={2}
                            placeholder={t('artisan', 'replyPlaceholder') || 'Répondre publiquement à cet avis…'}
                          />
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setReplyingId(null);
                                setReplyText('');
                              }}
                              disabled={savingId === r.id}
                            >
                              {t('common', 'cancel') || 'Annuler'}
                            </Button>
                            <Button size="sm" onClick={() => submitReply(r.id)} disabled={savingId === r.id || !replyText.trim()}>
                              {savingId === r.id && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                              {t('common', 'send') || 'Envoyer'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3">
                          <Button variant="outline" size="sm" onClick={() => startReply(r)}>
                            <MessageSquare className="h-3 w-3 mr-1" />
                            {r.sellerReply ? t('artisan', 'editReply') || 'Modifier la réponse' : t('artisan', 'reply') || 'Répondre'}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
