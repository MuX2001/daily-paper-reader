-- Reader v2 user-owned state. Run against the user's Supabase project.
-- GitHub usernames are display data, never authorization identifiers.
begin;
create table if not exists public.paper_states (
    user_id uuid not null references auth.users(id) on delete cascade,
    paper_key text not null check (length(paper_key) between 3 and 512),
    read_at timestamptz,
    starred boolean not null default false,
    dismissed_at timestamptz,
    feedback smallint not null default 0 check (feedback in (-1, 0, 1)),
    revision bigint not null default 1,
    updated_at timestamptz not null default now(),
    primary key (user_id, paper_key)
);
alter table public.paper_states add column if not exists legacy_status text
    check (legacy_status in ('read','good','blue','orange','bad'));
alter table public.paper_states add column if not exists legacy_imported_at timestamptz;
alter table public.paper_states add column if not exists note_text text not null default ''
    check (length(note_text) <= 50000);
alter table public.paper_states enable row level security;
revoke all on public.paper_states from anon;
grant select, insert, update, delete on public.paper_states to authenticated;
drop policy if exists paper_states_owner on public.paper_states;
create policy paper_states_owner on public.paper_states
    for all to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

-- Invoker trigger: no elevated privileges and no client-controlled revision.
create or replace function public.paper_states_revision()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
    if TG_OP = 'INSERT' then
        NEW.revision := 1;
    else
        if NEW.user_id <> OLD.user_id or NEW.paper_key <> OLD.paper_key then
            raise exception 'State identity is immutable';
        end if;
        NEW.revision := OLD.revision + 1;
    end if;
    NEW.updated_at := now();
    return NEW;
end;
$$;
revoke all on function public.paper_states_revision() from public;
drop trigger if exists paper_states_revision_trigger on public.paper_states;
create trigger paper_states_revision_trigger before insert or update on public.paper_states
    for each row execute function public.paper_states_revision();
create index if not exists paper_states_feedback_recent on public.paper_states(user_id, updated_at desc)
    where feedback <> 0;
commit;
