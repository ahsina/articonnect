'use client';

import { TradeIcon } from '@/components/shared/TradeIcon';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, Specialty, CreateSpecialtyDto, UpdateSpecialtyDto } from '@/lib/api/admin';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowLeft, RefreshCw, Plus, Pencil, Trash2, AlertTriangle, X } from 'lucide-react';

export default function SpecialtiesPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateSpecialtyDto>({
    name: '',
    category: '',
    description: '',
    icon: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [specialtiesData, categoriesData] = await Promise.all([
        adminApi.getSpecialties(),
        adminApi.getSpecialtyCategories(),
      ]);
      setSpecialties(specialtiesData);
      setCategories(categoriesData);
      setError(null);
    } catch (err: unknown) {
      console.error('Error loading specialties:', err);
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 403) {
        router.push('/');
      } else {
        setError(t('adminSpecialties', 'errorLoad'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.category.trim()) {
      setError(t('adminSpecialties', 'errorNameCategoryRequired'));
      return;
    }
    try {
      setProcessingId('create');
      await adminApi.createSpecialty(formData);
      await loadData();
      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      console.error('Error creating specialty:', err);
      setError(t('adminSpecialties', 'errorCreate'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdate = async () => {
    if (!selectedSpecialty) return;
    try {
      setProcessingId(selectedSpecialty.id);
      const updateDto: UpdateSpecialtyDto = {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        icon: formData.icon,
      };
      await adminApi.updateSpecialty(selectedSpecialty.id, updateDto);
      await loadData();
      setShowEditModal(false);
      setSelectedSpecialty(null);
      resetForm();
    } catch (err) {
      console.error('Error updating specialty:', err);
      setError(t('adminSpecialties', 'errorUpdate'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedSpecialty) return;
    try {
      setProcessingId(selectedSpecialty.id);
      await adminApi.deleteSpecialty(selectedSpecialty.id);
      await loadData();
      setShowDeleteModal(false);
      setSelectedSpecialty(null);
    } catch (err) {
      console.error('Error deleting specialty:', err);
      setError(t('adminSpecialties', 'errorDelete'));
    } finally {
      setProcessingId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      description: '',
      icon: '',
    });
  };

  const openEditModal = (specialty: Specialty) => {
    setSelectedSpecialty(specialty);
    setFormData({
      name: specialty.name,
      category: specialty.category,
      description: specialty.description || '',
      icon: specialty.icon || '',
    });
    setShowEditModal(true);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Filter specialties by category
  const filteredSpecialties = selectedCategory
    ? specialties.filter((s) => s.category === selectedCategory)
    : specialties;

  const inputClass =
    'h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-foreground';
  const labelClass = 'mb-1.5 block text-xs font-semibold text-muted-foreground';

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">{t('common', 'loading')}</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.push('/admin/admin/dashboard')}
            className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            title={t('adminSpecialties', 'back')}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              {t('adminSpecialties', 'title')}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{t('adminSpecialties', 'subtitle')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} leftIcon={<RefreshCw className="h-4 w-4" />}>
            {t('adminSpecialties', 'refresh')}
          </Button>
          <Button onClick={() => setShowCreateModal(true)} leftIcon={<Plus className="h-4 w-4" />}>
            {t('adminSpecialties', 'addSpecialty')}
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-semibold hover:opacity-70">
            {t('adminSpecialties', 'dismiss')}
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('adminSpecialties', 'totalSpecialties')}
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground">
            {specialties.length}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('adminSpecialties', 'categories')}
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground">
            {categories.length}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('adminSpecialties', 'active')}
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-success">
            {specialties.filter((s) => s.isActive).length}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('adminSpecialties', 'inactive')}
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground">
            {specialties.filter((s) => !s.isActive).length}
          </p>
        </Card>
      </div>

      {/* Category Filter */}
      <Card className="p-5">
        <label className={labelClass} htmlFor="category-filter">
          {t('adminSpecialties', 'categories')}
        </label>
        <select
          id="category-filter"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="h-10 w-full max-w-sm rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-foreground"
        >
          <option value="">{t('adminSpecialties', 'allCategories')}</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </Card>

      {/* Specialties Table */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border p-5">
          <h2 className="font-display text-base font-bold text-foreground">
            {t('adminSpecialties', 'title')}
          </h2>
          <Badge variant="secondary">
            {filteredSpecialties.length} {t('adminSpecialties', 'specialtiesWord')}
          </Badge>
        </div>

        {filteredSpecialties.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {t('adminSpecialties', 'noSpecialtiesFound')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Métier
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Catégorie
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {t('adminSpecialties', 'artisansWord')}
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {t('adminSpecialties', 'created')}
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSpecialties.map((specialty) => (
                  <tr key={specialty.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-muted">
                          <TradeIcon name={specialty.name} className="h-5 w-5 text-foreground" />
                        </span>
                        <div>
                          <div className="font-semibold text-foreground">{specialty.name}</div>
                          {specialty.description && (
                            <div className="text-xs text-muted-foreground">{specialty.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle text-muted-foreground">{specialty.category}</td>
                    <td className="px-4 py-3 align-middle text-foreground">
                      {specialty._count?.artisans ?? 0}
                    </td>
                    <td className="px-4 py-3 align-middle text-muted-foreground whitespace-nowrap">
                      {formatDate(specialty.createdAt)}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <Badge variant={specialty.isActive ? 'success' : 'secondary'}>
                        {specialty.isActive
                          ? t('adminSpecialties', 'active')
                          : t('adminSpecialties', 'inactive')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(specialty)}
                          leftIcon={<Pencil className="h-3.5 w-3.5" />}
                        >
                          {t('adminSpecialties', 'edit')}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedSpecialty(specialty);
                            setShowDeleteModal(true);
                          }}
                          leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                        >
                          {t('adminSpecialties', 'delete')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">
                {t('adminSpecialties', 'addNewSpecialty')}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>{t('adminSpecialties', 'nameRequired')}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('adminSpecialties', 'namePlaceholder')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t('adminSpecialties', 'categoryRequired')}</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder={t('adminSpecialties', 'categoryPlaceholder')}
                  list="categories"
                  className={inputClass}
                />
                <datalist id="categories">
                  {categories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className={labelClass}>{t('adminSpecialties', 'description')}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('adminSpecialties', 'descriptionPlaceholder')}
                  rows={3}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-foreground"
                />
              </div>
              <div>
                <label className={labelClass}>{t('adminSpecialties', 'iconEmoji')}</label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="e.g., 🔧"
                  className={inputClass}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                {t('adminSpecialties', 'cancel')}
              </Button>
              <Button onClick={handleCreate} disabled={processingId === 'create'}>
                {processingId === 'create'
                  ? t('adminSpecialties', 'creating')
                  : t('adminSpecialties', 'create')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedSpecialty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">
                {t('adminSpecialties', 'editSpecialty')}
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedSpecialty(null);
                  resetForm();
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>{t('adminSpecialties', 'nameRequired')}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t('adminSpecialties', 'categoryRequired')}</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  list="categories-edit"
                  className={inputClass}
                />
                <datalist id="categories-edit">
                  {categories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className={labelClass}>{t('adminSpecialties', 'description')}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-foreground"
                />
              </div>
              <div>
                <label className={labelClass}>{t('adminSpecialties', 'iconEmoji')}</label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedSpecialty(null);
                  resetForm();
                }}
              >
                {t('adminSpecialties', 'cancel')}
              </Button>
              <Button onClick={handleUpdate} disabled={processingId === selectedSpecialty.id}>
                {processingId === selectedSpecialty.id
                  ? t('adminSpecialties', 'saving')
                  : t('adminSpecialties', 'saveChanges')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedSpecialty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h2 className="mb-4 font-display text-lg font-bold text-foreground">
              {t('adminSpecialties', 'deleteSpecialty')}
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {t('adminSpecialties', 'deleteConfirmPrefix')}{' '}
              <strong className="text-foreground">{selectedSpecialty.name}</strong>
              {t('adminSpecialties', 'deleteConfirmSuffix')}
            </p>
            {selectedSpecialty._count?.artisans && selectedSpecialty._count.artisans > 0 && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p>
                  {t('adminSpecialties', 'warningPrefix')} {selectedSpecialty._count.artisans}{' '}
                  {t('adminSpecialties', 'warningSuffix')}
                </p>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedSpecialty(null);
                }}
              >
                {t('adminSpecialties', 'cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={processingId === selectedSpecialty.id}
              >
                {processingId === selectedSpecialty.id
                  ? t('adminSpecialties', 'deleting')
                  : t('adminSpecialties', 'delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
