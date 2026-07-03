import { NextResponse } from 'next/server';
import { createClaudeJson } from '@/lib/anthropic';
import { createClient } from '@/lib/supabase/server';
import { flattenProfileForAi } from '@/lib/profile-data';
import { FREE_RESUME_LIMIT, fetchProStatus, getCurrentUsageMonth } from '@/lib/usage';

export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Expected application/json request body.' },
        { status: 415 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const month = getCurrentUsageMonth();

    const [{ data: usageRow }, isPro] = await Promise.all([
      supabase
        .from('user_usage')
        .select('tailor_count')
        .eq('user_id', user.id)
        .eq('month', month)
        .maybeSingle(),
      fetchProStatus(supabase, user.id),
    ]);

    const count = usageRow?.tailor_count || 0;

    if (!isPro && count >= FREE_RESUME_LIMIT) {
      return NextResponse.json(
        { error: 'FREE_LIMIT_REACHED', count },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { profile, company, jobTitle, interviewDetails } = body || {};

    if (!company || !jobTitle) {
      return NextResponse.json(
        { error: 'Company and job title are required.' },
        { status: 400 }
      );
    }

    const normalizedProfile = flattenProfileForAi(profile && typeof profile === 'object' ? profile : {});

    const candidateName =
      normalizedProfile.full_name ||
      `${normalizedProfile.first_name || ''} ${normalizedProfile.last_name || ''}`.trim() ||
      'Candidate';

    const details = String(interviewDetails || '').trim();

    let parsed;
    try {
      parsed = await createClaudeJson({
        system: `You are an expert career coach writing a highly professional, warm, and specific post-interview thank-you email on behalf of a job candidate.

Return ONLY valid JSON in this exact shape:
{
  "subject": "",
  "body": ""
}

Rules:
- Subject line should be concise and professional, referencing the specific role.
- Body should open with a greeting such as "Hi [Interviewer Name]," if a name was provided in the interview details, otherwise "Hi [Hiring Manager's Name],".
- Thank them for their time and the opportunity to interview for the specific role at the specific company.
- If interview details are provided, weave in specific references (topics discussed, people met, things learned) to make the email feel personal and genuine. Do NOT invent details that were not provided.
- If no interview details are provided, keep the email professional but slightly more general, and gently reinforce enthusiasm for the role.
- Reaffirm genuine interest in the role and company, and briefly reinforce 1-2 relevant strengths from the candidate's real background that fit the role.
- Keep it concise: 3-4 short paragraphs, no more than 200 words in the body.
- Sign off with "Best regards," on its own line, followed by the candidate's name on the next line.
- Do not include a "To:" line, date, or address block — this is only the email body text.
- Do not use placeholders like [Company Name] — always use the real company and role name provided.
- Never fabricate employers, dates, or achievements beyond what is in the candidate's background.`,
        user: `Candidate name: ${candidateName}
Job title: ${jobTitle}
Company: ${company}

Candidate experience summary:
${normalizedProfile.experience || 'Not provided'}

Candidate skills:
${normalizedProfile.skills || 'Not provided'}

Interview details provided by candidate (may be empty):
${details || 'None provided — write a professional, slightly general thank-you note without inventing specifics.'}`,
        maxTokens: 2048,
      });
    } catch {
      return NextResponse.json({ error: 'AI returned invalid JSON.' }, { status: 500 });
    }

    const { error: usageError } = await supabase.from('user_usage').upsert(
      {
        user_id: user.id,
        month,
        tailor_count: count + 1,
      },
      { onConflict: 'user_id,month' }
    );

    if (usageError) {
      console.error('USAGE UPSERT ERROR:', usageError);
    }

    return NextResponse.json({
      subject: parsed.subject || `Thank You – ${jobTitle} Interview`,
      body: parsed.body || '',
      usage: {
        count: count + 1,
        limit: isPro ? 'unlimited' : FREE_RESUME_LIMIT,
      },
    });
  } catch (err) {
    console.error('THANK YOU EMAIL ERROR:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate thank-you email' },
      { status: 500 }
    );
  }
}
