import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST() {
  try {
    const { data: projects } = await supabaseAdmin
      .from('projects')
      .select('id, banners, archetype, updated_at, banner_history');

    let migrated = 0;
    for (const project of (projects || [])) {
      if (Array.isArray(project.banner_history) && project.banner_history.length > 0) continue;
      if (!Array.isArray(project.banners) || project.banners.length === 0) continue;

      const iteration = {
        iterationId: `iter_${new Date(project.updated_at).getTime()}`,
        createdAt: project.updated_at,
        archetypeId: project.archetype?.id || null,
        archetypeLabel: project.archetype?.label || project.archetype?.id || null,
        bannerGroups: project.banners,
      };

      const { error } = await supabaseAdmin
        .from('projects')
        .update({ banner_history: [iteration] })
        .eq('id', project.id);

      if (!error) migrated++;
    }

    return NextResponse.json({ success: true, migrated, total: projects?.length || 0 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
