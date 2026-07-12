'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api/client';
import { Category } from '@/lib/api/marketplace';
import { Card, CardContent } from '@/components/ui/card';
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
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Catégories produit</h1>
            <p className="text-muted-foreground mt-1">
              Créez, modifiez et activez/désactivez les catégories du marketplace.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent"
            >
              <RotateCcw className="h-4 w-4" /> Rafraîchir
            </button>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Nouvelle catégorie
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-200 rounded-lg text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-4 font-medium">
              Fermer
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-3xl font-bold text-primary">{categories.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Actives</p>
              <p className="text-3xl font-bold text-foreground">{activeCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Désactivées</p>
              <p className="text-3xl font-bold text-foreground">
                {categories.length - activeCount}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Nom</th>
                    <th className="px-4 py-3 font-medium">Slug</th>
                    <th className="px-4 py-3 font-medium">Parent</th>
                    <th className="px-4 py-3 font-medium">Produits</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr
                      key={cat.id}
                      className={`border-b border-border last:border-0 ${
                        cat.active ? '' : 'opacity-60'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2 font-medium text-foreground">
                          {cat.icon && <span>{cat.icon}</span>}
                          {cat.name}
                        </span>
                        {cat.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {cat.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{cat.slug}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {parentName(cat.parentId) || '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {cat._count?.products ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs ${
                            cat.active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {cat.active ? 'Active' : 'Désactivée'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(cat)}
                            disabled={processingId === cat.id}
                            className="p-2 text-foreground hover:bg-accent rounded-lg disabled:opacity-50"
                            title="Modifier"
                          >
                            <Settings className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => toggleActive(cat)}
                            disabled={processingId === cat.id}
                            className="p-2 text-foreground hover:bg-accent rounded-lg disabled:opacity-50"
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
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
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
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        Aucune catégorie.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                {editing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => onNameChange(e.target.value)}
                    placeholder="ex : Menuiserie"
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
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
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Icône (emoji ou nom)
                  </label>
                  <input
                    type="text"
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    placeholder="ex : 🔨"
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                {!editing && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Catégorie parente
                    </label>
                    <select
                      value={form.parentId}
                      onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                      className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary"
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
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditing(null);
                    setForm(emptyForm);
                  }}
                  className="px-4 py-2 text-foreground bg-muted rounded-lg hover:bg-accent"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={processingId === 'submit'}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
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
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Supprimer la catégorie
              </h2>
              <p className="text-muted-foreground mb-4">
                Confirmer la suppression de <strong>{toDelete.name}</strong> ?
              </p>
              {(toDelete._count?.products ?? 0) > 0 && (
                <div className="p-4 bg-amber-100 border border-amber-200 rounded-lg mb-4 text-amber-800 text-sm">
                  Cette catégorie contient {toDelete._count?.products} produit(s). Elle
                  sera <strong>désactivée</strong> (et non supprimée) afin de préserver
                  l'historique des ventes.
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setToDelete(null)}
                  className="px-4 py-2 text-foreground bg-muted rounded-lg hover:bg-accent"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  disabled={processingId === toDelete.id}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
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
