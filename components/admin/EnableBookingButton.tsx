"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '@/lib/firebase';

/**
 * Admin utility to enable booking on all equipment
 * This is a one-time migration component
 */
export function EnableBookingButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEnableBooking = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const functions = getFunctions(app);
      const enableBooking = httpsCallable(functions, 'enableEquipmentBooking');

      console.log('Calling enableEquipmentBooking function...');
      const response = await enableBooking();

      const data = response.data as any;
      console.log('Success:', data);

      if (data.updated === 0 && data.totalEquipment > 0) {
        setResult(`✅ All ${data.totalEquipment} equipment items already have booking enabled.`);
      } else {
        setResult(
          `✅ Success! Enabled booking on ${data.updated} out of ${data.totalEquipment} equipment items.`
        );
      }
    } catch (err: any) {
      console.error('Error calling function:', err);
      setError(`❌ Error: ${err.message || 'Failed to enable booking'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 border border-border rounded-lg bg-card space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Enable Equipment Booking (Admin)</h3>
        <p className="text-sm text-muted-foreground mt-1">
          One-time migration to enable booking functionality on all equipment
        </p>
      </div>

      <Button
        onClick={handleEnableBooking}
        disabled={loading || !!result}
        variant="default"
        size="lg"
      >
        {loading ? 'Enabling Booking...' : 'Enable Booking on All Equipment'}
      </Button>

      {result && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-green-800 dark:text-green-200">
          {result}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-800 dark:text-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
