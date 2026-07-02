import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { readSubscriptionFromProfile } from '@/lib/stripe-profile';

/** Authoritative Pro status for the signed-in user (service-role read, bypasses RLS gaps). */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error, status } = await readSubscriptionFromProfile(user.id);

    if (error) {
      console.error('PRO STATUS READ ERROR:', error.message || error);
      return NextResponse.json(
        { error: 'Could not read subscription status.', isPro: false },
        { status: 500 }
      );
    }

    return NextResponse.json(status ?? { isPro: false, cancelAtPeriodEnd: false, periodEnd: null });
  } catch (err) {
    console.error('PRO STATUS ERROR:', err);
    return NextResponse.json({ error: err.message || 'Could not read status.' }, { status: 500 });
  }
}
