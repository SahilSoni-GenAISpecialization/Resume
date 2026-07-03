import { NextResponse } from 'next/server';
import { createClaudeJson, createClaudeText, getUserFacingAiError, isAiConfigured } from '@/lib/anthropic';
import { createClient } from '@/lib/supabase/server';
import { flattenProfileForAi } from '@/lib/profile-data';
import { sanitizeJobDescription } from '@/lib/api-response';
import { FREE_RESUME_LIMIT, fetchProStatus, getCurrentUsageMonth } from '@/lib/usage';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    if (!isAiConfigured()) {
      console.error('TAILOR ERROR: ANTHROPIC_API_KEY is not set on the server');
      return NextResponse.json({ error: getUserFacingAiError() }, { status: 503 });
    }

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
        {
          error: 'FREE_LIMIT_REACHED',
          message:
            'You have used all 5 free resume/cover letter generations this month. Upgrade to Pro for CAD $9.99/month to continue.',
          count,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { profile, jobDescription, jobTitle, company, applyUrl, mode } = body || {};

    const normalizedMode = mode === 'cover_letter' || mode === 'cover' ? 'cover_letter' : 'resume';

    if (!profile || typeof profile !== 'object') {
      return NextResponse.json({ error: 'Profile is required.' }, { status: 400 });
    }

    if (!jobDescription || typeof jobDescription !== 'string' || !jobDescription.trim()) {
      return NextResponse.json(
        { error: 'Job description is required.' },
        { status: 400 }
      );
    }

    const cleanedJobDescription = sanitizeJobDescription(jobDescription);

    const normalizedProfile = flattenProfileForAi({
      first_name: profile.first_name || profile.firstName || profile.full_name?.split(' ')?.[0] || '',
      last_name:
        profile.last_name ||
        profile.lastName ||
        profile.full_name?.split(' ')?.slice(1).join(' ') ||
        '',
      full_name:
        profile.full_name ||
        `${profile.first_name || profile.firstName || ''} ${profile.last_name || profile.lastName || ''}`.trim(),
      email: profile.email || '',
      phone: profile.phone || '',
      address: profile.address || profile.location || '',
      linkedin: profile.linkedin || '',
      portfolio: profile.portfolio || profile.website || '',
      summary: profile.summary || '',
      experience: profile.experience || '',
      education: profile.education || '',
      certifications: profile.certifications || '',
      skills: profile.skills || '',
      projects: profile.projects || '',
      additional_info: profile.additional_info || profile.additionalInfo || '',
    });

    const profileForAi = {
      name: normalizedProfile.full_name || `${normalizedProfile.first_name || ''} ${normalizedProfile.last_name || ''}`.trim(),
      email: normalizedProfile.email || '',
      phone: normalizedProfile.phone || '',
      summary: normalizedProfile.summary || '',
      experience: String(normalizedProfile.experience || '').slice(0, 6000),
      education: String(normalizedProfile.education || '').slice(0, 2000),
      skills: String(normalizedProfile.skills || '').slice(0, 1500),
      projects: String(normalizedProfile.projects || '').slice(0, 2000),
      certifications: String(normalizedProfile.certifications || '').slice(0, 1500),
    };

    const candidateName =
      normalizedProfile.full_name ||
      `${normalizedProfile.first_name} ${normalizedProfile.last_name}`.trim() ||
      'Candidate';

    let resumeText = '';
    let coverLetter = '';
    let matchScore = null;
    let matchReasons = '';
    let matchImprovementTips = '';
    let tailoredStructured = null;

    if (normalizedMode === 'resume') {
      let tailoredStructured;
      try {
        tailoredStructured = await createClaudeJson({
          system: `You are an expert ATS resume writer. Return ONLY valid JSON in this shape:
{"name":"","contact":{"email":"","phone":"","address":"","linkedin":"","portfolio":""},"summary":"","skills":[],"experience":[{"title":"","company":"","years":"","bullets":[]}],"education":[{"degree":"","institution":"","year":""}],"certifications":[],"projects":[{"name":"","years":"","details":[]}],"match_score":0,"match_reasons":[],"match_improvement_tips":[]}

Rules:
- Use ONLY the candidate's real background. Never invent employers, degrees, or dates.
- Align summary, skills, and bullets to the job with natural ATS keywords.
- Recent role: 5-7 bullets; prior roles: 4-5 bullets each. Action-oriented bullets only.
- Include contact from profile. Realistic match_score. match_reasons and match_improvement_tips must be specific.`,
          user: `PROFILE:
${JSON.stringify(profileForAi)}

JOB: ${jobTitle || 'Not specified'} at ${company || 'Not specified'}

DESCRIPTION:
${cleanedJobDescription.slice(0, 8000)}`,
          maxTokens: 4096,
        });
      } catch (err) {
        console.error('Tailor resume AI error:', err);
        return NextResponse.json({ error: getUserFacingAiError() }, { status: 500 });
      }

      tailoredStructured.name = tailoredStructured.name || candidateName;
      tailoredStructured.contact = {
        email: tailoredStructured?.contact?.email || normalizedProfile.email || '',
        phone: tailoredStructured?.contact?.phone || normalizedProfile.phone || '',
        address: tailoredStructured?.contact?.address || normalizedProfile.address || '',
        linkedin: tailoredStructured?.contact?.linkedin || normalizedProfile.linkedin || '',
        portfolio: tailoredStructured?.contact?.portfolio || normalizedProfile.portfolio || '',
      };

      resumeText = formatResumeAsText(tailoredStructured);

      matchScore = Number.isInteger(tailoredStructured?.match_score)
        ? tailoredStructured.match_score
        : null;

      matchReasons = Array.isArray(tailoredStructured?.match_reasons)
        ? tailoredStructured.match_reasons.join('\n')
        : '';

      matchImprovementTips = Array.isArray(tailoredStructured?.match_improvement_tips)
        ? tailoredStructured.match_improvement_tips.join('\n')
        : '';
    }

    if (normalizedMode === 'cover_letter') {
      try {
        coverLetter = await createClaudeText({
        system: `You are a professional cover letter writer.

Write a tailored cover letter.

Rules:
- Start with "Dear Hiring Manager,"
- No address block
- No placeholders
- 4-5 short paragraphs
- Use the candidate's real experience
- Do not invent employers, titles, dates, certifications, or achievements
- End with:
Sincerely,
${candidateName}
- Maximum 400-500 words`,
        user: `Candidate name: ${candidateName}
Target role: ${jobTitle || 'this role'}
Company: ${company || 'this company'}

Candidate summary:
${normalizedProfile.summary}

Candidate experience:
${normalizedProfile.experience}

Candidate skills:
${normalizedProfile.skills}

Candidate projects:
${normalizedProfile.projects}

Candidate education:
${normalizedProfile.education}

Job description:
${cleanedJobDescription.slice(0, 8000)}`,
        maxTokens: 2048,
        });
      } catch (err) {
        console.error('Tailor cover letter AI error:', err);
        return NextResponse.json({ error: getUserFacingAiError() }, { status: 500 });
      }
    }

    const insertPayload = {
      user_id: user.id,
      tailored_resume: normalizedMode === 'resume' ? resumeText : null,
      cover_letter: normalizedMode === 'cover_letter' ? coverLetter : null,
      match_score: normalizedMode === 'resume' ? matchScore : null,
      status: normalizedMode === 'resume' ? 'resume_generated' : 'cover_letter_generated',
      job_title: jobTitle || 'Unknown',
      company: company || 'Unknown',
      job_description: cleanedJobDescription,
      apply_url: applyUrl || null,
    };

    const safeCompany = insertPayload.company;
    const safeTitle = insertPayload.job_title;

    const { data: existingRows } = await supabase
      .from('applications')
      .select('id, tailored_resume, cover_letter, match_score')
      .eq('user_id', user.id)
      .eq('company', safeCompany)
      .eq('job_title', safeTitle)
      .order('created_at', { ascending: false })
      .limit(1);

    const existing = existingRows?.[0];
    let applicationId = existing?.id || null;

    if (existing) {
      const updatePayload = {
        job_description: cleanedJobDescription,
        apply_url: applyUrl || undefined,
        status: insertPayload.status,
      };

      if (normalizedMode === 'resume') {
        updatePayload.tailored_resume = resumeText;
        updatePayload.match_score = matchScore;
      } else {
        updatePayload.cover_letter = coverLetter;
      }

      const { error: applicationError } = await supabase
        .from('applications')
        .update(updatePayload)
        .eq('id', existing.id);

      if (applicationError) {
        return NextResponse.json(
          { error: applicationError.message || 'Failed to save application.' },
          { status: 500 }
        );
      }
    } else {
      const { data: inserted, error: applicationError } = await supabase
        .from('applications')
        .insert(insertPayload)
        .select('id')
        .single();

      if (applicationError) {
        return NextResponse.json(
          { error: applicationError.message || 'Failed to save application.' },
          { status: 500 }
        );
      }

      applicationId = inserted?.id || null;
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
  resume: normalizedMode === 'resume' ? resumeText : '',
  coverLetter: normalizedMode === 'cover_letter' ? coverLetter : '',
  matchScore: normalizedMode === 'resume' ? matchScore : null,
  matchReasons: normalizedMode === 'resume' ? matchReasons : '',
  matchImprovementTips: normalizedMode === 'resume' ? matchImprovementTips : '',
  jobTitle: jobTitle || null,
  company: company || null,
  applyUrl: applyUrl || null,
  mode: normalizedMode,
  applicationId,
  usage: {
    count: count + 1,
    limit: isPro ? 'unlimited' : FREE_RESUME_LIMIT,
  },
});
  } catch (err) {
    console.error('TAILOR ERROR:', err);
    return NextResponse.json({ error: getUserFacingAiError() }, { status: 500 });
  }
}

function formatResumeAsText(r) {
  const lines = [];

  if (r?.name) {
    lines.push(r.name.trim());
  }

  const contactParts = [
    r?.contact?.email,
    r?.contact?.phone,
    r?.contact?.address,
    r?.contact?.linkedin,
    r?.contact?.portfolio,
  ].filter(Boolean);

  if (contactParts.length) {
    lines.push(contactParts.join(' | '));
  }

  lines.push('');

  if (r?.summary) {
    lines.push('SUMMARY');
    lines.push(r.summary.trim());
    lines.push('');
  }

  if (Array.isArray(r?.skills) && r.skills.length) {
    lines.push('SKILLS');

    r.skills.forEach((skill) => {
  lines.push(`- ${skill.trim()}`);
});

    lines.push('');
  }

  if (Array.isArray(r?.experience) && r.experience.length) {
  lines.push('EXPERIENCE');

  r.experience.forEach((exp) => {
    const title = exp.title?.trim() || '';
    const company = exp.company?.trim() || '';
    const years = exp.years?.trim() || '';

    const heading =
      `${title}${company ? ' || ' + company : ''}${years ? ' || ' + years : ''}`.trim();

    if (heading) lines.push(heading);

    if (Array.isArray(exp.bullets)) {
      exp.bullets.forEach((b) => lines.push(`- ${b.trim()}`));
    }

    lines.push('');
  });
}

  if (Array.isArray(r?.projects) && r.projects.length) {
  lines.push('PROJECTS');

  r.projects.forEach((project) => {
    if (project?.name) {
      const tech = project?.tech?.trim() || '';
      const years = project?.years?.trim() || '';
      const heading =
        `${project.name.trim()}${tech ? ' || ' + tech : ''}${years ? ' || ' + years : ''}`.trim();
      lines.push(heading);
    }

    if (Array.isArray(project?.details)) {
      project.details
        .filter(Boolean)
        .forEach((d) => lines.push(`- ${d.trim()}`));
    }

    lines.push('');
  });
}

  if (Array.isArray(r?.education) && r.education.length) {
    lines.push('EDUCATION');

    r.education.forEach((ed) => {
      const row =
        `${ed.degree || ''}${ed.institution ? ' - ' + ed.institution : ''}${ed.year ? ' | ' + ed.year : ''}`.trim();
      if (row) lines.push(row);
    });

    lines.push('');
  }

  if (Array.isArray(r?.certifications) && r.certifications.filter(Boolean).length) {
    lines.push('CERTIFICATIONS');
    r.certifications
      .filter(Boolean)
      .forEach((c) => lines.push(`- ${c.trim()}`));
    lines.push('');
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}