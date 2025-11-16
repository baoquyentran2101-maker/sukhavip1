'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function MenuPage() {
  const [groups, setGroups] = useState([]);
  const [items, setItems] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);

  // form nhóm
  const [gName, setGName] = useState('');
  const [gSort, setGSort] = useState(0);

  // form món
  const [iName, setIName] = useState('');
  const [iPrice, setIPrice] = useState(0);
  const [iSort, setISort] = useState(0);

  async function loadAll() {
    // nhóm
    const { data: g } = await supabase
      .from('menu_groups')
      .select('id, name, sort')
      .order('sort', { ascending: true });
    setGroups(g || []);
    if (!activeGroup && g && g.length) setActiveGroup(g[0].id);

    // món
    const { data: it } = await supabase
      .from('menu_items')
      .select('id, group_id, name, price, is_active, sort')
      .order('sort', { ascending: true });
    setItems(it || []);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const itemsByGroup = useMemo(
    () => items.filter((i) => i.group_id === activeGroup),
    [items, activeGroup]
  );

  // ===== NHÓM MÓN =====

  async function addGroup() {
    if (!gName.trim()) return;
    await supabase.from('menu_groups').insert({
      name: gName.trim(),
      sort: Number(gSort) || 0,
    });
    setGName('');
    setGSort(0);
    loadAll();
  }

  async function updateGroup(id, patch) {
    await supabase.from('menu_groups').update(patch).eq('id', id);
    loadAll();
  }

  async function deleteGroup(id) {
    if (!confirm('Xoá nhóm này và toàn bộ món trong nhóm?')) return;
    await supabase.from('menu_groups').delete().eq('id', id);
    if (activeGroup === id) setActiveGroup(null);
    loadAll();
  }

  // ===== MÓN =====

  async function addItem() {
    if (!iName.trim() || !activeGroup) return;
    await supabase.from('menu_items').insert({
      group_id: activeGroup,
      name: iName.trim(),
      price: Number(iPrice) || 0,
      sort: Number(iSort) || 0,
      is_active: true,          // ✅ luôn hiển thị
    });
    setIName('');
    setIPrice(0);
    setISort(0);
    loadAll();
  }

  async function updateItem(id, patch) {
    await supabase.from('menu_items').update(patch).eq('id', id);
    loadAll();
  }

  async function deleteItem(id) {
    if (!confirm('Xoá món này?')) return;
    await supabase.from('menu_items').delete().eq('id', id);
    loadAll();
  }

  return (
    <main style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Quản lý Menu</h3>
        <Link href="/"><button>← Về màn hình chính</button></Link>
      </div>

      {/* NHÓM MÓN */}
      <section style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <h4>Nhóm món</h4>

        {/* form thêm nhóm */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px auto', gap: 8, marginBottom: 10 }}>
          <input
            placeholder="Tên nhóm (vd: Cà phê)"
            value={gName}
            onChange={(e) => setGName(e.target.value)}
          />
          <input
            type="number"
            placeholder="Sort"
            value={gSort}
            onChange={(e) => setGSort(e.target.value)}
          />
          <button onClick={addGroup}>Thêm nhóm</button>
        </div>

        {/* danh sách nhóm */}
        <div style={{ display: 'grid', gap: 6 }}>
          {groups.map((g) => (
            <div
              key={g.id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr 80px auto',
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
                onChange={(e) => updateGroup(g.id, { name: e.target.value, sort: g.sort })}
              />
              <input
                type="number"
                value={g.sort ?? 0}
                onChange={(e) =>
                  updateGroup(g.id, { name: g.name, sort: Number(e.target.value) || 0 })
                }
              />
              <button onClick={() => deleteGroup(g.id)} style={{ color: '#b00020' }}>
                Xoá
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* MÓN TRONG NHÓM */}
      <section style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
        <h4>
          Món trong nhóm:{' '}
          <b>{groups.find((g) => g.id === activeGroup)?.name || 'Chưa chọn nhóm'}</b>
        </h4>

        {/* form thêm món – có TÊN + GIÁ + SORT */}
        {activeGroup && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 80px auto', gap: 8 }}>
            <input
              placeholder="Tên món mới"
              value={iName}
              onChange={(e) => setIName(e.target.value)}
            />
            <input
              type="number"
              placeholder="Giá (đ)"
              value={iPrice}
              onChange={(e) => setIPrice(e.target.value)}
            />
            <input
              type="number"
              placeholder="Sort"
              value={iSort}
              onChange={(e) => setISort(e.target.value)}
            />
            <button onClick={addItem}>Thêm món</button>
          </div>
        )}

        {/* danh sách món */}
        <div style={{ marginTop: 12, display: 'grid', gap: 6 }}>
          {itemsByGroup.map((it) => (
            <div
              key={it.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 110px 80px 120px auto',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <input
                value={it.name}
                onChange={(e) => updateItem(it.id, { name: e.target.value })}
              />
              <input
                type="number"
                value={it.price}
                onChange={(e) =>
                  updateItem(it.id, { price: Number(e.target.value) || 0 })
                }
              />
              <input
                type="number"
                value={it.sort ?? 0}
                onChange={(e) =>
                  updateItem(it.id, { sort: Number(e.target.value) || 0 })
                }
              />
              <select
                value={it.is_active ? 'true' : 'false'}
                onChange={(e) => updateItem(it.id, { is_active: e.target.value === 'true' })}
              >
                <option value="true">Hiển thị</option>
                <option value="false">Ẩn</option>
              </select>
              <button onClick={() => deleteItem(it.id)} style={{ color: '#b00020' }}>
                Xoá
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
