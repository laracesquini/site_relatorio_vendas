-- Initial settings. Everything here can be renamed, archived or extended in
-- Configurações.

insert into public.units (code, name) values
  ('un', 'Unidade'),
  ('g', 'Grama'),
  ('kg', 'Quilograma'),
  ('m', 'Metro'),
  ('pct', 'Pacote'),
  ('rolo', 'Rolo');

insert into public.sales_channels (name, sort_order) values
  ('Mercado Livre', 1),
  ('Shopee', 2),
  ('TikTok Shop', 3),
  ('Pessoal', 4);

insert into public.categories (name, kind, is_operational) values
  ('Chaveiros', 'product', false),
  ('Plaquinhas Pet', 'product', false),
  ('Fidgets e sensoriais', 'product', false),
  ('Vasos', 'product', false),
  ('Luminárias', 'product', false),
  ('Suportes', 'product', false),
  ('Lembrancinhas', 'product', false),
  ('Kits', 'product', false),
  ('Filamentos', 'material', false),
  ('Componentes eletrônicos', 'material', false),
  ('Argolas e ferragens', 'material', false),
  ('Embalagens', 'material', false),
  ('Tintas e acabamento', 'material', false),
  ('Outros materiais', 'material', false),
  ('Anúncios', 'expense', true),
  ('Impostos e MEI', 'expense', true),
  ('Frete e envio', 'expense', true),
  ('Ferramentas e equipamentos', 'expense', true),
  ('Outras despesas', 'expense', true);

insert into public.variation_types (name, sort_order) values
  ('Cor', 1),
  ('Tamanho', 2),
  ('Modelo', 3);
