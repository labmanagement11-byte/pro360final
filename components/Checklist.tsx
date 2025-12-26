import React, { useState, useEffect } from 'react';

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


const CHECKLIST_KEY = 'dashboard_checklist';

const Checklist = ({ user }) => {
  const [cleaning, setCleaning] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CHECKLIST_KEY + '_cleaning');
      return saved ? JSON.parse(saved) : cleaningTasks.map(task => ({ task, done: false }));
    }
    return cleaningTasks.map(task => ({ task, done: false }));
  });
  const [maintenance, setMaintenance] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CHECKLIST_KEY + '_maintenance');
      return saved ? JSON.parse(saved) : maintenanceTasks.map(task => ({ task, done: false }));
    }
    return maintenanceTasks.map(task => ({ task, done: false }));
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CHECKLIST_KEY + '_cleaning', JSON.stringify(cleaning));
      localStorage.setItem(CHECKLIST_KEY + '_maintenance', JSON.stringify(maintenance));
    }
  }, [cleaning, maintenance]);

  const toggleCleaning = idx => {
    setCleaning(cleaning.map((i, iidx) => iidx === idx ? { ...i, done: !i.done } : i));
  };
  const toggleMaintenance = idx => {
    setMaintenance(maintenance.map((i, iidx) => iidx === idx ? { ...i, done: !i.done } : i));
  };

  const resetChecklist = () => {
    setCleaning(cleaningTasks.map(task => ({ task, done: false })));
    setMaintenance(maintenanceTasks.map(task => ({ task, done: false })));
  };

  return (
    <div className="checklist-list">
      <h2>Checklist EPIC D1</h2>
      <h3>Limpieza</h3>
      <ul>
        {cleaning.map((i, idx) => (
          <li key={idx} className={i.done ? 'disabled' : ''}>
            <input type="checkbox" checked={i.done} onChange={() => toggleCleaning(idx)} disabled={user.role !== 'empleado'} title={i.task} /> <span>{i.task}</span>
          </li>
        ))}
      </ul>
      <h3 className="checklist-maintenance-title">Mantenimiento</h3>
      <ul>
        {maintenance.map((i, idx) => (
          <li key={idx} className={i.done ? 'disabled' : ''}>
            <input type="checkbox" checked={i.done} onChange={() => toggleMaintenance(idx)} disabled={user.role !== 'empleado'} title={i.task} /> <span>{i.task}</span>
          </li>
        ))}
      </ul>
      {(user.role === 'dueno' || user.role === 'manager') && (
        <button onClick={resetChecklist} className="checklist-reset-btn">Reiniciar Checklist</button>
      )}
    </div>
  );
};

export default Checklist;
