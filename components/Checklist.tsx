import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import type { User } from './Dashboard';

const cleaningTasks = [
  'Barrer y trapear toda la casa.',
  'Quitar el polvo de todas las superficies y decoración usando un trapo húmedo.',
  'Limpiar los televisores cuidadosamente sin dejar marcas en la pantalla.',
  'Revisar zócalos y esquinas para asegurarse de que estén limpios.',
  'Limpiar telaraña.',
  'Limpiar todas las superficies de la sala.',
  'Mover los cojines del sofá y verificar que no haya suciedad ni hormigas debajo.',
  'Organizar cojines y dejar la sala ordenada.',
  'Limpiar mesa, sillas y superficies del comedor.',
  'Asegurarse de que el área del comedor quede limpia y ordenada.',
  'Limpiar superficies, gabinetes por fuera y por dentro de la cocina.',
  'Verificar que los gabinetes estén limpios, organizados y funcionales.',
  'Limpiar la cafetera y su filtro.',
  'Verificar que el dispensador de jabón de loza esté lleno.',
  'Dejar toallas de cocina limpias y disponibles para los visitantes.',
  'Limpiar microondas por dentro y por fuera.',
  'Limpiar el filtro de agua.',
  'Limpiar la nevera por dentro y por fuera (no dejar alimentos).',
  'Lavar las canecas de basura y colocar bolsas nuevas.',
  'Limpiar ducha (pisos y paredes) de los baños.',
  'Limpiar divisiones de vidrio y asegurarse de que no queden marcas.',
  'Limpiar espejo, sanitario y lavamanos con Clorox.',
  'Lavar las canecas de basura y colocar bolsas nuevas en los baños.',
  'Verificar disponibilidad de toallas: máximo 10 toallas blancas de cuerpo en toda la casa, máximo 4 toallas de mano en total (1 por baño).',
  'Dejar un rollo de papel higiénico nuevo instalado en cada baño.',
  'Dejar un rollo extra en el cuarto de lavado.',
  'Lavar y volver a colocar los tapetes de baño.',
  'Revisar que no haya objetos dentro de los cajones de las habitaciones.',
  'Lavar sábanas y hacer las camas correctamente.',
  'Limpiar el polvo de todas las superficies de las habitaciones.',
  'Lavar los tapetes de la habitación y volver a colocarlos limpios.',
  'Limpiar el filtro de la lavadora en cada lavada.',
  'Limpiar el gabinete debajo del lavadero.',
  'Dejar ganchos de ropa disponibles.',
  'Dejar toallas disponibles para la piscina.',
  'Barrer y trapear el área de BBQ.',
  'Limpiar mesa y superficies del área de BBQ.',
  'Limpiar la mini nevera y no dejar ningún alimento dentro.',
  'Limpiar la parrilla con el cepillo (no usar agua).',
  'Retirar las cenizas del carbón.',
  'Dejar toda el área de BBQ limpia y ordenada.',
  'Barrer y trapear el área de piscina.',
  'Organizar los muebles alrededor de la piscina.',
  'Limpiar el piso de la terraza.',
  'Limpiar superficies de la terraza.',
  'Organizar los cojines de la sala exterior.'
];

const maintenanceTasks = [
  'Mantener la piscina limpia y en funcionamiento.',
  'Revisar constantemente el cuarto de máquinas para verificar su funcionamiento y detectar posibles filtraciones de agua.',
  'Chequear que el generador eléctrico funcione correctamente y tenga diesel suficiente.',
  'Encender la planta eléctrica al menos 2 veces al mes durante mínimo media hora.',
  'Cortar el césped cada mes y medio a dos meses, y limpiar restos de césped.',
  'Mantenimiento de palmeras: remover hojas secas.',
  'Mantener la matera de la terraza libre de maleza y deshierbar regularmente.',
  'Regar las plantas vivas según necesidad.'
];


const CHECKLIST_KEY = 'dashboard_checklist'; // legacy, no longer usado


const Checklist = ({ user }: { user: User }) => {
  const [cleaning, setCleaning] = useState<{ id?: number; item: string; room?: string; complete: boolean; reason?: string }[]>([]);
  const [maintenance, setMaintenance] = useState<{ id?: number; item: string; room?: string; complete: boolean; reason?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar checklist desde Supabase
  useEffect(() => {
    const fetchChecklist = async () => {
      setLoading(true);
      const { data, error } = await supabase!
        .from('checklist')
        .select('*')
        .eq('house', 'EPIC D1');
      if (!error && data) {
        // @ts-expect-error
        setCleaning(data.filter(i => !i.room || i.room === 'Limpieza'));
        // @ts-expect-error
        setMaintenance(data.filter(i => i.room === 'Mantenimiento'));
      } else {
        setCleaning([]);
        setMaintenance([]);
      }
      setLoading(false);
    };
    fetchChecklist();
  }, []);

  // Agrupar tareas de limpieza por zona
  const cleaningZones = [
    { key: 'habitaciones', label: 'Habitaciones' },
    { key: 'cocina', label: 'Cocina' },
    { key: 'banos', label: 'Baños' },
    { key: 'sala', label: 'Sala' },
    { key: 'comedor', label: 'Comedor' },
    { key: 'terraza', label: 'Terraza' },
    { key: 'bbq', label: 'Área BBQ' },
    { key: 'piscina', label: 'Piscina' },
    { key: 'lavanderia', label: 'Lavandería' },
    { key: 'otros', label: 'Otros' },
  ];

  // Mapear cada tarea a una zona (esto puede mejorarse si tienes el campo room en la base de datos)
  const getZone = (item: string) => {
    if (/habita/i.test(item) || /cama/i.test(item) || /tapete/i.test(item) || /cajon/i.test(item)) return 'habitaciones';
    if (/cocina|microondas|nevera|filtro de agua|gabinete|cafetera|jab[oó]n|toalla de cocina/i.test(item)) return 'cocina';
    if (/ba.n|sanitario|lavamanos|papel hig[ií]enico|toalla de mano|ducha|espejo|tapete de ba.n/i.test(item)) return 'banos';
    if (/sala|coj[ií]n/i.test(item)) return 'sala';
    if (/comedor/i.test(item)) return 'comedor';
    if (/terraza/i.test(item)) return 'terraza';
    if (/bbq|parrilla|carb[oó]n|mini nevera/i.test(item)) return 'bbq';
    if (/piscina/i.test(item)) return 'piscina';
    if (/lavadora|lavadero|ganchos|cuarto de lavado/i.test(item)) return 'lavanderia';
    return 'otros';
  };

  const cleaningByZone: Record<string, typeof cleaning> = {};
  cleaningZones.forEach(z => { cleaningByZone[z.key] = []; });
  cleaning.forEach(i => {
    const zone = getZone(i.item);
    cleaningByZone[zone].push(i);
  });

  // Marcar/desmarcar ítem de limpieza
  const toggleCleaning = async (idx: number) => {
    const item = cleaning[idx];
    if (!item || !item.id) return;
    const { data, error } = await supabase!
      .from('checklist')
      // @ts-expect-error
      .update({ complete: !item.complete })
      .eq('id', item.id)
      .select();
    if (!error && data && data.length > 0) {
      setCleaning(cleaning.map((i, iidx) => iidx === idx ? data[0] : i));
    }
  };
  // Marcar/desmarcar ítem de mantenimiento
  const toggleMaintenance = async (idx: number) => {
    const item = maintenance[idx];
    if (!item || !item.id) return;
    // @ts-expect-error
    const { data, error } = await supabase!
      .from('checklist')
      .update({ complete: !item.complete })
      .eq('id', item.id)
      .select();
    if (!error && data && data.length > 0) {
      setMaintenance(maintenance.map((i, iidx) => iidx === idx ? data[0] : i));
    }
  };

  // Reiniciar checklist (manager/dueno)
  const resetChecklist = async () => {
    const allIds = [...cleaning, ...maintenance].map(i => i.id).filter(Boolean);
    const { data, error } = await supabase
      .from('checklist')
      .update({ complete: false })
      .in('id', allIds);
    if (!error) {
      setCleaning(cleaning.map(i => ({ ...i, complete: false })));
      setMaintenance(maintenance.map(i => ({ ...i, complete: false })));
    }
  };

  return (
    <div className="checklist-list ultra-checklist">
      <h2 className="ultra-checklist-title">Checklist EPIC D1</h2>
      {loading && <p className="ultra-task-text ultra-task-loading">Cargando checklist...</p>}
      {!loading && <>
      {cleaningZones.map(zone => (
        cleaningByZone[zone.key].length > 0 && (
          <div className="ultra-checklist-section" key={zone.key}>
            <h3 className="ultra-section-title">{zone.label}</h3>
            <div className="ultra-tasks-grid">
              {cleaningByZone[zone.key].map((i, idx) => (
                <div key={i.id || idx} className={`ultra-task-card${i.complete ? ' done' : ''}`}> 
                  <label className="ultra-checkbox">
                    <input type="checkbox" checked={!!i.complete} onChange={() => toggleCleaning(cleaning.findIndex(c => c.id === i.id))} disabled={user.role !== 'empleado'} title={i.item} />
                    <span className="ultra-task-icon">{i.complete ? '✔️' : '🧹'}</span>
                    <span className="ultra-task-text">{i.item}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )
      ))}
      <div className="ultra-checklist-section">
        <h3 className="ultra-section-title">Mantenimiento</h3>
        <div className="ultra-tasks-grid">
          {maintenance.map((i, idx) => (
            <div key={idx} className={`ultra-task-card${i.complete ? ' done' : ''}`}> 
              <label className="ultra-checkbox">
                <input type="checkbox" checked={!!i.complete} onChange={() => toggleMaintenance(idx)} disabled={user.role !== 'empleado'} title={i.item} />
                <span className="ultra-task-icon">{i.complete ? '🔧' : '🛠️'}</span>
                <span className="ultra-task-text">{i.item}</span>
              </label>
            </div>
          ))}
        </div>
      </div>
      </>}
      {!loading && (user.role === 'dueno' || user.role === 'manager') && (
        <button onClick={resetChecklist} className="ultra-reset-btn">Reiniciar Checklist</button>
      )}
    </div>
  );
};

export default Checklist;
