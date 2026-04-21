-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Departments table (no foreign key deps)
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles table (references auth.users and departments)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  student_id TEXT UNIQUE,
  department_id UUID REFERENCES public.departments,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin', 'super_admin')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Form templates table
CREATE TABLE IF NOT EXISTS public.form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES public.departments NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  semester TEXT NOT NULL,
  schema_json JSONB NOT NULL DEFAULT '[]',
  is_published BOOLEAN DEFAULT false,
  deadline TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Applications table
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.profiles NOT NULL,
  template_id UUID REFERENCES public.form_templates NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'under_review', 'approved', 'changes_requested')),
  response_data JSONB DEFAULT '{}',
  admin_feedback TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- DEPARTMENTS POLICIES
DROP POLICY IF EXISTS "Everyone can view active departments" ON public.departments;
CREATE POLICY "Everyone can view active departments"
  ON public.departments FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
CREATE POLICY "Admins can manage departments"
  ON public.departments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- FORM TEMPLATES POLICIES
DROP POLICY IF EXISTS "Students can view published templates for their dept" ON public.form_templates;
CREATE POLICY "Students can view published templates for their dept"
  ON public.form_templates FOR SELECT
  USING (
    is_published = true AND (
      department_id IN (
        SELECT department_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Admins can manage form templates" ON public.form_templates;
CREATE POLICY "Admins can manage form templates"
  ON public.form_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- APPLICATIONS POLICIES
DROP POLICY IF EXISTS "Students manage own applications" ON public.applications;
CREATE POLICY "Students manage own applications"
  ON public.applications FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (
    auth.uid() = student_id AND
    status IN ('draft', 'pending', 'changes_requested')
  );

DROP POLICY IF EXISTS "Admins can update application status" ON public.applications;
CREATE POLICY "Admins can update application status"
  ON public.applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can view all applications" ON public.applications;
CREATE POLICY "Admins can view all applications"
  ON public.applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- STORAGE POLICIES
INSERT INTO storage.buckets (id, name, public) VALUES ('registration-docs', 'registration-docs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Students can upload to own folder" ON storage.objects;
CREATE POLICY "Students can upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'registration-docs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Students can view own files" ON storage.objects;
CREATE POLICY "Students can view own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'registration-docs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Admins can view all files" ON storage.objects;
CREATE POLICY "Admins can view all files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'registration-docs' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Students can delete own files" ON storage.objects;
CREATE POLICY "Students can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'registration-docs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- TRIGGERS for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_templates_updated_at
  BEFORE UPDATE ON public.form_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- AUTO-CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed sample departments
INSERT INTO public.departments (name, code, is_active) VALUES
  ('Computer Science', 'CS', true),
  ('Electrical Engineering', 'EE', true),
  ('Business Administration', 'BA', true),
  ('Medicine', 'MED', true),
  ('Law', 'LAW', true)
ON CONFLICT (name) DO NOTHING;
