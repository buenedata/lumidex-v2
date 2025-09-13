import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin/auth';
import { VariantManager } from '@/components/admin/VariantManager';

export default async function AdminPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/auth/signin');
  }

  // Check admin access
  await requireAdmin();
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gradient">Admin Dashboard</h1>
        <p className="text-muted max-w-2xl mx-auto">
          Manage variant policies, custom card variants, and TCG system configuration.
        </p>
      </div>

      {/* Admin Tools */}
      <div className="space-y-8">
        {/* Custom Variant Manager */}
        <VariantManager />
      </div>
    </div>
  );
}

// Generate metadata for SEO
export function generateMetadata() {
  return {
    title: 'Admin Dashboard - Pokemon TCG | Lumidex v2',
    description: 'Admin interface for managing variant policies and TCG system configuration.',
  };
}

// This page requires authentication, so disable static generation
export const dynamic = 'force-dynamic';