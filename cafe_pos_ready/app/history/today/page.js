'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';

export default function TodayHistoryPage() {
  const [payments, setPayments] = useState([]);

  async function loadToday() {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const { data } = await supabase
      .from('payments')
      .select('id, method, paid_amount, paid_at, orders!inner(id, table_name)')
      .gte('paid_at', today)
      .order('paid_at', { ascending: false });

    setPayments(data || []);
  }

  useEffect(() => {
    loadToday();
  }, []);

  const total = useMemo(
    () => payments.reduce((s, p) => s + Number(p.paid_amount || 0), 0),
    [payments]
  );

  const methodLabel = (m) => (m === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt');

  return (
    <main style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Lịch sử thanh toán hôm nay</h3>
        <Link href="/"><button>← Về màn hình chính</button></Link>
      </div>

      <div style={{ marginBottom: 8 }}>
        <b>Tổng doanh thu hôm nay:</b> {total.toLocaleString('vi-VN')} đ
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {payments.map((p) => (
          <div
            key={p.id}
            style={{
              border: '1px solid #eee',
              borderRadius: 8,
              padding: 8,
              display: 'grid',
              gridTemplateColumns: '1.4fr 0.8fr auto',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>
                {p.orders?.table_name || '—'} – {methodLabel(p.method)}
              </div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                {new Date(p.paid_at).toLocaleString('vi-VN')}
              </div>
            </div>
            <div style={{ fontWeight: 600 }}>
              {Number(p.paid_amount).toLocaleString('vi-VN')} đ
            </div>
            <div style={{ textAlign: 'right' }}>
              <Link href={`/history/order/${p.orders?.id || ''}`}>
                <button disabled={!p.orders?.id}>Xem món</button>
              </Link>
            </div>
          </div>
        ))}
        {!payments.length && <div>Chưa có hoá đơn nào hôm nay.</div>}
      </div>
    </main>
  );
}
