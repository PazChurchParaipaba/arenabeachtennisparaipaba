-- ============================================================================
-- ARENA BEACH TENNIS PARAIPABA - SCRIPT DE BANCO DE DADOS SUPABASE
-- Cole e execute este script no SQL Editor do seu projeto Supabase:
-- https://supabase.com/dashboard/project/groezaseypdbpgymgpvo/sql/new
-- ============================================================================

-- 1. Tabela de Estado Sincronizado em Tempo Real da Arena
CREATE TABLE IF NOT EXISTS public.arena_bt_paraipaba_state (
  id TEXT PRIMARY KEY DEFAULT 'main',
  state JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_arena_bt_paraipaba_updated_at
  ON public.arena_bt_paraipaba_state (updated_at DESC);

-- 3. Habilitar Row Level Security (RLS) conforme boas práticas do Supabase
ALTER TABLE public.arena_bt_paraipaba_state ENABLE ROW LEVEL SECURITY;

-- 4. Garantir permissões na Data API para roles anon e authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.arena_bt_paraipaba_state TO anon, authenticated;

-- 5. Políticas RLS para leitura e atualização da agenda em tempo real
DROP POLICY IF EXISTS "arena_bt_select_policy" ON public.arena_bt_paraipaba_state;
CREATE POLICY "arena_bt_select_policy"
  ON public.arena_bt_paraipaba_state
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "arena_bt_insert_policy" ON public.arena_bt_paraipaba_state;
CREATE POLICY "arena_bt_insert_policy"
  ON public.arena_bt_paraipaba_state
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (id = 'main');

DROP POLICY IF EXISTS "arena_bt_update_policy" ON public.arena_bt_paraipaba_state;
CREATE POLICY "arena_bt_update_policy"
  ON public.arena_bt_paraipaba_state
  FOR UPDATE
  TO anon, authenticated
  USING (id = 'main')
  WITH CHECK (id = 'main');

-- 6. Habilitar Realtime (WebSocket) para atualização instantânea entre celulares e PC
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'arena_bt_paraipaba_state'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_bt_paraipaba_state;
  END IF;
END $$;

-- 7. Inserir configuração inicial padrão (16:00 às 23:00 | R$ 40,00/hora | Horários Fixos)
INSERT INTO public.arena_bt_paraipaba_state (id, state, updated_at)
VALUES (
  'main',
  '{
    "config": {
      "openTime": "16:00",
      "closeTime": "23:00",
      "pricePerHourAvulso": 40,
      "pricePerHourFixed": 40,
      "pixKey": "arenabeachtennisparaipaba@pix.com.br",
      "adminPassword": "admin123"
    },
    "fixedSchedules": [
      {
        "id": "fix-seg-boaterra",
        "dayOfWeek": 1,
        "startTime": "19:00",
        "endTime": "21:00",
        "clientName": "BOA TERRA - FELIPE",
        "pricePerDay": 80
      },
      {
        "id": "fix-ter-mabelly",
        "dayOfWeek": 2,
        "startTime": "18:00",
        "endTime": "19:00",
        "clientName": "MABELLY",
        "pricePerDay": 40
      },
      {
        "id": "fix-ter-tonilenne",
        "dayOfWeek": 2,
        "startTime": "19:00",
        "endTime": "20:00",
        "clientName": "TONILENNE",
        "pricePerDay": 40
      },
      {
        "id": "fix-qua-rafaele-eugenia",
        "dayOfWeek": 3,
        "startTime": "19:00",
        "endTime": "20:00",
        "clientName": "Rafaele ou Eugenia",
        "pricePerDay": 40
      },
      {
        "id": "fix-qui-rafaele-eugenia",
        "dayOfWeek": 4,
        "startTime": "19:00",
        "endTime": "20:00",
        "clientName": "Rafaele ou Eugenia",
        "pricePerDay": 40
      },
      {
        "id": "fix-sex-isac",
        "dayOfWeek": 5,
        "startTime": "20:00",
        "endTime": "21:30",
        "clientName": "Isac",
        "pricePerDay": 60
      },
      {
        "id": "fix-sab-evanio",
        "dayOfWeek": 6,
        "startTime": "18:00",
        "endTime": "19:00",
        "clientName": "Evanio",
        "pricePerDay": 40
      },
      {
        "id": "fix-sab-shalom",
        "dayOfWeek": 6,
        "startTime": "20:30",
        "endTime": "22:30",
        "clientName": "Shalom - Antônio Neto ou Israel",
        "pricePerDay": 80
      }
    ],
    "bookings": [],
    "fixedPayments": {},
    "availabilityOverrides": {},
    "cashflow": []
  }'::jsonb,
  now()
)
ON CONFLICT (id) DO NOTHING;

