import { NextResponse } from 'next/server';
import { createClaudeJson, getUserFacingAiError, isAiConfigured } from '@/lib/anthropic';

const SYSTEM_PROMPT = `Extract resume data and return ONLY valid JSON with these exact keys:
{
  "firstName": "",
  "lastName": "",
  "email": "",
  "phone": "",
  "address": "",
  "linkedin": "",
  "portfolio": "",
  "experience": [
    { "company": "", "title": "", "from": "", "until": "", "details": "" }
  ],
  "education": [
    { "institution": "", "degree": "", "from": "", "until": "" }
  ],
  "certifications": [
    { "name": "", "issuer": "", "from": "", "until": "" }
  ],
  "licenses": [
    { "name": "", "issuer": "", "from": "", "until": "" }
  ],
  "skills": ["skill one", "skill two"],
  "projects": [
    { "name": "", "from": "", "until": "", "details": "" }
  ]
}

Rules:
- Return valid JSON only. No markdown fences.
- Use empty strings for missing scalar values.
- Use empty arrays when a section is missing entirely.
- For experience: one object per job with company, job title, from/until dates, and bullet details in "details".
- For education: institution name, degree/program, from/until dates.
- For certifications and licenses: separate arrays; certifications are credentials, licenses are professional licenses.
- For skills: array of individual skill strings.
- For projects: project name, date range, and description in details.
- Do not invent details not present in the resume.
- Preserve date formats as written when possible.`;

function normalizeExtractedText(text) {
  if (typeof text === 'string') return text.trim();
  if (Array.isArray(text)) return text.filter(Boolean).join('\n\n').trim();
  return '';
}

export async function POST(request) {
  try {
    if (!isAiConfigured()) {
      console.error('PARSE RESUME ERROR: ANTHROPIC_API_KEY is not set on the server');
      return NextResponse.json({ error: getUserFacingAiError() }, { status: 503 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const isPdf =
      file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');
    const isDocx =
      file.type ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name?.toLowerCase().endsWith('.docx');

    if (!isPdf && !isDocx) {
      return NextResponse.json(
        { error: 'Unsupported file type. Use PDF or DOCX.' },
        { status: 400 }
      );
    }

    let extractedText = '';

    if (isPdf) {
      const { extractText } = await import('unpdf');
      const result = await extractText(new Uint8Array(buffer), { mergePages: true });
      extractedText = normalizeExtractedText(result?.text);
    }

    if (isDocx) {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result?.value?.trim() || '';
    }

    if (!extractedText) {
      return NextResponse.json(
        { error: `Could not extract text from ${isPdf ? 'PDF' : 'DOCX'}.` },
        { status: 400 }
      );
    }

    let parsed;
    try {
      parsed = await createClaudeJson({
        system: SYSTEM_PROMPT,
        user: `Resume text:\n\n${extractedText.slice(0, 15000)}`,
        maxTokens: 8192,
      });
    } catch (err) {
      console.error('Parse resume AI error:', err);
      return NextResponse.json({ error: getUserFacingAiError() }, { status: 500 });
    }

    const safe = {
      firstName: parsed.firstName || '',
      lastName: parsed.lastName || '',
      email: parsed.email || '',
      phone: parsed.phone || '',
      address: parsed.address || '',
      linkedin: parsed.linkedin || '',
      portfolio: parsed.portfolio || '',
      experience: Array.isArray(parsed.experience) ? parsed.experience : [],
      education: Array.isArray(parsed.education) ? parsed.education : [],
      certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
      licenses: Array.isArray(parsed.licenses) ? parsed.licenses : [],
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    };

    return NextResponse.json({ success: true, data: safe });
  } catch (err) {
    console.error('Parse resume error:', err);
    return NextResponse.json({ error: getUserFacingAiError() }, { status: 500 });
  }
}
