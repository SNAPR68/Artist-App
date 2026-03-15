'use client';

import { useState, type FormEvent } from 'react';
import { apiClient } from '../../lib/api-client';

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

export default function BookingInquiryForm({ artistId, artistName, eventTypes }: BookingInquiryFormProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('refresh_token');
  });

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    // Re-check auth before submitting
    if (typeof window !== 'undefined' && !localStorage.getItem('refresh_token')) {
      setIsAuthenticated(false);
      setSubmitting(false);
      return;
    }

    // Build requirements string including budget and message
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

  // --- Success state ---
  if (successBookingId) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Inquiry Sent!</h3>
          <p className="text-gray-600 text-sm mb-3">
            Your booking inquiry for <strong>{artistName}</strong> has been submitted successfully.
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Booking ID: <code className="bg-gray-100 px-2 py-0.5 rounded">{successBookingId}</code>
          </p>
          <p className="text-sm text-gray-500">
            The artist will review your request and respond soon. You can track this booking in your dashboard.
          </p>
          <button
            type="button"
            onClick={() => {
              setSuccessBookingId('');
              setFormData((prev) => ({ ...prev, event_date: '', event_city: '', event_venue: '', budget: '', message: '' }));
            }}
            className="mt-4 text-sm text-primary-600 hover:text-primary-700 font-medium"
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
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Book This Artist</h3>
        <p className="text-gray-600 text-sm mb-4">
          Sign in to send a booking inquiry to {artistName}.
        </p>
        <a
          href={`/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '')}`}
          className="block w-full text-center bg-primary-500 hover:bg-primary-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
        >
          Sign in to Book
        </a>
      </div>
    );
  }

  // --- Inquiry form ---
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Book This Artist</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Event Type */}
        <div>
          <label htmlFor="bk-event-type" className="block text-sm font-medium text-gray-700 mb-1">
            Event Type <span className="text-red-500">*</span>
          </label>
          <select
            id="bk-event-type"
            name="event_type"
            value={formData.event_type}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {eventTypes.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {/* Event Date */}
        <div>
          <label htmlFor="bk-event-date" className="block text-sm font-medium text-gray-700 mb-1">
            Event Date <span className="text-red-500">*</span>
          </label>
          <input
            id="bk-event-date"
            type="date"
            name="event_date"
            value={formData.event_date}
            onChange={handleChange}
            min={today}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* City */}
        <div>
          <label htmlFor="bk-city" className="block text-sm font-medium text-gray-700 mb-1">
            City <span className="text-red-500">*</span>
          </label>
          <input
            id="bk-city"
            type="text"
            name="event_city"
            value={formData.event_city}
            onChange={handleChange}
            placeholder="e.g. Mumbai"
            required
            minLength={2}
            maxLength={100}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Venue */}
        <div>
          <label htmlFor="bk-venue" className="block text-sm font-medium text-gray-700 mb-1">
            Venue
          </label>
          <input
            id="bk-venue"
            type="text"
            name="event_venue"
            value={formData.event_venue}
            onChange={handleChange}
            placeholder="e.g. Grand Ballroom, Taj Hotel"
            maxLength={500}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Duration */}
        <div>
          <label htmlFor="bk-duration" className="block text-sm font-medium text-gray-700 mb-1">
            Duration (hours) <span className="text-red-500">*</span>
          </label>
          <input
            id="bk-duration"
            type="number"
            name="duration_hours"
            value={formData.duration_hours}
            onChange={handleChange}
            min={0.5}
            max={24}
            step={0.5}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Budget */}
        <div>
          <label htmlFor="bk-budget" className="block text-sm font-medium text-gray-700 mb-1">
            Budget (INR)
          </label>
          <input
            id="bk-budget"
            type="number"
            name="budget"
            value={formData.budget}
            onChange={handleChange}
            placeholder="e.g. 50000"
            min={0}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Message */}
        <div>
          <label htmlFor="bk-message" className="block text-sm font-medium text-gray-700 mb-1">
            Message
          </label>
          <textarea
            id="bk-message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            rows={3}
            placeholder="Tell the artist about your event, any special requirements..."
            maxLength={5000}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
        >
          {submitting ? 'Sending...' : 'Send Inquiry'}
        </button>
      </form>
    </div>
  );
}
