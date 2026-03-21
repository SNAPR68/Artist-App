'use client';

import { useState, type FormEvent } from 'react';
import { Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { BookingStepIndicator } from './BookingStepIndicator';

interface BookingInquiryFormProps {
  artistId: string;
  artistName: string;
  eventTypes: string[];
}

interface BookingResponse {
  id: string;
  status: string;
  event_type: string;
  event_date: string;
  event_city: string;
}

const STEP_LABELS = ['Event Details', 'Requirements', 'Review'];

export default function BookingInquiryForm({ artistId, artistName, eventTypes }: BookingInquiryFormProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('refresh_token');
  });

  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    event_type: eventTypes[0] ?? '',
    event_date: '',
    event_city: '',
    event_venue: '',
    duration_hours: 2,
    budget: '',
    message: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successBookingId, setSuccessBookingId] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'duration_hours' ? parseFloat(value) || 0 : value,
    }));
  }

  function nextStep() {
    setCurrentStep((s) => Math.min(s + 1, 3));
  }

  function prevStep() {
    setCurrentStep((s) => Math.max(s - 1, 1));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (typeof window !== 'undefined' && !localStorage.getItem('refresh_token')) {
      setIsAuthenticated(false);
      setSubmitting(false);
      return;
    }

    const parts: string[] = [];
    if (formData.budget) {
      parts.push(`Budget: INR ${Number(formData.budget).toLocaleString('en-IN')}`);
    }
    if (formData.message.trim()) {
      parts.push(formData.message.trim());
    }
    const requirements = parts.length > 0 ? parts.join('\n\n') : undefined;

    try {
      const res = await apiClient<BookingResponse>('/v1/bookings', {
        method: 'POST',
        body: JSON.stringify({
          artist_id: artistId,
          event_type: formData.event_type,
          event_date: formData.event_date,
          event_city: formData.event_city,
          event_venue: formData.event_venue || undefined,
          duration_hours: formData.duration_hours,
          requirements,
        }),
      });

      if (res.success) {
        setSuccessBookingId(res.data.id);
      } else {
        const msg = Array.isArray(res.errors) && res.errors.length > 0
          ? res.errors.map((err: { message?: string }) => err.message ?? String(err)).join(', ')
          : 'Something went wrong. Please try again.';
        setError(msg);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const today = new Date().toISOString().split('T')[0];

  // --- Success state ---
  if (successBookingId) {
    return (
      <div className="glass-card p-6">
        <div className="text-center animate-fade-in-up">
          <div className="w-14 h-14 bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-green-400" />
          </div>
          <h3 className="text-lg font-heading font-semibold text-text-primary mb-1">Inquiry Sent!</h3>
          <p className="text-sm text-text-muted mb-3">
            Your booking inquiry for <strong className="text-text-secondary">{artistName}</strong> has been submitted.
          </p>
          <p className="text-xs text-text-muted mb-4">
            Booking ID: <code className="bg-glass-light border border-glass-border px-2 py-0.5 rounded text-text-secondary">{successBookingId}</code>
          </p>
          <p className="text-sm text-text-muted mb-4">
            The artist will review your request and respond soon.
          </p>
          <button
            type="button"
            onClick={() => {
              setSuccessBookingId('');
              setCurrentStep(1);
              setFormData((prev) => ({ ...prev, event_date: '', event_city: '', event_venue: '', budget: '', message: '' }));
            }}
            className="text-sm text-primary-400 hover:text-primary-300 font-medium transition-colors"
          >
            Send another inquiry
          </button>
        </div>
      </div>
    );
  }

  // --- Login prompt ---
  if (!isAuthenticated) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-heading font-semibold text-text-primary mb-2">Book This Artist</h3>
        <p className="text-sm text-text-muted mb-4">
          Sign in to send a booking inquiry to {artistName}.
        </p>
        <a
          href={`/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '')}`}
          className="block w-full text-center bg-gradient-accent hover:bg-gradient-accent-hover text-white font-medium py-3 px-4 rounded-xl transition-all hover-glow"
        >
          Sign in to Book
        </a>
      </div>
    );
  }

  // --- Multi-step Inquiry form ---
  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-heading font-semibold text-text-primary mb-4">Book This Artist</h3>

      <BookingStepIndicator currentStep={currentStep} totalSteps={3} labels={STEP_LABELS} />

      <form onSubmit={handleSubmit}>
        <div className="relative overflow-hidden">
          {/* Step 1 */}
          <div
            className={`space-y-4 transition-all duration-300 ${
              currentStep === 1
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 absolute inset-0 pointer-events-none translate-x-full'
            }`}
          >
            <FormField label="Event Type" required>
              <select name="event_type" value={formData.event_type} onChange={handleChange} required className="form-input">
                {eventTypes.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Event Date" required>
              <input type="date" name="event_date" value={formData.event_date} onChange={handleChange} min={today} required className="form-input" />
            </FormField>

            <FormField label="City" required>
              <input type="text" name="event_city" value={formData.event_city} onChange={handleChange} placeholder="e.g. Mumbai" required minLength={2} maxLength={100} className="form-input" />
            </FormField>

            <FormField label="Venue">
              <input type="text" name="event_venue" value={formData.event_venue} onChange={handleChange} placeholder="e.g. Grand Ballroom, Taj Hotel" maxLength={500} className="form-input" />
            </FormField>
          </div>

          {/* Step 2 */}
          <div
            className={`space-y-4 transition-all duration-300 ${
              currentStep === 2
                ? 'opacity-100 translate-x-0'
                : currentStep < 2
                  ? 'opacity-0 absolute inset-0 pointer-events-none translate-x-full'
                  : 'opacity-0 absolute inset-0 pointer-events-none -translate-x-full'
            }`}
          >
            <FormField label="Duration (hours)" required>
              <input type="number" name="duration_hours" value={formData.duration_hours} onChange={handleChange} min={0.5} max={24} step={0.5} required className="form-input" />
            </FormField>

            <FormField label="Budget (INR)">
              <input type="number" name="budget" value={formData.budget} onChange={handleChange} placeholder="e.g. 50000" min={0} className="form-input" />
            </FormField>

            <FormField label="Message">
              <textarea name="message" value={formData.message} onChange={handleChange} rows={3} placeholder="Tell the artist about your event..." maxLength={5000} className="form-input resize-none" />
            </FormField>
          </div>

          {/* Step 3 */}
          <div
            className={`space-y-3 transition-all duration-300 ${
              currentStep === 3
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 absolute inset-0 pointer-events-none -translate-x-full'
            }`}
          >
            <h4 className="text-sm font-medium text-text-primary mb-2">Review Your Inquiry</h4>
            <ReviewRow label="Event Type" value={formData.event_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} />
            <ReviewRow label="Date" value={formData.event_date} />
            <ReviewRow label="City" value={formData.event_city} />
            {formData.event_venue && <ReviewRow label="Venue" value={formData.event_venue} />}
            <ReviewRow label="Duration" value={`${formData.duration_hours} hours`} />
            {formData.budget && <ReviewRow label="Budget" value={`₹${Number(formData.budget).toLocaleString('en-IN')}`} />}
            {formData.message && <ReviewRow label="Message" value={formData.message} />}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-2 mt-6">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="flex items-center gap-1 px-4 py-2.5 bg-glass-light border border-glass-border rounded-xl text-sm text-text-secondary hover:bg-glass-medium transition-colors"
            >
              <ArrowLeft size={14} />
              Back
            </button>
          )}

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-gradient-accent hover:bg-gradient-accent-hover text-white font-semibold rounded-xl transition-all hover-glow"
            >
              Next
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-gradient-accent hover:bg-gradient-accent-hover disabled:opacity-50 text-white font-semibold rounded-xl transition-all hover-glow"
            >
              {submitting ? 'Sending...' : 'Send Inquiry'}
            </button>
          )}
        </div>
      </form>

      <style jsx>{`
        .form-input {
          width: 100%;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          color: var(--tw-text-opacity, 1) #F9FAFB;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.10);
          border-radius: 0.75rem;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .form-input:focus {
          border-color: rgba(59, 130, 246, 0.5);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }
        .form-input::placeholder {
          color: #9CA3AF;
        }
      `}</style>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-muted mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-glass-border last:border-0">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="text-sm text-text-primary font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}
