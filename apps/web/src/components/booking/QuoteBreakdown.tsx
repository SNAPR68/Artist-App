'use client';

interface QuoteBreakdownProps {
  breakdown: {
    base_amount_paise: number;
    travel_surcharge_paise: number;
    platform_fee_paise: number;
    tds_paise: number;
    gst_on_platform_fee_paise: number;
    total_client_pays_paise: number;
    artist_receives_paise: number;
  };
}

function formatINR(paise: number) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

export function QuoteBreakdown({ breakdown }: QuoteBreakdownProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-gray-600">Base Fee</span>
        <span className="font-medium">{formatINR(breakdown.base_amount_paise)}</span>
      </div>
      {breakdown.travel_surcharge_paise > 0 && (
        <div className="flex justify-between">
          <span className="text-gray-600">Travel Surcharge</span>
          <span className="font-medium">{formatINR(breakdown.travel_surcharge_paise)}</span>
        </div>
      )}
      <div className="flex justify-between">
        <span className="text-gray-600">Platform Fee (10%)</span>
        <span className="font-medium">{formatINR(breakdown.platform_fee_paise)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">GST on Platform Fee (18%)</span>
        <span className="font-medium">{formatINR(breakdown.gst_on_platform_fee_paise)}</span>
      </div>
      <hr className="border-gray-200" />
      <div className="flex justify-between font-semibold text-gray-900">
        <span>Total (Client Pays)</span>
        <span>{formatINR(breakdown.total_client_pays_paise)}</span>
      </div>
      <hr className="border-gray-200" />
      <div className="flex justify-between text-gray-500 text-xs">
        <span>TDS Deducted (10% Sec 194J)</span>
        <span>-{formatINR(breakdown.tds_paise)}</span>
      </div>
      <div className="flex justify-between text-green-700 font-medium">
        <span>Artist Receives</span>
        <span>{formatINR(breakdown.artist_receives_paise)}</span>
      </div>
    </div>
  );
}
