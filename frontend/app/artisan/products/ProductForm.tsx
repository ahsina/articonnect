'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  marketplaceApi,
  Product,
  ProductStatus,
  Category,
  CreateProductDto,
} from '@/lib/api/marketplace';
import { useLanguage } from '@/contexts/LanguageContext';
import { X, Upload, Loader2, Trash2 } from 'lucide-react';

interface ProductFormProps {
  product?: Product | null; // édition si fourni, sinon création
  categories: Category[];
  onClose: () => void;
  onSaved: (product: Product) => void;
}

const STATUSES: ProductStatus[] = ['DRAFT', 'ACTIVE', 'INACTIVE', 'SOLD_OUT'];

// Types d'image réellement acceptés par le backend (détection par magic bytes côté serveur).
// On les valide AUSSI côté client pour donner un message clair AVANT l'appel réseau et éviter
// que l'utilisateur ne choisisse un SVG / HEIC (photo iPhone) qui serait rejeté par le serveur.
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ACCEPTED_IMAGE_ACCEPT = ACCEPTED_IMAGE_TYPES.join(',');
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 Mo (aligné sur S3Service.maxFileSizes.image)

/**
 * Aplati une arborescence de catégories (racines + sous-catégories) en une liste plate,
 * dédupliquée par id et triée par nom. Robuste que le backend renvoie une liste plate
 * (findAll) OU un arbre imbriqué (getTree) : dans les deux cas TOUTES les catégories
 * (pas seulement les racines) sont proposées dans le sélecteur.
 */
function flattenCategories(categories: Category[]): Category[] {
  const seen = new Map<string, Category>();
  const walk = (list?: Category[]) => {
    for (const c of list || []) {
      if (c && c.id && !seen.has(c.id)) seen.set(c.id, c);
      if (c?.children?.length) walk(c.children);
    }
  };
  walk(categories);
  return Array.from(seen.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }),
  );
}

export default function ProductForm({ product, categories, onClose, onSaved }: ProductFormProps) {
  const { t } = useLanguage();
  const isEdit = !!product;

  // Liste plate, dédupliquée et triée de TOUTES les catégories (racines + sous-catégories).
  const categoryOptions = flattenCategories(categories);

  // Le backend renvoie categoryId (uuid). Le champ `category` du DTO accepte id OU slug.
  const initialCategory =
    product?.categoryId || product?.category || categoryOptions[0]?.id || '';

  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState<string>(product?.price != null ? String(product.price) : '');
  const [vatRate, setVatRate] = useState<string>(
    product?.vatRate != null ? String(product.vatRate) : '17',
  );
  const [stock, setStock] = useState<string>(product?.stock != null ? String(product.stock) : '0');
  const [sku, setSku] = useState(product?.sku || '');
  const [category, setCategory] = useState(initialCategory);
  const [status, setStatus] = useState<ProductStatus>(product?.status || 'DRAFT');
  const [images, setImages] = useState<string[]>(product?.images || []);
  const [imageUrl, setImageUrl] = useState('');

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addImageUrl = () => {
    const url = imageUrl.trim();
    if (!url) return;
    setImages((prev) => [...prev, url]);
    setImageUrl('');
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Validation client AVANT l'appel réseau : type réellement accepté + taille.
    // Donne un message clair (français) plutôt qu'un échec serveur opaque, notamment pour
    // les SVG / HEIC (photos iPhone) que le backend rejette (détection par magic bytes).
    for (const file of Array.from(files)) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setError(
          `Format non pris en charge (${file.name}). Formats acceptés : JPEG, PNG, WebP ou GIF.`,
        );
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setError(`Image trop volumineuse (${file.name}). Taille maximale : 5 Mo.`);
        return;
      }
    }

    setUploading(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const { url } = await marketplaceApi.uploadPhoto(file);
        uploaded.push(url);
      }
      setImages((prev) => [...prev, ...uploaded]);
    } catch (e: any) {
      // Remonte le motif exact renvoyé par le backend (ex : type non autorisé, antivirus)
      // au lieu d'un message générique noyant la cause.
      const msg = e?.response?.data?.message;
      setError(
        (Array.isArray(msg) ? msg.join(', ') : msg) ||
          "Échec de l'envoi de la photo. Réessayez avec une image JPEG, PNG, WebP ou GIF (max 5 Mo).",
      );
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const validate = (): string | null => {
    if (!name.trim()) return t('artisan', 'nameRequired') || 'Le nom est requis';
    if (!description.trim()) return t('artisan', 'descriptionRequired') || 'La description est requise';
    const p = Number(price);
    if (!price || Number.isNaN(p) || p < 0) return t('artisan', 'priceInvalid') || 'Prix invalide';
    const s = Number(stock);
    if (Number.isNaN(s) || s < 0) return t('artisan', 'stockInvalid') || 'Stock invalide';
    if (!category) return t('artisan', 'categoryRequired') || 'La catégorie est requise';
    return null;
  };

  const handleSubmit = async () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: CreateProductDto = {
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        vatRate: vatRate === '' ? undefined : Number(vatRate),
        stock: Number(stock),
        category,
        images,
        sku: sku.trim() || undefined,
        status,
      };

      let saved: Product;
      if (isEdit && product) {
        saved = await marketplaceApi.updateProduct(product.id, payload);
      } else {
        saved = await marketplaceApi.createProduct(payload);
      }
      onSaved(saved);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        (Array.isArray(e?.response?.data?.message) ? e.response.data.message.join(', ') : null) ||
        (t('common', 'error') || 'Une erreur est survenue');
      setError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-card border border-border shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <h2 className="text-lg font-bold text-foreground">
            {isEdit ? t('artisan', 'editProduct') || 'Modifier le produit' : t('artisan', 'addProduct') || 'Ajouter un produit'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={t('common', 'close') || 'Fermer'}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div>
            <Label htmlFor="p-name">{t('artisan', 'productName') || 'Nom du produit'} *</Label>
            <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Lustre LED moderne" />
          </div>

          <div>
            <Label htmlFor="p-desc">{t('artisan', 'description') || 'Description'} *</Label>
            <Textarea
              id="p-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder={t('artisan', 'descriptionPlaceholder') || 'Décrivez votre produit…'}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="p-price">{t('artisan', 'price') || 'Prix'} (€) *</Label>
              <Input id="p-price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="p-vat">{t('artisan', 'vatRate') || 'TVA'} (%)</Label>
              <Input id="p-vat" type="number" min="0" step="0.1" value={vatRate} onChange={(e) => setVatRate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="p-stock">{t('artisan', 'stock') || 'Stock'} *</Label>
              <Input id="p-stock" type="number" min="0" step="1" value={stock} onChange={(e) => setStock(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <Label htmlFor="p-sku">{t('artisan', 'sku') || 'Référence (SKU)'}</Label>
              <Input id="p-sku" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="LUS-LED-001" />
            </div>
            <div>
              <Label htmlFor="p-cat">{t('artisan', 'category') || 'Catégorie'} *</Label>
              <select
                id="p-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {categoryOptions.length === 0 && <option value="">—</option>}
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="p-status">{t('artisan', 'status') || 'Statut'}</Label>
              <select
                id="p-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ProductStatus)}
                className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t('productStatus', s) || s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Photos */}
          <div>
            <Label>{t('artisan', 'photos') || 'Photos'}</Label>
            <div className="mt-2 flex flex-wrap gap-3">
              {images.map((img, idx) => (
                <div key={`${img}-${idx}`} className="relative group">
                  <img src={img} alt="" className="w-20 h-20 object-cover rounded-lg border border-border" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={t('common', 'delete') || 'Supprimer'}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border cursor-pointer text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                <span className="text-[10px]">{t('artisan', 'upload') || 'Uploader'}</span>
                <input
                  type="file"
                  accept={ACCEPTED_IMAGE_ACCEPT}
                  multiple
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => handleUpload(e.target.files)}
                />
              </label>
            </div>
            {/* Ajout par URL */}
            <div className="mt-3 flex gap-2">
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder={t('artisan', 'imageUrlPlaceholder') || 'https://… (URL d’image)'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addImageUrl();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addImageUrl}>
                {t('artisan', 'addUrl') || 'Ajouter'}
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex justify-end gap-2 px-6 py-4 border-t border-border bg-card">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t('common', 'cancel') || 'Annuler'}
          </Button>
          <Button onClick={handleSubmit} disabled={saving || uploading}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? t('common', 'save') || 'Enregistrer' : t('artisan', 'createProduct') || 'Créer'}
          </Button>
        </div>
      </div>
    </div>
  );
}
