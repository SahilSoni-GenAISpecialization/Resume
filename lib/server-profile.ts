import type { SupabaseClient } from '@supabase/supabase-js';
import { flattenProfileForAi } from '@/lib/profile-data';

/** Load the authenticated user's profile from Supabase for AI routes (keeps POST bodies small). */
export async function loadUserProfileForAi(
  supabase: SupabaseClient,
  userId: string,
  email?: string | null
) {
  const { data: row, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error || !row) return null;

  try {
    return flattenProfileForAi({
      ...row,
      email: email || String(row.email || ''),
    });
  } catch (err) {
    console.error('loadUserProfileForAi flatten error:', err);
    return null;
  }
}
