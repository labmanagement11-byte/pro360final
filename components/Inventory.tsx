import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { archiveCalendarAssignment } from '../utils/archiveCompletedAssignment';
import './Inventory.css';

const AREAS = [
  'Cocina', 'Comedor', 'Sala', 'Habitaciones', 'Baños', 'Lavandería',
  'Terraza', 'Piscina', 'BBQ', 'Área de limpieza', 'Bodega', 'General', 'Otros',
];

const ISSUES = [
  { value: 'roto', label: 'Roto' },
  { value: 'danado', label: 'Dañado' },
  { value: 'perdido', label: 'Perdido' },
];

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  location?: string | null;
  notes?: string | null;
  house?: string | null;
  complete?: boolean;
  issue_type?: string | null;
  missing_qty?: number | null;
  checked_by?: string | null;
  checked_at?: string | null;
}

interface User {
  username: string;
  role: string;
  house?: string;
}

interface InventoryProps {
  user: User;
  houseName?: string;
}

function isOwnerRole(role?: string) {
  const value = String(role || '').toLowerCase();
  return value === 'owner' || value === 'dueno' || value === 'manager';
}

function issueLabel(value?: string | null) {
  if (value === 'roto') return 'Roto';
  if (value === 'danado') return 'Dañado';
  if (value === 'perdido') return 'Perdido';
  return '';
}

const Inventory: React.FC<InventoryProps> = ({ user, houseName }) => {
  const house = houseName && houseName !== 'all' ? houseName : (user.house && user.house !== 'all' ? user.house : 'EPIC D1');
  const owner = isOwnerRole(user.role);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ name: '', quantity: 1, location: AREAS[0], notes: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [issueFor, setIssueFor] = useState<string | null>(null);
  const [issueForm, setIssueForm] = useState({ issue_type: 'perdido', missing_qty: 1, notes: '' });
  const [activeAssignment, setActiveAssignment] = useState<any>(null);

  const loadItems = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('inventory')
      .select('*')
      .eq('house', house)
      .order('location', { ascending: true })
      .order('name', { ascending: true });
    if (error) {
      setItems([]);
      setNotice(error.message || 'No se pudo cargar el inventario');
    } else {
      setItems((data || []) as InventoryItem[]);
    }
    setLoading(false);
  }, [house]);

  useEffect(() => {
    loadItems();
    if (!supabase) return;
    const channel = supabase
      .channel(`inventory-live-${house}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'inventory',
        filter: `house=eq.${house}`,
      }, () => {
        loadItems();
      })
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [house, loadItems]);

  useEffect(() => {
    const loadAssignment = async () => {
      if (!supabase || !owner) return;
      const { data } = await (supabase as any)
        .from('calendar_assignments')
        .select('*')
        .eq('house', house)
        .eq('completed', false)
        .order('date', { ascending: false })
        .limit(1);
      setActiveAssignment(data && data[0] ? data[0] : null);
    };
    loadAssignment();
    if (!supabase) return;
    const channel = supabase
      .channel(`inventory-assignments-${house}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_assignments' }, () => {
        loadAssignment();
      })
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [house, owner]);

  const grouped = useMemo(() => {
    const map = new Map<string, InventoryItem[]>();
    items.forEach((item) => {
      const key = String(item.location || 'General').trim() || 'General';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    return Array.from(map.entries());
  }, [items]);

  const doneCount = items.filter((item) => item.complete).length;
  const issueCount = items.filter((item) => !item.complete && item.issue_type).length;
  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  const flash = (text: string) => {
    setNotice(text);
    setTimeout(() => setNotice(''), 1800);
  };

  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    const payload = {
      name: form.name.trim(),
      quantity: Number(form.quantity) || 1,
      location: form.location || 'General',
      notes: form.notes.trim() || null,
      house,
      complete: false,
      issue_type: null,
      missing_qty: 0,
    };
    if (!payload.name) return;
    if (editId) {
      const { error } = await (supabase as any).from('inventory').update({
        name: payload.name,
        quantity: payload.quantity,
        location: payload.location,
        notes: payload.notes,
        updated_at: new Date().toISOString(),
      }).eq('id', editId);
      if (error) return flash(error.message);
      setEditId(null);
      flash('Artículo actualizado');
    } else {
      const { error } = await (supabase as any).from('inventory').insert([payload]);
      if (error) return flash(error.message.includes('duplicate') || error.code === '23505' ? 'Ese artículo ya está en esta zona' : error.message);
      flash('Artículo guardado');
    }
    setForm({ name: '', quantity: 1, location: form.location, notes: '' });
  };

  const deleteItem = async (item: InventoryItem) => {
    if (!supabase || !confirm(`¿Eliminar ${item.name}?`)) return;
    await (supabase as any).from('inventory').delete().eq('id', item.id);
  };

  const markComplete = async (item: InventoryItem) => {
    if (!supabase) return;
    await (supabase as any).from('inventory').update({
      complete: true,
      issue_type: null,
      missing_qty: 0,
      checked_by: user.username,
      checked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', item.id);
    setIssueFor(null);
  };

  const markIssue = async (item: InventoryItem) => {
    if (!supabase) return;
    await (supabase as any).from('inventory').update({
      complete: false,
      issue_type: issueForm.issue_type,
      missing_qty: Number(issueForm.missing_qty) || 0,
      notes: issueForm.notes.trim() || item.notes,
      checked_by: user.username,
      checked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', item.id);
    setIssueFor(null);
    flash('Reporte guardado');
  };

  const finishJob = async () => {
    if (!activeAssignment?.id) {
      flash('No hay un trabajo activo para cerrar');
      return;
    }
    if (!confirm('¿Marcar este trabajo como terminado? Se irá a Completados y el inventario se reinicia, pero los objetos se quedan.')) return;
    const ok = await archiveCalendarAssignment(activeAssignment, user.username);
    if (!ok) return flash('No se pudo terminar el trabajo');
    setActiveAssignment(null);
    flash('Trabajo terminado. Inventario listo para la próxima limpieza');
  };

  return (
    <div className="inv-page">
      <h2 className="inv-title">Inventario {house}</h2>
      <p className="inv-live">En tiempo real</p>
      {notice && <p className="inv-live">{notice}</p>}

      <div className="inv-progress">
        <div className="inv-progress-top">
          <strong>Revisión de la casa</strong>
          <span>{doneCount}/{items.length} completos</span>
        </div>
        <div className="inv-bar">
          <span style={{ width: `${pct}%`, background: pct === 100 ? '#16a34a' : '#2563eb' }} />
        </div>
        <div className="inv-progress-meta">
          <span style={{ color: '#16a34a' }}>{doneCount} ok</span>
          <span style={{ color: '#dc2626' }}>{issueCount} con reporte</span>
          <span style={{ color: '#d97706' }}>{items.length - doneCount - issueCount} pendientes</span>
        </div>
      </div>

      {owner && (
        <form className="inv-form" onSubmit={saveItem}>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Artículo"
            required
          />
          <input
            type="number"
            min={1}
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
            title="Cantidad"
          />
          <select value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} title="Zona">
            {AREAS.map((area) => <option key={area} value={area}>{area}</option>)}
          </select>
          <input
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Nota opcional"
          />
          <button className="inv-btn main" type="submit">{editId ? 'Guardar' : 'Agregar'}</button>
        </form>
      )}

      {owner && activeAssignment && (
        <div style={{ marginBottom: '1rem' }}>
          <button className="inv-btn ok" type="button" onClick={finishJob}>
            Terminar trabajo de {activeAssignment.employee}
          </button>
        </div>
      )}

      {loading && <p className="inv-empty">Cargando inventario...</p>}
      {!loading && items.length === 0 && <p className="inv-empty">Aún no hay objetos guardados en esta casa.</p>}

      {!loading && grouped.map(([zone, zoneItems]) => {
        const zoneDone = zoneItems.filter((item) => item.complete).length;
        return (
          <section key={zone} className="inv-zone">
            <div className="inv-zone-head">
              <span>{zone}</span>
              <span>{zoneDone}/{zoneItems.length}</span>
            </div>
            <div className="inv-grid">
              {zoneItems.map((item) => {
                const hasIssue = !item.complete && !!item.issue_type;
                const klass = item.complete ? 'ok' : hasIssue ? 'issue' : '';
                return (
                  <article key={item.id} className={`inv-card ${klass}`}>
                    <div className={`inv-card-band ${klass || 'wait'}`}>
                      {item.complete ? 'Completo' : hasIssue ? issueLabel(item.issue_type) : 'Pendiente'}
                    </div>
                    <div className="inv-card-body">
                      <h3>{item.name}</h3>
                      <div className="inv-meta">
                        Cantidad: {item.quantity}
                        {item.notes ? ` · ${item.notes}` : ''}
                        {hasIssue && item.missing_qty ? ` · Faltan ${item.missing_qty}` : ''}
                        {item.checked_by ? ` · ${item.checked_by}` : ''}
                      </div>
                      <div className="inv-actions">
                        <button className="inv-btn ok" type="button" onClick={() => markComplete(item)}>Completo</button>
                        <button className="inv-btn warn" type="button" onClick={() => {
                          setIssueFor(item.id);
                          setIssueForm({
                            issue_type: item.issue_type || 'perdido',
                            missing_qty: item.missing_qty || 1,
                            notes: '',
                          });
                        }}>Incompleto</button>
                        {owner && (
                          <>
                            <button className="inv-btn ghost" type="button" onClick={() => {
                              setEditId(item.id);
                              setForm({
                                name: item.name,
                                quantity: item.quantity || 1,
                                location: item.location || 'General',
                                notes: item.notes || '',
                              });
                            }}>Editar</button>
                            <button className="inv-btn danger" type="button" onClick={() => deleteItem(item)}>Borrar</button>
                          </>
                        )}
                      </div>
                      {issueFor === item.id && (
                        <div className="inv-issue-box">
                          <select
                            value={issueForm.issue_type}
                            onChange={(e) => setIssueForm({ ...issueForm, issue_type: e.target.value })}
                            title="Motivo"
                          >
                            {ISSUES.map((issue) => <option key={issue.value} value={issue.value}>{issue.label}</option>)}
                          </select>
                          <input
                            type="number"
                            min={0}
                            value={issueForm.missing_qty}
                            onChange={(e) => setIssueForm({ ...issueForm, missing_qty: Number(e.target.value) })}
                            placeholder="Cantidad afectada"
                          />
                          <input
                            value={issueForm.notes}
                            onChange={(e) => setIssueForm({ ...issueForm, notes: e.target.value })}
                            placeholder="Detalle (opcional)"
                          />
                          <button className="inv-btn warn" type="button" onClick={() => markIssue(item)}>Guardar reporte</button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default Inventory;
