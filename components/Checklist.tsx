import React, { useEffect, useMemo, useState } from 'react';
import { supabase, checklistTable } from '../utils/supabaseClient';
import type { User } from './Dashboard';
import './Checklist.css';

interface ChecklistItem {
  id: number;
  house: string;
  item: string;
  complete: boolean;
  room?: string | null;
  assigned_to?: string | null;
  completed_by?: string | null;
  completed_at?: string | null;
}

interface ChecklistProps {
  user: User;
  assignmentId?: number | string;
}

const ROOM_ORDER = [
  'LIMPIEZA GENERAL',
  'HABITACIONES',
  'SALA',
  'COMEDOR',
  'COCINA',
  'BAÑOS',
  'ZONA DE LAVADO',
  'TERRAZA',
  'ÁREA DE BBQ',
  'ÁREA DE PISCINA',
  'LIMPIEZA PROFUNDA',
  'ÁREAS VERDES',
  'PISCINA Y AGUA',
  'RUTINA DE MANTENIMIENTO',
  'SISTEMAS ELÉCTRICOS',
];

const REGULAR_ROOMS = new Set([
  'LIMPIEZA GENERAL', 'HABITACIONES', 'SALA', 'COMEDOR', 'COCINA',
  'BAÑOS', 'ZONA DE LAVADO', 'TERRAZA', 'ÁREA DE BBQ', 'ÁREA DE PISCINA',
]);
const DEEP_ROOMS = new Set(['LIMPIEZA PROFUNDA']);
const MAINT_ROOMS = new Set(['ÁREAS VERDES', 'PISCINA Y AGUA', 'RUTINA DE MANTENIMIENTO', 'SISTEMAS ELÉCTRICOS']);

function isOwnerRole(role?: string) {
  const value = String(role || '').toLowerCase();
  return value === 'owner' || value === 'dueno' || value === 'manager';
}

function houseForUser(user: User) {
  if (!user.house || user.house === 'all') return 'EPIC D1';
  return user.house;
}

function roomKind(room?: string | null): 'regular' | 'deep' | 'maint' {
  const name = String(room || '').trim().toUpperCase();
  if (DEEP_ROOMS.has(name) || name.includes('PROFUNDA')) return 'deep';
  if (MAINT_ROOMS.has(name) || name.includes('MANTEN')) return 'maint';
  return 'regular';
}

function assignmentKind(type?: string | null): 'regular' | 'deep' | 'maint' {
  const value = String(type || '').toLowerCase();
  if (value.includes('manten')) return 'maint';
  if (value.includes('profund')) return 'deep';
  return 'regular';
}

function formatWhen(value?: string | null) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

const Checklist = ({ user, assignmentId }: ChecklistProps) => {
  const selectedHouse = houseForUser(user);
  const owner = isOwnerRole(user.role);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'regular' | 'deep' | 'maint' | 'all'>('regular');
  const [assignmentType, setAssignmentType] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const loadItems = async () => {
    setLoading(true);
    const { data, error } = await checklistTable()
      .select('id, house, item, complete, room, assigned_to, completed_by, completed_at')
      .eq('house', selectedHouse)
      .order('id', { ascending: true });

    if (error) {
      console.error('Error cargando checklist:', error);
      setItems([]);
    } else {
      setItems((data || []) as ChecklistItem[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    const loadAssignment = async () => {
      if (!supabase) return;
      if (user.role !== 'empleado') return;
      const { data } = await supabase
        .from('calendar_assignments')
        .select('type')
        .eq('employee', user.username)
        .eq('house', selectedHouse)
        .order('date', { ascending: false })
        .limit(1);
      const type = data && data[0] ? String((data[0] as { type?: string }).type || '') : '';
      setAssignmentType(type || null);
      setFilter(assignmentKind(type));
    };
    loadAssignment();
  }, [user.username, user.role, selectedHouse]);

  useEffect(() => {
    loadItems();
    if (!supabase) return;

    const channel = supabase
      .channel(`checklist-live-${selectedHouse}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'checklist',
        filter: `house=eq.${selectedHouse}`,
      }, () => {
        loadItems();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [selectedHouse, assignmentId]);

  const visibleItems = useMemo(() => {
    const kind = owner ? filter : (assignmentType ? assignmentKind(assignmentType) : filter);
    return items.filter((item) => {
      if (kind === 'all') return true;
      return roomKind(item.room) === kind;
    });
  }, [items, filter, owner, assignmentType]);

  const grouped = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>();
    visibleItems.forEach((item) => {
      const room = String(item.room || 'OTROS').trim() || 'OTROS';
      if (!map.has(room)) map.set(room, []);
      map.get(room)!.push(item);
    });
    return Array.from(map.entries()).sort((a, b) => {
      const ai = ROOM_ORDER.indexOf(a[0].toUpperCase());
      const bi = ROOM_ORDER.indexOf(b[0].toUpperCase());
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [visibleItems]);

  const doneCount = visibleItems.filter((item) => item.complete).length;

  const toggleItem = async (item: ChecklistItem) => {
    if (!item.id) return;
    const next = !item.complete;
    const payload = {
      complete: next,
      completed_by: next ? user.username : null,
      completed_at: next ? new Date().toISOString() : null,
    };

    setItems((prev) => prev.map((row) => row.id === item.id ? { ...row, ...payload } : row));

    const { error } = await (checklistTable() as any)
      .update(payload)
      .eq('id', item.id)
      .eq('house', selectedHouse);

    if (error) {
      setItems((prev) => prev.map((row) => row.id === item.id ? item : row));
      setNotice(error.message || 'No se pudo marcar la tarea');
      return;
    }

    if (supabase && next) {
      await supabase
        .from('cleaning_checklist')
        .update({
          completed: true,
          completed_by: user.username,
          completed_at: new Date().toISOString(),
        } as any)
        .eq('house', selectedHouse)
        .eq('task', item.item);
    }

    setNotice(next ? 'Tarea completada' : 'Tarea reabierta');
    setTimeout(() => setNotice(''), 1600);
  };

  const resetVisible = async () => {
    const ids = visibleItems.map((item) => item.id);
    if (!ids.length) return;
    setItems((prev) => prev.map((row) => ids.includes(row.id)
      ? { ...row, complete: false, completed_by: null, completed_at: null }
      : row));
    await (checklistTable() as any)
      .update({ complete: false, completed_by: null, completed_at: null })
      .eq('house', selectedHouse)
      .in('id', ids);
  };

  return (
    <div className="checklist-list ultra-checklist">
      <h2 className="ultra-checklist-title">Checklist {selectedHouse}</h2>
      <p className="checklist-live">En tiempo real</p>
      <p className="checklist-progress">{doneCount} de {visibleItems.length} tareas completadas</p>
      {notice && <div className="checklist-live">{notice}</div>}

      {owner && (
        <div className="checklist-filter">
          <button className={filter === 'regular' ? 'active' : ''} onClick={() => setFilter('regular')}>Limpieza</button>
          <button className={filter === 'deep' ? 'active' : ''} onClick={() => setFilter('deep')}>Profunda</button>
          <button className={filter === 'maint' ? 'active' : ''} onClick={() => setFilter('maint')}>Mantenimiento</button>
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Todo</button>
        </div>
      )}

      {loading && <p className="ultra-task-text ultra-task-loading">Cargando checklist...</p>}

      {!loading && grouped.length === 0 && (
        <p className="checklist-empty">No hay tareas para esta casa todavía.</p>
      )}

      {!loading && grouped.map(([room, roomItems]) => {
        const roomDone = roomItems.filter((item) => item.complete).length;
        return (
          <section key={room} className="checklist-zone ultra-checklist-section">
            <h3 className="checklist-zone-title ultra-section-title">
              <span>{room}</span>
              <span className="checklist-zone-count">{roomDone}/{roomItems.length}</span>
            </h3>
            <div className="ultra-tasks-grid">
              {roomItems.map((item) => (
                <div key={item.id} className={`ultra-task-card${item.complete ? ' done' : ''}`}>
                  <label className="ultra-checkbox">
                    <input
                      type="checkbox"
                      checked={!!item.complete}
                      onChange={() => toggleItem(item)}
                      title={item.item}
                    />
                    <span className="ultra-task-icon">{item.complete ? '✔️' : '🧹'}</span>
                    <span className="ultra-task-text">
                      {item.item}
                      {item.complete && (
                        <span className="checklist-done-meta">
                          Completado{item.completed_by ? ` por ${item.completed_by}` : ''}{item.completed_at ? ` · ${formatWhen(item.completed_at)}` : ''}
                        </span>
                      )}
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {owner && visibleItems.length > 0 && (
        <button onClick={resetVisible} className="ultra-reset-btn">Reiniciar checklist</button>
      )}
    </div>
  );
};

export default Checklist;
