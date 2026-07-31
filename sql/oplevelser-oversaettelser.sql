-- ─────────────────────────────────────────────────────────────────────────
-- HVILKE FELTER MANGLER DANSK ELLER ENGELSK?
--
-- Koden er verificeret: alle 25 felter skifter sprog begge veje, når begge
-- sprog findes i databasen. Er det ene tomt, viser siden det andet — bedre
-- end et hul, men det ser ud, som om sproget ikke skifter.
--
-- Denne forespørgsel viser præcis hvor der mangler noget.
-- Kun læsning, ændrer intet.
-- ─────────────────────────────────────────────────────────────────────────

with kort as (
  select 'opl'  as slags, unnest(array[
    'vin','olie','vandre','mad','ride','caminito','malaga','cordoba','antequera',
    'stjerner','flamingo','eltorcal','camorra','ardales','dolmener','pena',
    'alhambra','sevilla','picasso']) as navn
  union all
  select 'well', unnest(array['breathwork','meditation','somatic','healing','massage','pool'])
),
felter as (select unnest(array['titel','kort','lang']) as felt),
alle as (select k.slags, k.navn, f.felt from kort k cross join felter f)
select
  a.slags || '.' || a.navn                as "Felt",
  case a.felt when 'titel' then 'Overskrift'
              when 'kort'  then 'Kort tekst'
              else 'Modaltekst' end       as "Del",
  case when coalesce(da.value,'') = '' then '⚠ MANGLER' else 'ok' end as "Dansk",
  case when coalesce(en.value,'') = '' then '⚠ MANGLER' else 'ok' end as "Engelsk"
from alle a
left join public.site_content da
  on da.key = a.slags || '_' || a.navn || '_' || a.felt || '_da'
left join public.site_content en
  on en.key = a.slags || '_' || a.navn || '_' || a.felt || '_en'
where coalesce(da.value,'') = '' or coalesce(en.value,'') = ''
order by a.slags, a.navn, a.felt;


-- Kun en optælling — hvor mange felter er hele?
-- select
--   count(*) filter (where da_ok and en_ok)  as "Begge sprog",
--   count(*) filter (where da_ok and not en_ok) as "Kun dansk",
--   count(*) filter (where en_ok and not da_ok) as "Kun engelsk",
--   count(*) filter (where not da_ok and not en_ok) as "Ingen af delene"
-- from (
--   select
--     coalesce((select value from public.site_content where key = k || '_da'), '') <> '' as da_ok,
--     coalesce((select value from public.site_content where key = k || '_en'), '') <> '' as en_ok
--   from (
--     select s || '_' || n || '_' || f as k
--     from (select unnest(array['opl','well']) s) a,
--          (select unnest(array['vin','olie','vandre','mad','ride','caminito','malaga',
--            'cordoba','antequera','stjerner','flamingo','eltorcal','camorra','ardales',
--            'dolmener','pena','alhambra','sevilla','picasso','breathwork','meditation',
--            'somatic','healing','massage','pool']) n) b,
--          (select unnest(array['titel','kort','lang']) f) c
--   ) t
-- ) u;
