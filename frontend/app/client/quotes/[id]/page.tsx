'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { quoteApi, num, type Quote, type QuoteStatus, type LineItemType } from '@/lib/api/quote';

const STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: 'Brouillon',
  SENT: 'À traiter',
  VIEWED: 'Vu',
  ACCEPTED: 'Accepté',
  REJECTED: 'Refusé',
  EXPIRED: 'Expiré',
  CONVERTED: 'Signé',
};

const STATUS_COLORS: Record<QuoteStatus, string> = {
  DRAFT: 'bg-muted text-foreground',
  SENT: 'bg-amber-100 text-amber-800',
  VIEWED: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-muted text-muted-foreground',
  CONVERTED: 'bg-primary/10 text-primary',
};

const ITEM_TYPE_LABELS: Record<LineItemType, string> = {
  LABOR: "Main d'œuvre",
  MATERIAL: 'Matériel',
  TRAVEL: 'Déplacement',
  OTHER: 'Autre',
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

export default function ClientQuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = String(params?.id || '');

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
        title: 'Erreur',
        description:
          error?.response?.status === 403 || error?.response?.status === 404
            ? "Ce devis est introuvable ou ne vous est pas destiné."
            : 'Impossible de charger le devis.',
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
      toast({ title: 'Devis accepté', description: "L'artisan a été notifié.", variant: 'success' });
      await load();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error?.response?.data?.message?.toString() || "Impossible d'accepter le devis.",
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
      toast({ title: 'Devis refusé', description: "L'artisan a été notifié.", variant: 'success' });
      setShowReject(false);
      setRejectReason('');
      await load();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error?.response?.data?.message?.toString() || 'Impossible de refuser le devis.',
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
      toast({ title: 'Signature requise', description: 'Veuillez dessiner votre signature.', variant: 'destructive' });
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
        title: 'Devis signé',
        description: 'Votre acceptation a été enregistrée. Une facture a été générée.',
        variant: 'success',
      });
      setShowSignature(false);
      await load();
    } catch (error: any) {
      console.error('Erreur signature:', error);
      toast({
        title: 'Erreur',
        description: error?.response?.data?.message?.toString() || 'Échec de la signature.',
        variant: 'destructive',
      });
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">Chargement…</div>;
  }
  if (!quote) {
    return (
      <div className="p-6">
        <Button variant="outline" onClick={() => router.push('/client/quotes')}>← Retour aux devis</Button>
        <div className="text-center py-12 text-muted-foreground">Devis introuvable.</div>
      </div>
    );
  }

  const artisanName = quote.artisan
    ? [quote.artisan.firstName, quote.artisan.lastName].filter(Boolean).join(' ')
    : 'Artisan';

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Button variant="outline" size="sm" onClick={() => router.push('/client/quotes')} className="mb-4">
        ← Retour aux devis
      </Button>

      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-muted-foreground">{quote.quoteNumber}</span>
                <Badge className={STATUS_COLORS[quote.status]}>{STATUS_LABELS[quote.status]}</Badge>
                {isExpired && <Badge className="bg-red-100 text-red-700">Expiré</Badge>}
              </div>
              <CardTitle className="mt-1">{quote.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">De : {artisanName}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{formatCurrency(num(quote.totalAmount))}</div>
              <div className="text-xs text-muted-foreground">Valide jusqu&apos;au {formatDate(quote.validUntil)}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {quote.description && <p className="text-sm text-muted-foreground mb-4">{quote.description}</p>}

          {/* Lignes */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-3 py-2">Désignation</th>
                    <th className="text-left font-medium px-3 py-2">Type</th>
                    <th className="text-right font-medium px-3 py-2">Qté</th>
                    <th className="text-right font-medium px-3 py-2">P.U.</th>
                    <th className="text-right font-medium px-3 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(quote.lineItems || []).map((l, i) => (
                    <tr key={l.id || i} className="border-t">
                      <td className="px-3 py-2 text-foreground">{l.description}</td>
                      <td className="px-3 py-2 text-muted-foreground">{ITEM_TYPE_LABELS[l.itemType] || l.itemType}</td>
                      <td className="px-3 py-2 text-right">{num(l.quantity)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(num(l.unitPrice))}</td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatCurrency(num(l.totalPrice ?? num(l.quantity) * num(l.unitPrice)))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totaux */}
          <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Sous-total</span><span>{formatCurrency(num(quote.subtotal))}</span></div>
            {num(quote.discountAmount) > 0 && (
              <div className="flex justify-between"><span className="text-muted-foreground">Remise</span><span className="text-red-600">-{formatCurrency(num(quote.discountAmount))}</span></div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground">TVA ({num(quote.taxRate)}%)</span><span>{formatCurrency(num(quote.taxAmount))}</span></div>
            <div className="flex justify-between border-t pt-1 mt-1 font-semibold"><span>Total TTC</span><span className="text-primary">{formatCurrency(num(quote.totalAmount))}</span></div>
          </div>

          {quote.termsAndConditions && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground whitespace-pre-line">
              <div className="font-medium text-foreground mb-1">Conditions</div>
              {quote.termsAndConditions}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {['ACCEPTED', 'CONVERTED'].includes(quote.status) ? (
        <Card>
          <CardContent className="p-4 text-center text-green-700 bg-green-50 rounded-lg">
            Vous avez accepté ce devis{quote.status === 'CONVERTED' ? ' (signé, facture générée)' : ''}.
          </CardContent>
        </Card>
      ) : quote.status === 'REJECTED' ? (
        <Card>
          <CardContent className="p-4 text-center text-red-700 bg-red-50 rounded-lg">
            Vous avez refusé ce devis.
          </CardContent>
        </Card>
      ) : isExpired ? (
        <Card>
          <CardContent className="p-4 text-center text-muted-foreground">
            Ce devis a expiré. Contactez l&apos;artisan pour en obtenir un nouveau.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-3">
              Vous pouvez accepter ce devis en un clic, ou le signer électroniquement (valeur juridique
              eIDAS) pour générer directement la facture.
            </p>
            <div className="flex flex-wrap gap-3">
              {canSign && <Button onClick={() => setShowSignature(true)}>Accepter et signer</Button>}
              {canRespond && (
                <Button variant={canSign ? 'outline' : 'default'} onClick={handleAccept} disabled={acting}>
                  {acting ? 'Traitement…' : 'Accepter'}
                </Button>
              )}
              {canRespond && (
                <Button variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => setShowReject(true)}>
                  Refuser
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
            <h3 className="text-lg font-bold text-foreground mb-3">Refuser le devis</h3>
            <Textarea
              placeholder="Motif (optionnel)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowReject(false)}>Annuler</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleReject} disabled={acting}>
                {acting ? '…' : 'Confirmer le refus'}
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
              <h3 className="text-lg font-bold text-foreground">Signer le devis</h3>
              <button onClick={() => setShowSignature(false)} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
            </div>
            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground">{quote.quoteNumber}</div>
              <div className="font-medium text-foreground">{quote.title}</div>
              <div className="text-lg font-bold text-primary mt-1">{formatCurrency(num(quote.totalAmount))}</div>
            </div>
            <label className="block text-sm font-medium text-foreground mb-2">Dessinez votre signature :</label>
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
            <Button variant="ghost" size="sm" onClick={clearCanvas} className="mt-2">Effacer</Button>
            <div className="p-3 bg-primary/10 rounded-lg my-4 text-xs text-primary">
              En signant, je reconnais avoir pris connaissance des conditions et accepte les termes du
              devis. Cette signature électronique a valeur juridique (règlement eIDAS, art. 1366-1367 du
              Code civil).
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowSignature(false)}>Annuler</Button>
              <Button onClick={handleSign} disabled={signing}>{signing ? 'Signature…' : 'Confirmer et signer'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
