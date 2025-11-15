'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function HomePage() {
  const [areas, setAreas] = useState([]);
  const [activeArea, setActiveArea] = useState(null);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadAreas() {
    setLoading(true);
    const { data, error } = await supabase
      .from('areas')
      .select('id, name, sort')
      .order('sort', { ascending: true });

    if (!error && data) {
      setAreas(data);
      if (!activeArea && data.length) setActiveArea(data[0].id);
    }
    setLoading(false);
  }

  async function loadTables(areaId) {
    if (!areaId) return;
    const { data } = await supabase
      .from('cafe_tables')
      .select('id, name, status')
      .eq('area_id', areaId)
      .order('name', { ascending: true });

    setTables(data || []);
  }

  useEffect(() => {
    loadAreas();
  }, []);

  useEffect(() => {
    if (activeArea) loadTables(activeArea);
  }, [activeArea]);

  const statusColor = (status) => {
    if (status === 'empty') return '#e8fff0';
    if (status === 'in_use') return '#fff3e0';
    return '#eeeeee';
  };

  return (
    <main style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: '0 0 4px' }}>Chọn khu &amp; bàn</h3>
          <small>Khu A/B/C/D và khu “Mang về” đã được tạo sẵn trong schema.</small>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/menu"><button>Quản lý Menu</button></Link>
          <Link href="/areas"><button>Quản lý Khu &amp; Bàn</button></Link>
          <Link href="/history/today"><button>Lịch sử hôm nay</button></Link>
        </div>
      </div>

      {/* Tabs khu */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {areas.map((a) => (
          <button
            key={a.id}
            onClick={() => setActiveArea(a.id)}
            style={{
              padding: '6px 10px',
              borderRadius: 20,
              border: activeArea === a.id ? '2px solid #1976d2' : '1px solid #ccc',
              background: activeArea === a.id ? '#e3f2fd' : '#fff',
              cursor: 'pointer',
            }}
          >
            {a.name}
          </button>
        ))}
      </div>

      {loading && <div>Đang tải...</div>}

      {/* Grid bàn */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
          gap: 10,
        }}
      >
        {tables.map((t) => (
          <Link key={t.id} href={`/table/${t.id}`}>
            <div
              style={{
                border: '1px solid #ddd',
                borderRadius: 10,
                padding: '12px 8px',
                textAlign: 'center',
                background: statusColor(t.status),
                cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 600 }}>{t.name}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{t.status}</div>
            </div>
          </Link>
        ))}
        {!tables.length && !loading && (
          <div>Chưa có bàn trong khu này. Vào “Quản lý Khu & Bàn” để tạo.</div>
        )}
      </div>
    </main>
  );
}
