import { NextResponse } from 'next/server';
import { createClaudeJson, createClaudeText, getUserFacingAiError, isAiConfigured } from '@/lib/anthropic';
import { createClient } from '@/lib/supabase/server';
import { isSafeHttpUrl, sanitizeJobDescription } from '@/lib/api-response';
import { filterAddressedSuggestions } from '@/lib/profile-data';
import { applyMatchScoreAdjustments, filterMatchAnalysis } from '@/lib/match-scoring';
import { loadUserProfileBundle } from '@/lib/server-profile';
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

    const body = await request.json();
    const {
      jobDescription,
      jobTitle,
      company,
      applyUrl,
      mode,
      previousMatchScore,
      profileAdditions,
      resumeEnhancements,
      resolvedSuggestions,
      wovenEnhancements,
      tailoredResume,
    } = body || {};

    const normalizedMode =
      mode === 'cover_letter' || mode === 'cover'
        ? 'cover_letter'
        : mode === 'match_only'
          ? 'match_only'
          : 'resume';

    const safeApplyUrl = isSafeHttpUrl(applyUrl) ? String(applyUrl).trim() : null;

    const profileBundle = await loadUserProfileBundle(supabase, user.id, user.email);
    if (!profileBundle) {
      return NextResponse.json(
        { error: 'Complete your profile before generating documents.' },
        { status: 400 }
      );
    }

    const { flat: normalizedProfile, matchPayload: profileForAi } = profileBundle;

    const addressedList = Array.isArray(resolvedSuggestions)
      ? resolvedSuggestions.filter((s) => typeof s === 'string' && s.trim())
      : [
          ...(Array.isArray(profileAdditions) ? profileAdditions : []),
          ...(Array.isArray(resumeEnhancements) ? resumeEnhancements : []),
        ].filter((s) => typeof s === 'string' && s.trim());

    const profileAdditionList = Array.isArray(profileAdditions)
      ? profileAdditions.filter((s) => typeof s === 'string' && s.trim())
      : [];

    const resumeEnhancementList = Array.isArray(resumeEnhancements)
      ? resumeEnhancements.filter((s) => typeof s === 'string' && s.trim())
      : [];

    const wovenEnhancementList = Array.isArray(wovenEnhancements)
      ? wovenEnhancements.filter((s) => typeof s === 'string' && s.trim())
      : [];

    const tailoredResumeText =
      typeof tailoredResume === 'string' && tailoredResume.trim()
        ? tailoredResume.trim().slice(0, 12000)
        : '';

    const priorScore =
      typeof previousMatchScore === 'number' && Number.isFinite(previousMatchScore)
        ? Math.round(Math.max(0, Math.min(100, previousMatchScore)))
        : null;

    if (!jobDescription || typeof jobDescription !== 'string' || !jobDescription.trim()) {
      return NextResponse.json(
        { error: 'Job description is required.' },
        { status: 400 }
      );
    }

    const cleanedJobDescription = sanitizeJobDescription(jobDescription);
    if (!cleanedJobDescription.trim()) {
      return NextResponse.json(
        { error: 'Job description was empty after processing. Try pasting plain text from the posting.' },
        { status: 400 }
      );
    }

    const candidateName =
      normalizedProfile.full_name ||
      `${normalizedProfile.first_name} ${normalizedProfile.last_name}`.trim() ||
      'Candidate';

    const MATCH_ANALYSIS_SYSTEM = `You are an expert ATS resume matcher. Return ONLY valid JSON:
{"match_score":0,"match_reasons":[],"match_improvement_tips":[]}

Rules:
- When TAILORED RESUME is provided, score how well THAT resume fits the job (skills/experience/certs in the document count as matched).
- Otherwise score how well the candidate PROFILE fits the job.
- Skills and certifications listed in the profile or tailored resume count as present.
- match_score: integer 0-100 for current fit.
- match_reasons: 3-6 bullets on strengths and remaining gaps. Do not repeat ALREADY ADDRESSED or RECENTLY WOVEN items as gaps.
- match_improvement_tips: only NEW actionable bullets for gaps still missing. Never repeat items in ALREADY ADDRESSED, RECENTLY WOVEN, or RECENTLY ADDED TO PROFILE.
- Use ONLY facts from the profile/resume. Never invent credentials.`;

    function buildMatchContextBlock(scoringResume = '') {
      const resumeForScoring = scoringResume || tailoredResumeText;
      const sections = [
        `CANDIDATE PROFILE:\n${JSON.stringify(profileForAi)}`,
      ];

      if (profileAdditionList.length) {
        sections.push(
          `RECENTLY ADDED TO PROFILE (count as matched — do not re-suggest as gaps):\n${profileAdditionList.map((s) => `- ${s}`).join('\n')}`
        );
      }

      if (resumeEnhancementList.length) {
        sections.push(
          `QUEUED FOR RESUME (will be woven into the tailored resume — do not penalize score or list as profile gaps):\n${resumeEnhancementList.map((s) => `- ${s}`).join('\n')}`
        );
      }

      if (wovenEnhancementList.length) {
        sections.push(
          `RECENTLY WOVEN INTO RESUME (treat as addressed — do not list as gaps or repeat in tips):\n${wovenEnhancementList.map((s) => `- ${s}`).join('\n')}`
        );
      }

      if (resumeForScoring) {
        sections.push(
          `TAILORED RESUME (primary source for match scoring — skills, experience, and certifications in this document count as matched):\n${resumeForScoring}`
        );
      }

      if (addressedList.length) {
        sections.push(
          `ALREADY ADDRESSED BY USER (exclude from match_improvement_tips):\n${addressedList.map((s) => `- ${s}`).join('\n')}`
        );
      }

      if (priorScore !== null) {
        sections.push(
          `PREVIOUS MATCH SCORE: ${priorScore}%. If RECENTLY ADDED TO PROFILE, RECENTLY WOVEN INTO RESUME, or TAILORED RESUME now covers prior gaps, the new score must be >= ${priorScore}. Never decrease the score after the user addressed recommendations.`
        );
      }

      sections.push(
        `TARGET JOB: ${jobTitle || 'Not specified'} at ${company || 'Not specified'}`,
        `JOB DESCRIPTION:\n${cleanedJobDescription.slice(0, 8000)}`
      );

      return sections.join('\n\n');
    }

    const allAddressed = [
      ...addressedList,
      ...wovenEnhancementList,
    ].filter((s, i, arr) => arr.findIndex((x) => x === s) === i);

    function toMatchLineList(value) {
      if (Array.isArray(value)) {
        return value.map((line) => String(line || '').trim()).filter(Boolean);
      }
      if (typeof value === 'string' && value.trim()) {
        return value
          .split('\n')
          .map((line) => line.replace(/^[-•\d.]+\s*/, '').trim())
          .filter(Boolean);
      }
      return [];
    }

    function finalizeMatchAnalysis(rawScore, rawReasons, rawTips, wovenCount = 0) {
      let matchScore =
        Number.isInteger(rawScore) ? rawScore : typeof rawScore === 'number' ? Math.round(rawScore) : null;

      const reasonList = toMatchLineList(rawReasons);
      const tipList = toMatchLineList(rawTips);

      const filtered = filterMatchAnalysis(reasonList, tipList, allAddressed);

      matchScore = applyMatchScoreAdjustments(matchScore, {
        priorScore,
        profileAdditionCount: profileAdditionList.length,
        wovenCount: wovenCount || wovenEnhancementList.length,
        addressedCount: allAddressed.length,
        remainingTips: filtered.tips.length,
      });

      return {
        matchScore,
        matchReasons: filtered.reasons.join('\n'),
        matchImprovementTips: filtered.tips.join('\n'),
      };
    }

    async function runMatchAnalysis(scoringResume = '') {
      const matchPayload = await createClaudeJson({
        system: MATCH_ANALYSIS_SYSTEM,
        user: buildMatchContextBlock(scoringResume),
        maxTokens: 1536,
      });

      return finalizeMatchAnalysis(
        matchPayload?.match_score,
        matchPayload?.match_reasons,
        matchPayload?.match_improvement_tips,
        wovenEnhancementList.length || resumeEnhancementList.length
      );
    }

    if (normalizedMode !== 'match_only' && !isPro && count >= FREE_RESUME_LIMIT) {
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

    if (normalizedMode === 'match_only') {
      let matchScore = null;
      let matchReasons = '';
      let matchImprovementTips = '';

      try {
        const finalized = await runMatchAnalysis(tailoredResumeText);
        matchScore = finalized.matchScore;
        matchReasons = finalized.matchReasons;
        matchImprovementTips = finalized.matchImprovementTips;
      } catch (err) {
        console.error('Match-only AI error:', err);
        return NextResponse.json({ error: getUserFacingAiError() }, { status: 500 });
      }

      const safeCompany = company || 'Unknown';
      const safeTitle = jobTitle || 'Unknown';

      const { data: existingRows } = await supabase
        .from('applications')
        .select('id')
        .eq('user_id', user.id)
        .eq('company', safeCompany)
        .eq('job_title', safeTitle)
        .order('created_at', { ascending: false })
        .limit(1);

      const existing = existingRows?.[0];
      if (existing?.id) {
        await supabase
          .from('applications')
          .update({
            match_score: matchScore,
            job_description: cleanedJobDescription,
          })
          .eq('id', existing.id);
      }

      return NextResponse.json({
        resume: '',
        coverLetter: '',
        matchScore,
        matchReasons,
        matchImprovementTips,
        jobTitle: jobTitle || null,
        company: company || null,
        applyUrl: safeApplyUrl,
        mode: 'match_only',
        applicationId: existing?.id || null,
        usage: {
          count,
          limit: isPro ? 'unlimited' : FREE_RESUME_LIMIT,
        },
      });
    }


    let resumeText = '';
    let coverLetter = '';
    let matchScore = null;
    let matchReasons = '';
    let matchImprovementTips = '';
    let tailoredStructured = null;

    if (normalizedMode === 'resume') {
      const resumeSystemPrompt = `You are an expert ATS resume writer. Return ONLY valid JSON in this shape:
{"name":"","contact":{"email":"","phone":"","address":"","linkedin":"","portfolio":""},"summary":"","skills":[],"experience":[{"title":"","company":"","years":"","bullets":[]}],"education":[{"degree":"","institution":"","year":""}],"certifications":[],"projects":[{"name":"","years":"","details":[]}]}

Rules:
- Use ONLY the candidate's real background. Never invent employers, degrees, or dates.
- Align summary, skills, and bullets to the job with natural ATS keywords.
- Recent role: 5-7 bullets; prior roles: 4-5 bullets each. Action-oriented bullets only.
- Include ALL experience, education, certifications, and projects from the profile — never omit sections.
- Include contact from profile.`;

      const resumeUserPrompt = `${buildMatchContextBlock()}${
        resumeEnhancementList.length
          ? `\n\nRESUME ENHANCEMENTS TO WEAVE IN (emphasize in summary, skills, and relevant bullets using only truthful framing from the profile):\n${resumeEnhancementList.map((s) => `- ${s}`).join('\n')}`
          : ''
      }`;

      function resumeLooksComplete(text) {
        const profileHasExperience = String(profileForAi.experience || '').trim().length > 20;
        if (profileHasExperience && !text.includes('EXPERIENCE')) return false;
        if (String(profileForAi.education || '').trim() && !text.includes('EDUCATION')) return false;
        return text.length >= 400;
      }

      try {
        tailoredStructured = await createClaudeJson({
          system: resumeSystemPrompt,
          user: resumeUserPrompt,
          maxTokens: 8192,
        });
      } catch (err) {
        console.error('Tailor resume AI error:', err);
        return NextResponse.json({ error: getUserFacingAiError() }, { status: 500 });
      }

      if (!tailoredStructured || typeof tailoredStructured !== 'object') {
        console.error('Tailor resume AI error: empty or invalid structured response');
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

      if (!resumeLooksComplete(resumeText)) {
        console.warn('Tailored resume looked truncated — retrying generation once');
        try {
          const retryStructured = await createClaudeJson({
            system: `${resumeSystemPrompt}\n- CRITICAL: You MUST include complete EXPERIENCE and EDUCATION sections. Do not stop early.`,
            user: resumeUserPrompt,
            maxTokens: 8192,
          });
          if (retryStructured && typeof retryStructured === 'object') {
            retryStructured.name = retryStructured.name || candidateName;
            retryStructured.contact = {
              email: retryStructured?.contact?.email || normalizedProfile.email || '',
              phone: retryStructured?.contact?.phone || normalizedProfile.phone || '',
              address: retryStructured?.contact?.address || normalizedProfile.address || '',
              linkedin: retryStructured?.contact?.linkedin || normalizedProfile.linkedin || '',
              portfolio: retryStructured?.contact?.portfolio || normalizedProfile.portfolio || '',
            };
            const retryText = formatResumeAsText(retryStructured);
            if (resumeLooksComplete(retryText) || retryText.length > resumeText.length) {
              tailoredStructured = retryStructured;
              resumeText = retryText;
            }
          }
        } catch (retryErr) {
          console.error('Tailor resume retry error:', retryErr);
        }
      }
      if (!resumeText.trim()) {
        console.error('Tailor resume AI error: formatted resume was empty');
        return NextResponse.json({ error: getUserFacingAiError() }, { status: 500 });
      }

      try {
        const finalized = await runMatchAnalysis(resumeText);
        matchScore = finalized.matchScore;
        matchReasons = finalized.matchReasons;
        matchImprovementTips = finalized.matchImprovementTips;
      } catch (err) {
        console.error('Match analysis after resume tailor error:', err);
        return NextResponse.json({ error: getUserFacingAiError() }, { status: 500 });
      }
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

      if (!coverLetter?.trim()) {
        console.error('Tailor cover letter AI error: empty response');
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
      apply_url: safeApplyUrl,
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
        apply_url: safeApplyUrl || undefined,
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
  applyUrl: safeApplyUrl,
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
  const asText = (value) => String(value ?? '').trim();

  if (r?.name) {
    lines.push(asText(r.name));
  }

  const contactParts = [
    r?.contact?.email,
    r?.contact?.phone,
    r?.contact?.address,
    r?.contact?.linkedin,
    r?.contact?.portfolio,
  ]
    .map(asText)
    .filter(Boolean);

  if (contactParts.length) {
    lines.push(contactParts.join(' | '));
  }

  lines.push('');

  if (r?.summary) {
    lines.push('SUMMARY');
    lines.push(asText(r.summary));
    lines.push('');
  }

  if (Array.isArray(r?.skills) && r.skills.length) {
    lines.push('SKILLS');

    r.skills.forEach((skill) => {
      const text = asText(typeof skill === 'string' ? skill : skill?.name || skill?.label);
      if (text) lines.push(`- ${text}`);
    });

    lines.push('');
  }

  if (Array.isArray(r?.experience) && r.experience.length) {
    lines.push('EXPERIENCE');

    r.experience.forEach((exp) => {
      const title = asText(exp?.title);
      const company = asText(exp?.company);
      const years = asText(exp?.years);

      const heading =
        `${title}${company ? ' || ' + company : ''}${years ? ' || ' + years : ''}`.trim();

      if (heading) lines.push(heading);

      if (Array.isArray(exp?.bullets)) {
        exp.bullets.forEach((b) => {
          const bullet = asText(typeof b === 'string' ? b : b?.text);
          if (bullet) lines.push(`- ${bullet}`);
        });
      }

      lines.push('');
    });
  }

  if (Array.isArray(r?.projects) && r.projects.length) {
    lines.push('PROJECTS');

    r.projects.forEach((project) => {
      if (project?.name) {
        const tech = asText(project?.tech);
        const years = asText(project?.years);
        const heading =
          `${asText(project.name)}${tech ? ' || ' + tech : ''}${years ? ' || ' + years : ''}`.trim();
        if (heading) lines.push(heading);
      }

      if (Array.isArray(project?.details)) {
        project.details
          .filter(Boolean)
          .forEach((d) => {
            const detail = asText(typeof d === 'string' ? d : d?.text);
            if (detail) lines.push(`- ${detail}`);
          });
      }

      lines.push('');
    });
  }

  if (Array.isArray(r?.education) && r.education.length) {
    lines.push('EDUCATION');

    r.education.forEach((ed) => {
      const row =
        `${asText(ed?.degree)}${ed?.institution ? ' - ' + asText(ed.institution) : ''}${ed?.year ? ' | ' + asText(ed.year) : ''}`.trim();
      if (row) lines.push(row);
    });

    lines.push('');
  }

  if (Array.isArray(r?.certifications) && r.certifications.filter(Boolean).length) {
    lines.push('CERTIFICATIONS');
    r.certifications
      .filter(Boolean)
      .forEach((c) => {
        const cert = asText(typeof c === 'string' ? c : c?.name);
        if (cert) lines.push(`- ${cert}`);
      });
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