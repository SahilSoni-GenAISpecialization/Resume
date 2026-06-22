import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Extract resume data and return ONLY valid JSON with these exact keys:
{
  "firstName": "",
  "lastName": "",
  "email": "",
  "phone": "",
  "address": "",
  "linkedin": "",
  "portfolio": "",
  "summary": "",
  "experience": "",
  "education": "",
  "certifications": "",
  "skills": "",
  "projects": ""
}

Rules:
- Return valid JSON only.
- Do not include markdown fences.
- Use empty strings for missing values.
- For experience, education, certifications, skills, and projects return readable plain text.
- Do not invent details that are not present in the resume.
- Keep line breaks where useful inside long text fields.`;

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const isPdf = file.type === 'application/pdf';
    const isDocx =
      file.type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (!isPdf && !isDocx) {
      return NextResponse.json(
        { error: 'Unsupported file type. Use PDF or DOCX.' },
        { status: 400 }
      );
    }

    let extractedText = '';

    if (isPdf) {
      const { extractText } = await import('unpdf');
      const result = await extractText(new Uint8Array(buffer));
      extractedText = result?.text?.trim() || '';
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

    const completion = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Resume text:\n\n${extractedText.slice(0, 15000)}`,
        },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() || '';

    if (!raw) {
      return NextResponse.json(
        { error: 'AI returned an empty response.' },
        { status: 500 }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: 'AI returned invalid JSON.', raw },
        { status: 500 }
      );
    }

    const safe = {
      firstName: parsed.firstName || '',
      lastName: parsed.lastName || '',
      email: parsed.email || '',
      phone: parsed.phone || '',
      address: parsed.address || '',
      linkedin: parsed.linkedin || '',
      portfolio: parsed.portfolio || '',
      summary: parsed.summary || '',
      experience: parsed.experience || '',
      education: parsed.education || '',
      certifications: parsed.certifications || '',
      skills: parsed.skills || '',
      projects: parsed.projects || '',
    };

    return NextResponse.json({ success: true, data: safe });
  } catch (err) {
    console.error('Parse resume error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to parse resume' },
      { status: 500 }
    );
  }
}