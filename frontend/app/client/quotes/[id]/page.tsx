'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { quoteApi, num, type Quote, type QuoteStatus, type LineItemType } from '@/lib/api/quote';

const STATUS_COLORS: Record<QuoteStatus, string> = {
  DRAFT: 'bg-muted text-foreground',
  SENT: 'bg-amber-100 text-amber-800',
  VIEWED: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-muted text-muted-foreground',
  CONVERTED: 'bg-primary/10 text-primary',
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

export default function ClientQuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();
  const id = String(params?.id || '');

  // Libellés de statut et de type de ligne, traduits (t() humanise la clé si absente du dictionnaire).
  const STATUS_LABELS: Record<QuoteStatus, string> = {
    DRAFT: t('quotes', 'statusDraft'),
    SENT: t('quotes', 'statusSent'),
    VIEWED: t('quotes', 'statusViewed'),
    ACCEPTED: t('quotes', 'statusAccepted'),
    REJECTED: t('quotes', 'statusRejected'),
    EXPIRED: t('quotes', 'statusExpired'),
    CONVERTED: t('quotes', 'statusConverted'),
  };
  const ITEM_TYPE_LABELS: Record<LineItemType, string> = {
    LABOR: t('quotes', 'itemTypeLabor'),
    MATERIAL: t('quotes', 'itemTypeMaterial'),
    TRAVEL: t('quotes', 'itemTypeTravel'),
    OTHER: t('quotes', 'itemTypeOther'),
  };

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  // Refus
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Signature
  const [showSignature, setShowSignature] = useState(false);
  const [signing, setSigning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      const q = await quoteApi.get(id);
      setQuote(q);
    } catch (error: any) {
      console.error('Erreur chargement devis:', error);
      toast({
        title: t('common', 'error'),
        description:
          error?.response?.status === 403 || error?.response?.status === 404
            ? t('quotes', 'notFoundOrForbidden')
            : t('quotes', 'loadError'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const isExpired =
    !!quote && new Date(quote.validUntil).getTime() < Date.now() &&
    !['ACCEPTED', 'CONVERTED'].includes(quote.status);

  const canRespond = !!quote && ['SENT', 'VIEWED'].includes(quote.status) && !isExpired;
  // La signature exige le statut SENT/PENDING côté backend (pas VIEWED) :
  // on ne pré-marque donc jamais « VIEWED » sur cette page.
  const canSign = !!quote && quote.status === 'SENT' && !isExpired;

  const handleAccept = async () => {
    if (!quote) return;
    setActing(true);
    try {
      await quoteApi.respond(quote.id, { accepted: true });
      toast({ title: t('quotes', 'accepted'), description: t('quotes', 'artisanNotified'), variant: 'success' });
      await load();
    } catch (error: any) {
      toast({
        title: t('common', 'error'),
        description: error?.response?.data?.message?.toString() || t('quotes', 'acceptError'),
        variant: 'destructive',
      });
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    if (!quote) return;
    setActing(true);
    try {
      await quoteApi.respond(quote.id, { accepted: false, rejectionReason: rejectReason.trim() || undefined });
      toast({ title: t('quotes', 'rejected'), description: t('quotes', 'artisanNotified'), variant: 'success' });
      setShowReject(false);
      setRejectReason('');
      await load();
    } catch (error: any) {
      toast({
        title: t('common', 'error'),
        description: error?.response?.data?.message?.toString() || t('quotes', 'rejectError'),
        variant: 'destructive',
      });
    } finally {
      setActing(false);
    }
  };

  // ----- Signature canvas -----
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  };
  const clearCanvas = () => {
    setHasDrawn(false);
    initCanvas();
  };
  const posOf = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const cy = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: cx - rect.left, y: cy - rect.top };
  };
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = posOf(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = posOf(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };
  const stopDrawing = () => setIsDrawing(false);

  useEffect(() => {
    if (showSignature) setTimeout(initCanvas, 80);
  }, [showSignature]);

  const handleSign = async () => {
    if (!quote) return;
    if (!hasDrawn) {
      toast({ title: t('quotes', 'signatureRequired'), description: t('quotes', 'drawSignature'), variant: 'destructive' });
      return;
    }
    setSigning(true);
    try {
      const signatureImage = canvasRef.current!.toDataURL('image/png');
      // Champs EXACTS attendus : signatureImage / signatureType / signerRole.
      await quoteApi.sign(quote.id, {
        signatureImage,
        signatureType: 'DRAWN',
        signerRole: 'CLIENT',
      });
      toast({
        title: t('quotes', 'signed'),
        description: t('quotes', 'signedDesc'),
        variant: 'success',
      });
      setShowSignature(false);
      await load();
    } catch (error: any) {
      console.error('Erreur signature:', error);
      toast({
        title: t('common', 'error'),
        description: error?.response?.data?.message?.toString() || t('quotes', 'signError'),
        variant: 'destructive',
      });
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">{t('quotes', 'loading')}</div>;
  }
  if (!quote) {
    return (
      <div className="p-6">
        <Button variant="outline" onClick={() => router.push('/client/quotes')}>← {t('quotes', 'backToQuotes')}</Button>
        <div className="text-center py-12 text-muted-foreground">{t('quotes', 'notFound')}</div>
      </div>
    );
  }

  const artisanName = quote.artisan
    ? [quote.artisan.firstName, quote.artisan.lastName].filter(Boolean).join(' ')
    : t('quotes', 'artisanDefault');

  return (
    <div className="min-h-screen bg-background py-8 px-4">
    <div className="max-w-[820px] mx-auto">
      <button
        onClick={() => router.push('/client/quotes')}
        className="text-[13.5px] font-semibold text-muted-foreground mb-4 hover:text-foreground"
      >
        ← {t('quotes', 'backToQuotes')}
      </button>

      <Card className="mb-4">
        <CardContent className="p-6 pt-6">
          <div className="flex items-start justify-between gap-5 flex-wrap">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-[11.5px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">{quote.quoteNumber}</span>
                <Badge className={STATUS_COLORS[quote.status]}>{STATUS_LABELS[quote.status]}</Badge>
                {isExpired && <Badge className="bg-red-100 text-red-700">{t('quotes', 'expired')}</Badge>}
              </div>
              <h1 className="font-display text-[23px] font-extrabold tracking-tight mt-2 text-foreground">{quote.title}</h1>
              <p className="text-[13.5px] text-muted-foreground mt-1">{t('quotes', 'fromLabel')} {artisanName}</p>
            </div>
            <div className="text-right">
              <div className="font-display text-[26px] font-extrabold text-foreground">{formatCurrency(num(quote.totalAmount))}</div>
              <div className="text-xs text-muted-foreground">{t('quotes', 'validUntil')} {formatDate(quote.validUntil)}</div>
              <a href={quoteApi.pdfUrl(quote.id)} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="mt-3">{t('quotes', 'downloadPdf')}</Button>
              </a>
            </div>
          </div>

          {quote.description && <p className="text-sm text-muted-foreground my-4">{quote.description}</p>}

          {/* Lignes */}
          <div className="border border-border rounded-xl overflow-hidden mt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted text-muted-foreground">
                    <th className="text-left font-semibold text-[12.5px] px-3.5 py-2.5">{t('quotes', 'colDescription')}</th>
                    <th className="text-left font-semibold text-[12.5px] px-3.5 py-2.5">{t('quotes', 'colType')}</th>
                    <th className="text-right font-semibold text-[12.5px] px-3.5 py-2.5">{t('quotes', 'colQty')}</th>
                    <th className="text-right font-semibold text-[12.5px] px-3.5 py-2.5">{t('quotes', 'colUnitPrice')}</th>
                    <th className="text-right font-semibold text-[12.5px] px-3.5 py-2.5">{t('quotes', 'colTotal')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(quote.lineItems || []).map((l, i) => (
                    <tr key={l.id || i} className="border-t border-border">
                      <td className="px-3.5 py-3 text-foreground">{l.description}</td>
                      <td className="px-3.5 py-3 text-muted-foreground">{ITEM_TYPE_LABELS[l.itemType] || l.itemType}</td>
                      <td className="px-3.5 py-3 text-right">{num(l.quantity)}</td>
                      <td className="px-3.5 py-3 text-right">{formatCurrency(num(l.unitPrice))}</td>
                      <td className="px-3.5 py-3 text-right font-semibold">
                        {formatCurrency(num(l.totalPrice ?? num(l.quantity) * num(l.unitPrice)))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totaux */}
          <div className="mt-[18px] ml-auto max-w-[280px] text-sm">
            <div className="flex justify-between py-1.5"><span className="text-muted-foreground">{t('quotes', 'subtotal')}</span><span>{formatCurrency(num(quote.subtotal))}</span></div>
            {num(quote.discountAmount) > 0 && (
              <div className="flex justify-between py-1.5"><span className="text-muted-foreground">{t('quotes', 'discount')}</span><span className="text-destructive">−{formatCurrency(num(quote.discountAmount))}</span></div>
            )}
            <div className="flex justify-between py-1.5"><span className="text-muted-foreground">{t('quotes', 'vat')} ({num(quote.taxRate)}%)</span><span>{formatCurrency(num(quote.taxAmount))}</span></div>
            <div className="flex justify-between border-t border-border pt-3 mt-1.5 font-display text-[17px] font-extrabold"><span>{t('quotes', 'totalTtc')}</span><span>{formatCurrency(num(quote.totalAmount))}</span></div>
          </div>

          {quote.termsAndConditions && (
            <div className="mt-[18px] p-4 bg-muted rounded-xl text-[13.5px] text-muted-foreground whitespace-pre-line">
              <div className="font-semibold text-foreground mb-1">{t('quotes', 'conditions')}</div>
              {quote.termsAndConditions}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {['ACCEPTED', 'CONVERTED'].includes(quote.status) ? (
        <Card>
          <CardContent className="p-5 pt-5 text-center text-green-700 bg-green-50 rounded-2xl">
            {t('quotes', 'acceptedMessage')}{quote.status === 'CONVERTED' ? t('quotes', 'acceptedSignedSuffix') : ''}.
          </CardContent>
        </Card>
      ) : quote.status === 'REJECTED' ? (
        <Card>
          <CardContent className="p-5 pt-5 text-center text-red-700 bg-red-50 rounded-2xl">
            {t('quotes', 'rejectedMessage')}
          </CardContent>
        </Card>
      ) : isExpired ? (
        <Card>
          <CardContent className="p-5 pt-5 text-center text-muted-foreground">
            {t('quotes', 'expiredMessage')}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-5 pt-5">
            <div className="rounded-xl bg-blue-50 p-3.5 text-[13px] text-blue-700 mb-4">
              {t('quotes', 'helpTextPrefix')} <strong>{t('quotes', 'helpTextBold')}</strong> {t('quotes', 'helpTextSuffix')}
            </div>
            <div className="flex flex-wrap gap-2.5 items-center">
              {canSign && <Button onClick={() => setShowSignature(true)}>{t('quotes', 'acceptAndSign')}</Button>}
              {canRespond && (
                <Button variant={canSign ? 'outline' : 'default'} onClick={handleAccept} disabled={acting}>
                  {acting ? t('quotes', 'processing') : t('quotes', 'accept')}
                </Button>
              )}
              {canRespond && (
                <Button variant="ghost" className="text-destructive" onClick={() => setShowReject(true)}>
                  {t('quotes', 'reject')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal refus */}
      {showReject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-foreground mb-3">{t('quotes', 'rejectQuoteTitle')}</h3>
            <Textarea
              placeholder={t('quotes', 'reasonOptional')}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowReject(false)}>{t('quotes', 'cancel')}</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleReject} disabled={acting}>
                {acting ? '…' : t('quotes', 'confirmReject')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal signature */}
      {showSignature && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-foreground">{t('quotes', 'signQuoteTitle')}</h3>
              <button onClick={() => setShowSignature(false)} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
            </div>
            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground">{quote.quoteNumber}</div>
              <div className="font-medium text-foreground">{quote.title}</div>
              <div className="text-lg font-bold text-primary mt-1">{formatCurrency(num(quote.totalAmount))}</div>
            </div>
            <label className="block text-sm font-medium text-foreground mb-2">{t('quotes', 'drawSignatureLabel')}</label>
            <div className="border-2 border-dashed border-border rounded-lg overflow-hidden">
              <canvas
                ref={canvasRef}
                width={440}
                height={150}
                className="w-full cursor-crosshair touch-none bg-white"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            <Button variant="ghost" size="sm" onClick={clearCanvas} className="mt-2">{t('quotes', 'clear')}</Button>
            <div className="p-3 bg-primary/10 rounded-lg my-4 text-xs text-primary">
              {t('quotes', 'eidasNotice')}
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowSignature(false)}>{t('quotes', 'cancel')}</Button>
              <Button onClick={handleSign} disabled={signing}>{signing ? t('quotes', 'signing') : t('quotes', 'confirmAndSign')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
