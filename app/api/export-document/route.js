import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from 'docx';

export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Expected application/json request body.' },
        { status: 415 }
      );
    }

    const body = await request.json();
    const { content, format, fileName, documentType } = body || {};

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Content is required.' }, { status: 400 });
    }

    if (!format || !['pdf', 'docx'].includes(format)) {
      return NextResponse.json(
        { error: 'Format must be pdf or docx.' },
        { status: 400 }
      );
    }

    const safeBaseName = sanitizeFileName(
      fileName || (documentType === 'cover' ? 'cover-letter' : 'resume')
    );

    if (format === 'pdf') {
      const bytes = await createPdf(content, documentType);
      return new NextResponse(bytes, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${safeBaseName}.pdf"`,
        },
      });
    }

    const bytes = await createDocx(content, documentType);
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${safeBaseName}.docx"`,
      },
    });
  } catch (err) {
    console.error('EXPORT DOCUMENT ERROR:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to export document.' },
      { status: 500 }
    );
  }
}

function sanitizeFileName(name) {
  return (
    String(name)
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'document'
  );
}

function splitLines(content) {
  return content
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd());
}

function parseResumeContent(content) {
  const lines = splitLines(sanitizePdfText(content)).filter((line) => line.trim() !== '');
  const sections = {};
  let name = '';
  let contactLine = '';

  const sectionNames = [
    'SUMMARY',
    'SKILLS',
    'EXPERIENCE',
    'EDUCATION',
    'CERTIFICATIONS',
    'PROJECTS',
  ];

  let currentSection = null;

  for (const line of lines) {
    if (!name) {
      name = line;
      continue;
    }

    if (!contactLine && !sectionNames.includes(line)) {
      contactLine = line;
      continue;
    }

    if (sectionNames.includes(line)) {
      currentSection = line;
      if (!sections[currentSection]) sections[currentSection] = [];
      continue;
    }

    if (/^[-─━]{3,}$/.test(line)) continue;

    if (currentSection) {
      sections[currentSection].push(line);
    }
  }

  return { name, contactLine, sections };
}

function isBulletLine(line) {
  return /^(-|•)\s+/.test(line.trim());
}

function isExperienceHeading(line, section) {
  if (section !== 'EXPERIENCE') return false;
  return line.includes('||');
}

function parseExperienceHeading(line) {
  const [title = '', company = '', years = ''] = line.split('||').map((s) => s.trim());
  return { title, company, years };
}

async function createPdf(content, documentType) {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612;
  const pageHeight = 792;
  const marginX = 54;
  const topMargin = 54;
  const bottomMargin = 54;
  const lineHeight = 14;
  const bodyFontSize = 10.5;
  const headingFontSize = 11.5;
  const nameFontSize = 18;
  const muted = rgb(0.35, 0.35, 0.35);

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - topMargin;

  const newPage = () => {
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - topMargin;
  };

  const ensureSpace = (needed = lineHeight) => {
    if (y - needed < bottomMargin) newPage();
  };

  const drawWrappedText = (
    text,
    {
      x = marginX,
      size = bodyFontSize,
      font = fontRegular,
      color = rgb(0, 0, 0),
      maxWidth = pageWidth - marginX * 2,
      align = 'left',
      customLineHeight = lineHeight,
    } = {}
  ) => {
    const safeText = sanitizePdfText(text);
    const words = safeText.split(/\s+/).filter(Boolean);

    if (!words.length) {
      ensureSpace(customLineHeight);
      y -= customLineHeight;
      return;
    }

    let currentLine = '';
    const wrappedLines = [];

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, size);

      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) wrappedLines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) wrappedLines.push(currentLine);

    for (const wrappedLine of wrappedLines) {
      ensureSpace(customLineHeight);
      const textWidth = font.widthOfTextAtSize(wrappedLine, size);
      let drawX = x;

      if (align === 'center') {
        drawX = (pageWidth - textWidth) / 2;
      } else if (align === 'right') {
        drawX = x + maxWidth - textWidth;
      }

      page.drawText(wrappedLine, {
        x: drawX,
        y,
        size,
        font,
        color,
      });

      y -= customLineHeight;
    }
  };

  const drawBulletParagraph = (text) => {
    const bulletX = marginX + 2;
    const textX = marginX + 16;
    const bulletSize = bodyFontSize + 1;

    const safeText = sanitizePdfText(text);
    const words = safeText.split(/\s+/).filter(Boolean);

    if (!words.length) {
      y -= 8;
      return;
    }

    let currentLine = '';
    const wrappedLines = [];
    const maxWidth = pageWidth - textX - marginX;

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = fontRegular.widthOfTextAtSize(testLine, bodyFontSize);

      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) wrappedLines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) wrappedLines.push(currentLine);

    wrappedLines.forEach((wrappedLine, index) => {
      ensureSpace(15);

      if (index === 0) {
        page.drawText('•', {
          x: bulletX,
          y,
          size: bulletSize,
          font: fontRegular,
          color: rgb(0, 0, 0),
        });
      }

      page.drawText(wrappedLine, {
        x: textX,
        y,
        size: bodyFontSize,
        font: fontRegular,
        color: rgb(0, 0, 0),
      });

      y -= 15;
    });
  };

  if (documentType === 'cover') {
    const lines = splitLines(content);

    for (const line of lines) {
      if (!line.trim()) {
        y -= lineHeight;
        continue;
      }

      drawWrappedText(line, {
        x: marginX,
        size: bodyFontSize + 0.5,
        font: fontRegular,
        maxWidth: pageWidth - marginX * 2,
        customLineHeight: 18,
      });
    }

    return await pdfDoc.save();
  }

  const { name, contactLine, sections } = parseResumeContent(content);

  if (name) {
    drawWrappedText(name, {
      size: nameFontSize,
      font: fontBold,
      align: 'center',
      customLineHeight: 22,
    });
  }

  if (contactLine) {
    drawWrappedText(contactLine, {
      size: 10,
      font: fontRegular,
      align: 'center',
      customLineHeight: 16,
      color: rgb(0.25, 0.25, 0.25),
    });
  }

  y -= 8;

  const orderedSections = [
    'SUMMARY',
    'SKILLS',
    'EXPERIENCE',
    'PROJECTS',
    'EDUCATION',
    'CERTIFICATIONS',
  ];

  for (const section of orderedSections) {
    const items = sections[section];
    if (!items || !items.length) continue;

    ensureSpace(24);

    page.drawLine({
      start: { x: marginX, y },
      end: { x: pageWidth - marginX, y },
      thickness: 1,
      color: rgb(0.82, 0.82, 0.82),
    });

    y -= 14;

    drawWrappedText(section, {
      size: headingFontSize,
      font: fontBold,
      customLineHeight: 16,
    });

    y -= 4;

    for (const rawLine of items) {
      const line = rawLine.trim();

      if (!line) {
        y -= 6;
        continue;
      }

      if (isExperienceHeading(line, section)) {
        y -= 6;
        ensureSpace(22);

        const { title, company, years } = parseExperienceHeading(line);
        const headingText = `${title}${company ? ` — ${company}` : ''}`;

        drawWrappedText(headingText, {
          x: marginX,
          size: bodyFontSize + 0.4,
          font: fontBold,
          maxWidth: pageWidth - marginX * 2,
          customLineHeight: 16,
        });

        if (years) {
          drawWrappedText(years, {
            x: marginX,
            size: bodyFontSize,
            font: fontRegular,
            color: muted,
            customLineHeight: 13,
          });
        }

        y -= 2;
        continue;
      }

      if (section === 'EXPERIENCE') {
        drawBulletParagraph(line.replace(/^(-|•)\s*/, ''));
        continue;
      }

      if (isBulletLine(line)) {
        drawBulletParagraph(line.replace(/^(-|•)\s*/, ''));
      } else {
        drawWrappedText(line, {
          x: marginX,
          size: bodyFontSize,
          font: fontRegular,
          maxWidth: pageWidth - marginX * 2,
          customLineHeight: 15,
        });
      }
    }

    y -= 10;
  }

  return await pdfDoc.save();
}

async function createDocx(content, documentType) {
  const lines = splitLines(content);

  if (documentType === 'cover') {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: lines.map((line) =>
            new Paragraph({
              spacing: { after: line.trim() ? 180 : 120 },
              children: [new TextRun({ text: line || ' ', size: 24 })],
            })
          ),
        },
      ],
    });

    return await Packer.toBuffer(doc);
  }

  const { name, contactLine, sections } = parseResumeContent(content);
  const children = [];

  if (name) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: name,
            bold: true,
            size: 32,
          }),
        ],
      })
    );
  }

  if (contactLine) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 220 },
        children: [
          new TextRun({
            text: contactLine,
            size: 20,
          }),
        ],
      })
    );
  }

  const orderedSections = [
    'SUMMARY',
    'SKILLS',
    'EXPERIENCE',
    'PROJECTS',
    'EDUCATION',
    'CERTIFICATIONS',
  ];

  for (const section of orderedSections) {
    const items = sections[section];
    if (!items || !items.length) continue;

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 180, after: 120 },
        border: {
          bottom: {
            color: 'D9D9D9',
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6,
          },
        },
        children: [
          new TextRun({
            text: section,
            bold: true,
            size: 24,
          }),
        ],
      })
    );

    for (const raw of items) {
      const line = raw.trim();

      if (!line) {
        children.push(
          new Paragraph({
            spacing: { after: 80 },
            children: [new TextRun({ text: ' ' })],
          })
        );
        continue;
      }

      if (isExperienceHeading(line, section)) {
        const { title, company, years } = parseExperienceHeading(line);

        children.push(
          new Paragraph({
            spacing: { before: 220, after: 80 },
            children: [
              new TextRun({
                text: title,
                bold: true,
                size: 23,
              }),
              new TextRun({
                text: company ? ` — ${company}` : '',
                bold: true,
                size: 23,
              }),
              new TextRun({
                text: years ? ` | ${years}` : '',
                size: 22,
                color: '666666',
              }),
            ],
          })
        );
        continue;
      }

      if (section === 'EXPERIENCE') {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 90 },
            indent: { left: 360, hanging: 180 },
            children: [
              new TextRun({
                text: line.replace(/^(-|•)\s*/, ''),
                size: 22,
              }),
            ],
          })
        );
        continue;
      }

      if (isBulletLine(line)) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 90 },
            indent: { left: 360, hanging: 180 },
            children: [
              new TextRun({
                text: line.replace(/^(-|•)\s*/, ''),
                size: 22,
              }),
            ],
          })
        );
      } else {
        children.push(
          new Paragraph({
            spacing: { after: 90 },
            children: [
              new TextRun({
                text: line,
                size: 22,
              }),
            ],
          })
        );
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

function sanitizePdfText(text) {
  return String(text)
    .replace(/[─━│┃┌┐└┘├┤┬┴┼]/g, '-')
    .replace(/[•●▪◦]/g, '-')
    .replace(/[—–]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\u00A0/g, ' ')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
}