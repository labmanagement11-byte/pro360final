
import React, { useState, useEffect } from 'react';
import { FaBoxOpen, FaChair, FaBed, FaBath, FaUtensils, FaCouch, FaSwimmer, FaBroom, FaTshirt, FaQuestion } from 'react-icons/fa';

const ROOMS = [
  'Cocina', 'Terraza', 'Piscina', 'BBQ', 'Pasillo', 'Baños', 'Habitación 1', 'Habitación 2', 'Habitación 3', 'Lavandería'
];
const INVENTORY_KEY = 'dashboard_inventory';

const roomIcons = {
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
    { name: 'Cucharas', room: 'Cocina', quantity: 12, complete: false, missing: 0 },
    { name: 'Tenedores', room: 'Cocina', quantity: 12, complete: false, missing: 0 },
    { name: 'Cuchillos', room: 'Cocina', quantity: 12, complete: false, missing: 0 },
    { name: 'Platos llanos', room: 'Cocina', quantity: 12, complete: false, missing: 0 },
    { name: 'Platos hondos', room: 'Cocina', quantity: 12, complete: false, missing: 0 },
    { name: 'Vasos', room: 'Cocina', quantity: 12, complete: false, missing: 0 },
    { name: 'Copas de vino', room: 'Cocina', quantity: 8, complete: false, missing: 0 },
    { name: 'Copas de agua', room: 'Cocina', quantity: 8, complete: false, missing: 0 },
    { name: 'Sartenes', room: 'Cocina', quantity: 3, complete: false, missing: 0 },
    { name: 'Ollas', room: 'Cocina', quantity: 4, complete: false, missing: 0 },
    { name: 'Tazas', room: 'Cocina', quantity: 8, complete: false, missing: 0 },
    { name: 'Toallas de baño', room: 'Baños', quantity: 10, complete: false, missing: 0 },
    { name: 'Toallas de mano', room: 'Baños', quantity: 4, complete: false, missing: 0 },
    { name: 'Almohadas', room: 'Habitación 1', quantity: 2, complete: false, missing: 0 },
    { name: 'Almohadas', room: 'Habitación 2', quantity: 2, complete: false, missing: 0 },
    { name: 'Almohadas', room: 'Habitación 3', quantity: 2, complete: false, missing: 0 },
    { name: 'Sábanas', room: 'Habitación 1', quantity: 2, complete: false, missing: 0 },
    { name: 'Sábanas', room: 'Habitación 2', quantity: 2, complete: false, missing: 0 },
    { name: 'Sábanas', room: 'Habitación 3', quantity: 2, complete: false, missing: 0 },
    { name: 'Toallas de piscina', room: 'Piscina', quantity: 6, complete: false, missing: 0 },
    { name: 'Sillas', room: 'Terraza', quantity: 6, complete: false, missing: 0 },
    { name: 'Mesa', room: 'Terraza', quantity: 1, complete: false, missing: 0 },
    { name: 'Parrilla', room: 'BBQ', quantity: 1, complete: false, missing: 0 },
    { name: 'Cenicero', room: 'BBQ', quantity: 1, complete: false, missing: 0 },
    { name: 'Escoba', room: 'Pasillo', quantity: 2, complete: false, missing: 0 },
    { name: 'Trapeador', room: 'Pasillo', quantity: 2, complete: false, missing: 0 },
    { name: 'Cestos de basura', room: 'Baños', quantity: 3, complete: false, missing: 0 },
    { name: 'Cestos de basura', room: 'Cocina', quantity: 1, complete: false, missing: 0 },
    { name: 'Cestos de basura', room: 'Terraza', quantity: 1, complete: false, missing: 0 },
  ];
  const [items, setItemsState] = useState<InventoryItem[]>(() => {
    if (externalInventory) return externalInventory;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(INVENTORY_KEY);
      if (saved) return JSON.parse(saved);
      localStorage.setItem(INVENTORY_KEY, JSON.stringify(airbnbExample));
      return airbnbExample;
    }
    return airbnbExample;
  });

  // Sync with external inventory if provided
  useEffect(() => {
    if (externalInventory) setItemsState(externalInventory);
  }, [externalInventory]);

  // Update parent if setInventory provided
  useEffect(() => {
    if (setExternalInventory) setExternalInventory(items);
  }, [items]);
  const [form, setForm] = useState({
    name: '',
    room: ROOMS[0],
    quantity: 1,
  });
  const [editIdx, setEditIdx] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', room: ROOMS[0], quantity: 1 });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(INVENTORY_KEY, JSON.stringify(items));
    }
  }, [items]);

  // Agregar item
  const addItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setItemsState([...items, { ...form, complete: false, missing: 0 }]);
    setForm({ name: '', room: ROOMS[0], quantity: 1 });
  };

  // Editar item
  const saveEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setItemsState(items.map((it, idx) => idx === editIdx ? { ...editForm, complete: it.complete, missing: it.missing } : it));
    setEditIdx(null);
    setEditForm({ name: '', room: ROOMS[0], quantity: 1 });
  };

  // Eliminar item
  const deleteItem = (idx: number) => {
    setItemsState(items.filter((_, i) => i !== idx));
  };

  // Marcar como completo/incompleto y reportar faltantes (empleado)
  const toggleComplete = (idx: number) => {
    setItemsState(items.map((it, i) => i === idx ? { ...it, complete: !it.complete } : it));
  };
  const setMissing = (idx: number, value: number) => {
    setItemsState(items.map((it, i) => i === idx ? { ...it, missing: value } : it));
  };

  // Reiniciar inventario (manager/dueno)
  const resetInventory = () => {
    setItemsState(items.map(it => ({ ...it, complete: false, missing: 0 })));
  };

  // Agrupar por habitación
  const grouped = ROOMS.map(room => ({
    room,
    items: items.filter(it => it.room === room)
  })).filter(g => g.items.length > 0);

  return (
    <div className="inventory-list">
      <h2 className="inv-title">Inventario por Habitaciones</h2>
      {(user.role === 'dueno' || user.role === 'manager') && (
        <form onSubmit={editIdx !== null ? saveEdit : addItem} className="inv-form">
          <label htmlFor="inv-item-name" className="inv-label">Artículo:</label>
          <input
            id="inv-item-name"
            type="text"
            placeholder="Artículo"
            value={editIdx !== null ? editForm.name : form.name}
            onChange={e => editIdx !== null ? setEditForm({ ...editForm, name: e.target.value }) : setForm({ ...form, name: e.target.value })}
            required
            title="Nombre del artículo"
          />
          <label htmlFor="inv-room-select" className="inv-label">Habitación:</label>
          <select
            id="inv-room-select"
            value={editIdx !== null ? editForm.room : form.room}
            onChange={e => editIdx !== null ? setEditForm({ ...editForm, room: e.target.value }) : setForm({ ...form, room: e.target.value })}
            title="Selecciona la habitación"
          >
            {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <label htmlFor="inv-qty" className="inv-label">Cantidad:</label>
          <input
            id="inv-qty"
            type="number"
            min={1}
            value={editIdx !== null ? editForm.quantity : form.quantity}
            onChange={e => editIdx !== null ? setEditForm({ ...editForm, quantity: Number(e.target.value) }) : setForm({ ...form, quantity: Number(e.target.value) })}
            required
            title="Cantidad del artículo"
          />
          <button type="submit" className="inv-btn main">{editIdx !== null ? 'Guardar' : 'Agregar'}</button>
          {editIdx !== null && <button type="button" className="inv-btn" onClick={() => setEditIdx(null)}>Cancelar</button>}
        </form>
      )}
      {grouped.length === 0 && <p>No hay artículos en el inventario.</p>}
      <div className="inv-rooms">
        {grouped.map(g => (
          <div key={g.room} className="inv-room-card">
            <div className="inv-room-header">
              <span className="inv-room-icon">{roomIcons[g.room] || <FaQuestion />}</span>
              <h3>{g.room}</h3>
            </div>
            <div className="inv-items">
              {g.items.map((it, idx) => (
                <div key={idx} className={`inv-item-card${it.complete ? ' complete' : ''}`}>
                  <div className="inv-item-main">
                    <span className="inv-item-name">{it.name}</span>
                    <span className="inv-item-qty">({it.quantity})</span>
                  </div>
                  <div className="inv-item-actions">
                    {(user.role === 'dueno' || user.role === 'manager') && (
                      <>
                        <button className="inv-btn" onClick={() => { setEditIdx(items.indexOf(it)); setEditForm({ name: it.name, room: it.room, quantity: it.quantity }); }}>Editar</button>
                        <button className="inv-btn danger" onClick={() => deleteItem(items.indexOf(it))}>Eliminar</button>
                      </>
                    )}
                    {user.role === 'empleado' && (
                      <>
                        <label className="inv-check">
                          <input type="checkbox" checked={!!it.complete} onChange={() => toggleComplete(items.indexOf(it))} /> Completo
                        </label>
                        <label htmlFor={`inv-missing-${idx}`} className="inv-label">Faltan:</label>
                        <input
                          id={`inv-missing-${idx}`}
                          type="number"
                          min={0}
                          max={it.quantity}
                          value={it.missing || 0}
                          onChange={e => setMissing(items.indexOf(it), Number(e.target.value))}
                          className="inv-missing"
                          title="Cantidad faltante"
                        />
                      </>
                    )}
                    {(user.role === 'dueno' || user.role === 'manager') && it.missing > 0 && (
                      <span className="inv-missing-label inv-missing">Reportado: Faltan {it.missing}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {(user.role === 'dueno' || user.role === 'manager') && grouped.length > 0 && (
        <button onClick={resetInventory} className="inv-btn main inv-reset">Reiniciar Inventario</button>
      )}
    </div>
  );
};

export default Inventory;
