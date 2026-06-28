'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface SignatureProps {
  quoteId: string;
  onSigned?: (signatureData: any) => void;
  onCancel?: () => void;
  signerRole: 'CLIENT' | 'ARTISAN';
}

type SignatureMode = 'draw' | 'type';

export function ElectronicSignature({
  quoteId,
  onSigned,
  onCancel,
  signerRole,
}: SignatureProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<SignatureMode>('draw');
  const [typedName, setTypedName] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // Set drawing style
    ctx.strokeStyle = '#1a365d';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);

    const rect = canvas.getBoundingClientRect();
    const point = getPoint(e, rect);

    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const point = getPoint(e, rect);

    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const getPoint = (e: React.MouseEvent | React.TouchEvent, rect: DOMRect) => {
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  };

  const getSignatureImage = (): string | null => {
    if (mode === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) return null;
      return canvas.toDataURL('image/png');
    } else {
      // For typed signature, create a canvas with the text
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 400, 100);
      ctx.font = 'italic 32px "Brush Script MT", cursive';
      ctx.fillStyle = '#1a365d';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedName, 200, 50);

      return canvas.toDataURL('image/png');
    }
  };

  const isValid = () => {
    if (!consentChecked) return false;
    if (mode === 'draw' && !hasDrawn) return false;
    if (mode === 'type' && typedName.trim().length < 2) return false;
    return true;
  };

  const handleSign = async () => {
    if (!isValid()) return;

    setLoading(true);
    setError(null);

    try {
      const signatureImage = getSignatureImage();

      const response = await fetch(`/api/quotes/${quoteId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          signatureImage,
          signatureType: mode === 'draw' ? 'DRAWN' : 'TYPED',
          signerRole,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erreur lors de la signature');
      }

      const result = await response.json();
      onSigned?.(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const legalText = signerRole === 'CLIENT'
    ? "En signant ce devis, je reconnais avoir pris connaissance de l'ensemble des conditions et accepte les termes proposes. Cette signature electronique a la meme valeur juridique qu'une signature manuscrite conformement au reglement eIDAS et aux articles 1366 et 1367 du Code civil francais."
    : "Je certifie que ce devis reflete fidelement les prestations proposees et les prix indiques. Cette signature electronique engage ma responsabilite professionnelle conformement au reglement eIDAS.";

  return (
    <div className="bg-card rounded-xl shadow-lg overflow-hidden max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-blue-800 px-6 py-4">
        <h2 className="text-xl font-bold text-white">
          Signature electronique
        </h2>
        <p className="text-blue-100 text-sm mt-1">
          {signerRole === 'CLIENT' ? 'Signez pour accepter ce devis' : 'Validez ce devis avec votre signature'}
        </p>
      </div>

      <div className="p-6">
        {/* Mode Toggle */}
        <div className="flex rounded-lg bg-muted p-1 mb-6">
          <button
            onClick={() => setMode('draw')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              mode === 'draw'
                ? 'bg-card shadow text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Dessiner
          </button>
          <button
            onClick={() => setMode('type')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              mode === 'type'
                ? 'bg-card shadow text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Taper
          </button>
        </div>

        {/* Signature Area */}
        {mode === 'draw' ? (
          <div className="mb-6">
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="w-full h-32 border-2 border-dashed border-border rounded-lg cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!hasDrawn && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-muted-foreground">Signez ici</span>
                </div>
              )}
            </div>
            <button
              onClick={clearCanvas}
              className="mt-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Effacer
            </button>
          </div>
        ) : (
          <div className="mb-6">
            <input
              type="text"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder="Votre nom complet"
              className="w-full px-4 py-3 text-2xl font-serif italic text-center border-2 border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-blue-200"
              style={{ fontFamily: '"Brush Script MT", cursive' }}
            />
            <p className="mt-2 text-sm text-muted-foreground text-center">
              Cette signature manuscrite sera utilisee
            </p>
          </div>
        )}

        {/* Legal Consent */}
        <div className="mb-6 p-4 bg-background rounded-lg">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="mt-1 w-5 h-5 text-primary border-border rounded focus:ring-primary"
            />
            <span className="text-sm text-muted-foreground leading-relaxed">
              {legalText}
            </span>
          </label>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-4 py-3 border border-border text-foreground rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
          )}
          <button
            onClick={handleSign}
            disabled={!isValid() || loading}
            className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signature en cours...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Signer le devis
              </>
            )}
          </button>
        </div>

        {/* Security Info */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Signature securisee - Conforme eIDAS
          </div>
        </div>
      </div>
    </div>
  );
}

export default ElectronicSignature;
