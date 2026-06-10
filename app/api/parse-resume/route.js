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
For experience, education, certifications and projects return readable plain text. No markdown. No explanation. JSON only.`;

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
    const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (!isPdf && !isDocx) {
      return NextResponse.json({ error: 'Unsupported file type. Use PDF or DOCX.' }, { status: 400 });
    }

    // PDF — send directly to GPT-5-nano vision (no local parser needed)
    if (isPdf) {
      const base64 = buffer.toString('base64');

      const completion = await openai.chat.completions.create({
        model: 'gpt-5-nano',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: SYSTEM_PROMPT },
              { type: 'image_url', image_url: { url: `data:application/pdf;base64,${base64}` } },
            ],
          },
        ],
        max_tokens: 3000,
      });

      const raw = completion.choices[0].message.content?.trim() || '';
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
      const parsed = JSON.parse(cleaned);
      return NextResponse.json({ success: true, data: parsed });
    }

    // DOCX — extract text with mammoth, then send to GPT
    if (isDocx) {
      const mammoth = (await import('mammoth')).default;
      const result = await mammoth.extractRawText({ buffer });
      const extractedText = result.value?.trim();

      if (!extractedText) {
        return NextResponse.json({ error: 'Could not extract text from DOCX.' }, { status: 400 });
      }

      const completion = await openai.chat.completions.create({
        model: 'gpt-5-nano',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: extractedText.slice(0, 12000) },
        ],
        temperature: 0.1,
      });

      const raw = completion.choices.message.content?.trim() || '';
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
      const parsed = JSON.parse(cleaned);
      return NextResponse.json({ success: true, data: parsed });
    }

  } catch (err) {
    console.error('Parse resume error:', err);
    return NextResponse.json({ error: err.message || 'Failed to parse resume' }, { status: 500 });
  }
}