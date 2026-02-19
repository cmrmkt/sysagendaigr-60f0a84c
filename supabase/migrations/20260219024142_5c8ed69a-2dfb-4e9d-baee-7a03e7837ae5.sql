
-- Block anonymous (unauthenticated) SELECT access on all tables
-- These policies ensure only authenticated users can read data

-- profiles
CREATE POLICY "Block anonymous read access on profiles"
ON public.profiles FOR SELECT
USING (auth.uid() IS NOT NULL);

-- organization_credentials
CREATE POLICY "Block anonymous read access on organization_credentials"
ON public.organization_credentials FOR SELECT
USING (auth.uid() IS NOT NULL);

-- organizations
CREATE POLICY "Block anonymous read access on organizations"
ON public.organizations FOR SELECT
USING (auth.uid() IS NOT NULL);

-- invoices
CREATE POLICY "Block anonymous read access on invoices"
ON public.invoices FOR SELECT
USING (auth.uid() IS NOT NULL);

-- notification_logs
CREATE POLICY "Block anonymous read access on notification_logs"
ON public.notification_logs FOR SELECT
USING (auth.uid() IS NOT NULL);

-- events
CREATE POLICY "Block anonymous read access on events"
ON public.events FOR SELECT
USING (auth.uid() IS NOT NULL);

-- event_tasks
CREATE POLICY "Block anonymous read access on event_tasks"
ON public.event_tasks FOR SELECT
USING (auth.uid() IS NOT NULL);

-- announcements
CREATE POLICY "Block anonymous read access on announcements"
ON public.announcements FOR SELECT
USING (auth.uid() IS NOT NULL);

-- scheduled_reminders
CREATE POLICY "Block anonymous read access on scheduled_reminders"
ON public.scheduled_reminders FOR SELECT
USING (auth.uid() IS NOT NULL);

-- ministries
CREATE POLICY "Block anonymous read access on ministries"
ON public.ministries FOR SELECT
USING (auth.uid() IS NOT NULL);

-- event_templates
CREATE POLICY "Block anonymous read access on event_templates"
ON public.event_templates FOR SELECT
USING (auth.uid() IS NOT NULL);

-- user_roles
CREATE POLICY "Block anonymous read access on user_roles"
ON public.user_roles FOR SELECT
USING (auth.uid() IS NOT NULL);

-- user_ministries
CREATE POLICY "Block anonymous read access on user_ministries"
ON public.user_ministries FOR SELECT
USING (auth.uid() IS NOT NULL);

-- event_collaborators
CREATE POLICY "Block anonymous read access on event_collaborators"
ON public.event_collaborators FOR SELECT
USING (auth.uid() IS NOT NULL);

-- event_volunteers
CREATE POLICY "Block anonymous read access on event_volunteers"
ON public.event_volunteers FOR SELECT
USING (auth.uid() IS NOT NULL);

-- event_collaborator_ministries
CREATE POLICY "Block anonymous read access on event_collaborator_ministries"
ON public.event_collaborator_ministries FOR SELECT
USING (auth.uid() IS NOT NULL);

-- push_subscriptions
CREATE POLICY "Block anonymous read access on push_subscriptions"
ON public.push_subscriptions FOR SELECT
USING (auth.uid() IS NOT NULL);

-- usage_logs
CREATE POLICY "Block anonymous read access on usage_logs"
ON public.usage_logs FOR SELECT
USING (auth.uid() IS NOT NULL);
