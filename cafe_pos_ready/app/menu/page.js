'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function MenuPage() {
  const [groups, setGroups] = useState([]);
  const [items, setItems] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);

  // input nhóm
  const [gName, setGName] = useState('');
  const [gSort, setGSort] = useState(0);

  // input món
  const [iName, setIName] = useState('');
  const [iPrice, setIPrice] = useState('');
  const [iSort, setISort] = useState(0);

  // tải dữ liệu
  async function loadAll() {
    // nhóm
    const { data: g, error: gErr } = await supabase
      .from('menu_groups')
      .select('id, name, sort')
      .order('sort', { ascending: true });

    if (gErr) {
      console.error(gErr);
      alert('Lỗi load nhóm món');
      return;
    }

    setGroups(g || []);
    if (!activeGroup && g && g.length) {
      setActiveGroup(g[0].id);
    }

    // món
    const { data: it, error: iErr } = await supabase
      .from('menu_items')
      .select('id, group_id, name, price, is_active, sort')
      .order('sort', { ascending: true });

    if (iErr) {
      console.error(iErr);
      alert('Lỗi load món');
      return;
    }

    setItems(it || []);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const itemsByGroup = useMemo(
    () => items.filter((i) => i.group_id === activeGroup),
    [items, activeGroup]
  );

  // THÊM NHÓM
  async function addGroup() {
    if (!gName.trim()) {
      alert('Nhập tên nhóm');
      return;
    }
    const { error } = await supabase.from('menu_groups').insert({
      name: gName.trim(),
      sort: Number(gSort) || 0,
    });
    if (error) {
      console.error(error);
      alert('Lỗi khi thêm nhóm');
      return;
    }
    setGName('');
    setGSort(0);
    await loadAll();
  }

  // CẬP NHẬT NHÓM
  async function updateGroup(id, patch) {
    const { error } = await supabase.from('menu_groups').update(patch).eq('id', id);
    if (error) {
      console.error(error);
      alert('Lỗi khi sửa nhóm');
    } else {
      await loadAll();
    }
  }

  async function deleteGroup(id) {
    if (!confirm('Xoá nhóm này và toàn bộ món trong nhóm?')) return;
    const { error } = await supabase.from('menu_groups').delete().eq('id', id);
    if (error) {
      console.error(error);
      alert('Lỗi khi xoá nhóm');
      return;
    }
    if (activeGroup === id) setActiveGroup(null);
    await loadAll();
  }

  // THÊM MÓN
  async function addItem() {
    if (!activeGroup) {
      alert('Chưa chọn nhóm món');
      return;
    }
    if (!iName.trim()) {
      alert('Nhập tên món');
      return;
    }
    const priceNumber = Number(iPrice);
    if (Number.isNaN(priceNumber)) {
      alert('Giá phải là số');
      return;
    }

    const { error } = await supabase.from('menu_items').insert({
      group_id: activeGroup,
      name: iName.trim(),
      price: priceNumber,
      sort: Number(iSort) || 0,
      is_active: true,
    });

    if (error) {
      console.error(error);
      alert('Lỗi khi thêm món');
      return;
    }

    setIName('');
    setIPrice('');
    setISort(0);
    await loadAll();
  }

  async function updateItem(id, patch) {
    const { error } = await supabase.from('menu_items').update(patch).eq('id', id);
    if (error) {
      console.error(error);
      alert('Lỗi khi sửa món');
    } else {
      await loadAll();
    }
  }

  async function deleteItem(id) {
    if (!confirm('Xoá món này?')) return;
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) {
      console.error(error);
      alert('Lỗi khi xoá món');
    } else {
      await loadAll();
    }
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

        <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px auto', gap: 8 }}>
            <input
              placeholder="Tên nhóm mới (Cà phê, Trà...)"
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
                onChange={(e) => updateGroup(g.id, { name: e.target.value })}
              />
              <input
                type="number"
                value={g.sort ?? 0}
                onChange={(e) => updateGroup(g.id, { sort: Number(e.target.value) || 0 })}
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

        {activeGroup && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 80px auto', gap: 8 }}>
            <input
              placeholder="Tên món mới"
              value={iName}
              onChange={(e) => setIName(e.target.value)}
            />
            <input
              type="number"
              placeholder="Giá"
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
              <div>
                <input
                  value={it.name}
                  onChange={(e) => updateItem(it.id, { name: e.target.value })}
                />
                <div style={{ fontSize: 11, opacity: 0.7 }}>
                  {/* chỉ hiển thị – không lưu số lượng ở đây */}
                  Mặc định gọi 1 ly, số lượng nằm ở phần Order, không nằm trong Menu.
                </div>
              </div>
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
                onChange={(e) =>
                  updateItem(it.id, { is_active: e.target.value === 'true' })
                }
              >
                <option value="true">Hiển thị</option>
                <option value="false">Ẩn</option>
              </select>
              <button onClick={() => deleteItem(it.id)} style={{ color: '#b00020' }}>
                Xoá
              </button>
            </div>
          ))}
          {!itemsByGroup.length && <div>Nhóm này chưa có món.</div>}
        </div>
      </section>
    </main>
  );
}
