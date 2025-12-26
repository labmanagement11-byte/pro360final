
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
  inventory?: InventoryItem[];
  setInventory?: (inventory: InventoryItem[]) => void;
}

const Inventory: React.FC<InventoryProps> = ({ user, inventory: externalInventory, setInventory: setExternalInventory }) => {
  const airbnbExample: InventoryItem[] = [
    // Cocina
    { name: 'Cucharas', room: 'Cocina', quantity: 8 },
    { name: 'Tenedores', room: 'Cocina', quantity: 8 },
    { name: 'Cuchillos', room: 'Cocina', quantity: 8 },
    { name: 'Platos llanos', room: 'Cocina', quantity: 8 },
    { name: 'Platos hondos', room: 'Cocina', quantity: 8 },
    { name: 'Platos de postre', room: 'Cocina', quantity: 8 },
    { name: 'Vasos', room: 'Cocina', quantity: 8 },
    { name: 'Copas de vino', room: 'Cocina', quantity: 6 },
    { name: 'Copas de agua', room: 'Cocina', quantity: 6 },
    { name: 'Tazas', room: 'Cocina', quantity: 8 },
    { name: 'Sartenes', room: 'Cocina', quantity: 3 },
    { name: 'Ollas', room: 'Cocina', quantity: 3 },
    { name: 'Cafetera', room: 'Cocina', quantity: 1 },
    { name: 'Microondas', room: 'Cocina', quantity: 1 },
    { name: 'Licuadora', room: 'Cocina', quantity: 1 },
    { name: 'Tostadora', room: 'Cocina', quantity: 1 },
    { name: 'Refrigerador', room: 'Cocina', quantity: 1 },
    { name: 'Dispensador de agua', room: 'Cocina', quantity: 1 },
    { name: 'Cuchillos grandes', room: 'Cocina', quantity: 2 },
    { name: 'Tabla de picar', room: 'Cocina', quantity: 2 },
    { name: 'Abrelatas', room: 'Cocina', quantity: 1 },
    { name: 'Sacacorchos', room: 'Cocina', quantity: 1 },
    { name: 'Colador', room: 'Cocina', quantity: 1 },
    { name: 'Bandejas', room: 'Cocina', quantity: 2 },
    { name: 'Recipientes plásticos', room: 'Cocina', quantity: 6 },
    { name: 'Papel aluminio', room: 'Cocina', quantity: 1 },
    { name: 'Film plástico', room: 'Cocina', quantity: 1 },
    { name: 'Servilletas', room: 'Cocina', quantity: 1 },
    { name: 'Jarra de agua', room: 'Cocina', quantity: 1 },
    { name: 'Cestos de basura', room: 'Cocina', quantity: 1 },
    // Habitaciones
    { name: 'Almohadas', room: 'Habitación 1', quantity: 2 },
    { name: 'Almohadas', room: 'Habitación 2', quantity: 2 },
    { name: 'Almohadas', room: 'Habitación 3', quantity: 2 },
    { name: 'Sábanas', room: 'Habitación 1', quantity: 2 },
    { name: 'Sábanas', room: 'Habitación 2', quantity: 2 },
    { name: 'Sábanas', room: 'Habitación 3', quantity: 2 },
    { name: 'Cobijas', room: 'Habitación 1', quantity: 2 },
    { name: 'Cobijas', room: 'Habitación 2', quantity: 2 },
    { name: 'Cobijas', room: 'Habitación 3', quantity: 2 },
    { name: 'Perchas', room: 'Habitación 1', quantity: 6 },
    { name: 'Perchas', room: 'Habitación 2', quantity: 6 },
    { name: 'Perchas', room: 'Habitación 3', quantity: 6 },
    { name: 'Cortinas', room: 'Habitación 1', quantity: 1 },
    { name: 'Cortinas', room: 'Habitación 2', quantity: 1 },
    { name: 'Cortinas', room: 'Habitación 3', quantity: 1 },
    // Baños
    { name: 'Toallas de baño', room: 'Baños', quantity: 6 },
    { name: 'Toallas de mano', room: 'Baños', quantity: 3 },
    { name: 'Tapetes de baño', room: 'Baños', quantity: 3 },
    { name: 'Cestos de basura', room: 'Baños', quantity: 2 },
    { name: 'Papel higiénico', room: 'Baños', quantity: 6 },
    { name: 'Jabón de manos', room: 'Baños', quantity: 3 },
    { name: 'Shampoo', room: 'Baños', quantity: 3 },
    { name: 'Acondicionador', room: 'Baños', quantity: 3 },
    { name: 'Secador de pelo', room: 'Baños', quantity: 1 },
    // Terraza
    { name: 'Sillas', room: 'Terraza', quantity: 4 },
    { name: 'Mesa', room: 'Terraza', quantity: 1 },
    { name: 'Cojines', room: 'Terraza', quantity: 4 },
    { name: 'Cestos de basura', room: 'Terraza', quantity: 1 },
    // Piscina
    { name: 'Toallas de piscina', room: 'Piscina', quantity: 4 },
    { name: 'Flotadores', room: 'Piscina', quantity: 2 },
    { name: 'Sillas de piscina', room: 'Piscina', quantity: 2 },
    // BBQ
    { name: 'Parrilla', room: 'BBQ', quantity: 1 },
    { name: 'Cenicero', room: 'BBQ', quantity: 1 },
    { name: 'Utensilios BBQ', room: 'BBQ', quantity: 3 },
    // Lavandería
    { name: 'Lavadora', room: 'Lavandería', quantity: 1 },
    { name: 'Secadora', room: 'Lavandería', quantity: 1 },
    { name: 'Jabón de ropa', room: 'Lavandería', quantity: 1 },
    { name: 'Canasta de ropa', room: 'Lavandería', quantity: 1 },
    // Limpieza
    { name: 'Escoba', room: 'Pasillo', quantity: 1 },
    { name: 'Trapeador', room: 'Pasillo', quantity: 1 },
    { name: 'Recogedor', room: 'Pasillo', quantity: 1 },
    { name: 'Balde', room: 'Pasillo', quantity: 1 },
    { name: 'Cloro', room: 'Pasillo', quantity: 1 },
    { name: 'Desinfectante', room: 'Pasillo', quantity: 1 },
    // Extras
    { name: 'Botiquín de primeros auxilios', room: 'Pasillo', quantity: 1 },
    { name: 'Extintor', room: 'Pasillo', quantity: 1 },
    { name: 'Linterna', room: 'Pasillo', quantity: 1 },
    { name: 'Manual de la casa', room: 'Pasillo', quantity: 1 },
  ];
  const [items, setItemsState] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar inventario desde Supabase
  useEffect(() => {
    const fetchInventory = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('house', 'EPIC D1');
      if (!error && data) {
        setItemsState(data);
      } else {
        setItemsState([]);
      }
      setLoading(false);
    };
    fetchInventory();
  }, []);

  // Sync with external inventory if provided
  // No externalInventory ni setInventory: todo es cloud
  const [form, setForm] = useState({
    name: '',
    room: ROOMS[0],
    quantity: 1,
  });
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', room: ROOMS[0], quantity: 1 });

  // No localStorage: todo es cloud

  // Agregar item a Supabase
  const addItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newItem = { ...form, complete: false, missing: 0, house: 'EPIC D1' };
    const { data, error } = await supabase.from('inventory').insert([newItem]).select();
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
    const { data, error } = await supabase
      .from('inventory')
      .update({ name: updatedItem.name, room: updatedItem.room, quantity: updatedItem.quantity })
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
    const { error } = await supabase.from('inventory').delete().eq('id', item.id);
    if (!error) {
      setItemsState(items.filter((_, i) => i !== idx));
    }
  };

  // Marcar como completo/incompleto y reportar faltantes (empleado)
  const toggleComplete = async (idx: number) => {
    const item = items[idx];
    if (!item || !item.id) return;
    const { data, error } = await supabase
      .from('inventory')
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
    const { data, error } = await supabase
      .from('inventory')
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
    const { data, error } = await supabase
      .from('inventory')
      .update({ reason: value })
      .eq('id', item.id)
      .select();
    if (!error && data && data.length > 0) {
      setItemsState(items.map((it, i) => i === idx ? data[0] : it));
    }
  };

  // Reiniciar inventario (manager/dueno)
  const resetInventory = async () => {
    // Actualizar todos los items en Supabase
    const ids = items.map(it => it.id);
    const { data, error } = await supabase
      .from('inventory')
      .update({ complete: false, missing: 0 })
      .in('id', ids);
    if (!error) {
      setItemsState(items.map(it => ({ ...it, complete: false, missing: 0 })));
    }
  };

  // Agrupar por habitación (eliminada la declaración duplicada)
  const grouped = ROOMS.map(room => ({
    room,
    items: items.filter(it => it.room === room)
  })).filter(g => g.items.length > 0);

  // Agrupar por habitación
  // ...existing code...

  return (
    <div className="inventory-list ultra-checklist">
      <h2 className="ultra-checklist-title">Inventario EPIC D1</h2>
      {loading && <p className="ultra-task-text ultra-task-loading">Cargando inventario...</p>}
      {!loading && (user.role === 'dueno' || user.role === 'manager') && (
        <form onSubmit={editIdx !== null ? saveEdit : addItem} className="ultra-form-row ultra-inv-form-row">
          <input id="inv-item-name" type="text" placeholder="Artículo" value={editIdx !== null ? editForm.name : form.name} onChange={e => editIdx !== null ? setEditForm({ ...editForm, name: e.target.value }) : setForm({ ...form, name: e.target.value })} required title="Nombre del artículo" className="ultra-task-text ultra-inv-minwidth" />
          <select id="inv-room-select" value={editIdx !== null ? editForm.room : form.room} onChange={e => editIdx !== null ? setEditForm({ ...editForm, room: e.target.value }) : setForm({ ...form, room: e.target.value })} title="Selecciona la habitación" className="ultra-task-text">
            {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <input id="inv-qty" type="number" min={1} value={editIdx !== null ? editForm.quantity : form.quantity} onChange={e => editIdx !== null ? setEditForm({ ...editForm, quantity: Number(e.target.value) }) : setForm({ ...form, quantity: Number(e.target.value) })} required title="Cantidad del artículo" className="ultra-task-text ultra-inv-qty" />
          <button type="submit" className="ultra-reset-btn ultra-inv-btn-main">{editIdx !== null ? 'Guardar' : 'Agregar'}</button>
          {editIdx !== null && <button type="button" className="ultra-reset-btn ultra-inv-btn-cancel" onClick={() => setEditIdx(null)}>Cancelar</button>}
        </form>
      )}
      {!loading && grouped.length === 0 && <p className="ultra-task-text ultra-task-loading">No hay artículos en el inventario.</p>}
      <div className="ultra-tasks-grid">
        {grouped.map(g => (
          <div key={g.room} className="ultra-task-card ultra-inv-room-card">
            <div className="ultra-inv-room-header">
              <span className="ultra-task-icon">{roomIcons[g.room] || <FaQuestion />}</span>
              <span className="ultra-section-title ultra-inv-room-title">{g.room}</span>
            </div>
            <div className="ultra-inv-items-list">
              {g.items.map((it, idx) => (
                <div key={idx} className={`ultra-task-card${it.complete ? ' done' : ''} ultra-inv-item-card`}>
                  <span className="ultra-task-icon">📦</span>
                  <span className="ultra-task-text ultra-inv-item-name">{it.name} <span className="ultra-inv-item-qty">({it.quantity})</span></span>
                  {(user.role === 'dueno' || user.role === 'manager') && (
                    <>
                      <button className="ultra-reset-btn ultra-inv-btn-edit" onClick={() => { setEditIdx(items.indexOf(it)); setEditForm({ name: it.name, room: it.room, quantity: it.quantity }); }}>Editar</button>
                      <button className="ultra-reset-btn ultra-inv-btn-delete" onClick={() => deleteItem(items.indexOf(it))}>Eliminar</button>
                    </>
                  )}
                  {user.role === 'empleado' && (
                    <div className="ultra-inv-emp-row">
                      <label className="ultra-checkbox ultra-inv-checkbox">
                        <input type="checkbox" checked={!!it.complete} onChange={() => toggleComplete(items.indexOf(it))} />
                        <span className="ultra-inv-checkbox-label">Completo</span>
                      </label>
                      <input type="number" min={0} max={it.quantity} value={it.missing || 0} onChange={e => setMissing(items.indexOf(it), Number(e.target.value))} className="ultra-task-text ultra-inv-missing" title="Cantidad faltante" />
                      {!it.complete && (
                        <input type="text" placeholder="Motivo si no completo" value={it.reason || ''} onChange={e => setReason(items.indexOf(it), e.target.value)} className="ultra-task-text ultra-inv-reason" title="Motivo de no completar" />
                      )}
                    </div>
                  )}
                  {(user.role === 'dueno' || user.role === 'manager') && (it.missing ?? 0) > 0 && (
                    <span className="ultra-task-text ultra-inv-reported">Reportado: Faltan {it.missing ?? 0}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {!loading && (user.role === 'dueno' || user.role === 'manager') && grouped.length > 0 && (
        <button onClick={resetInventory} className="ultra-reset-btn ultra-inv-btn-reset">Reiniciar Inventario</button>
      )}
    </div>
  );
};

export default Inventory;
