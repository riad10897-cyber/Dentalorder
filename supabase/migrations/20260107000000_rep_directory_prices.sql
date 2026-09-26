-- Adds prices to the public rep list.
--
-- 20260105 built rep_directory with four columns to stop the list handing
-- out every rep's whish_number and subscription state. Prices were left out
-- with it, which was over-correction: a student choosing a rep is choosing
-- between their prices, and until now they could not see what they were
-- picking until after they had picked it. Switching rep makes that concrete
-- — the confirmation has to say what the student will actually pay.
--
-- Prices are not sensitive in the way a payment handle is. A rep sets them
-- publicly and competes on them; every one of their students already sees
-- them on the profile screen. whish_number and subscription_paid_until stay
-- out, which was the point of the original change.
--
-- `create or replace view` keeps the existing ACL, but the grants are
-- re-stated anyway: this schema's default privileges hand every new object
-- full write access to anon, and being explicit here is cheaper than
-- finding out again that a view was born writable.

create or replace view public.rep_directory as
  select id, display_name, university, section, frasaco_price, copy_a_price
  from public.representatives;

comment on view public.rep_directory is
  'Public rep picker list. Name, faculty, section and prices — the things a student chooses between. No whish_number, no subscription state. Readable without a session because sign-up needs it before the account exists.';

revoke all on public.rep_directory from anon, authenticated;
grant select on public.rep_directory to anon, authenticated;
