-- Admins can dismiss (delete) listing reports.

drop policy if exists "admins delete reports" on public.listing_reports;
create policy "admins delete reports"
  on public.listing_reports
  for delete
  to authenticated
  using (public.user_is_admin());
