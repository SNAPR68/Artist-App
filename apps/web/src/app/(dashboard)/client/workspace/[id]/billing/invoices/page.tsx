'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FileText, Download, ArrowLeft } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface Invoice {
  id: string;
  invoice_number: string;
  plan: string;
  amount_paise: number;
  gst_paise: number;
  total_paise: number;
  issued_at: string;
  status: 'paid' | 'pending' | 'failed';
  pdf_url?: string;
}

export default function InvoicesPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient<Invoice[]>(`/v1/subscription/invoices?workspace_id=${workspaceId}`)
      .then((res) => {
        if (res.success && Array.isArray(res.data)) setInvoices(res.data);
      })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-6">
      <Link href={`/client/workspace/${workspaceId}/billing`}
        className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1 transition-colors">
        <ArrowLeft size={12} /> Back to billing
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-display font-extrabold text-white">GST Invoices</h1>
        <p className="text-white/50 text-sm">Tax invoices for your GRID subscription.</p>
      </header>

      {loading ? (
        <p className="text-white/40 text-sm">Loading invoices…</p>
      ) : invoices.length === 0 ? (
        <div className="glass-card rounded-xl p-12 border border-white/10 text-center">
          <FileText size={32} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/50 text-sm">No invoices yet.</p>
          <p className="text-white/30 text-xs mt-1">Invoices appear after your first paid subscription payment.</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] border-b border-white/10">
              <tr className="text-left text-[10px] text-white/40 uppercase tracking-widest font-bold">
                <th className="p-4">Invoice #</th>
                <th className="p-4">Date</th>
                <th className="p-4">Plan</th>
                <th className="p-4 text-right">Total</th>
                <th className="p-4">Status</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="p-4 text-white font-mono text-xs">{inv.invoice_number}</td>
                  <td className="p-4 text-white/60">{new Date(inv.issued_at).toLocaleDateString('en-IN')}</td>
                  <td className="p-4 text-white/80 capitalize">{inv.plan}</td>
                  <td className="p-4 text-right text-white font-bold">
                    ₹{(inv.total_paise / 100).toLocaleString('en-IN')}
                  </td>
                  <td className="p-4">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      inv.status === 'paid' ? 'bg-green-500/20 text-green-300' :
                      inv.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-red-500/20 text-red-300'
                    }`}>{inv.status}</span>
                  </td>
                  <td className="p-4 text-right">
                    {inv.pdf_url && (
                      <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#c39bff] hover:text-[#b48af0]">
                        <Download size={12} /> PDF
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
