-- Loop Workouts' server side, in Supabase (see docs/features/backup-and-sync.md, Sync).
-- Run it in the project's SQL editor. It's safe to run again: it replaces what it made.

-- Every record an account syncs, of every kind, in one table. A deletion is a record with
-- deleted_at set, kept for good. seq goes up on every write, so a device can fetch
-- everything written since the last seq it saw.
create sequence if not exists public.records_seq;

create table if not exists public.records (
    user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
    -- 'workout', 'history', 'exercise', 'exercise-note', 'hidden-exercise' or 'library-order'
    kind text not null,
    id text not null,
    -- When it last changed, and was deleted, in ms since the epoch, as on the device
    updated_at bigint not null,
    deleted_at bigint,
    -- The record itself; null for a deletion
    data jsonb,
    seq bigint not null default nextval('public.records_seq'),
    primary key (user_id, kind, id)
);

create index if not exists records_user_seq on public.records (user_id, seq);

-- A write moves the record to the end of the queue of changes
create or replace function public.records_next_seq() returns trigger
language plpgsql set search_path = '' as $$
begin
    new.seq := nextval('public.records_seq');
    return new;
end;
$$;

drop trigger if exists records_next_seq on public.records;
create trigger records_next_seq before update on public.records
    for each row execute function public.records_next_seq();

-- Each account sees and changes only its own records
alter table public.records enable row level security;

drop policy if exists "Own records" on public.records;
create policy "Own records" on public.records
    for all to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

-- Delete account (SYN-8): the signed-in user deletes themselves, and with them their records
-- (on delete cascade). A browser can't delete a user itself, so this runs as the owner.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
    if auth.uid() is null then
        raise exception 'Not signed in';
    end if;
    delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
