'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, Specialty, CreateSpecialtyDto, UpdateSpecialtyDto } from '@/lib/api/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

export default function SpecialtiesPage() {
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
        setError('Failed to load specialties');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.category.trim()) {
      setError('Name and category are required');
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
      setError('Failed to create specialty');
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
      setError('Failed to update specialty');
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
      setError('Failed to delete specialty');
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

  // Group by category for display
  const groupedSpecialties = filteredSpecialties.reduce(
    (acc, specialty) => {
      if (!acc[specialty.category]) {
        acc[specialty.category] = [];
      }
      acc[specialty.category].push(specialty);
      return acc;
    },
    {} as Record<string, Specialty[]>,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="text-muted-foreground hover:text-foreground"
            >
              Back
            </button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Specialty Management</h1>
              <p className="text-muted-foreground mt-1">Manage service categories and specialties</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadData}
              className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent"
            >
              Refresh
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              + Add Specialty
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
            <button onClick={() => setError(null)} className="ml-4 text-red-300 font-medium">
              Dismiss
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Specialties</p>
                  <p className="text-3xl font-bold text-primary">{specialties.length}</p>
                </div>
                <span className="text-4xl">🛠️</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Categories</p>
                  <p className="text-3xl font-bold text-purple-600">{categories.length}</p>
                </div>
                <span className="text-4xl">📁</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-3xl font-bold text-green-600">
                    {specialties.filter((s) => s.isActive).length}
                  </p>
                </div>
                <span className="text-4xl">✅</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-4 py-2 rounded-lg ${
              selectedCategory === ''
                ? 'bg-primary text-white'
                : 'bg-muted text-foreground hover:bg-accent'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg ${
                selectedCategory === cat
                  ? 'bg-primary text-white'
                  : 'bg-muted text-foreground hover:bg-accent'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Specialties by Category */}
        {Object.entries(groupedSpecialties).map(([category, specs]) => (
          <Card key={category} className="mb-6">
            <CardHeader>
              <CardTitle>{category}</CardTitle>
              <CardDescription>{specs.length} specialties</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {specs.map((specialty) => (
                  <div
                    key={specialty.id}
                    className={`p-4 border rounded-lg ${
                      specialty.isActive
                        ? 'border-border bg-card'
                        : 'border-border bg-background opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{specialty.icon || '🔧'}</span>
                        <div>
                          <h4 className="font-medium text-foreground">{specialty.name}</h4>
                          {specialty.description && (
                            <p className="text-sm text-muted-foreground mt-1">{specialty.description}</p>
                          )}
                          {specialty._count?.artisans !== undefined && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {specialty._count.artisans} artisans
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditModal(specialty)}
                          className="p-1 text-primary hover:text-primary"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSpecialty(specialty);
                            setShowDeleteModal(true);
                          }}
                          className="p-1 text-red-600 hover:text-red-400"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Created: {formatDate(specialty.createdAt)}</span>
                      <span
                        className={`px-2 py-0.5 rounded ${
                          specialty.isActive
                            ? 'bg-green-500/15 text-green-400'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {specialty.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredSpecialties.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <span className="text-4xl block mb-2">🛠️</span>
              <p>No specialties found</p>
            </CardContent>
          </Card>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">Add New Specialty</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Plomberie"
                      className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Category *
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g., Building & Construction"
                      list="categories"
                      className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                    <datalist id="categories">
                      {categories.map((cat) => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description..."
                      rows={3}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Icon (emoji)
                    </label>
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      placeholder="e.g., 🔧"
                      className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-foreground bg-muted rounded-lg hover:bg-accent"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={processingId === 'create'}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    {processingId === 'create' ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedSpecialty && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">Edit Specialty</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Category *
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      list="categories-edit"
                      className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                    <datalist id="categories-edit">
                      {categories.map((cat) => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Icon (emoji)
                    </label>
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedSpecialty(null);
                      resetForm();
                    }}
                    className="px-4 py-2 text-foreground bg-muted rounded-lg hover:bg-accent"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdate}
                    disabled={processingId === selectedSpecialty.id}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    {processingId === selectedSpecialty.id ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedSpecialty && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">Delete Specialty</h2>
                <p className="text-muted-foreground mb-4">
                  Are you sure you want to delete <strong>{selectedSpecialty.name}</strong>? This
                  action cannot be undone.
                </p>
                {selectedSpecialty._count?.artisans && selectedSpecialty._count.artisans > 0 && (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mb-4">
                    <p className="text-yellow-400">
                      Warning: {selectedSpecialty._count.artisans} artisans are using this
                      specialty.
                    </p>
                  </div>
                )}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setSelectedSpecialty(null);
                    }}
                    className="px-4 py-2 text-foreground bg-muted rounded-lg hover:bg-accent"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={processingId === selectedSpecialty.id}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {processingId === selectedSpecialty.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
