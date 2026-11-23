-- Integration test after create_paper_states_schema.sql.
-- Requires auth.users with UUIDs ending 001 and 002 in a disposable test DB.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
insert into public.paper_states(user_id,paper_key,starred,revision)
values ('00000000-0000-0000-0000-000000000001','arxiv:1234.56789v1',true,999);
do $$ begin
 if (select revision from public.paper_states where paper_key='arxiv:1234.56789v1') <> 1 then raise exception 'insert revision not protected'; end if;
end $$;
update public.paper_states set read_at=now() where paper_key='arxiv:1234.56789v1' and revision=1;
do $$ begin
 if not (select starred and read_at is not null and revision=2 from public.paper_states where paper_key='arxiv:1234.56789v1') then raise exception 'independent state/revision failed'; end if;
end $$;
update public.paper_states set starred=false where paper_key='arxiv:1234.56789v1' and revision=1;
do $$ begin
 if not (select starred from public.paper_states where paper_key='arxiv:1234.56789v1') then raise exception 'stale revision overwrote current state'; end if;
end $$;
update public.paper_states set note_text='Private research note' where paper_key='arxiv:1234.56789v1' and revision=2;
update public.paper_states set note_text='Stale overwritten text' where paper_key='arxiv:1234.56789v1' and revision=2;
do $$ begin
 if not (select note_text='Private research note' and revision=3 and starred from public.paper_states where paper_key='arxiv:1234.56789v1') then raise exception 'note revision or independent state failed'; end if;
 begin
  update public.paper_states set note_text=repeat('x',50001) where paper_key='arxiv:1234.56789v1';
  raise exception 'oversized note allowed';
 exception when check_violation then null;
 end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$ begin
 if exists(select 1 from public.paper_states) then raise exception 'cross-user select leak'; end if;
 begin
  insert into public.paper_states(user_id,paper_key) values('00000000-0000-0000-0000-000000000001','forged:key');
  raise exception 'forged ownership accepted';
 exception when insufficient_privilege then null;
 end;
end $$;
update public.paper_states set starred=false where paper_key='arxiv:1234.56789v1';
set local role anon;
do $$ begin
 begin
  perform * from public.paper_states;
  raise exception 'anonymous select allowed';
 exception when insufficient_privilege then null;
 end;
end $$;
rollback;
