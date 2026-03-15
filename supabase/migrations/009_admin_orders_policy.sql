-- Allow admin users to read all orders
CREATE POLICY "Orders: admin can read all" ON public.orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Allow admin users to update all orders (for verify/reject)
CREATE POLICY "Orders: admin can update all" ON public.orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );
