-- ─────────────────────────────────────────────────────────────────────────
-- OVERSÆTTELSER — hvad mangler?
--
-- Alt indhold i site_content ligger som nøglepar: `felt_da` og `felt_en`.
-- Mangler det ene, viser siden det andet sprog i stedet. Det er bedre end et
-- hul, men det betyder også, at en manglende oversættelse er let at overse —
-- siden ser jo hel ud.
--
-- Denne fil finder dem. Kun læsning, ændrer intet. Kør den i Supabase SQL
-- Editor, når du vil vide, hvor der mangler noget.
-- ─────────────────────────────────────────────────────────────────────────

-- ── 1 · OPLEVELSES-KORTENE PÅ FORSIDEN ───────────────────────────────────
-- De 19 kort i sektionen "Oplevelser & Livsnydelse". Hvert kort har tre
-- felter: titel (overskrift), kort (linjen på kortet) og lang (modalteksten).

with alle as (
  select k.kort, f.felt
  from (select unnest(array[
      'vin','olie','vandre','mad','ride','caminito','malaga','cordoba',
      'antequera','stjerner','flamingo','eltorcal','camorra','ardales',
      'dolmener','pena','alhambra','sevilla','picasso']) as kort) k
  cross join (select unnest(array['titel','kort','lang']) as felt) f
)
select
  a.kort                                   as "Kort",
  a.felt                                   as "Felt",
  case when coalesce(da.value,'') = '' then '— mangler —' else 'ok' end as "Dansk",
  case when coalesce(en.value,'') = '' then '— mangler —' else 'ok' end as "Engelsk"
from alle a
left join public.site_content da on da.key = 'opl_' || a.kort || '_' || a.felt || '_da'
left join public.site_content en on en.key = 'opl_' || a.kort || '_' || a.felt || '_en'
where coalesce(da.value,'') = '' or coalesce(en.value,'') = ''
order by a.kort, a.felt;


-- ── 2 · HELE site_content ────────────────────────────────────────────────
-- Samme øvelse for alt andet indhold på forsiden og undersiderne.
-- Fjern kommentartegnene for at køre den.

-- select
--   grundnavn                                as "Felt",
--   case when har_da then 'ok' else '— mangler —' end as "Dansk",
--   case when har_en then 'ok' else '— mangler —' end as "Engelsk"
-- from (
--   select
--     regexp_replace(key, '_(da|en)$', '') as grundnavn,
--     bool_or(key like '%\_da' and coalesce(value,'') <> '') as har_da,
--     bool_or(key like '%\_en' and coalesce(value,'') <> '') as har_en
--   from public.site_content
--   where key ~ '_(da|en)$'
--   group by 1
-- ) t
-- where not (har_da and har_en)
-- order by grundnavn;


-- ── 3 · SEVÆRDIGHEDERNE ──────────────────────────────────────────────────
-- Her ligger indholdet i JSONB, så tjekket ser anderledes ud: for hver
-- dansk nøgle uden _en-endelse ledes efter dens engelske makker.

-- select
--   s.slug                                   as "Seværdighed",
--   n.noegle                                 as "Felt",
--   case when coalesce(s.indhold ->> (n.noegle || '_en'), '') = ''
--        then '— mangler engelsk —' else 'ok' end as "Status"
-- from public.sevaerdigheder s
-- cross join lateral (
--   select k as noegle
--   from jsonb_object_keys(s.indhold) k
--   where k !~ '_en$'
--     and k !~ '^(vis_|strip|sektion_orden|nav_links|cta_link)'
--     and k !~ '_image$'
--     and coalesce(s.indhold ->> k, '') <> ''
-- ) n
-- where coalesce(s.indhold ->> (n.noegle || '_en'), '') = ''
-- order by s.slug, n.noegle;
