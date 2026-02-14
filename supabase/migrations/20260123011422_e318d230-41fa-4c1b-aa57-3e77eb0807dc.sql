-- =============================================
-- FASE 1: Tipos e Funções Auxiliares
-- =============================================

-- Enum para roles de usuário
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'leader', 'viewer');

-- =============================================
-- FASE 2: Tabela de Organizações (Igrejas)
-- =============================================

CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'BR',
  phone TEXT,
  email TEXT,
  address TEXT,
  logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'rejected')),
  subscription_status TEXT NOT NULL DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled')),
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- FASE 3: Tabela de Perfis de Usuários
-- =============================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_country TEXT NOT NULL DEFAULT 'BR',
  email TEXT,
  is_volunteer BOOLEAN DEFAULT FALSE,
  can_create_events BOOLEAN DEFAULT FALSE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- FASE 4: Tabela de Roles (Separada por Segurança)
-- =============================================

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'viewer',
  UNIQUE(user_id, role)
);

-- =============================================
-- FASE 5: Funções de Segurança (SECURITY DEFINER)
-- =============================================

-- Função para verificar role (evita recursão RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função para obter organization_id do usuário
CREATE OR REPLACE FUNCTION public.get_user_org(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = _user_id
$$;

-- Função para verificar se é admin ou superior
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
    AND role IN ('admin', 'super_admin')
  )
$$;

-- =============================================
-- FASE 6: Tabelas de Dados
-- =============================================

-- Ministérios
CREATE TABLE public.ministries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Associação Usuário-Ministério
CREATE TABLE public.user_ministries (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ministry_id UUID REFERENCES public.ministries(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, ministry_id)
);

-- Eventos
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  end_date DATE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  ministry_id UUID REFERENCES public.ministries(id) ON DELETE SET NULL,
  responsible_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  observations TEXT,
  location TEXT,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'ministry')),
  is_all_day BOOLEAN DEFAULT FALSE,
  reminder TEXT DEFAULT 'none',
  custom_color TEXT,
  recurrence JSONB,
  parent_event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Colaboradores de Eventos
CREATE TABLE public.event_collaborators (
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, user_id)
);

-- Voluntários de Eventos
CREATE TABLE public.event_volunteers (
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, user_id)
);

-- Avisos/Anúncios
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  background_color TEXT NOT NULL DEFAULT '#3B82F6',
  text_color TEXT NOT NULL DEFAULT '#FFFFFF',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  publish_date DATE NOT NULL DEFAULT CURRENT_DATE,
  unpublish_date DATE,
  external_link TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tarefas de Eventos (Kanban)
CREATE TABLE public.event_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date DATE,
  start_date DATE,
  task_order INTEGER NOT NULL DEFAULT 0,
  ministry_id UUID REFERENCES public.ministries(id) ON DELETE SET NULL,
  is_archived BOOLEAN DEFAULT FALSE,
  checklists JSONB DEFAULT '[]',
  label_ids TEXT[] DEFAULT '{}',
  assignee_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- FASE 7: Índices para Performance
-- =============================================

CREATE INDEX idx_profiles_organization ON public.profiles(organization_id);
CREATE INDEX idx_profiles_phone ON public.profiles(phone);
CREATE INDEX idx_ministries_organization ON public.ministries(organization_id);
CREATE INDEX idx_events_organization ON public.events(organization_id);
CREATE INDEX idx_events_date ON public.events(date);
CREATE INDEX idx_events_ministry ON public.events(ministry_id);
CREATE INDEX idx_announcements_organization ON public.announcements(organization_id);
CREATE INDEX idx_announcements_status ON public.announcements(status);
CREATE INDEX idx_event_tasks_event ON public.event_tasks(event_id);
CREATE INDEX idx_event_tasks_status ON public.event_tasks(status);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_organizations_status ON public.organizations(status);
CREATE INDEX idx_organizations_slug ON public.organizations(slug);

-- =============================================
-- FASE 8: Triggers para updated_at
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ministries_updated_at
  BEFORE UPDATE ON public.ministries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_event_tasks_updated_at
  BEFORE UPDATE ON public.event_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- FASE 9: Habilitar RLS em todas as tabelas
-- =============================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_tasks ENABLE ROW LEVEL SECURITY;

-- =============================================
-- FASE 10: Políticas RLS
-- =============================================

-- Organizations: Super admins veem todas, usuários veem a própria
CREATE POLICY "Super admins see all organizations"
  ON public.organizations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users see own organization"
  ON public.organizations FOR SELECT TO authenticated
  USING (id = public.get_user_org(auth.uid()));

CREATE POLICY "Super admins manage organizations"
  ON public.organizations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Profiles: Usuários veem perfis da mesma organização
CREATE POLICY "Users see own org profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins manage org profiles"
  ON public.profiles FOR ALL TO authenticated
  USING (
    organization_id = public.get_user_org(auth.uid())
    AND public.is_org_admin(auth.uid())
  );

-- User Roles: Apenas super_admin pode ver/gerenciar
CREATE POLICY "Super admins manage all roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins manage org user roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = public.user_roles.user_id
      AND p.organization_id = public.get_user_org(auth.uid())
    )
    AND public.is_org_admin(auth.uid())
    AND role != 'super_admin'
  );

CREATE POLICY "Users see own role"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Ministries: Usuários veem da organização
CREATE POLICY "Users see own org ministries"
  ON public.ministries FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));

CREATE POLICY "Admins manage ministries"
  ON public.ministries FOR ALL TO authenticated
  USING (
    organization_id = public.get_user_org(auth.uid())
    AND public.is_org_admin(auth.uid())
  );

-- User Ministries
CREATE POLICY "Users see own org user_ministries"
  ON public.user_ministries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ministries m
      WHERE m.id = ministry_id
      AND m.organization_id = public.get_user_org(auth.uid())
    )
  );

CREATE POLICY "Admins manage user_ministries"
  ON public.user_ministries FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ministries m
      WHERE m.id = ministry_id
      AND m.organization_id = public.get_user_org(auth.uid())
    )
    AND public.is_org_admin(auth.uid())
  );

-- Events: Usuários veem da organização
CREATE POLICY "Users see own org events"
  ON public.events FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));

CREATE POLICY "Users with permission can create events"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_org(auth.uid())
    AND (
      public.is_org_admin(auth.uid())
      OR public.has_role(auth.uid(), 'leader')
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND can_create_events = true
      )
    )
  );

CREATE POLICY "Event managers can update events"
  ON public.events FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_org(auth.uid())
    AND (
      public.is_org_admin(auth.uid())
      OR public.has_role(auth.uid(), 'leader')
      OR responsible_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete events"
  ON public.events FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_org(auth.uid())
    AND public.is_org_admin(auth.uid())
  );

-- Event Collaborators
CREATE POLICY "Users see own org event_collaborators"
  ON public.event_collaborators FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
      AND e.organization_id = public.get_user_org(auth.uid())
    )
  );

CREATE POLICY "Event managers can manage collaborators"
  ON public.event_collaborators FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
      AND e.organization_id = public.get_user_org(auth.uid())
      AND (
        public.is_org_admin(auth.uid())
        OR e.responsible_id = auth.uid()
      )
    )
  );

-- Event Volunteers
CREATE POLICY "Users see own org event_volunteers"
  ON public.event_volunteers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
      AND e.organization_id = public.get_user_org(auth.uid())
    )
  );

CREATE POLICY "Event managers can manage volunteers"
  ON public.event_volunteers FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
      AND e.organization_id = public.get_user_org(auth.uid())
      AND (
        public.is_org_admin(auth.uid())
        OR e.responsible_id = auth.uid()
      )
    )
  );

-- Announcements
CREATE POLICY "Users see own org announcements"
  ON public.announcements FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));

CREATE POLICY "Admins manage announcements"
  ON public.announcements FOR ALL TO authenticated
  USING (
    organization_id = public.get_user_org(auth.uid())
    AND public.is_org_admin(auth.uid())
  );

-- Event Tasks
CREATE POLICY "Users see own org event_tasks"
  ON public.event_tasks FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));

CREATE POLICY "Users can manage event tasks"
  ON public.event_tasks FOR ALL TO authenticated
  USING (
    organization_id = public.get_user_org(auth.uid())
    AND (
      public.is_org_admin(auth.uid())
      OR public.has_role(auth.uid(), 'leader')
      OR EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = event_id AND e.responsible_id = auth.uid()
      )
    )
  );