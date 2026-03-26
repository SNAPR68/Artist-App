'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '../../../../../../lib/api-client';

// ─── Types ────────────────────────────────────────────────────

interface WorkspaceData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  company_type: string | null;
  city: string | null;
  website: string | null;
  logo_url: string | null;
  brand_color: string | null;
}

const COMPANY_TYPES = [
  { value: '', label: 'Select type...' },
  { value: 'entertainment_agency', label: 'Entertainment Agency' },
  { value: 'wedding_planner', label: 'Wedding Planner' },
  { value: 'event_management', label: 'Event Management' },
  { value: 'corporate_events', label: 'Corporate Events' },
  { value: 'other', label: 'Other' },
];

// ─── Page ─────────────────────────────────────────────────────

export default function WorkspaceSettingsPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [city, setCity] = useState('');
  const [website, setWebsite] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [brandColor, setBrandColor] = useState('');

  useEffect(() => {
    apiClient<WorkspaceData>(`/v1/workspaces/${workspaceId}`)
      .then((res) => {
        if (res.success) {
          const w = res.data;
          setName(w.name ?? '');
          setDescription(w.description ?? '');
          setCompanyType(w.company_type ?? '');
          setCity(w.city ?? '');
          setWebsite(w.website ?? '');
          setLogoUrl(w.logo_url ?? '');
          setBrandColor(w.brand_color ?? '');
        }
      })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleSave = async () => {
    if (!name.trim()) {
      setToast({ type: 'error', message: 'Workspace name is required.' });
      return;
    }

    setSaving(true);
    try {
      const res = await apiClient<WorkspaceData>(`/v1/workspaces/${workspaceId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          company_type: companyType || undefined,
          city: city.trim() || undefined,
          website: website.trim() || undefined,
          logo_url: logoUrl.trim() || undefined,
          brand_color: brandColor.trim() || undefined,
        }),
      });

      if (res.success) {
        setToast({ type: 'success', message: 'Workspace settings saved successfully.' });
      } else {
        setToast({
          type: 'error',
          message: (res.errors as { message?: string }[])?.[0]?.message ?? 'Failed to save settings.',
        });
      }
    } catch {
      setToast({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/client/workspace/${workspaceId}`}
          className="text-sm text-primary-500 hover:underline"
        >
          &larr; Back to Workspace
        </Link>
        <h1 className="text-2xl font-display font-extrabold tracking-tighter text-white mt-1">Settings</h1>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-nocturne-success/15 text-nocturne-success border border-green-200'
              : 'bg-nocturne-error/15 text-nocturne-error border border-red-200'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Workspace Info */}
      <div className="bg-nocturne-surface rounded-lg border border-nocturne-border-subtle p-6 space-y-4">
        <h2 className="text-sm font-semibold text-nocturne-text-tertiary uppercase tracking-wide">
          Workspace Info
        </h2>

        <div>
          <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-nocturne-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Workspace name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-nocturne-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Brief description of your workspace"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Company Type</label>
          <select
            value={companyType}
            onChange={(e) => setCompanyType(e.target.value)}
            className="w-full px-3 py-2 border border-nocturne-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-nocturne-surface"
          >
            {COMPANY_TYPES.map((ct) => (
              <option key={ct.value} value={ct.value}>
                {ct.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">City</label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full px-3 py-2 border border-nocturne-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="e.g. Mumbai"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Website URL</label>
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            type="url"
            className="w-full px-3 py-2 border border-nocturne-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="https://example.com"
          />
        </div>
      </div>

      {/* Branding */}
      <div className="bg-nocturne-surface rounded-lg border border-nocturne-border-subtle p-6 space-y-4">
        <h2 className="text-sm font-semibold text-nocturne-text-tertiary uppercase tracking-wide">Branding</h2>

        <div>
          <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Logo URL</label>
          <input
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            type="url"
            className="w-full px-3 py-2 border border-nocturne-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="https://example.com/logo.png"
          />
          {logoUrl && (
            <div className="mt-2">
              <Image
                src={logoUrl}
                alt="Logo preview"
                width={48}
                height={48}
                className="object-contain rounded border border-nocturne-border-subtle"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Brand Color</label>
          <div className="flex items-center gap-3">
            <input
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="flex-1 px-3 py-2 border border-nocturne-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="#FF5733"
              maxLength={7}
            />
            {brandColor && /^#[0-9A-Fa-f]{6}$/.test(brandColor) && (
              <div
                className="w-10 h-10 rounded-lg border border-nocturne-border-subtle flex-shrink-0"
                style={{ backgroundColor: brandColor }}
                title={brandColor}
              />
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-nocturne-primary text-white px-6 py-2.5 rounded-lg hover:bg-nocturne-primary disabled:opacity-50 font-medium text-sm transition-colors"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Danger Zone */}
      <div className="bg-nocturne-surface rounded-lg border border-red-200 p-6">
        <h2 className="text-sm font-semibold text-nocturne-error uppercase tracking-wide mb-3">
          Danger Zone
        </h2>
        <p className="text-sm text-nocturne-text-secondary mb-4">
          Permanently delete this workspace and all associated data. This action cannot be undone.
        </p>
        <div className="relative group inline-block">
          <button
            disabled
            className="bg-red-100 text-red-400 px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed"
          >
            Delete Workspace
          </button>
          <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block">
            <div className="bg-nocturne-surface text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
              Contact support to delete a workspace
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
