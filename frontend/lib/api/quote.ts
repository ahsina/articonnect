import apiClient from './client';

/**
 * Client API pour les DEVIS FORMELS (Quote QUO-xxxx).
 *
 * Backend : /quotes (voir quote.controller.ts).
 *  - Les montants sont renvoyés en Decimal → SÉRIALISÉS EN CHAÎNES (ex: "210.6").
 *    Toujours passer par `num()` avant tout calcul/affichage côté UI.
 *  - GET /quotes accepte le filtre `status` (enum) mais REFUSE page/limit
 *    (validés @IsNumber sur des query strings → 400). On ne les envoie donc pas.
 *  - GET /quotes est réservé au rôle ARTISAN. Le CLIENT n'a pas d'endpoint de
 *    liste : son inbox se reconstruit via les notifications « Nouveau devis reçu »
 *    (link = /client/quotes/:id) puis GET /quotes/:id (autorisé client+artisan).
 */

export type QuoteStatus =
  | 'DRAFT'
  | 'SENT'
  | 'VIEWED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CONVERTED';

export type LineItemType = 'LABOR' | 'MATERIAL' | 'TRAVEL' | 'OTHER';

/** Parse robuste d'un Decimal-string ou number renvoyé par l'API. */
export const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};

export interface QuoteLineItem {
  id?: string;
  itemType: LineItemType;
  description: string;
  quantity: number | string;
  unit?: string;
  unitPrice: number | string;
  totalPrice?: number | string;
  position?: number;
}

export interface QuoteParty {
  id: string;
  firstName: string;
  lastName: string | null;
  email?: string | null;
  phone?: string | null;
  avatar?: string | null;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  artisanId: string;
  clientId: string;
  missionId?: string | null;
  title: string;
  description?: string | null;
  category: string;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  subtotal: string | number;
  laborTotal: string | number;
  materialsTotal: string | number;
  travelTotal: string | number;
  discountAmount: string | number;
  discountPercent?: string | number | null;
  taxRate: string | number;
  taxAmount: string | number;
  totalAmount: string | number;
  currency: string;
  validUntil: string;
  status: QuoteStatus;
  termsAndConditions?: string | null;
  notes?: string | null;
  rejectionReason?: string | null;
  sentAt?: string | null;
  viewedAt?: string | null;
  acceptedAt?: string | null;
  respondedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  client?: QuoteParty;
  artisan?: QuoteParty;
  lineItems?: QuoteLineItem[];
  mission?: { id: string; title: string; status: string } | null;
}

export interface QuoteListResponse {
  data: Quote[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface QuoteStats {
  total: number;
  draft: number;
  sent: number;
  accepted: number;
  rejected: number;
  expired: number;
  conversionRate: number;
  totalAcceptedValue: string | number;
}

export interface CreateQuoteLineItemInput {
  itemType: LineItemType;
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
}

export interface CreateQuoteInput {
  clientId: string;
  missionId?: string;
  title: string;
  description?: string;
  category: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  taxRate: number;
  discountPercent?: number;
  validUntil: string; // ISO date (YYYY-MM-DD accepté)
  lineItems: CreateQuoteLineItemInput[];
  termsAndConditions?: string;
  notes?: string;
}

export interface SignQuoteInput {
  signatureImage?: string;
  signatureType: 'DRAWN' | 'TYPED' | 'CHECKBOX';
  signerRole: 'CLIENT' | 'ARTISAN';
}

export const quoteApi = {
  /** Liste des devis de l'artisan connecté (filtre `status` optionnel). */
  list: async (status?: QuoteStatus): Promise<QuoteListResponse> => {
    const response = await apiClient.get('/quotes', {
      params: status ? { status } : undefined,
    });
    return response.data;
  },

  getStats: async (): Promise<QuoteStats> => {
    const response = await apiClient.get('/quotes/stats');
    return response.data;
  },

  /** Détail d'un devis (autorisé au client destinataire ET à l'artisan émetteur). */
  get: async (id: string): Promise<Quote> => {
    const response = await apiClient.get(`/quotes/${id}`);
    return response.data;
  },

  create: async (data: CreateQuoteInput): Promise<Quote> => {
    const response = await apiClient.post('/quotes', data);
    return response.data;
  },

  /** Passe le devis DRAFT → SENT et notifie le client (« Nouveau devis reçu »). */
  send: async (id: string, message?: string): Promise<Quote> => {
    const response = await apiClient.post(`/quotes/${id}/send`, { message });
    return response.data;
  },

  /** CLIENT : marque le devis SENT → VIEWED. */
  markViewed: async (id: string): Promise<Quote> => {
    const response = await apiClient.post(`/quotes/${id}/view`);
    return response.data;
  },

  /** CLIENT : accepte (accepted:true) ou refuse (accepted:false + rejectionReason). */
  respond: async (
    id: string,
    payload: { accepted: boolean; rejectionReason?: string; signature?: string },
  ): Promise<Quote> => {
    const response = await apiClient.post(`/quotes/${id}/respond`, payload);
    return response.data;
  },

  /**
   * Signature électronique. Champs EXACTS attendus par le backend :
   * { signatureImage, signatureType, signerRole }. Le devis doit être en statut
   * SENT/PENDING (ne pas marquer VIEWED avant de signer).
   */
  sign: async (
    id: string,
    payload: SignQuoteInput,
  ): Promise<{ signatureId: string; signedAt: string; documentHash: string }> => {
    const response = await apiClient.post(`/quotes/${id}/sign`, payload);
    return response.data;
  },

  /** URL de téléchargement du PDF (ARTISAN uniquement côté backend). */
  pdfUrl: (id: string): string => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    return `${base}/documents/pdf/quote/${id}`;
  },
};

export default quoteApi;
