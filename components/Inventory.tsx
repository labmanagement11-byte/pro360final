
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { FaBoxOpen, FaChair, FaBed, FaBath, FaUtensils, FaCouch, FaSwimmer, FaBroom, FaTshirt, FaQuestion } from 'react-icons/fa';

const ROOMS = [
  'Cocina', 'Terraza', 'Piscina', 'BBQ', 'Pasillo', 'Baños', 'Habitación 1', 'Habitación 2', 'Habitación 3', 'Lavandería'
];
const INVENTORY_KEY = 'dashboard_inventory'; // legacy, no longer used

const roomIcons: { [key: string]: React.ReactElement } = {
  'Cocina': <FaUtensils style={{color:'#3182ce'}} />,
  'Terraza': <FaChair style={{color:'#fbbf24'}} />,
  'Piscina': <FaSwimmer style={{color:'#38bdf8'}} />,
  'BBQ': <FaUtensils style={{color:'#f87171'}} />,
  'Pasillo': <FaBroom style={{color:'#a3e635'}} />,
  'Baños': <FaBath style={{color:'#818cf8'}} />,
  'Habitación 1': <FaBed style={{color:'#f472b6'}} />,
  'Habitación 2': <FaBed style={{color:'#f472b6'}} />,
  'Habitación 3': <FaBed style={{color:'#f472b6'}} />,
  'Lavandería': <FaTshirt style={{color:'#38bdf8'}} />,
};

interface InventoryItem {
  id?: number; // ID de Supabase (opcional)
  name: string;
  room: string;
  quantity: number;
  complete?: boolean;
  missing?: number;
  reason?: string;
}

interface User {
  username: string;
  role: string;
}

interface InventoryProps {
  user: User;
  houseName?: string;
  inventory?: InventoryItem[];
  setInventory?: (inventory: InventoryItem[]) => void;
}

const Inventory: React.FC<InventoryProps> = ({ user, houseName = 'HYNTIBA2 APTO 406', inventory: externalInventory, setInventory: setExternalInventory }) => {
    const [form, setForm] = useState({ name: '', room: ROOMS[0], quantity: 1 });
    const [editForm, setEditForm] = useState({ name: '', room: ROOMS[0], quantity: 1 });
    const [editIdx, setEditIdx] = useState<number | null>(null);
  const [items, setItemsState] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Guardar plantilla predefinida al agregar/editar/eliminar (solo HYNTIBA2)
  useEffect(() => {
    if (houseName === 'HYNTIBA2 APTO 406') {
      localStorage.setItem('plantilla_inventario_hyntiba2', JSON.stringify(items));
    }
  }, [items, houseName]);
  // Para HYNTIBA2, no hay inventario predefinido, solo gestión manual
  // Formulario para agregar/editar items
  // ...existing code...

  // Cargar inventario desde Supabase
  const fetchInventory = async () => {
        // Si hay plantilla local y no hay datos en Supabase, cargar plantilla
        if (houseName === 'HYNTIBA2 APTO 406') {
          const { data, error } = await supabase!.from('inventory').select('*').eq('house', houseName);
          if ((!error && data && data.length === 0)) {
            const plantilla = localStorage.getItem('plantilla_inventario_hyntiba2');
            if (plantilla) {
              setItemsState(JSON.parse(plantilla));
              setLoading(false);
              return;
            }
          }
        }
    setLoading(true);
    const { data, error } = await supabase!
      .from('inventory')
      .select('*')
      .eq('house', houseName);
    if (!error && data) {
      setItemsState(data);
    } else {
      setItemsState([]);
    }
    setLoading(false);
  };

  // Cargar inventario al montar y suscribirse a cambios en tiempo real
  useEffect(() => {
    fetchInventory();

    if (!supabase) return;

    // Suscripción realtime a cambios en inventory
    const channel = supabase
      .channel(`inventory-changes-${houseName}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory', filter: `house=eq.${houseName}` }, (payload: any) => {
        console.log('Cambio en inventory:', payload);
        fetchInventory();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [houseName]);

  // Sync with external inventory if provided
  // No externalInventory ni setInventory: todo es cloud

  // No localStorage: todo es cloud

  // Agregar item a Supabase
  const addItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newItem = { ...form, complete: false, missing: 0, house: houseName };
    // @ts-expect-error
    const { data, error } = await supabase!.from('inventory').insert([newItem]).select();
    if (!error && data && data.length > 0) {
      setItemsState([...items, data[0]]);
      setForm({ name: '', room: ROOMS[0], quantity: 1 });
    }
  };

  // Editar item en Supabase
  const saveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editIdx === null) return;
    const itemToEdit = items[editIdx];
    const updatedItem = { ...itemToEdit, ...editForm };
      const { data, error } = await supabase!
        .from('inventory')
        // @ts-expect-error
        .update({ missing: value })
        // @ts-expect-error
        .eq('id', itemToEdit.id)
        .select();
    if (!error && data && data.length > 0) {
      setItemsState(items.map((it, idx) => idx === editIdx ? data[0] : it));
      setEditIdx(null);
      setEditForm({ name: '', room: ROOMS[0], quantity: 1 });
    }
  };

  // Eliminar item en Supabase
  const deleteItem = async (idx: number) => {
    const item = items[idx];
    if (!item || !item.id) return;
    const { error } = await supabase!.from('inventory').delete().eq('id', item.id);
    if (!error) {
      setItemsState(items.filter((_, i) => i !== idx));
    }
  };

  // Marcar como completo/incompleto y reportar faltantes (empleado)
  const toggleComplete = async (idx: number) => {
    const item = items[idx];
    if (!item || !item.id) return;
    const { data, error } = await supabase!
      .from('inventory')
      // @ts-expect-error
      .update({ complete: !item.complete })
      .eq('id', item.id)
      .select();
    if (!error && data && data.length > 0) {
      setItemsState(items.map((it, i) => i === idx ? data[0] : it));
    }
  };
  const setMissing = async (idx: number, value: number) => {
    const item = items[idx];
    if (!item || !item.id) return;
    const { data, error } = await supabase!
      .from('inventory')
      // @ts-expect-error
      .update({ missing: value })
      .eq('id', item.id)
      .select();
    if (!error && data && data.length > 0) {
      setItemsState(items.map((it, i) => i === idx ? data[0] : it));
    }
  };

  // Set reason for incomplete item
  const setReason = async (idx: number, value: string) => {
    const item = items[idx];
    if (!item || !item.id) return;
    const { data, error } = await supabase!
      .from('inventory')
      // @ts-expect-error
      .update({ reason: value })
      .eq('id', item.id)
      .select();
    if (!error && data && data.length > 0) {
      setItemsState(items.map((it, i) => i === idx ? data[0] : it));
    }
  };

  // Reiniciar inventario (manager/owner)
  const resetInventory = async () => {
    // Actualizar todos los items en Supabase
    const ids = items.map(it => it.id);
    const { data, error } = await supabase!
      .from('inventory')
      // @ts-expect-error
      .update({ complete: false, missing: 0 })
      .in('id', ids);
    if (!error) {
      setItemsState(items.map(it => ({ ...it, complete: false, missing: 0 })));
    }
  };

  // Agrupar por habitación
  // ...existing code...

  // Agrupar por habitación
  const grouped = ROOMS.map(room => ({
    room,
    items: items.filter(it => it.room === room)
  })).filter(g => g.items.length > 0);

  return (
    <div className="inventory-list ultra-checklist">
      <h2 className="ultra-checklist-title">Inventario {houseName}</h2>
      {loading && <p className="ultra-task-text" style={{textAlign:'center'}}>Cargando inventario...</p>}
      {/* Formulario para agregar/editar items solo para managers de HYNTIBA2 */}
      {!loading && houseName === 'HYNTIBA2 APTO 406' && (user.role === 'owner' || user.role === 'manager') && (
        <form
          onSubmit={async e => {
            e.preventDefault();
            if (editIdx !== null) {
              // Editar item existente
              const itemToEdit = items[editIdx];
              const { data, error } = await (supabase!.from('inventory') as any).update({ name: editForm.name, room: editForm.room, quantity: editForm.quantity }).eq('id', itemToEdit.id).select();
              if (!error && data && data.length > 0) {
                setItemsState(items.map((it, idx) => idx === editIdx ? data[0] : it));
                setEditIdx(null);
                setEditForm({ name: '', room: ROOMS[0], quantity: 1 });
              }
            } else {
              // Agregar nuevo item
              const { data, error } = await (supabase!.from('inventory') as any).insert([{ name: form.name, room: form.room, quantity: form.quantity, house: houseName, complete: false, missing: 0 }]).select();
              if (!error && data && data.length > 0) {
                setItemsState([...items, data[0]]);
                setForm({ name: '', room: ROOMS[0], quantity: 1 });
              }
            }
          }}
          className="ultra-form-row" style={{marginBottom:'1.5rem', display:'flex', flexWrap:'wrap', gap:'0.7rem', alignItems:'center', justifyContent:'center'}}
        >
          <input id="inv-item-name" type="text" placeholder="Artículo" value={editIdx !== null ? editForm.name : form.name} onChange={e => editIdx !== null ? setEditForm({ ...editForm, name: e.target.value }) : setForm({ ...form, name: e.target.value })} required title="Nombre del artículo" className="ultra-task-text" style={{minWidth:'120px'}} />
          <select id="inv-room-select" value={editIdx !== null ? editForm.room : form.room} onChange={e => editIdx !== null ? setEditForm({ ...editForm, room: e.target.value }) : setForm({ ...form, room: e.target.value })} title="Selecciona la habitación" className="ultra-task-text">
            {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <input id="inv-qty" type="number" min={1} value={editIdx !== null ? editForm.quantity : form.quantity} onChange={e => editIdx !== null ? setEditForm({ ...editForm, quantity: Number(e.target.value) }) : setForm({ ...form, quantity: Number(e.target.value) })} required title="Cantidad del artículo" className="ultra-task-text" style={{width:'70px'}} />
          <button type="submit" className="ultra-reset-btn" style={{padding:'0.5rem 1.2rem', fontSize:'1rem'}}>{editIdx !== null ? 'Guardar' : 'Agregar'}</button>
          {editIdx !== null && <button type="button" className="ultra-reset-btn" style={{background:'#aaa',color:'#fff',padding:'0.5rem 1.2rem', fontSize:'1rem'}} onClick={() => { setEditIdx(null); setEditForm({ name: '', room: ROOMS[0], quantity: 1 }); }}>Cancelar</button>}
        </form>
      )}
      {!loading && grouped.length === 0 && <p className="ultra-task-text" style={{textAlign:'center'}}>No hay artículos en el inventario.</p>}
      <div className="ultra-tasks-grid">
        {grouped.map(g => (
          <div key={g.room} className="ultra-task-card" style={{flexDirection:'column', alignItems:'flex-start', minHeight:'unset'}}>
            <div style={{display:'flex',alignItems:'center',marginBottom:'0.7rem'}}>
              <span className="ultra-task-icon">{roomIcons[g.room] || <FaQuestion />}</span>
              <span className="ultra-section-title" style={{margin:0}}>{g.room}</span>
            </div>
            <div style={{width:'100%'}}>
              {g.items.map((it, idx) => (
                <div key={idx} className={`ultra-task-card${it.complete ? ' done' : ''}`} style={{marginBottom:'0.5rem',background:'#fff',color:'#23272f',padding:'0.7rem 1rem',boxShadow:'0 1px 6px #0001',display:'flex',alignItems:'center',gap:'0.7rem'}}>
                  <span className="ultra-task-icon">📦</span>
                  <span className="ultra-task-text" style={{flex:1}}>{it.name} <span style={{opacity:0.7}}>({it.quantity})</span></span>
                  {(user.role === 'owner' || user.role === 'manager') && houseName === 'HYNTIBA2 APTO 406' && (
                    <>
                      <button className="ultra-reset-btn" style={{padding:'0.2rem 0.8rem',fontSize:'0.95rem',marginRight:'0.3rem',background:'#2563eb',color:'#fff'}} onClick={() => { setEditIdx(items.indexOf(it)); setEditForm({ name: it.name, room: it.room, quantity: it.quantity }); }}>Editar</button>
                      <button className="ultra-reset-btn" style={{padding:'0.2rem 0.8rem',fontSize:'0.95rem',background:'#e11d48',color:'#fff'}} onClick={() => deleteItem(items.indexOf(it))}>Eliminar</button>
                    </>
                  )}
                  {(user.role === 'owner' || user.role === 'manager') && houseName !== 'HYNTIBA2 APTO 406' && (
                    <>
                      <button className="ultra-reset-btn" style={{padding:'0.2rem 0.8rem',fontSize:'0.95rem',marginRight:'0.3rem',background:'#2563eb',color:'#fff'}} onClick={() => { setEditIdx(items.indexOf(it)); setEditForm({ name: it.name, room: it.room, quantity: it.quantity }); }}>Editar</button>
                      <button className="ultra-reset-btn" style={{padding:'0.2rem 0.8rem',fontSize:'0.95rem',background:'#e11d48',color:'#fff'}} onClick={() => deleteItem(items.indexOf(it))}>Eliminar</button>
                    </>
                  )}
                  {user.role === 'empleado' && (
                    <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                      <label className="ultra-checkbox" style={{margin:0}}>
                        <input type="checkbox" checked={!!it.complete} onChange={() => toggleComplete(items.indexOf(it))} />
                        <span style={{marginLeft:'0.2rem'}}>Completo</span>
                      </label>
                      <input type="number" min={0} max={it.quantity} value={it.missing || 0} onChange={e => setMissing(items.indexOf(it), Number(e.target.value))} className="ultra-task-text" style={{width:'55px',fontSize:'0.95rem'}} title="Cantidad faltante" />
                      {!it.complete && (
                        <input type="text" placeholder="Motivo si no completo" value={it.reason || ''} onChange={e => setReason(items.indexOf(it), e.target.value)} className="ultra-task-text" style={{fontSize:'0.95rem',width:'120px'}} title="Motivo de no completar" />
                      )}
                    </div>
                  )}
                  {(user.role === 'owner' || user.role === 'manager') && (it.missing ?? 0) > 0 && (
                    <span className="ultra-task-text" style={{color:'#e11d48',marginLeft:'0.7rem'}}>Reportado: Faltan {it.missing ?? 0}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {!loading && (user.role === 'owner' || user.role === 'manager') && grouped.length > 0 && (
        <button onClick={resetInventory} className="ultra-reset-btn" style={{marginTop:'2rem'}}>Reiniciar Inventario</button>
      )}
    </div>
  );
};

export default Inventory;
