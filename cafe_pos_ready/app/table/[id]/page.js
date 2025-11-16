'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

  // -----------------------
  // Tải thông tin bàn + order + menu
  // -----------------------
  useEffect(() => {
    if (!tableId) return;

    (async () => {
      setLoading(true);

      // 1. Lấy thông tin bàn
      const { data: t, error: tErr } = await supabase
        .from('cafe_tables')
        .select('id, name, status')
        .eq('id', tableId)
        .single();

      if (tErr) {
        console.error('Lỗi lấy table:', tErr);
        setLoading(false);
        return;
      }

      setTable(t);

      // Nếu bàn đang empty thì set sang in_use
      if (t.status === 'empty') {
        await supabase
          .from('cafe_tables')
          .update({ status: 'in_use' })
          .eq('id', t.id);
      }

      // 2. Đảm bảo luôn có 1 order đang open cho bàn này
      const oid = await ensureOpenOrder(t);
      setOrderId(oid);

      // 3. Lấy menu group + item
      const { data: g } = await supabase
        .from('menu_groups')
        .select('id, name, sort')
        .order('sort', { ascending: true });

      setGroups(g || []);
      if (g && g.length && !activeGroup) setActiveGroup(g[0].id);

      const { data: it } = await supabase
        .from('menu_items')
        .select('id, group_id, name, price, is_active, sort')
        .eq('is_active', true)
        .order('sort', { ascending: true });

      setItems(it || []);

      // 4. Lấy các món hiện có trong order
      await loadOrderItems(oid);

      setLoading(false);
    })();
  }, [tableId]);

  // Hàm đảm bảo luôn có 1 order open
  async function ensureOpenOrder(t) {
    // Thử tìm order open
    let { data: existing, error } = await supabase
      .from('orders')
      .select('id')
      .eq('table_id', t.id)
      .eq('status', 'open')
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Lỗi tìm order:', error);
    }

    if (existing && existing.id) {
      return existing.id;
    }

    // Nếu không có -> tạo mới
    const { data: inserted, error: insErr } = await supabase
      .from('orders')
      .insert({
        table_id: t.id,
        table_name: t.name,
        status: 'open'
      })
      .select('id')
      .single();

    if (insErr) {
      console.error('Lỗi tạo order mới:', insErr);
      return null;
    }

    return inserted.id;
  }

  // Lấy danh sách order_items cho 1 order
  async function loadOrderItems(oid) {
    if (!oid) return;
    const { data, error } = await supabase
      .from('order_items')
      .select('id, item_id, item_name, price, qty, amount')
      .eq('order_id', oid)
      .order('item_name', { ascending: true });

    if (error) {
      console.error('Lỗi load order_items:', error);
      return;
    }
    setOrderItems(data || []);
  }

  // Danh sách món theo group đang chọn
  const itemsOfGroup = useMemo(
    () => items.filter((i) => i.group_id === activeGroup),
    [items, activeGroup]
  );

  // -----------------------
  // Thêm món vào order khi bấm
  // -----------------------
  async function handleAddItem(item) {
    try {
      // Nếu vì lý do nào đó chưa có orderId -> tạo lại
      let currentOrderId = orderId;
      if (!currentOrderId && table) {
        currentOrderId = await ensureOpenOrder(table);
        setOrderId(currentOrderId);
      }
      if (!currentOrderId) {
        alert('Không tạo được order cho bàn, kiểm tra Supabase.');
        return;
      }

      // Kiểm tra món đã có trong bill chưa
      const existing = orderItems.find((oi) => oi.item_id === item.id);

      if (existing) {
        // Tăng số lượng
        const newQty = existing.qty + 1;
        const { error: upErr } = await supabase
          .from('order_items')
          .update({ qty: newQty })
          .eq('id', existing.id);

        if (upErr) {
          console.error('Lỗi tăng qty:', upErr);
          alert('Không cập nhật được số lượng món.');
        }
      } else {
        // Thêm dòng mới
        const { error: insErr } = await supabase.from('order_items').insert({
          order_id: currentOrderId,
          item_id: item.id,
          item_name: item.name,
          price: item.price,
          qty: 1
        });

        if (insErr) {
          console.error('Lỗi thêm món:', insErr);
          alert('Không thêm được món. Kiểm tra cột order_items.');
        }
      }

      // Reload lại bill
      await loadOrderItems(currentOrderId);
    } catch (e) {
      console.error(e);
    }
  }

  // Tăng/giảm số lượng trong bill
  async function changeQty(id, delta) {
    const current = orderItems.find((o) => o.id === id);
    if (!current) return;
    const newQty = current.qty + delta;

    if (newQty <= 0) {
      await supabase.from('order_items').delete().eq('id', id);
    } else {
      await supabase.from('order_items').update({ qty: newQty }).eq('id', id);
    }
    await loadOrderItems(orderId);
  }

  const total = useMemo(
    () =>
      orderItems.reduce(
        (sum, it) => sum + Number(it.amount || it.price * it.qty || 0),
        0
      ),
    [orderItems]
  );

  // Thanh toán
  async function handlePayment(method) {
    if (!orderId || !orderItems.length) {
      alert('Chưa có món để thanh toán');
      return;
    }

    const { error: payErr } = await supabase.from('payments').insert({
      order_id: orderId,
      method,
      paid_amount: total
    });

    if (payErr) {
      console.error('Lỗi lưu payment:', payErr);
      alert('Không lưu được thanh toán.');
      return;
    }

    await supabase.from('orders').update({ status: 'paid' }).eq('id', orderId);

    if (table) {
      await supabase
        .from('cafe_tables')
        .update({ status: 'empty' })
        .eq('id', table.id);
    }

    alert('Đã thanh toán xong!');
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 12
        }}
      >
        <h3 style={{ margin: 0 }}>Bàn {table.name}</h3>
        <Link href="/">
          <button>← Về chọn bàn</button>
        </Link>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.1fr 0.9fr',
          gap: 12
        }}
      >
        {/* Cột chọn món */}
        <section
          style={{ border: '1px solid #eee', borderRadius: 8, padding: 10 }}
        >
          <h4>Chọn món</h4>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 10
            }}
          >
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => setActiveGroup(g.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 18,
                  border:
                    activeGroup === g.id
                      ? '2px solid #1976d2'
                      : '1px solid #ccc',
                  background:
                    activeGroup === g.id ? '#e3f2fd' : '#fff'
                }}
              >
                {g.name}
              </button>
            ))}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 8
            }}
          >
            {itemsOfGroup.map((it) => (
              <button
                key={it.id}
                onClick={() => handleAddItem(it)}
                style={{
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  padding: 8,
                  textAlign: 'left',
                  background: '#fff',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: 600 }}>{it.name}</div>
                <div style={{ fontSize: 12 }}>
                  {Number(it.price).toLocaleString('vi-VN')} đ
                </div>
              </button>
            ))}
            {!itemsOfGroup.length && (
              <div>Nhóm này chưa có món hiển thị.</div>
            )}
          </div>
        </section>

        {/* Cột bill hiện tại */}
        <section
          style={{ border: '1px solid #eee', borderRadius: 8, padding: 10 }}
        >
          <h4>Đơn hiện tại</h4>
          <div
            style={{
              maxHeight: 360,
              overflow: 'auto',
              display: 'grid',
              gap: 6,
              marginBottom: 8
            }}
          >
            {orderItems.map((oi) => (
              <div
                key={oi.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 80px 90px',
                  gap: 8,
                  alignItems: 'center'
                }}
              >
                <div>
                  <div>{oi.item_name}</div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>
                    {Number(oi.price).toLocaleString('vi-VN')} đ
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 4,
                    alignItems: 'center'
                  }}
                >
                  <button onClick={() => changeQty(oi.id, -1)}>-</button>
                  <span>{oi.qty}</span>
                  <button onClick={() => changeQty(oi.id, 1)}>+</button>
                </div>
                <div style={{ textAlign: 'right', fontWeight: 600 }}>
                  {Number(oi.amount || oi.qty * oi.price).toLocaleString(
                    'vi-VN'
                  )}{' '}
                  đ
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
              paddingTop: 8
            }}
          >
            <div>
              Tổng: <b>{total.toLocaleString('vi-VN')} đ</b>
            </div>
            <button onClick={() => setShowCheckout(true)}>Thanh toán</button>
          </div>

          {showCheckout && (
            <div
              style={{
                marginTop: 10,
                borderTop: '1px dashed #ccc',
                paddingTop: 8
              }}
            >
              <div style={{ marginBottom: 6, fontWeight: 600 }}>
                Xác nhận thanh toán
              </div>
              <div
                style={{
                  maxHeight: 180,
                  overflow: 'auto',
                  marginBottom: 6
                }}
              >
                {orderItems.map((oi) => (
                  <div
                    key={oi.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 13
                    }}
                  >
                    <span>
                      {oi.item_name} x {oi.qty}
                    </span>
                    <span>
                      {Number(oi.amount || oi.qty * oi.price).toLocaleString(
                        'vi-VN'
                      )}{' '}
                      đ
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 6 }}>
                Tổng cần thu: <b>{total.toLocaleString('vi-VN')} đ</b>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handlePayment('cash')}>Tiền mặt</button>
                <button onClick={() => handlePayment('transfer')}>
                  Chuyển khoản
                </button>
                <button onClick={() => setShowCheckout(false)}>Hủy</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
