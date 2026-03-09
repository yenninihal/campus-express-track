
CREATE TABLE public.buses (
  id SERIAL PRIMARY KEY,
  bus_no INTEGER NOT NULL,
  reg_no TEXT NOT NULL,
  route_name TEXT NOT NULL,
  driver_name TEXT NOT NULL DEFAULT '',
  staff_incharge TEXT NOT NULL DEFAULT '',
  incharge_contact TEXT NOT NULL DEFAULT ''
);

ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read buses" ON public.buses FOR SELECT USING (true);
