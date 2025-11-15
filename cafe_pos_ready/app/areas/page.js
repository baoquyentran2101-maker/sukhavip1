'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';

export default function AreasPage() {
  const [areas, setAreas] = useState([]);
  const [areaName, setAreaName] = useState('');
  const [areaSort, setAreaSort] = useState(0);
  const [newTableName, setNewTableName] = useState('');

  async function loadAreas() {
    const { data } = await supabase
      .from('areas')
      .select('id, name, sort, cafe_tables(id, name, status)')
      .order('sort', { ascending: true });
    setAreas(data || []);
  }

  useEffect(() => {
    loadAreas();
  }, []);

  async function addArea() {
    if (!areaName.trim()) return;
    await supabase.from('areas').insert({
      name: areaName.trim(),
      sort: Number(areaSort) || 0,
    });
    setAreaName('');
    setAreaSort(0);
    loadAreas();
  }

  async function updateArea(id, name, sort) {
    await supabase.from('areas').update({
      name,
      sort: Number(sort) || 0,
    }).eq('id', id);
    loadAreas();
  }

  async function deleteArea(id) {
    if (!confirm('Xoá khu này? Toàn bộ bàn trong khu sẽ bị xoá.')) return;
    await supabase.from('areas').delete().eq('id', id);
    loadAreas();
  }

  async function addTable(areaId) {
    if (!newTableName.trim()) return;
    await supabase.from('cafe_tables').insert({
      area_id: areaId,
      name: newTableName.trim(),
      status: 'empty',
    });
    setNewTableName('');
    loadAreas();
  }

  async function updateTableName(id, name) {
    await supabase.from('cafe_tables').update({ name }).eq('id', id);
    loadAreas();
  }

  async function deleteTable(id) {
    if (!confirm('Xoá bàn này?')) return;
    await supabase.from('cafe_tables').delete().eq('id', id);
    loadAreas();
  }

  return (
    <main style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Quản lý Khu &amp; Bàn</h3>
        <Link href="/"><button>← Về màn hình chính</button></Link>
      </div>

      {/* Thêm khu mới */}
      <section style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <h4>Thêm khu mới</h4>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            placeholder="Tên khu (vd: Khu E)"
            value={areaName}
            onChange={(e) => setAreaName(e.target.value)}
          />
          <input
            type="number"
            placeholder="Thứ tự"
            value={areaSort}
            onChange={(e) => setAreaSort(e.target.value)}
            style={{ width: 80 }}
          />
          <button onClick={addArea}>Thêm khu</button>
        </div>
      </section>

      {/* Danh sách khu + bàn */}
      {areas.map((a) => (
        <section
          key={a.id}
          style={{
            border: '1px solid #eee',
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <input
              value={a.name}
              onChange={(e) => updateArea(a.id, e.target.value, a.sort)}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              value={a.sort ?? 0}
              onChange={(e) => updateArea(a.id, a.name, e.target.value)}
              style={{ width: 80 }}
            />
            <button onClick={() => deleteArea(a.id)} style={{ color: '#b00020' }}>Xoá khu</button>
          </div>

          <div style={{ marginBottom: 8, fontWeight: 600 }}>Bàn trong {a.name}</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {(a.cafe_tables || []).map((t) => (
              <div
                key={t.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <input
                  value={t.name}
                  onChange={(e) => updateTableName(t.id, e.target.value)}
                />
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: t.status === 'empty' ? '#e8fff0' : '#fff3e0',
                    fontSize: 12,
                  }}
                >
                  {t.status}
                </span>
                <button onClick={() => deleteTable(t.id)} style={{ color: '#b00020' }}>
                  Xoá
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <input
              placeholder="Tên bàn mới (vd: A9)"
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
            />
            <button onClick={() => addTable(a.id)}>Thêm bàn</button>
          </div>
        </section>
      ))}
    </main>
  );
}
