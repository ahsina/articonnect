'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api/client';
import { Category } from '@/lib/api/marketplace';
import { Plus, Settings, Ban, CheckCircle2, Trash2, RotateCcw } from 'lucide-react';

interface CategoryForm {
  name: string;
  slug: string;
  description: string;
  icon: string;
  parentId: string;
}

const emptyForm: CategoryForm = {
  name: '',
  slug: '',
  description: '',
  icon: '',
  parentId: '',
};

// Slugify simple : minuscules, sans accents, tirets.
function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function AdminCategoriesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);

  const [toDelete, setToDelete] = useState<Category | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/marketplace/admin/categories');
      setCategories(res.data);
      setError(null);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      if (e.response?.status === 403 || e.response?.status === 401) {
        router.push('/');
        return;
      }
      setError('Impossible de charger les catégories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setSlugTouched(false);
    setShowForm(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      icon: cat.icon || '',
      parentId: cat.parentId || '',
    });
    setSlugTouched(true);
    setShowForm(true);
  };

  const onNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      slug: slugTouched ? f.slug : slugify(name),
    }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      setError('Le nom et le slug sont obligatoires.');
      return;
    }
    try {
      setProcessingId('submit');
      if (editing) {
        // L'édition ne touche pas au parent (réutilise le service update backend).
        await apiClient.patch(`/marketplace/admin/categories/${editing.id}`, {
          name: form.name.trim(),
          slug: form.slug.trim(),
          description: form.description.trim() || undefined,
          icon: form.icon.trim() || undefined,
        });
      } else {
        await apiClient.post('/marketplace/admin/categories', {
          name: form.name.trim(),
          slug: form.slug.trim(),
          description: form.description.trim() || undefined,
          icon: form.icon.trim() || undefined,
          parentId: form.parentId || undefined,
        });
      }
      await loadData();
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      setError(null);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } } };
      if (e.response?.status === 409) {
        setError(e.response?.data?.message || 'Ce slug est déjà utilisé.');
      } else {
        setError(editing ? 'Échec de la modification.' : 'Échec de la création.');
      }
    } finally {
      setProcessingId(null);
    }
  };

  const toggleActive = async (cat: Category) => {
    try {
      setProcessingId(cat.id);
      await apiClient.patch(`/marketplace/admin/categories/${cat.id}`, {
        active: !cat.active,
      });
      await loadData();
    } catch {
      setError('Échec du changement de statut.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      setProcessingId(toDelete.id);
      await apiClient.delete(`/marketplace/admin/categories/${toDelete.id}`);
      await loadData();
      setToDelete(null);
      setError(null);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } } };
      setError(e.response?.data?.message || 'Échec de la suppression.');
      setToDelete(null);
    } finally {
      setProcessingId(null);
    }
  };

  const parentName = (parentId?: string | null) =>
    parentId ? categories.find((c) => c.id === parentId)?.name : null;

  const topLevel = categories.filter((c) => !c.parentId);
  const activeCount = categories.filter((c) => c.active).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Chargement…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Catégories produit</h1>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Créez, modifiez et activez/désactivez les catégories du marketplace.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              <RotateCcw className="h-4 w-4" /> Rafraîchir
            </button>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Nouvelle catégorie
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-4 font-medium">
              Fermer
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total</p>
            <p className="mt-2 text-3xl font-display font-bold text-foreground">{categories.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Actives</p>
            <p className="mt-2 text-3xl font-display font-bold text-success">{activeCount}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Désactivées</p>
            <p className="mt-2 text-3xl font-display font-bold text-foreground">
              {categories.length - activeCount}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <h2 className="font-display text-base font-bold text-foreground">Toutes les catégories</h2>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              {categories.length} catégorie(s)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-left">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nom catégorie</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Slug</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parent</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Produits</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Statut</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr
                    key={cat.id}
                    className={`border-b border-border last:border-0 hover:bg-muted/50 ${
                      cat.active ? '' : 'opacity-60'
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-muted text-lg">
                          {cat.icon || '📦'}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{cat.name}</div>
                          {cat.description && (
                            <div className="text-xs text-muted-foreground">{cat.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{cat.slug}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {parentName(cat.parentId) || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {cat._count?.products ?? 0}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          cat.active
                            ? 'bg-success/10 text-success'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {cat.active ? 'Active' : 'Désactivée'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(cat)}
                          disabled={processingId === cat.id}
                          className="rounded-lg p-2 text-foreground hover:bg-muted disabled:opacity-50"
                          title="Modifier"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toggleActive(cat)}
                          disabled={processingId === cat.id}
                          className="rounded-lg p-2 text-foreground hover:bg-muted disabled:opacity-50"
                          title={cat.active ? 'Désactiver' : 'Activer'}
                        >
                          {cat.active ? (
                            <Ban className="h-4 w-4" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setToDelete(cat)}
                          disabled={processingId === cat.id}
                          className="rounded-lg p-2 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                      Aucune catégorie.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
            <div className="border-b border-border px-6 py-4">
              <h2 className="font-display text-lg font-bold text-foreground">
                {editing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => onNameChange(e.target.value)}
                    placeholder="ex : Menuiserie"
                    className="h-10 w-full rounded-xl border border-border bg-card px-3 outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Slug *
                  </label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setForm({ ...form, slug: slugify(e.target.value) });
                    }}
                    placeholder="ex : menuiserie"
                    className="h-10 w-full rounded-xl border border-border bg-card px-3 font-mono text-sm outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2 outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Icône (emoji ou nom)
                  </label>
                  <input
                    type="text"
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    placeholder="ex : 🔨"
                    className="h-10 w-full rounded-xl border border-border bg-card px-3 outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10"
                  />
                </div>
                {!editing && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">
                      Catégorie parente
                    </label>
                    <select
                      value={form.parentId}
                      onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                      className="h-10 w-full rounded-xl border border-border bg-card px-3 outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10"
                    >
                      <option value="">Aucune (catégorie racine)</option>
                      {topLevel.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditing(null);
                    setForm(emptyForm);
                  }}
                  className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={processingId === 'submit'}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {processingId === 'submit'
                    ? 'Enregistrement…'
                    : editing
                      ? 'Enregistrer'
                      : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {toDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
            <div className="border-b border-border px-6 py-4">
              <h2 className="font-display text-lg font-bold text-foreground">
                Supprimer la catégorie
              </h2>
            </div>
            <div className="p-6">
              <p className="mb-4 text-muted-foreground">
                Confirmer la suppression de <strong className="text-foreground">{toDelete.name}</strong> ?
              </p>
              {(toDelete._count?.products ?? 0) > 0 && (
                <div className="mb-4 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
                  Cette catégorie contient {toDelete._count?.products} produit(s). Elle
                  sera <strong>désactivée</strong> (et non supprimée) afin de préserver
                  l'historique des ventes.
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setToDelete(null)}
                  className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  disabled={processingId === toDelete.id}
                  className="rounded-xl border border-destructive/30 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                >
                  {processingId === toDelete.id ? 'Suppression…' : 'Supprimer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
