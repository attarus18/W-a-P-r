-- Aggiunge "color" (colorante) come quarto tipo di materiale prezzabile,
-- prezzato a peso come la cera (g/kg/oz/lb).

alter table public.materials drop constraint materials_material_type_check;
alter table public.materials add constraint materials_material_type_check
  check (material_type in ('wax', 'wick', 'fragrance', 'color'));
