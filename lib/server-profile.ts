import type { SupabaseClient } from '@supabase/supabase-js';
import { buildMatchProfilePayload, flattenProfileForAi } from '@/lib/profile-data';

/** Load the authenticated user's profile row from Supabase. */
export async function loadUserProfileRow(
  supabase: SupabaseClient,
  userId: string
) {
  const { data: row, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error || !row) return null;
  return row;
}

/** Load the authenticated user's profile from Supabase for AI routes (keeps POST bodies small). */
export async function loadUserProfileForAi(
  supabase: SupabaseClient,
  userId: string,
  email?: string | null
) {
  const row = await loadUserProfileRow(supabase, userId);
  if (!row) return null;

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

/** Flattened profile plus raw row for match scoring and resume tailoring. */
export async function loadUserProfileBundle(
  supabase: SupabaseClient,
  userId: string,
  email?: string | null
) {
  const row = await loadUserProfileRow(supabase, userId);
  if (!row) return null;

  const rowWithEmail = { ...row, email: email || String(row.email || '') };

  try {
    return {
      row: rowWithEmail,
      flat: flattenProfileForAi(rowWithEmail),
      matchPayload: buildMatchProfilePayload(rowWithEmail),
    };
  } catch (err) {
    console.error('loadUserProfileBundle error:', err);
    return null;
  }
}
