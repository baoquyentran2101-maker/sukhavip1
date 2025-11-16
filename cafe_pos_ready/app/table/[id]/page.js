'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function TablePage({ params }) {
  const tableId = params.id;
  const router = useRouter();

  const [table, setTable] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [groups, setGroups] = useState([]);
  const [items, setItems] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tableId) return;

    async function init() {
      setLoading(true);

      // lấy thông tin bàn
      const { data: t } = await supabase
        .from('cafe_tables')
        .select('id, name, status')
        .eq('id', tableId)
        .single();
      setTable(t);

      // nếu bàn trống => chuyển sang in_use
      if (t && t.status === 'empty') {
        await supabase.from('cafe_tables').update({ status: 'in_use' }).eq('id', tableId);
      }

      // tìm order đang mở
      let { data: existingOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('table_id', tableId)
        .eq('status', 'open')
        .maybeSingle();

      // nếu chưa có => tạo mới
      if (!existingOrder) {
        const { data: inserted, error } = await supabase
          .from('orders')
          .insert({
            table_id: tableId,
            table_name: t?.name || '',
            status: 'open',
          })
          .select('id')
          .single();
        if (error) console.error(error);
        existingOrder = inserted;
      }
      setOrderId(existingOrder.id);

      // nhóm món
      const { data: g } = await supabase
        .from('menu_groups')
        .select('id, name, sort')
        .order('sort', { ascending: true });
      setGroups(g || []);
      if (g && g.length) setActiveGroup(g[0].id);

      // món: cho phép is_active = true hoặc null
      const { data: it } = await supabase
  .from('menu_items')
  .select('id, group_id, name, price, is_active, sort')
  .eq('is_active', true)   // chỉ lấy món đang bật
  .order('sort', { ascending: true });
      setItems(it || []);

      await loadOrderItems(existingOrder.id);
      setLoading(false);
    }

    async function loadOrderItems(oid) {
      const { data } = await supabase
        .from('order_items')
        .select('id, item_id, item_name, price, qty, amount')
        .eq('order_id', oid)
        .order('item_name', { ascending: true });
      setOrderItems(data || []);
    }

    init();
  }, [tableId]);

  async function reloadOrderItems() {
    if (!orderId) return;
    const { data } = await supabase
      .from('order_items')
      .select('id, item_id, item_name, price, qty, amount')
      .eq('order_id', orderId)
      .order('item_name', { ascending: true });
    setOrderItems(data || []);
  }

  const itemsOfGroup = useMemo(
  () => items.filter((i) => i.group_id === activeGroup),
  [items, activeGroup]
);

  // thêm món vào order
  async function addItem(itemId) {
    if (!orderId) return;
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const existing = orderItems.find((oi) => oi.item_id === itemId);
    if (existing) {
      await supabase
        .from('order_items')
        .update({ qty: existing.qty + 1 })
        .eq('id', existing.id);
    } else {
      await supabase.from('order_items').insert({
        order_id: orderId,
        item_id: itemId,
        item_name: item.name,
        price: item.price,
        qty: 1,
      });
    }
    await reloadOrderItems();
  }

  async function changeQty(id, delta) {
    const current = orderItems.find((o) => o.id === id);
    if (!current) return;
    const newQty = current.qty + delta;
    if (newQty <= 0) {
      await supabase.from('order_items').delete().eq('id', id);
    } else {
      await supabase.from('order_items').update({ qty: newQty }).eq('id', id);
    }
    await reloadOrderItems();
  }

  const total = useMemo(
    () => orderItems.reduce((sum, it) => sum + Number(it.amount || it.price * it.qty || 0), 0),
    [orderItems]
  );

  async function handlePayment(method) {
    if (!orderId || !orderItems.length) {
      alert('Chưa có món để thanh toán');
      return;
    }

    const paidAmount = total;

    // lưu payment
    const { error: payError } = await supabase.from('payments').insert({
      order_id: orderId,
      method,
      paid_amount: paidAmount,
    });
    if (payError) {
      console.error(payError);
      alert('Lỗi khi lưu thanh toán');
      return;
    }

    // cập nhật trạng thái
    await supabase.from('orders').update({ status: 'paid' }).eq('id', orderId);
    if (table) {
      await supabase.from('cafe_tables').update({ status: 'empty' }).eq('id', table.id);
    }

    alert('Đã thanh toán thành công');
    router.push('/history/today');
  }

  if (loading || !table) {
    return (
      <main style={{ padding: 16 }}>
        <div>Đang tải...</div>
      </main>
    );
  }

  return (
    <main style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Bàn {table.name}</h3>
        <Link href="/"><button>← Về chọn bàn</button></Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 12 }}>
        {/* LEFT: chọn món */}
        <section style={{ border: '1px solid #eee', borderRadius: 8, padding: 10 }}>
          <h4>Chọn món</h4>

          {/* tabs nhóm */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => setActiveGroup(g.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 18,
                  border: activeGroup === g.id ? '2px solid #1976d2' : '1px solid #ccc',
                  background: activeGroup === g.id ? '#e3f2fd' : '#fff',
                }}
              >
                {g.name}
              </button>
            ))}
          </div>

          {/* danh sách món */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 8,
            }}
          >
            {itemsOfGroup.map((it) => (
              <button
                key={it.id}
                onClick={() => addItem(it.id)}
                style={{
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  padding: 8,
                  textAlign: 'left',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 600 }}>{it.name}</div>
                <div style={{ fontSize: 12 }}>
                  {Number(it.price).toLocaleString('vi-VN')} đ
                </div>
              </button>
            ))}
            {!itemsOfGroup.length && (
              <div style={{ gridColumn: '1 / -1', fontSize: 13, opacity: 0.7 }}>
                Nhóm này chưa có món hoặc tất cả đang bị ẩn.
              </div>
            )}
          </div>
        </section>

        {/* RIGHT: đơn hiện tại */}
        <section style={{ border: '1px solid #eee', borderRadius: 8, padding: 10 }}>
          <h4>Đơn hiện tại</h4>

          <div
            style={{
              maxHeight: 360,
              overflow: 'auto',
              display: 'grid',
              gap: 6,
              marginBottom: 8,
            }}
          >
            {orderItems.map((oi) => (
              <div
                key={oi.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 80px 90px',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <div>
                  <div>{oi.item_name}</div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>
                    {Number(oi.price).toLocaleString('vi-VN')} đ
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <button onClick={() => changeQty(oi.id, -1)}>-</button>
                  <span>{oi.qty}</span>
                  <button onClick={() => changeQty(oi.id, 1)}>+</button>
                </div>
                <div style={{ textAlign: 'right', fontWeight: 600 }}>
                  {Number(oi.amount || oi.qty * oi.price).toLocaleString('vi-VN')} đ
                </div>
              </div>
            ))}
            {!orderItems.length && <div>Chưa có món nào.</div>}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 8,
              borderTop: '1px solid #eee',
              paddingTop: 8,
            }}
          >
            <div>
              Tổng: <b>{total.toLocaleString('vi-VN')} đ</b>
            </div>
            <button onClick={() => setShowCheckout(true)}>Thanh toán</button>
          </div>

          {showCheckout && (
            <div style={{ marginTop: 10, borderTop: '1px dashed #ccc', paddingTop: 8 }}>
              <div style={{ marginBottom: 6, fontWeight: 600 }}>Xác nhận thanh toán</div>
              <div style={{ maxHeight: 180, overflow: 'auto', marginBottom: 6 }}>
                {orderItems.map((oi) => (
                  <div
                    key={oi.id}
                    style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}
                  >
                    <span>
                      {oi.item_name} x {oi.qty}
                    </span>
                    <span>
                      {Number(oi.amount || oi.qty * oi.price).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 6 }}>
                Tổng cần thu: <b>{total.toLocaleString('vi-VN')} đ</b>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handlePayment('cash')}>Tiền mặt</button>
                <button onClick={() => handlePayment('transfer')}>Chuyển khoản</button>
                <button onClick={() => setShowCheckout(false)}>Hủy</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
