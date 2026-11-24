-- Mapa de tecnicas Promo Design -> Fast Gravacoes apontava para os slugs de uma
-- migration antiga do destino ('laser-co2', 'thermal-press', 'sublimation-mug'),
-- mas a producao do Fast Gravacoes usa ids curtos em public.techniques:
--   bordado, dtf, flexo, laser, serigrafia, sublimacao, tampografia, tamposec, uv
-- (confirmado em 413 jobs e 10 maquinas). Resultado medido: o erp-api recebe
-- technique_id inexistente, viola jobs_technique_id_fkey (23503) e responde 500
-- em 100% das entregas - a fila retentava para sempre.
--
-- Corrige os ids para os que existem em producao e remove os vinculos sem
-- equivalente no destino: sem linha no mapa, integration_fg_technique() devolve
-- NULL e o adapter marca o evento como 'skipped' com motivo, em vez de queimar
-- tentativas contra um id invalido.
UPDATE public.integration_technique_map m
SET fg_technique_id = v.fg_technique_id,
    updated_at      = now()
FROM (VALUES
  ('laser',                'laser'),
  ('laser co 2',           'laser'),
  ('laser co2',            'laser'),
  ('laser fiber',          'laser'),
  ('laser fibra',          'laser'),
  ('fibra laser',          'laser'),
  ('laser uv',             'uv'),
  ('tampografia',          'tampografia'),
  ('tampo',                'tampografia'),
  ('sublimacao',           'sublimacao'),
  ('sublimacao textil',    'sublimacao'),
  ('prensa termica',       'sublimacao'),
  ('sublimacao - caneca',  'sublimacao'),
  ('sublimacao caneca',    'sublimacao'),
  ('sublimao',             'sublimacao'),
  ('sublimao textil',      'sublimacao'),
  ('sublimao - caneca',    'sublimacao'),
  ('sublimao caneca',      'sublimacao'),
  ('silk screen',          'serigrafia'),
  ('serigrafia',           'serigrafia'),
  ('silk textil',          'serigrafia'),
  ('silk vinilico plano',  'serigrafia'),
  ('silk vinilico rotativo','serigrafia'),
  ('dtf',                  'dtf'),
  ('dtf textil',           'dtf'),
  ('dtf uv',               'uv'),
  ('aplicacao dtf uv',     'uv')
) AS v(promo_technique, fg_technique_id)
WHERE m.promo_technique = v.promo_technique;

DELETE FROM public.integration_technique_map
WHERE promo_technique IN (
  'corte', 'corte midia',
  'decalque', 'decalque forno',
  'embossing', 'hot stamp', 'hot stamping'
);