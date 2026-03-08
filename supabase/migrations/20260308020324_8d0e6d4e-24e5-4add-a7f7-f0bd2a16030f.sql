
-- Table to store live driver GPS locations
CREATE TABLE public.driver_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id TEXT NOT NULL UNIQUE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  speed DOUBLE PRECISION NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'en-route',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read driver locations" ON public.driver_locations FOR SELECT USING (true);
CREATE POLICY "Anyone can insert driver locations" ON public.driver_locations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update driver locations" ON public.driver_locations FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete driver locations" ON public.driver_locations FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;

-- Table for bus missed notifications
CREATE TABLE public.bus_missed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name TEXT NOT NULL,
  roll_number TEXT NOT NULL,
  route_id TEXT NOT NULL,
  stop_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  acknowledged BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.bus_missed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read bus_missed" ON public.bus_missed FOR SELECT USING (true);
CREATE POLICY "Anyone can insert bus_missed" ON public.bus_missed FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update bus_missed" ON public.bus_missed FOR UPDATE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.bus_missed;
