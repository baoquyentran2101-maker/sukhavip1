'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../../lib/supabaseClient';

export default function OrderHistoryDetail({ params }) {
  const orderId = params.id;
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!orderId) return;

    async function loadData() {
      const { data: ord } = await supabase
        .from('orders')
        .select('id, table_name, created_at')
        .eq('id', orderId)
        .single();
      setOrder(ord);

      const { data: its } = await supabase
        .from('order_items')
        .select('id, item_name, price, qty, amount')
        .eq('order_id', orderId)
        .order('item_name', { ascending: true });
      setItems(its || []);
    }

    loadData();
  }, [orderId]);

  const total = useMemo(
    () => items.reduce((s, it) => s + Number(it.amount || it.price * it.qty || 0), 0),
    [items]
  );

  return (
    <main style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Chi tiết hoá đơn</h3>
        <Link href="/history/today"><button>← Về lịch sử hôm nay</button></Link>
      </div>

      {order ? (
        <div style={{ marginBottom: 10 }}>
          <div>
            <b>Bàn / Mang về:</b> {order.table_name || '—'}
          </div>
          <div>
            <b>Thời gian:</b>{' '}
            {order.created_at ? new Date(order.created_at).toLocaleString('vi-VN') : '—'}
          </div>
        </div>
      ) : (
        <div>Đang tải...</div>
      )}

      <section style={{ border: '1px solid #eee', borderRadius: 8, padding: 10 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Danh sách món</div>
        <div style={{ display: 'grid', gap: 6 }}>
          {items.map((it) => (
            <div
              key={it.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 80px 90px',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <div>{it.item_name}</div>
              <div>
                x {it.qty} @ {Number(it.price).toLocaleString('vi-VN')} đ
              </div>
              <div style={{ textAlign: 'right', fontWeight: 600 }}>
                {Number(it.amount || it.qty * it.price).toLocaleString('vi-VN')} đ
              </div>
            </div>
          ))}
          {!items.length && <div>Không có món nào.</div>}
        </div>
        <div style={{ marginTop: 8, borderTop: '1px solid #eee', paddingTop: 6 }}>
          <b>Tổng:</b> {total.toLocaleString('vi-VN')} đ
        </div>
      </section>
    </main>
  );
}
