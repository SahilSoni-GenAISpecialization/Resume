import { NextResponse } from 'next/server';
import { createClaudeJson, createClaudeText } from '@/lib/anthropic';
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
      target_role: profile.target_role || profile.targetRole || '',
      preferred_location: profile.preferred_location || profile.preferredLocation || '',
      summary: profile.summary || '',
      experience: profile.experience || '',
      education: profile.education || '',
      certifications: profile.certifications || '',
      skills: profile.skills || '',
      projects: profile.projects || '',
      additional_info: profile.additional_info || profile.additionalInfo || '',
    });

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
          system: `You are an expert ATS resume writer.

Return ONLY valid JSON in this exact shape:
{
  "name": "",
  "contact": {
    "email": "",
    "phone": "",
    "address": "",
    "linkedin": "",
    "portfolio": ""
  },
  "summary": "",
  "skills": [],
  "experience": [{ "title": "", "company": "", "years": "", "bullets": [] }],
  "education": [{ "degree": "", "institution": "", "year": "" }],
  "certifications": [],
  "projects": [{ "name": "", "years": "", "details": [] }],
  "match_score": 0,
  "match_reasons": [],
  "match_improvement_tips": []
}

Rules:
- Use ONLY the candidate's real background from the base profile.
- Do NOT invent employers, degrees, certifications, dates, or projects.
- Rewrite the summary, skills ordering, and experience bullets to align strongly to the job.
- Prioritize ATS keyword alignment naturally.
- EXPERIENCE BULLET RULES:
  - Current/most recent role: minimum 7 bullet points
  - Previous role (one before current): minimum 5-6 bullet points
  - Any older roles: minimum 4-5 bullet points
  - Every bullet must be strong, specific, and achievement/action oriented
  - Never write fewer bullets than the minimum for each role
  - Never pad with weak or generic bullets — every line must add value
  - Every experience bullet must be strong, specific, and achievement/action oriented.
- Include contact details from the candidate profile in the contact object.
- skills must be concise, relevant, and job-targeted.
- match_score must be realistic, not inflated, and based on actual alignment.
- "years" must always contain the date range string, e.g. "Oct 2025 - Present"
- Never leave "years" blank if dates are mentioned
- Never include dates inside the "title" field
- match_reasons must be short specific reasons for score strength or gaps (e.g. missing required skills, licenses, or years of experience).
- match_improvement_tips must contain 3-5 concrete, realistic, actionable steps the candidate could take to raise their match score toward 85%+ for THIS specific job — e.g. specific certifications/licenses to pursue, specific skills to build or highlight more prominently, specific keywords from the job description to naturally incorporate, or types of experience to gain or emphasize.
- Each match_improvement_tip must be specific to this job and this candidate's actual gaps — never generic advice like "improve your resume".
- Never suggest fabricating experience, skills, or credentials the candidate doesn't have — only suggest legitimate ways to close real gaps or better surface existing strengths.
- Optimize as much as possible for ATS match, but never fabricate qualifications.`,
          user: `BASE PROFILE JSON:
${JSON.stringify(normalizedProfile)}

JOB TITLE:
${jobTitle || 'Not specified'}

COMPANY:
${company || 'Not specified'}

APPLY URL:
${applyUrl || 'Not specified'}

JOB DESCRIPTION:
${jobDescription.slice(0, 12000)}`,
          maxTokens: 8192,
        });
      } catch {
        return NextResponse.json(
          { error: 'Model returned invalid resume JSON.' },
          { status: 500 }
        );
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
${jobDescription.slice(0, 8000)}`,
        maxTokens: 2048,
      });
    }

    const insertPayload = {
      user_id: user.id,
      tailored_resume: normalizedMode === 'resume' ? resumeText : null,
      cover_letter: normalizedMode === 'cover_letter' ? coverLetter : null,
      match_score: normalizedMode === 'resume' ? matchScore : null,
      status: normalizedMode === 'resume' ? 'resume_generated' : 'cover_letter_generated',
      job_title: jobTitle || null,
      company: company || null,
      job_description: jobDescription,
    };

    const { error: applicationError } = await supabase
      .from('applications')
      .insert(insertPayload);

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
  usage: {
    count: count + 1,
    limit: isPro ? 'unlimited' : FREE_RESUME_LIMIT,
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