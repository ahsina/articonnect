'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { companyApi, CreateCompanyDto } from '@/lib/api/company';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

export default function CreateCompanyPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateCompanyDto>({
    companyName: '',
    siret: '',
    vatNumber: '',
    description: '',
    website: '',
    baseAddress: '',
    city: '',
    postalCode: '',
    country: 'LU',
    latitude: 49.6116,
    longitude: 6.1319,
    serviceRadius: 20,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.companyName || !formData.siret || !formData.baseAddress || !formData.city) {
      toast({
        title: t('common', 'error') || 'Error',
        description: t('company', 'fillRequired') || 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await companyApi.create(formData);
      toast({
        title: t('common', 'success') || 'Success',
        description: t('company', 'companyCreated') || 'Company created successfully',
        variant: 'success',
      });
      router.push('/artisan/company/dashboard');
    } catch (error: any) {
      console.error('Error creating company:', error);
      toast({
        title: t('common', 'error') || 'Error',
        description:
          error.response?.data?.message ||
          t('company', 'createError') ||
          'Failed to create company',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          {t('company', 'createCompany') || 'Create Company'}
        </h1>
        <p className="text-muted-foreground">
          {t('company', 'createCompanyDesc') ||
            'Transform your solo practice into a company to hire employees'}
        </p>
      </div>

      {/* Benefits Card */}
      <Card className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-primary">
            {t('company', 'whyCreateCompany') || 'Why Create a Company?'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-card rounded-lg">
              <div className="text-2xl mb-2">👥</div>
              <h4 className="font-medium text-foreground">
                {t('company', 'hireEmployees') || 'Hire Employees'}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t('company', 'hireEmployeesDesc') ||
                  'Add technicians, managers, and contractors to your team'}
              </p>
            </div>
            <div className="p-4 bg-card rounded-lg">
              <div className="text-2xl mb-2">📈</div>
              <h4 className="font-medium text-foreground">
                {t('company', 'scaleUp') || 'Scale Your Business'}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t('company', 'scaleUpDesc') || 'Take on more missions and grow your revenue'}
              </p>
            </div>
            <div className="p-4 bg-card rounded-lg">
              <div className="text-2xl mb-2">💼</div>
              <h4 className="font-medium text-foreground">
                {t('company', 'professionalProfile') || 'Professional Profile'}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t('company', 'professionalProfileDesc') ||
                  'Build credibility with a company presence'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('company', 'companyInfo') || 'Company Information'}</CardTitle>
            <CardDescription>
              {t('company', 'companyInfoDesc') || 'Basic information about your company'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('company', 'companyName') || 'Company Name'} *
                </label>
                <Input
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="e.g., Artisan Services SARL"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('company', 'siret') || 'SIRET / RCS / KBO Number'} *
                </label>
                <Input
                  value={formData.siret}
                  onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
                  placeholder="e.g., 12345678901234"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('company', 'vatNumber') || 'VAT Number'}
                </label>
                <Input
                  value={formData.vatNumber}
                  onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                  placeholder="e.g., LU12345678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('company', 'website') || 'Website'}
                </label>
                <Input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://www.example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('company', 'description') || 'Description'}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={
                  t('company', 'descriptionPlaceholder') || 'Describe your company services...'
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('company', 'location') || 'Location'}</CardTitle>
            <CardDescription>
              {t('company', 'locationDesc') || 'Where is your company based?'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('company', 'address') || 'Address'} *
              </label>
              <Input
                value={formData.baseAddress}
                onChange={(e) => setFormData({ ...formData, baseAddress: e.target.value })}
                placeholder="e.g., 10 Rue de la Gare"
                required
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('company', 'city') || 'City'} *
                </label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Luxembourg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('company', 'postalCode') || 'Postal Code'} *
                </label>
                <Input
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  placeholder="L-1234"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('company', 'country') || 'Country'} *
                </label>
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="LU">Luxembourg</option>
                  <option value="FR">France</option>
                  <option value="BE">Belgium</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('company', 'serviceRadius') || 'Service Radius (km)'} *
              </label>
              <Input
                type="number"
                value={formData.serviceRadius}
                onChange={(e) =>
                  setFormData({ ...formData, serviceRadius: parseInt(e.target.value) })
                }
                min="1"
                max="100"
              />
              <p className="text-sm text-muted-foreground mt-1">
                {t('company', 'serviceRadiusDesc') || 'Maximum distance your company serves'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            {t('common', 'cancel') || 'Cancel'}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading
              ? t('common', 'creating') || 'Creating...'
              : t('company', 'createCompany') || 'Create Company'}
          </Button>
        </div>
      </form>
    </div>
  );
}
