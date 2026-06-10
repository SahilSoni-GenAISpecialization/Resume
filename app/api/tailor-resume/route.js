import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    const month = new Date().toISOString().slice(0, 7);

    const { data: usageRow } = await supabase
      .from('user_usage')
      .select('tailor_count,is_pro')
      .eq('user_id', user.id)
      .eq('month', month)
      .maybeSingle();

    const count = usageRow?.tailor_count || 0;
    const isPro = usageRow?.is_pro || false;

    if (!isPro && count >= 5) {
      return NextResponse.json(
        { error: 'FREE_LIMIT_REACHED', count },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { profile, jobDescription, jobTitle, company } = body || {};

    if (!profile || typeof profile !== 'object') {
      return NextResponse.json({ error: 'Profile is required.' }, { status: 400 });
    }

    if (!jobDescription || typeof jobDescription !== 'string' || !jobDescription.trim()) {
      return NextResponse.json(
        { error: 'Job description is required.' },
        { status: 400 }
      );
    }

    const normalizedProfile = {
      first_name: profile.first_name || profile.firstName || '',
      last_name: profile.last_name || profile.lastName || '',
      email: profile.email || '',
      phone: profile.phone || '',
      address: profile.address || '',
      linkedin: profile.linkedin || '',
      portfolio: profile.portfolio || '',
      target_role: profile.target_role || profile.targetRole || '',
      preferred_location: profile.preferred_location || profile.preferredLocation || '',
      summary: profile.summary || '',
      experience: profile.experience || '',
      education: profile.education || '',
      certifications: profile.certifications || '',
      skills: profile.skills || '',
      projects: profile.projects || '',
      additional_info: profile.additional_info || profile.additionalInfo || '',
    };

    const candidateName =
      `${normalizedProfile.first_name} ${normalizedProfile.last_name}`.trim() || 'Candidate';

    const resumeCompletion = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      response_format: { type: 'json_object' },
      temperature: 1,
      messages: [
        {
          role: 'system',
          content: `You are an expert ATS resume writer.
Return ONLY valid JSON.

{
  "name": "",
  "summary": "",
  "skills": [],
  "experience": [{ "title": "", "company": "", "years": "", "bullets": [] }],
  "education": [{ "degree": "", "institution": "", "year": "" }],
  "certifications": [],
  "match_score": 0,
  "match_reasons": []
}

Rules:
- Use the candidate's real background from the base profile.
- Tailor the summary, skills ordering, and bullets to the target job.
- Match keywords from the job description naturally.
- Keep bullets specific and ATS-friendly.
- match_score must be an integer from 0 to 100.
- match_reasons must be an array of short strings.`,
        },
        {
          role: 'user',
          content: `BASE PROFILE JSON:
${JSON.stringify(normalizedProfile)}

JOB TITLE:
${jobTitle || 'Not specified'}

COMPANY:
${company || 'Not specified'}

JOB DESCRIPTION:
${jobDescription.slice(0, 12000)}`,
        },
      ],
    });

    const rawResume = resumeCompletion.choices?.[0]?.message?.content || '{}';
    let tailored;

    try {
      tailored = JSON.parse(rawResume);
    } catch {
      return NextResponse.json(
        { error: 'Model returned invalid resume JSON.' },
        { status: 500 }
      );
    }

    const coverCompletion = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      temperature: 1,
      messages: [
        {
          role: 'system',
          content: `You are a professional cover letter writer.
Write a tailored cover letter.

Rules:
- Start with "Dear Hiring Manager,"
- No address block
- No placeholders
- 4 short paragraphs
- Use the candidate's real experience
- End with:
Sincerely,
${candidateName}
- Maximum 400 words`,
        },
        {
          role: 'user',
          content: `Candidate name: ${candidateName}
Target role: ${jobTitle || 'this role'}
Company: ${company || 'this company'}

Candidate summary:
${normalizedProfile.summary}

Candidate experience:
${normalizedProfile.experience}

Candidate skills:
${normalizedProfile.skills}

Job description:
${jobDescription.slice(0, 8000)}`,
        },
      ],
    });

    const coverLetter = coverCompletion.choices?.[0]?.message?.content?.trim() || '';

    const { error: applicationError } = await supabase.from('applications').insert({
      user_id: user.id,
      tailored_resume: tailored,
      cover_letter: coverLetter,
      match_score: Number.isInteger(tailored.match_score) ? tailored.match_score : 85,
      status: 'pending',
      job_title: jobTitle || null,
      company: company || null,
      job_description: jobDescription,
    });

    if (applicationError) {
      return NextResponse.json(
        { error: applicationError.message || 'Failed to save application.' },
        { status: 500 }
      );
    }

    const { error: usageError } = await supabase.from('user_usage').upsert(
      {
        user_id: user.id,
        month,
        tailor_count: count + 1,
        is_pro: isPro,
      },
      { onConflict: 'user_id,month' }
    );

    if (usageError) {
      console.error('USAGE UPSERT ERROR:', usageError);
    }

    return NextResponse.json({
      resume: formatResumeAsText(tailored),
      coverLetter,
      matchScore: tailored.match_score || 85,
      matchReasons: Array.isArray(tailored.match_reasons)
        ? tailored.match_reasons.join('\n')
        : '',
      jobTitle: jobTitle || null,
      company: company || null,
      usage: {
        count: count + 1,
        limit: isPro ? 'unlimited' : 5,
      },
    });
  } catch (err) {
    console.error('TAILOR ERROR:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to tailor resume' },
      { status: 500 }
    );
  }
}

function formatResumeAsText(r) {
  const lines = [];

  if (r?.name) {
    lines.push(r.name);
    lines.push('');
  }

  if (r?.summary) {
    lines.push('SUMMARY');
    lines.push('─'.repeat(40));
    lines.push(r.summary);
    lines.push('');
  }

  if (Array.isArray(r?.skills) && r.skills.length) {
    lines.push('SKILLS');
    lines.push('─'.repeat(40));
    lines.push(r.skills.join(' · '));
    lines.push('');
  }

  if (Array.isArray(r?.experience) && r.experience.length) {
    lines.push('EXPERIENCE');
    lines.push('─'.repeat(40));
    r.experience.forEach((exp) => {
      lines.push(
        `${exp.title || ''}${exp.company ? ' — ' + exp.company : ''}${exp.years ? ' (' + exp.years + ')' : ''}`
      );
      if (Array.isArray(exp.bullets)) {
        exp.bullets.forEach((b) => lines.push(`• ${b}`));
      }
      lines.push('');
    });
  }

  if (Array.isArray(r?.education) && r.education.length) {
    lines.push('EDUCATION');
    lines.push('─'.repeat(40));
    r.education.forEach((ed) => {
      lines.push(
        `${ed.degree || ''}${ed.institution ? ' — ' + ed.institution : ''}${ed.year ? ', ' + ed.year : ''}`
      );
    });
    lines.push('');
  }

  if (Array.isArray(r?.certifications) && r.certifications.filter(Boolean).length) {
    lines.push('CERTIFICATIONS');
    lines.push('─'.repeat(40));
    r.certifications.forEach((c) => lines.push(`• ${c}`));
    lines.push('');
  }

  return lines.join('\n').trim();
}