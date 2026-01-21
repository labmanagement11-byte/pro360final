import React, { useState } from 'react';
import * as realtimeService from '../utils/supabaseRealtimeService';

const AdminSetup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const createYntibaHouse = async () => {
    setLoading(true);
    setMessage('🔄 Creando casa YNTIBA 2 406...');

    try {
      const HOUSE_NAME = 'YNTIBA 2 406';

      // 1. Crear la casa
      const house = await realtimeService.createHouse({ houseName: HOUSE_NAME });
      if (!house) {
        setMessage('❌ Error al crear la casa');
        return;
      }
      setMessage('✅ Casa creada. Creando tareas...');

      // 2. Crear tareas de limpieza
      const cleaningTasks = [
        {
          title: 'Limpieza Regular - Sala y Comedor',
          description: 'Barrer, trapear, limpiar sofás y mesas',
          type: 'regular',
          house: HOUSE_NAME,
          assignedTo: 'Por asignar',
          createdBy: 'admin',
        },
        {
          title: 'Limpieza Regular - Habitaciones',
          description: 'Limpiar pisos, cambiar sábanas, organizar espacios',
          type: 'regular',
          house: HOUSE_NAME,
          assignedTo: 'Por asignar',
          createdBy: 'admin',
        },
        {
          title: 'Limpieza Regular - Baños',
          description: 'Limpiar sanitarios, espejos, pisos y duchas',
          type: 'regular',
          house: HOUSE_NAME,
          assignedTo: 'Por asignar',
          createdBy: 'admin',
        },
        {
          title: 'Limpieza Regular - Cocina',
          description: 'Limpiar encimeras, estufa, refrigerador y pisos',
          type: 'regular',
          house: HOUSE_NAME,
          assignedTo: 'Por asignar',
          createdBy: 'admin',
        },
        {
          title: 'Limpieza Regular - Zona de Lavandería',
          description: 'Limpiar lavadora, secadora, estantes y pisos',
          type: 'regular',
          house: HOUSE_NAME,
          assignedTo: 'Por asignar',
          createdBy: 'admin',
        },
        {
          title: 'Limpieza Profunda - Paredes y Techos',
          description: 'Limpiar paredes, techos, esquinas y eliminar telarañas en toda la casa',
          type: 'profunda',
          house: HOUSE_NAME,
          assignedTo: 'Por asignar',
          createdBy: 'admin',
        },
        {
          title: 'Limpieza Profunda - Refrigerador',
          description: 'Descongelar, limpiar bandejas y estantes del refrigerador',
          type: 'profunda',
          house: HOUSE_NAME,
          assignedTo: 'Por asignar',
          createdBy: 'admin',
        },
        {
          title: 'Limpieza Profunda - Horno y Microondas',
          description: 'Limpiar horno, microondas y todos los electrodomésticos de cocina',
          type: 'profunda',
          house: HOUSE_NAME,
          assignedTo: 'Por asignar',
          createdBy: 'admin',
        },
        {
          title: 'Limpieza Profunda - Ventanas',
          description: 'Limpiar ventanas interiores, exteriores y marcos',
          type: 'profunda',
          house: HOUSE_NAME,
          assignedTo: 'Por asignar',
          createdBy: 'admin',
        },
        {
          title: 'Limpieza Profunda - Cortinas y Tapetes',
          description: 'Lavar cortinas, tapetes y limpiar pisos profundamente',
          type: 'profunda',
          house: HOUSE_NAME,
          assignedTo: 'Por asignar',
          createdBy: 'admin',
        },
      ];

      for (const task of cleaningTasks) {
        await realtimeService.createTask(task);
      }
      setMessage('✅ Tareas creadas. Creando inventario...');

      setMessage('✅✅✅ Casa YNTIBA 2 406 creada exitosamente con 10 tareas de limpieza');
    } catch (error) {
      console.error('Error:', error);
      setMessage(`❌ Error: ${(error as any).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>🏗️ Panel de Administración</h1>
      <div style={{ border: '1px solid #ccc', padding: '1.5rem', borderRadius: '8px' }}>
        <h2>Crear Casa YNTIBA 2 406</h2>
        <p>Click el botón para crear la nueva casa con toda su infraestructura:</p>
        
        <button
          onClick={createYntibaHouse}
          disabled={loading}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#0284c7',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? '⏳ Creando...' : '✨ Crear Casa YNTIBA 2 406'}
        </button>

        {message && (
          <div
            style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: message.includes('❌') ? '#fee' : '#efe',
              borderRadius: '6px',
              border: `1px solid ${message.includes('❌') ? '#fcc' : '#cfc'}`,
            }}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSetup;
