'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function MenuPage() {
  // Nhóm món
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupSort, setNewGroupSort] = useState(0);

  // Món
  const [items, setItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');

  // --------------------------------------------------
  // LOAD DỮ LIỆU
  // --------------------------------------------------
  async function loadAll() {
    // Nhóm món
    const { data: g, error: gErr } = await supabase
      .from('menu_groups')
      .select('id, name, sort')
      .order('sort', { ascending: true });

    if (gErr) {
      console.error('Lỗi load menu_groups:', gErr);
      alert('Lỗi tải nhóm món: ' + gErr.message);
      return;
    }

    setGroups(g || []);
    if (!activeGroup && g && g.length > 0) {
      setActiveGroup(g[0].id);
    }

    // Món
    const { data: it, error: iErr } = await supabase
      .from('menu_items')
      .select('id, group_id, name, price, is_active')
      .order('name', { ascending: true });

    if (iErr) {
      console.error('Lỗi load menu_items:', iErr);
      alert('Lỗi tải món: ' + iErr.message);
      return;
    }

    setItems(it || []);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const itemsInActiveGroup = useMemo(
    () => items.filter((i) => i.group_id === activeGroup),
    [items, activeGroup]
  );

  // --------------------------------------------------
  // THÊM / SỬA / XOÁ NHÓM
  // --------------------------------------------------
  async function addGroup() {
    if (!newGroupName.trim()) {
      alert('Nhập tên nhóm món');
      return;
    }

    const { error } = await supabase.from('menu_groups').insert({
      name: newGroupName.trim(),
      sort: Number(newGroupSort) || 0,
    });

    if (error) {
      console.error('Lỗi thêm nhóm:', error);
      alert('Không thêm được nhóm: ' + error.message);
      return;
    }

    setNewGroupName('');
    setNewGroupSort(0);
    await loadAll();
  }

  async function updateGroup(id, patch) {
    const { error } = await supabase
      .from('menu_groups')
      .update(patch)
      .eq('id', id);

    if (error) {
      console.error('Lỗi cập nhật nhóm:', error);
      alert('Không cập nhật được nhóm: ' + error.message);
      return;
    }
    await loadAll();
  }

  async function deleteGroup(id) {
    if (!confirm('Xoá nhóm này và toàn bộ món trong nhóm?')) return;

    const { error } = await supabase
      .from('menu_groups')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Lỗi xoá nhóm:', error);
      alert('Không xoá được nhóm: ' + error.message);
      return;
    }

    if (activeGroup === id) setActiveGroup(null);
    await loadAll();
  }

  // --------------------------------------------------
  // THÊM / XOÁ MÓN TRONG NHÓM
  // --------------------------------------------------
  async function addItem() {
    if (!activeGroup) {
      alert('Chọn 1 nhóm món trước');
      return;
    }
    if (!newItemName.trim()) {
      alert('Nhập tên món');
      return;
    }

    const priceNumber = Number(newItemPrice);
    if (Number.isNaN(priceNumber)) {
      alert('Giá phải là số');
      return;
    }

    const { error } = await supabase.from('menu_items').insert({
      group_id: activeGroup,
      name: newItemName.trim(),
      price: priceNumber,
      is_active: true,
    });

    if (error) {
      console.error('Lỗi thêm món:', error);
      alert('Không thêm được món: ' + error.message);
      return;
    }

    setNewItemName('');
    setNewItemPrice('');
    await loadAll();
  }

  async function deleteItem(id) {
    if (!confirm('Xoá món này?')) return;

    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Lỗi xoá món:', error);
      alert('Không xoá được món: ' + error.message);
      return;
    }

    await loadAll();
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <main style={{ padding: 16 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <h3 style={{ margin: 0 }}>Quản lý menu</h3>
        <Link href="/">
          <button>← Về màn hình chính</button>
        </Link>
      </div>

      {/* NHÓM MÓN */}
      <section
        style={{
          border: '1px solid #eee',
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
        }}
      >
        <h4>Nhóm món (Cà phê, Trà, Bánh...)</h4>

        {/* Thêm nhóm mới */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 0.5fr auto',
            gap: 8,
            marginBottom: 10,
          }}
        >
          <input
            placeholder="Tên nhóm mới"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
          <input
            type="number"
            placeholder="Thứ tự"
            value={newGroupSort}
            onChange={(e) => setNewGroupSort(e.target.value)}
          />
          <button onClick={addGroup}>Thêm nhóm</button>
        </div>

        {/* Danh sách nhóm */}
        <div style={{ display: 'grid', gap: 6 }}>
          {groups.map((g) => (
            <div
              key={g.id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1.5fr 0.5fr auto',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <input
                type="radio"
                checked={activeGroup === g.id}
                onChange={() => setActiveGroup(g.id)}
              />
              <input
                value={g.name}
                onChange={(e) =>
                  updateGroup(g.id, { name: e.target.value, sort: g.sort })
                }
              />
              <input
                type="number"
                value={g.sort ?? 0}
                onChange={(e) =>
                  updateGroup(g.id, {
                    name: g.name,
                    sort: Number(e.target.value) || 0,
                  })
                }
              />
              <button
                onClick={() => deleteGroup(g.id)}
                style={{ color: '#b00020' }}
              >
                Xoá
              </button>
            </div>
          ))}
          {!groups.length && <div>Chưa có nhóm món nào.</div>}
        </div>
      </section>

      {/* MÓN TRONG NHÓM */}
      <section
        style={{
          border: '1px solid #eee',
          borderRadius: 8,
          padding: 12,
        }}
      >
        <h4>
          Món trong nhóm:{' '}
          <b>
            {groups.find((g) => g.id === activeGroup)?.name ||
              'Hãy chọn 1 nhóm ở trên'}
          </b>
        </h4>

        {/* Form thêm món: TÊN + GIÁ (TIỀN) */}
        {activeGroup && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.5fr 0.7fr auto',
              gap: 8,
              marginBottom: 10,
            }}
          >
            <input
              placeholder="Tên món"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
            />
            <input
              type="number"
              placeholder="Giá (đồng)"
              value={newItemPrice}
              onChange={(e) => setNewItemPrice(e.target.value)}
            />
            <button onClick={addItem}>Thêm món</button>
          </div>
        )}

        {/* Danh sách món trong nhóm: TÊN – GIÁ */}
        <div style={{ display: 'grid', gap: 6 }}>
          {itemsInActiveGroup.map((it) => (
            <div
              key={it.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.5fr 0.7fr auto',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <div>{it.name}</div>
              <div>
                {Number(it.price || 0).toLocaleString('vi-VN')}
                {' đ'}
              </div>
              <button
                onClick={() => deleteItem(it.id)}
                style={{ color: '#b00020' }}
              >
                Xoá
              </button>
            </div>
          ))}
          {activeGroup && !itemsInActiveGroup.length && (
            <div>Nhóm này chưa có món nào.</div>
          )}
        </div>

        <p style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
          * Ở đây chỉ khai báo <b>tên món</b> và <b>giá tiền</b>.
          Khi order tại bàn, số lượng và thành tiền sẽ được tính tự động.
        </p>
      </section>
    </main>
  );
}
