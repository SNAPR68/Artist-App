'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card } from '@artist-booking/ui';
import { useAuthStore } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { generateOTP, isLoading } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate Indian phone number
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    try {
      await generateOTP(phone);
      // Navigate to OTP verification with phone in query
      router.push(`/verify?phone=${encodeURIComponent(phone)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
      <Card variant="elevated" padding="lg" className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Welcome</h1>
          <p className="text-neutral-500">Enter your phone number to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center h-11 px-3 rounded-lg border border-neutral-300 bg-neutral-50 text-neutral-500 text-base">
              +91
            </div>
            <div className="flex-1">
              <Input
                type="tel"
                placeholder="Enter mobile number"
                value={phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setPhone(val);
                  setError('');
                }}
                error={error}
                autoFocus
                inputMode="numeric"
                autoComplete="tel"
              />
            </div>
          </div>

          <Button type="submit" fullWidth loading={isLoading}>
            Send OTP
          </Button>
        </form>

        <p className="text-xs text-neutral-400 text-center mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </Card>
    </main>
  );
}
