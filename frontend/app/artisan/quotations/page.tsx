'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { artisanApi } from '@/lib/api/artisan';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

interface Quotation {
  id: string;
  missionId: string;
  amount: number;
  description: string;
  validUntil: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'SIGNED';
  signedAt?: string;
  signedByClient?: boolean;
  signedByArtisan?: boolean;
  mission?: {
    id: string;
    title: string;
    client: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-100 text-gray-800',
  SIGNED: 'bg-blue-100 text-blue-800',
};

export default function QuotationsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'ACCEPTED'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Signature state
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [signing, setSigning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    loadQuotations();
  }, [filter, page]);

  const loadQuotations = async () => {
    try {
      const params: any = { page, limit: 20 };
      if (filter !== 'all') params.status = filter;

      const response = await artisanApi.getQuotations(params);
      setQuotations(response.data || []);
      setTotalPages(response.meta?.totalPages || 1);
    } catch (error) {
      console.error('Error loading quotations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const isExpiringSoon = (validUntil: string) => {
    const expiry = new Date(validUntil);
    const now = new Date();
    const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    return expiry > now && expiry < threeDays;
  };

  // Signature canvas functions
  const openSignatureModal = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setShowSignatureModal(true);
  };

  const closeSignatureModal = () => {
    setShowSignatureModal(false);
    setSelectedQuotation(null);
    clearCanvas();
  };

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
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleSignQuote = async () => {
    if (!selectedQuotation) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    setSigning(true);
    try {
      const signatureData = canvas.toDataURL('image/png');

      // Call the signature API
      const response = await fetch(`/api/quotes/${selectedQuotation.id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature: signatureData,
          signerType: 'ARTISAN',
        }),
      });

      if (response.ok) {
        toast({
          title: t('quotations', 'signatureSuccess') || 'Signature Success',
          description: t('quotations', 'signatureSuccessDesc') || 'Quote signed successfully',
          variant: 'success',
        });
        closeSignatureModal();
        loadQuotations();
      } else {
        throw new Error('Signature failed');
      }
    } catch (error) {
      console.error('Signature error:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('quotations', 'signatureError') || 'Failed to sign quote',
        variant: 'destructive',
      });
    } finally {
      setSigning(false);
    }
  };

  const sendSignatureRequest = async (quotation: Quotation) => {
    try {
      const response = await fetch(`/api/quotes/${quotation.id}/request-signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientEmail: quotation.mission?.client.email,
        }),
      });

      if (response.ok) {
        toast({
          title: t('quotations', 'signatureRequestSent') || 'Request Sent',
          description: t('quotations', 'signatureRequestSentDesc') || 'Signature request sent to client',
          variant: 'success',
        });
      } else {
        throw new Error('Request failed');
      }
    } catch (error) {
      console.error('Signature request error:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description: t('quotations', 'signatureRequestError') || 'Failed to send signature request',
        variant: 'destructive',
      });
    }
  };

  // Initialize canvas when modal opens
  useEffect(() => {
    if (showSignatureModal) {
      setTimeout(initCanvas, 100);
    }
  }, [showSignatureModal]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600">{t('common', 'loading') || 'Loading...'}</div>
      </div>
    );
  }

  const stats = {
    total: quotations.length,
    pending: quotations.filter((q) => q.status === 'PENDING').length,
    accepted: quotations.filter((q) => q.status === 'ACCEPTED').length,
    totalValue: quotations
      .filter((q) => q.status === 'ACCEPTED')
      .reduce((sum, q) => sum + q.amount, 0),
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('artisan', 'quotations') || 'Quotations'}
        </h1>
        <p className="text-gray-600">
          {t('artisan', 'manageQuotations') || 'Manage your quotations and proposals'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">
              {t('artisan', 'totalQuotations') || 'Total'}
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">{t('artisan', 'pending') || 'Pending'}</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">{t('artisan', 'accepted') || 'Accepted'}</div>
            <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">
              {t('artisan', 'totalValue') || 'Total Value'}
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(stats.totalValue)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          {t('common', 'all') || 'All'}
        </Button>
        <Button
          variant={filter === 'PENDING' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('PENDING')}
        >
          {t('artisan', 'pending') || 'Pending'}
        </Button>
        <Button
          variant={filter === 'ACCEPTED' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('ACCEPTED')}
        >
          {t('artisan', 'accepted') || 'Accepted'}
        </Button>
      </div>

      {/* Quotations List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('artisan', 'quotationsList') || 'Quotations List'}</CardTitle>
        </CardHeader>
        <CardContent>
          {quotations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📄</div>
              <p>{t('artisan', 'noQuotations') || 'No quotations found'}</p>
              <p className="text-sm mt-2">
                {t('artisan', 'createQuotationHint') || 'Create quotations from mission requests'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {quotations.map((quotation) => (
                <div
                  key={quotation.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">
                          {quotation.mission?.title || `Quotation #${quotation.id.slice(0, 8)}`}
                        </h4>
                        <Badge className={STATUS_COLORS[quotation.status]}>
                          {quotation.status}
                        </Badge>
                        {quotation.status === 'PENDING' && isExpiringSoon(quotation.validUntil) && (
                          <Badge className="bg-orange-100 text-orange-800">
                            ⏰ {t('artisan', 'expiringSoon') || 'Expiring Soon'}
                          </Badge>
                        )}
                      </div>
                      {quotation.mission?.client && (
                        <p className="text-sm text-gray-600 mb-2">
                          {t('artisan', 'client') || 'Client'}: {quotation.mission.client.firstName}{' '}
                          {quotation.mission.client.lastName}
                        </p>
                      )}
                      <p className="text-sm text-gray-500">{quotation.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>
                          {t('artisan', 'created') || 'Created'}: {formatDate(quotation.createdAt)}
                        </span>
                        <span>
                          {t('artisan', 'validUntil') || 'Valid until'}:{' '}
                          {formatDate(quotation.validUntil)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900">
                        {formatCurrency(quotation.amount)}
                      </div>
                      <div className="flex flex-col gap-2 mt-2">
                        {quotation.mission && (
                          <Link href={`/artisan/missions/${quotation.missionId}`}>
                            <Button variant="outline" size="sm" className="w-full">
                              {t('artisan', 'viewMission') || 'View Mission'}
                            </Button>
                          </Link>
                        )}
                        {quotation.status === 'ACCEPTED' && !quotation.signedByArtisan && (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => openSignatureModal(quotation)}
                          >
                            ✍️ {t('quotations', 'sign') || 'Sign'}
                          </Button>
                        )}
                        {quotation.status === 'ACCEPTED' && quotation.signedByArtisan && !quotation.signedByClient && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => sendSignatureRequest(quotation)}
                          >
                            📧 {t('quotations', 'requestClientSignature') || 'Request Client Signature'}
                          </Button>
                        )}
                        {quotation.signedByArtisan && quotation.signedByClient && (
                          <Badge className="bg-green-100 text-green-800 justify-center">
                            ✓ {t('quotations', 'fullySigned') || 'Fully Signed'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
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
              <span className="py-2 px-4 text-sm text-gray-600">
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
        </CardContent>
      </Card>

      {/* Signature Modal */}
      {showSignatureModal && selectedQuotation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {t('quotations', 'signQuote') || 'Sign Quotation'}
              </h3>
              <button
                onClick={closeSignatureModal}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                {t('quotations', 'quotationFor') || 'Quotation for'}:
              </div>
              <div className="font-medium text-gray-900">
                {selectedQuotation.mission?.title || `#${selectedQuotation.id.slice(0, 8)}`}
              </div>
              <div className="text-lg font-bold text-blue-600 mt-1">
                {formatCurrency(selectedQuotation.amount)}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('quotations', 'drawSignature') || 'Draw your signature below'}:
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={150}
                  className="w-full cursor-crosshair touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCanvas}
                className="mt-2"
              >
                {t('quotations', 'clearSignature') || 'Clear'}
              </Button>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg mb-4 text-sm text-blue-800">
              <p>
                {t('quotations', 'signatureDisclaimer') ||
                  'By signing this quotation, you confirm that you agree to provide the services described at the specified price.'}
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={closeSignatureModal}>
                {t('common', 'cancel') || 'Cancel'}
              </Button>
              <Button
                onClick={handleSignQuote}
                disabled={signing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {signing
                  ? t('quotations', 'signing') || 'Signing...'
                  : t('quotations', 'confirmSignature') || 'Confirm Signature'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
