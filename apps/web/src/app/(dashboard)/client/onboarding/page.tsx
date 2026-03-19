'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api-client';

const CLIENT_TYPES = [
  { value: 'corporate', label: 'Corporate' },
  { value: 'wedding_planner', label: 'Wedding Planner' },
  { value: 'club_venue', label: 'Club/Venue' },
  { value: 'individual', label: 'Individual' },
  { value: 'event_company', label: 'Event Company' },
];

const EVENT_TYPES = [
  'Wedding', 'Corporate', 'Private Party', 'Concert', 'Club Gig',
  'Festival', 'College Event', 'Restaurant', 'Other',
];

export default function ClientOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Company Info
  const [clientType, setClientType] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [city, setCity] = useState('');

  // Step 2: Event Preferences
  const [eventTypesInterested, setEventTypesInterested] = useState<string[]>([]);
  const [averageBudgetMin, setAverageBudgetMin] = useState<number>(0);
  const [averageBudgetMax, setAverageBudgetMax] = useState<number>(0);

  const isEventCompany = clientType === 'event_company';
  const totalSteps = isEventCompany ? 3 : 2;
  const stepLabels = isEventCompany
    ? ['Company Info', 'Event Preferences', 'Team Setup']
    : ['Company Info', 'Event Preferences'];

  const toggleEventType = (type: string) => {
    if (eventTypesInterested.includes(type)) {
      setEventTypesInterested(eventTypesInterested.filter((t) => t !== type));
    } else {
      setEventTypesInterested([...eventTypesInterested, type]);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return clientType.length > 0;
      case 2: return eventTypesInterested.length > 0;
      case 3: return true; // Team setup is informational
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const res = await apiClient('/v1/clients/profile', {
        method: 'POST',
        body: JSON.stringify({
          client_type: clientType,
          company_name: companyName || undefined,
          company_type: companyType || undefined,
          city: city || undefined,
          event_types_interested: eventTypesInterested,
          average_budget_min: averageBudgetMin > 0 ? averageBudgetMin * 100 : undefined,
          average_budget_max: averageBudgetMax > 0 ? averageBudgetMax * 100 : undefined,
        }),
      });

      if (!res.success) {
        setError(res.errors[0]?.message ?? 'Failed to create profile');
        return;
      }

      router.push('/client');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          {stepLabels.map((label, i) => (
            <span
              key={label}
              className={`${i + 1 <= step ? 'text-primary-500 font-medium' : ''}`}
            >
              {label}
            </span>
          ))}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Step 1: Company Info */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Tell us about your company</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Type *</label>
            <select
              value={clientType}
              onChange={(e) => setClientType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select a type...</option>
              {CLIENT_TYPES.map((ct) => (
                <option key={ct.value} value={ct.value}>{ct.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Your company or organization name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Type</label>
            <input
              type="text"
              value={companyType}
              onChange={(e) => setCompanyType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., Entertainment Agency, Corporate HR, Venue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., Mumbai, Delhi, Bangalore"
            />
          </div>
        </div>
      )}

      {/* Step 2: Event Preferences */}
      {step === 2 && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900">Event Preferences</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Event Types You're Interested In *</label>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleEventType(type)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    eventTypesInterested.includes(type)
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-primary-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Average Budget Min (INR)</label>
              <input
                type="number"
                value={averageBudgetMin || ''}
                onChange={(e) => setAverageBudgetMin(Number(e.target.value))}
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., 25000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Average Budget Max (INR)</label>
              <input
                type="number"
                value={averageBudgetMax || ''}
                onChange={(e) => setAverageBudgetMax(Number(e.target.value))}
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., 200000"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Team Setup (event_company only) */}
      {step === 3 && isEventCompany && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Team Setup</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <p className="text-blue-800 mb-3">
              You can create a workspace and invite team members from your dashboard after setup.
            </p>
            <Link
              href="/client/workspace"
              className="text-sm font-medium text-primary-500 hover:text-primary-600 underline"
            >
              Go to Workspace Settings
            </Link>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back
        </button>

        {step < totalSteps ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="px-6 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !canProceed()}
            className="px-6 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Complete Setup'}
          </button>
        )}
      </div>
    </div>
  );
}
