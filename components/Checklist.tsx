import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, checklistTable } from '../utils/supabaseClient';
import { archiveCalendarAssignment } from '../utils/archiveCompletedAssignment';
import Inventory from './Inventory';
import './Checklist.css';

interface User {
  username: string;
  role: string;
  house?: string;
  password?: string;
}

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

const Checklist = ({ user }: ChecklistProps) => {
  const selectedHouse = houseForUser(user);
  const owner = isOwnerRole(user.role);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'regular' | 'deep' | 'maint' | 'all'>('regular');
  const [statusFilter, setStatusFilter] = useState<'pendiente' | 'hecho' | 'todo'>('pendiente');
  const [openRoom, setOpenRoom] = useState<string | null>(null);
  const [assignmentType, setAssignmentType] = useState<string | null>(null);
  const [activeAssignment, setActiveAssignment] = useState<any>(null);
  const [notice, setNotice] = useState('');

  const loadItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (checklistTable() as any)
      .select('*')
      .eq('house', selectedHouse)
      .order('id', { ascending: true });

    if (error) {
      console.error('Error cargando checklist:', error);
      setItems([]);
    } else {
      setItems((data || []) as ChecklistItem[]);
    }
    setLoading(false);
  }, [selectedHouse]);

  useEffect(() => {
    const loadAssignment = async () => {
      if (!supabase) return;
      let query = (supabase as any)
        .from('calendar_assignments')
        .select('*')
        .eq('house', selectedHouse)
        .eq('completed', false)
        .order('date', { ascending: false });
      if (user.role === 'empleado') {
        query = query.eq('employee', user.username);
      }
      const { data } = await query.limit(1);
      const current = data && data[0] ? data[0] : null;
      setActiveAssignment(current);
      const type = current ? String(current.type || '') : '';
      setAssignmentType(type || null);
      if (type) setFilter(assignmentKind(type));
    };
    loadAssignment();
    if (!supabase) return;
    const channel = supabase
      .channel(`assignments-live-${selectedHouse}-${user.username}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'calendar_assignments',
      }, () => {
        loadAssignment();
      })
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
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
  }, [selectedHouse, loadItems]);

  const kindItems = useMemo(() => {
    const kind = owner ? filter : (assignmentType ? assignmentKind(assignmentType) : filter);
    return items.filter((item) => {
      if (kind === 'all') return true;
      return roomKind(item.room) === kind;
    });
  }, [items, filter, owner, assignmentType]);

  const visibleItems = useMemo(() => {
    return kindItems.filter((item) => {
      if (statusFilter === 'pendiente') return !item.complete;
      if (statusFilter === 'hecho') return !!item.complete;
      return true;
    });
  }, [kindItems, statusFilter]);

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

  useEffect(() => {
    if (!grouped.length) {
      setOpenRoom(null);
      return;
    }
    if (!openRoom || !grouped.some(([room]) => room === openRoom)) {
      setOpenRoom(grouped[0][0]);
    }
  }, [grouped, openRoom]);

  const doneCount = kindItems.filter((item) => item.complete).length;
  const pendingCount = kindItems.length - doneCount;

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
      await (supabase as any)
        .from('cleaning_checklist')
        .update({
          completed: true,
          completed_by: user.username,
          completed_at: new Date().toISOString(),
        })
        .eq('house', selectedHouse)
        .eq('task', item.item);
    }

    setNotice(next ? 'Tarea completada' : 'Tarea reabierta');
    setTimeout(() => setNotice(''), 1600);
  };

  const resetVisible = async () => {
    const ids = kindItems.map((item) => item.id);
    if (!ids.length) return;
    setItems((prev) => prev.map((row) => ids.includes(row.id)
      ? { ...row, complete: false, completed_by: null, completed_at: null }
      : row));
    await (checklistTable() as any)
      .update({ complete: false, completed_by: null, completed_at: null })
      .eq('house', selectedHouse)
      .in('id', ids);
  };

  const archiveVisibleWork = async () => {
    if (!activeAssignment?.id) {
      setNotice('No hay una asignación activa para archivar');
      return;
    }
    const ok = await archiveCalendarAssignment(activeAssignment, user.username);
    if (!ok) {
      setNotice('No se pudo pasar el trabajo a completados');
      return;
    }
    await resetVisible();
    setActiveAssignment(null);
    setNotice('Trabajo pasado a completados');
    setTimeout(() => setNotice(''), 1800);
  };

  return (
    <div className="checklist-list ultra-checklist">
      <header className="cl-head">
        <div>
          <h2 className="ultra-checklist-title">Checklist</h2>
          <p className="cl-sub">{selectedHouse}</p>
        </div>
        <span className="checklist-live">En vivo</span>
      </header>
      <p className="checklist-progress">{doneCount} de {kindItems.length} hechas</p>
      {notice && <div className="checklist-live">{notice}</div>}

      {owner && (
        <div className="checklist-filter">
          <button className={filter === 'regular' ? 'active' : ''} onClick={() => setFilter('regular')}>Limpieza</button>
          <button className={filter === 'deep' ? 'active' : ''} onClick={() => setFilter('deep')}>Profunda</button>
          <button className={filter === 'maint' ? 'active' : ''} onClick={() => setFilter('maint')}>Mantenimiento</button>
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Tipo: todo</button>
        </div>
      )}

      <div className="cl-tabs">
        <button type="button" className={statusFilter === 'pendiente' ? 'on' : ''} onClick={() => setStatusFilter('pendiente')}>Por hacer {pendingCount}</button>
        <button type="button" className={statusFilter === 'hecho' ? 'on' : ''} onClick={() => setStatusFilter('hecho')}>Hechas {doneCount}</button>
        <button type="button" className={statusFilter === 'todo' ? 'on' : ''} onClick={() => setStatusFilter('todo')}>Todo</button>
      </div>

      {loading && <p className="ultra-task-text ultra-task-loading">Cargando checklist...</p>}

      {!loading && !owner && !activeAssignment && (
        <p className="checklist-empty">No tienes tareas asignadas. Los trabajos terminados quedan en Completados.</p>
      )}

      {!loading && grouped.length === 0 && (owner || activeAssignment) && (
        <p className="checklist-empty">
          {kindItems.length === 0
            ? 'No hay tareas para esta casa todavía.'
            : statusFilter === 'pendiente'
              ? 'Nada pendiente en este checklist.'
              : 'No hay tareas en esta vista.'}
        </p>
      )}

      {!loading && (owner || activeAssignment) && grouped.map(([room, roomItems]) => {
        const roomDone = roomItems.filter((item) => item.complete).length;
        const open = openRoom === room;
        return (
          <section key={room} className={`checklist-zone ultra-checklist-section${open ? ' open' : ''}`}>
            <button
              type="button"
              className="cl-zone-btn"
              onClick={() => setOpenRoom(open ? null : room)}
              aria-expanded={open}
            >
              <span>{room}</span>
              <span className="checklist-zone-count">
                {statusFilter === 'pendiente' ? `${roomItems.length} por hacer` : `${roomDone}/${roomItems.length}`}
              </span>
            </button>
            {open && (
              <div className="ultra-tasks-grid cl-list">
                {roomItems.map((item) => (
                  <div key={item.id} className={`ultra-task-card${item.complete ? ' done' : ''}`}>
                    <label className="ultra-checkbox">
                      <input
                        type="checkbox"
                        checked={!!item.complete}
                        onChange={() => toggleItem(item)}
                        title={item.item}
                      />
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
            )}
          </section>
        );
      })}

      {owner && kindItems.length > 0 && (
        <div className="checklist-filter">
          {activeAssignment && doneCount === kindItems.length && (
            <button onClick={archiveVisibleWork} className="ultra-reset-btn">Pasar a trabajos completados</button>
          )}
          <button onClick={resetVisible} className="ultra-reset-btn">Reiniciar checklist</button>
        </div>
      )}

      <Inventory user={user} houseName={selectedHouse} />
    </div>
  );
};

export default Checklist;
