-- Crear tabla de recordatorios
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    due_date DATE NOT NULL,
    bank TEXT,
    account TEXT,
    invoice_number TEXT,
    house TEXT NOT NULL DEFAULT 'HYNTIBA2 APTO 406',
    frequency TEXT DEFAULT 'once' CHECK (frequency IN ('once', 'monthly', 'yearly')),
    amount DECIMAL(10,2),
    paid BOOLEAN DEFAULT FALSE,
    paid_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Política para permitir todo (ajustar según necesidades)
CREATE POLICY "Allow all operations on reminders" ON public.reminders
    FOR ALL USING (true) WITH CHECK (true);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.reminders;

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_reminders_house ON public.reminders(house);
CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON public.reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_frequency ON public.reminders(frequency);

-- Comentarios
COMMENT ON TABLE public.reminders IS 'Tabla de recordatorios de pagos por casa';
COMMENT ON COLUMN public.reminders.frequency IS 'Frecuencia del recordatorio: once (una vez), monthly (mensual), yearly (anual)';
