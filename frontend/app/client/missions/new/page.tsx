'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { missionsApi } from '@/lib/api/missions';
import { userApi } from '@/lib/api/user';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import {
  Wrench, Zap, Hammer, Paintbrush, KeyRound, Snowflake, Flame, Boxes,
  MapPin, Search, MessageSquare, Zap as Bolt, Calendar, ImagePlus, ChevronLeft,
} from 'lucide-react';

// test = mots-clés multilingues (FR + EN + racines communes) pour la détection auto du métier.
const CATEGORIES = [
  { id: 'plomberie', name: 'Plomberie', Icon: Wrench, test: /plomb|plumb|fuite|leak|évier|sink|robinet|faucet|tap|chauffe.?eau|water.?heater|canalisation|drain|pipe|wc|toilet|siphon|tuyau|water/i },
  { id: 'electricite', name: 'Électricité', Icon: Zap, test: /electr|électr|prise|socket|outlet|disjonct|breaker|tableau|court.?circuit|short.?circuit|lumière|light|interrupteur|switch|compteur|wiring|câbl|cabl/i },
  { id: 'menuiserie', name: 'Menuiserie', Icon: Hammer, test: /menuis|carpent|bois|wood|porte|door|fenêtre|window|placard|cabinet|meuble|furnitur|parquet|floor|étagère|shelf/i },
  { id: 'peinture', name: 'Peinture', Icon: Paintbrush, test: /peint|paint|mur|wall|enduit|papier peint|wallpaper|tapisser|plafond|ceiling/i },
  { id: 'serrurerie', name: 'Serrurerie', Icon: KeyRound, test: /serrur|lock|clé|key|porte bloqu|locked|verrou|bolt|cadenas|padlock|coffre|safe/i },
  { id: 'climatisation', name: 'Climatisation', Icon: Snowflake, test: /clim|air.?con|cooling|ventil|fan|fraîch|cool/i },
  { id: 'chauffage', name: 'Chauffage', Icon: Flame, test: /chauff|heat|radiateur|radiator|chaudière|boiler|gaz|gas|thermostat|froid|cold/i },
  { id: 'autre', name: 'Autre', Icon: Boxes, test: /.*/ },
];

// Détecte le métier à partir de la description (comme Uber devine la destination).
function detectCategory(text: string): string {
  if (!text || text.trim().length < 3) return '';
  const found = CATEGORIES.find((c) => c.id !== 'autre' && c.test.test(text));
  return found ? found.name : '';
}

// key = identifiant UI ; type = MissionType backend valide (EMERGENCY | SCHEDULED uniquement).
// nameKey/descKey/tagKey = clés i18n (namespace missions), résolues au rendu.
const INTERVENTIONS = [
  { key: 'DEVIS', type: 'SCHEDULED', nameKey: 'intDevisName', descKey: 'intDevisDesc', tagKey: 'intDevisTag', Icon: MessageSquare },
  { key: 'EMERGENCY', type: 'EMERGENCY', nameKey: 'intUrgenceName', descKey: 'intUrgenceDesc', tagKey: 'intUrgenceTag', Icon: Bolt },
  { key: 'SCHEDULED', type: 'SCHEDULED', nameKey: 'intPlanifieName', descKey: 'intPlanifieDesc', tagKey: 'intPlanifieTag', Icon: Calendar },
];

interface ClientProfile {
  clientType: 'INDIVIDUAL' | 'PROFESSIONAL';
  companyName?: string;
  vatNumber?: string;
}

const ADDR_KEY = 'krafolt_client_address';

export default function NewMissionPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [manualCategory, setManualCategory] = useState(false);
  const [interventionType, setInterventionType] = useState('DEVIS');
  const [scheduledFor, setScheduledFor] = useState('');
  const [budget, setBudget] = useState('');
  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [addr, setAddr] = useState({ address: '', city: '', postalCode: '', country: 'LU' });
  const [editAddr, setEditAddr] = useState(false);

  useEffect(() => {
    // Adresse par défaut : localStorage (dernière utilisée) — pré-remplie, changeable.
    try {
      const saved = localStorage.getItem(ADDR_KEY);
      if (saved) {
        const a = JSON.parse(saved);
        if (a?.address) setAddr({ address: a.address, city: a.city || '', postalCode: a.postalCode || '', country: a.country || 'LU' });
      }
    } catch { /* ignore */ }
    userApi.getClientProfile().then(setClientProfile).catch(() => {});
  }, []);

  // Détection auto du métier tant que l'utilisateur n'a pas choisi manuellement.
  useEffect(() => {
    if (!manualCategory) setCategory(detectCategory(description));
  }, [description, manualCategory]);

  const hasAddress = !!addr.address && !!addr.city;
  const isProfessional = clientProfile?.clientType === 'PROFESSIONAL';

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingPhoto(true);
    try {
      const urls = await Promise.all(Array.from(files).map(async (f) => (await missionsApi.uploadPhoto(f)).url));
      setBeforePhotos((prev) => [...prev, ...urls]);
    } catch {
      toast({ title: t('common', 'error'), description: t('missions', 'photoUploadError') || 'Erreur de téléchargement', variant: 'destructive' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const geocodeAddress = async (full: string) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(full)}&countrycodes=lu,fr,be&limit=1`,
        { headers: { 'User-Agent': 'Krafolt/1.0' } },
      );
      const data = await res.json();
      if (data?.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch { /* ignore */ }
    return { lat: 49.6116, lng: 6.1319 }; // Luxembourg
  };

  const canSubmit = hasAddress && description.trim().length >= 3 && !loading &&
    (interventionType !== 'SCHEDULED' || !!scheduledFor);

  const handleSubmit = async () => {
    if (!canSubmit) {
      if (!hasAddress) { setEditAddr(true); toast({ title: t('missions', 'addressRequired') || 'Ajoutez votre adresse', variant: 'destructive' }); }
      return;
    }
    setLoading(true);
    try {
      const coords = await geocodeAddress(`${addr.address}, ${addr.city}, ${addr.postalCode}`);
      const cat = category || 'Autre';
      const title = description.trim().slice(0, 60);
      const backendType = INTERVENTIONS.find((i) => i.key === interventionType)?.type || 'SCHEDULED';
      const missionData: Record<string, unknown> = {
        type: backendType,
        category: cat,
        title,
        description: description.trim(),
        address: addr.address,
        city: addr.city,
        postalCode: addr.postalCode,
        country: addr.country,
        latitude: coords.lat,
        longitude: coords.lng,
        clientBudget: budget ? parseFloat(budget) : undefined,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
        beforePhotos: beforePhotos.length > 0 ? beforePhotos : undefined,
      };
      if (isProfessional && clientProfile?.companyName) {
        missionData.billingCompanyName = clientProfile.companyName;
        if (clientProfile.vatNumber) missionData.billingVatNumber = clientProfile.vatNumber;
      }
      // Mémorise l'adresse comme adresse par défaut pour la prochaine fois.
      try { localStorage.setItem(ADDR_KEY, JSON.stringify(addr)); } catch { /* ignore */ }
      const mission = await missionsApi.create(missionData);
      router.push(`/client/missions/${mission.id}`);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({ title: t('common', 'error'), description: err.response?.data?.message || t('missions', 'creationError'), variant: 'destructive' });
      setLoading(false);
    }
  };

  const ctaLabel = interventionType === 'DEVIS'
    ? (t('missions', 'requestQuotes') || 'Demander des offres')
    : (t('missions', 'publishRequest') || 'Publier la demande');

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="mx-auto max-w-lg">
        {/* Hero carte + adresse (façon Uber) */}
        <div className="relative h-40 overflow-hidden bg-foreground">
          <div className="absolute inset-0 opacity-[0.12]"
               style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '26px 26px' }} />
          <button onClick={() => router.back()} className="absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <MapPin className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-[70%] text-background" strokeWidth={2} />
          <div className="absolute inset-x-4 bottom-3 z-10 rounded-2xl bg-card p-3 shadow-lg">
            {!editAddr ? (
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="font-display truncate text-sm font-bold text-foreground">
                    {hasAddress ? `${addr.address}, ${addr.city}` : (t('missions', 'addYourAddress') || 'Ajoutez votre adresse')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {hasAddress ? (t('missions', 'defaultAddress') || 'Adresse par défaut') : (t('missions', 'whereIntervention') || "Lieu de l'intervention")}
                  </div>
                </div>
                <button onClick={() => setEditAddr(true)} className="font-display text-xs font-bold text-foreground underline">
                  {hasAddress ? (t('common', 'change') || 'Changer') : (t('common', 'add') || 'Ajouter')}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input autoFocus value={addr.address} onChange={(e) => setAddr({ ...addr, address: e.target.value })}
                  placeholder={t('missions', 'streetPlaceholder') || 'Rue et numéro'}
                  className="w-full rounded-lg bg-muted px-3 py-2 text-sm outline-none" />
                <div className="flex gap-2">
                  <input value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })}
                    placeholder={t('missions', 'cityPlaceholder') || 'Ville'} className="w-1/2 rounded-lg bg-muted px-3 py-2 text-sm outline-none" />
                  <input value={addr.postalCode} onChange={(e) => setAddr({ ...addr, postalCode: e.target.value })}
                    placeholder="Code postal" className="w-1/4 rounded-lg bg-muted px-3 py-2 text-sm outline-none" />
                  <select value={addr.country} onChange={(e) => setAddr({ ...addr, country: e.target.value })}
                    className="w-1/4 rounded-lg bg-muted px-2 py-2 text-sm outline-none">
                    <option value="LU">LU</option><option value="FR">FR</option><option value="BE">BE</option>
                  </select>
                </div>
                <Button className="w-full" size="sm" onClick={() => setEditAddr(false)} disabled={!addr.address || !addr.city}>
                  {t('common', 'confirm') || 'Valider l’adresse'}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pt-4">
          {/* Recherche du besoin -> détection métier */}
          <div className="flex items-center gap-2.5 rounded-2xl bg-muted px-4 py-3.5">
            <Search className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
            <input value={description} onChange={(e) => { setDescription(e.target.value); setManualCategory(false); }}
              placeholder={t('missions', 'describeNeed') || 'Décrivez votre besoin…'}
              className="font-display w-full bg-transparent text-[15px] font-semibold outline-none" />
          </div>
          {category && (
            <p className="mt-2 px-1 text-xs text-muted-foreground">
              {t('missions', 'detectedTrade') || 'Métier détecté'} : <span className="font-bold text-foreground">{category}</span>
              {' · '}<button onClick={() => setManualCategory(true)} className="underline">{t('common', 'adjust') || 'ajuster'}</button>
            </p>
          )}

          {/* Sélecteur métier manuel (si ajustement ou non détecté) */}
          {(manualCategory || (!category && description.trim().length >= 3)) && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {CATEGORIES.map((c) => {
                const on = category === c.name;
                return (
                  <button key={c.id} onClick={() => { setCategory(c.name); setManualCategory(true); }}
                    className={`flex flex-shrink-0 flex-col items-center gap-1.5 rounded-xl border px-3 py-2.5 ${on ? 'border-foreground bg-foreground text-background' : 'border-border bg-card text-foreground'}`}>
                    <c.Icon className="h-5 w-5" strokeWidth={1.8} />
                    <span className="font-display text-[11px] font-bold">{c.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Type d'intervention (cartes horizontales façon Uber) */}
          <div className="font-display mt-6 mb-2.5 px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {t('missions', 'howToProceed') || 'Comment voulez-vous procéder ?'}
          </div>
          <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
            {INTERVENTIONS.map((it) => {
              const on = interventionType === it.key;
              return (
                <button key={it.key} onClick={() => setInterventionType(it.key)}
                  className={`w-[150px] flex-shrink-0 rounded-2xl border p-3.5 text-left ${on ? 'border-foreground bg-muted' : 'border-border bg-card'}`}>
                  <div className={`mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl ${on ? 'bg-foreground' : 'bg-muted'}`}>
                    <it.Icon className={`h-[18px] w-[18px] ${on ? 'text-background' : 'text-foreground'}`} strokeWidth={1.9} />
                  </div>
                  <div className="font-display text-sm font-extrabold">{t('missions', it.nameKey)}</div>
                  <div className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">{t('missions', it.descKey)}</div>
                  <span className={`mt-2 inline-block rounded-full px-2 py-0.5 font-display text-[10.5px] font-bold ${on ? 'bg-foreground text-background' : 'bg-muted text-foreground'}`}>{t('missions', it.tagKey)}</span>
                </button>
              );
            })}
          </div>

          {/* Date si planifié */}
          {interventionType === 'SCHEDULED' && (
            <input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)}
              className="mt-4 w-full rounded-xl border border-border bg-muted px-3 py-3 text-sm outline-none" />
          )}

          {/* Facultatifs : budget + photo */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2.5">
              <span className="text-sm text-muted-foreground">€</span>
              <input value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="numeric"
                placeholder={t('missions', 'budgetOptional') || 'Budget indicatif (facultatif)'}
                className="w-44 bg-transparent text-sm outline-none" />
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2.5 font-display text-[12.5px] font-bold">
              <ImagePlus className="h-4 w-4" />
              {uploadingPhoto ? '…' : (beforePhotos.length ? `${beforePhotos.length} photo(s)` : (t('missions', 'addPhoto') || 'Ajouter une photo'))}
              <input type="file" accept="image/*" multiple hidden onChange={handlePhotoUpload} />
            </label>
          </div>
        </div>
      </div>

      {/* CTA collant */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card">
        <div className="mx-auto max-w-lg px-4 py-3.5">
          <Button className="w-full" size="lg" onClick={handleSubmit} disabled={!canSubmit}>
            {loading ? (t('common', 'loading') || 'Envoi…') : ctaLabel}
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {t('missions', 'freeNoCommitment') || 'Gratuit · sans engagement · réponses en ~15 min'}
          </p>
        </div>
      </div>
    </div>
  );
}
