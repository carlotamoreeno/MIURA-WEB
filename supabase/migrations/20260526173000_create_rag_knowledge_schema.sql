-- TASK-017: Supabase pgvector schema for the controlled MIURA RAG corpus.
-- This migration stores only corpus documents/chunks. User evaluations remain browser-local.

create extension if not exists vector with schema extensions;

create table if not exists public.knowledge_documents (
  id text primary key,
  source_type text not null,
  title text not null,
  author text,
  version text,
  language text not null default 'es',
  canonical_url text,
  local_path text,
  license text,
  metadata jsonb not null default '{}'::jsonb,
  content_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint knowledge_documents_id_nonempty check (length(btrim(id)) > 0),
  constraint knowledge_documents_source_type_nonempty check (length(btrim(source_type)) > 0),
  constraint knowledge_documents_title_nonempty check (length(btrim(title)) > 0),
  constraint knowledge_documents_language_nonempty check (length(btrim(language)) > 0),
  constraint knowledge_documents_content_hash_nonempty check (length(btrim(content_hash)) > 0),
  constraint knowledge_documents_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.knowledge_chunks (
  id text primary key,
  document_id text not null references public.knowledge_documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding extensions.vector(1536) not null,
  token_count integer,
  page integer,
  section text,
  url text,
  metadata jsonb not null default '{}'::jsonb,
  content_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint knowledge_chunks_id_nonempty check (length(btrim(id)) > 0),
  constraint knowledge_chunks_content_nonempty check (length(btrim(content)) > 0),
  constraint knowledge_chunks_content_hash_nonempty check (length(btrim(content_hash)) > 0),
  constraint knowledge_chunks_chunk_index_nonnegative check (chunk_index >= 0),
  constraint knowledge_chunks_token_count_positive check (token_count is null or token_count > 0),
  constraint knowledge_chunks_page_positive check (page is null or page > 0),
  constraint knowledge_chunks_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint knowledge_chunks_document_chunk_unique unique (document_id, chunk_index)
);

create index if not exists knowledge_documents_source_type_idx
  on public.knowledge_documents (source_type);

create index if not exists knowledge_documents_language_idx
  on public.knowledge_documents (language);

create index if not exists knowledge_documents_metadata_gin_idx
  on public.knowledge_documents using gin (metadata);

create index if not exists knowledge_chunks_document_id_idx
  on public.knowledge_chunks (document_id);

create index if not exists knowledge_chunks_section_idx
  on public.knowledge_chunks (section);

create index if not exists knowledge_chunks_metadata_gin_idx
  on public.knowledge_chunks using gin (metadata);

create index if not exists knowledge_chunks_embedding_hnsw_idx
  on public.knowledge_chunks using hnsw (embedding extensions.vector_cosine_ops);

alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;

drop policy if exists "service_role manages knowledge documents" on public.knowledge_documents;
create policy "service_role manages knowledge documents"
  on public.knowledge_documents
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "service_role manages knowledge chunks" on public.knowledge_chunks;
create policy "service_role manages knowledge chunks"
  on public.knowledge_chunks
  for all
  to service_role
  using (true)
  with check (true);

create or replace function public.match_knowledge_chunks(
  query_embedding extensions.vector(1536),
  match_count integer default 8,
  filter jsonb default '{}'::jsonb,
  match_threshold double precision default 0
)
returns table (
  chunk_id text,
  document_id text,
  document_title text,
  source_type text,
  content text,
  page integer,
  section text,
  url text,
  language text,
  version text,
  license text,
  canonical_url text,
  local_path text,
  document_metadata jsonb,
  chunk_metadata jsonb,
  document_content_hash text,
  chunk_content_hash text,
  similarity double precision
)
language plpgsql
stable
set search_path = public, extensions
as $$
#variable_conflict use_column
declare
  effective_match_count integer := least(greatest(coalesce(match_count, 8), 1), 20);
  effective_filter jsonb := coalesce(filter, '{}'::jsonb);
  effective_match_threshold double precision := coalesce(match_threshold, 0);
begin
  if jsonb_typeof(effective_filter) <> 'object' then
    effective_filter := '{}'::jsonb;
  end if;

  return query
  select
    scored.chunk_id,
    scored.document_id,
    scored.document_title,
    scored.source_type,
    scored.content,
    scored.page,
    scored.section,
    scored.url,
    scored.language,
    scored.version,
    scored.license,
    scored.canonical_url,
    scored.local_path,
    scored.document_metadata,
    scored.chunk_metadata,
    scored.document_content_hash,
    scored.chunk_content_hash,
    scored.similarity
  from (
    select
      kc.id as chunk_id,
      kd.id as document_id,
      kd.title as document_title,
      kd.source_type,
      kc.content,
      kc.page,
      kc.section,
      coalesce(kc.url, kd.canonical_url) as url,
      kd.language,
      kd.version,
      kd.license,
      kd.canonical_url,
      kd.local_path,
      kd.metadata as document_metadata,
      kc.metadata as chunk_metadata,
      kd.content_hash as document_content_hash,
      kc.content_hash as chunk_content_hash,
      kc.chunk_index,
      jsonb_strip_nulls(
        jsonb_build_object(
          'documentId', kd.id,
          'sourceType', kd.source_type,
          'title', kd.title,
          'language', kd.language,
          'version', kd.version,
          'page', kc.page,
          'section', kc.section,
          'url', coalesce(kc.url, kd.canonical_url)
        ) || kd.metadata || kc.metadata
      ) as filter_metadata,
      (kc.embedding <=> query_embedding) as distance,
      (1 - (kc.embedding <=> query_embedding))::double precision as similarity
    from public.knowledge_chunks as kc
    join public.knowledge_documents as kd
      on kd.id = kc.document_id
  ) as scored
  where scored.similarity >= effective_match_threshold
    and (
      effective_filter = '{}'::jsonb
      or scored.filter_metadata @> effective_filter
    )
  order by scored.distance asc, scored.document_id asc, scored.chunk_index asc
  limit effective_match_count;
end;
$$;

revoke all on table public.knowledge_documents from anon, authenticated, public;
revoke all on table public.knowledge_chunks from anon, authenticated, public;
revoke all on function public.match_knowledge_chunks(extensions.vector, integer, jsonb, double precision)
  from anon, authenticated, public;

grant usage on schema public to service_role;
grant usage on schema extensions to service_role;
grant select, insert, update, delete on table public.knowledge_documents to service_role;
grant select, insert, update, delete on table public.knowledge_chunks to service_role;
grant execute on function public.match_knowledge_chunks(extensions.vector, integer, jsonb, double precision)
  to service_role;
