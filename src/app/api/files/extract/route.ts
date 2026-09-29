import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_OUTPUT_CHARS = 100_000;

function extensionOf(name: string): string {
  const match = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || '';
}

function cleanText(value: string): string {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_OUTPUT_CHARS);
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file was uploaded.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `File is too large for document extraction. Maximum size is ${Math.floor(MAX_FILE_BYTES / 1024 / 1024)} MB.` },
        { status: 413 }
      );
    }

    const name = file.name || 'uploaded-file';
    const ext = extensionOf(name);
    const buffer = Buffer.from(await file.arrayBuffer());

    if (['txt', 'md', 'markdown', 'csv', 'json', 'xml', 'yaml', 'yml', 'html', 'htm', 'css', 'js', 'jsx', 'ts', 'tsx', 'py', 'sql', 'java', 'c', 'cpp', 'h', 'hpp', 'go', 'rs', 'php', 'rb', 'swift', 'kt', 'dart', 'sh', 'bash', 'toml', 'ini', 'env'].includes(ext)) {
      return NextResponse.json({
        ok: true,
        name,
        type: 'text',
        text: cleanText(buffer.toString('utf8')),
      });
    }

    if (ext === 'pdf' || String(file.type).toLowerCase().includes('pdf')) {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        return NextResponse.json({
          ok: true,
          name,
          type: 'pdf',
          text: cleanText(result.text),
        });
      } finally {
        await parser.destroy().catch(() => {});
      }
    }

    if (ext === 'docx' || String(file.type).toLowerCase().includes('wordprocessingml')) {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return NextResponse.json({
        ok: true,
        name,
        type: 'docx',
        text: cleanText(result.value),
        warnings: Array.isArray(result.messages)
          ? result.messages.map((message: any) => String(message?.message || '')).filter(Boolean).slice(0, 20)
          : [],
      });
    }

    if (['xlsx', 'xls', 'xlsm', 'csv'].includes(ext) || String(file.type).toLowerCase().includes('spreadsheet')) {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
      const sections: string[] = [];

      for (const sheetName of workbook.SheetNames.slice(0, 20)) {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet, {
          FS: '\t',
          RS: '\n',
          blankrows: false,
        });
        sections.push(`## Sheet: ${sheetName}\n${csv}`);
      }

      return NextResponse.json({
        ok: true,
        name,
        type: 'spreadsheet',
        text: cleanText(sections.join('\n\n')),
        sheets: workbook.SheetNames.slice(0, 20),
      });
    }

    return NextResponse.json(
      {
        ok: false,
        error: `Unsupported document format: .${ext || 'unknown'}`,
        supported: ['pdf', 'docx', 'xlsx', 'xls', 'xlsm', 'txt', 'md', 'csv', 'json', 'xml', 'yaml', 'js', 'ts', 'tsx', 'py', 'sql', 'html', 'css'],
      },
      { status: 415 }
    );
  } catch (error: any) {
    console.error('[FILE EXTRACT]', error);
    return NextResponse.json(
      { error: error?.message || 'Document extraction failed.' },
      { status: 500 }
    );
  }
}
