import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

import { buildPlatformSnapshot, serializePlatformSnapshot } from '@/features/assistant/api/context';
import { ASSISTANT_SYSTEM_PROMPT } from '@/features/assistant/api/prompt';
import type { AssistantChatPayload, AssistantHistoryMessage } from '@/features/assistant/api/types';
import { getSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DEFAULT_MODEL = 'gemini-3.1-flash-lite';
const MAX_FILES = 4;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_BYTES = 16 * 1024 * 1024;
const MAX_TEXT_CHARS = 120_000;
const MAX_HISTORY_MESSAGES = 12;
const MAX_HISTORY_CHARS = 8_000;

const TEXT_EXTENSIONS = new Set(['txt', 'md', 'csv', 'tsv', 'json', 'log', 'xml', 'yaml', 'yml']);
const EXCEL_EXTENSIONS = new Set(['xlsx', 'xls']);

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };
type GeminiContent = { role: 'user' | 'model'; parts: GeminiPart[] };

function extensionOf(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

function isTextFile(name: string, mimeType: string) {
  return TEXT_EXTENSIONS.has(extensionOf(name)) || mimeType.startsWith('text/');
}

function isExcelFile(name: string, mimeType: string) {
  return (
    EXCEL_EXTENSIONS.has(extensionOf(name)) ||
    mimeType === 'application/vnd.ms-excel' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
}

function isSupportedBinary(mimeType: string) {
  return (
    mimeType === 'application/pdf' ||
    mimeType.startsWith('image/') ||
    mimeType.startsWith('audio/') ||
    mimeType.startsWith('video/')
  );
}

function clampText(value: string) {
  if (value.length <= MAX_TEXT_CHARS) return value;
  return `${value.slice(0, MAX_TEXT_CHARS)}\n\n[Contenu tronqué à ${MAX_TEXT_CHARS.toLocaleString('fr-FR')} caractères.]`;
}

async function fileToParts(file: File): Promise<GeminiPart[]> {
  const name = file.name || 'piece-jointe';
  const mimeType = file.type || 'application/octet-stream';
  const buffer = Buffer.from(await file.arrayBuffer());

  if (isTextFile(name, mimeType)) {
    const text = clampText(buffer.toString('utf8'));
    return [
      {
        text: `\n\n--- Pièce jointe : ${name} (${mimeType || 'texte'}) ---\n${text}`
      }
    ];
  }

  if (isExcelFile(name, mimeType)) {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    let text = '';
    for (const sheetName of workbook.SheetNames.slice(0, 5)) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;
      text += `\n### Feuille « ${sheetName} »\n${XLSX.utils.sheet_to_csv(sheet, { blankrows: false })}`;
      if (text.length > MAX_TEXT_CHARS) break;
    }
    return [
      {
        text: `\n\n--- Pièce jointe Excel convertie en CSV : ${name} ---\n${clampText(text)}`
      }
    ];
  }

  if (isSupportedBinary(mimeType)) {
    return [
      {
        inlineData: {
          mimeType,
          data: buffer.toString('base64')
        }
      }
    ];
  }

  throw new Error(
    `Le fichier « ${name} » n'est pas pris en charge. Formats acceptés : PDF, images, Excel, CSV, JSON, texte, audio et vidéo.`
  );
}

function normalizeHistory(payload: AssistantChatPayload): AssistantHistoryMessage[] {
  if (!payload || !Array.isArray(payload.messages)) return [];

  return payload.messages
    .filter(
      (message): message is AssistantHistoryMessage =>
        (message?.role === 'user' || message?.role === 'assistant') &&
        typeof message.content === 'string'
    )
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, MAX_HISTORY_CHARS)
    }))
    .filter((message) => message.content.trim().length > 0)
    .slice(-MAX_HISTORY_MESSAGES);
}

function buildContents(
  messages: AssistantHistoryMessage[],
  attachmentParts: GeminiPart[]
): GeminiContent[] {
  const contents: GeminiContent[] = [];

  for (const message of messages) {
    const role = message.role === 'assistant' ? 'model' : 'user';
    const parts: GeminiPart[] = [{ text: message.content }];
    const last = contents.at(-1);
    if (last && last.role === role) {
      last.parts.push(...parts);
    } else {
      contents.push({ role, parts });
    }
  }

  // Gemini attend une conversation qui commence par l'utilisateur.
  while (contents[0]?.role === 'model') contents.shift();

  const last = contents.at(-1);
  if (last?.role === 'user') {
    last.parts.push(...attachmentParts);
  } else if (attachmentParts.length) {
    contents.push({ role: 'user', parts: attachmentParts });
  }

  return contents;
}

function sseTextFromEvent(event: unknown): { text: string; finishReason?: string; error?: string } {
  if (!event || typeof event !== 'object') return { text: '' };
  const record = event as {
    error?: { message?: string };
    candidates?: Array<{
      finishReason?: string;
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  if (record.error) {
    return { text: '', error: record.error.message };
  }

  const candidate = record.candidates?.[0];
  const text =
    candidate?.content?.parts
      ?.map((part) => (typeof part.text === 'string' ? part.text : ''))
      .join('') ?? '';

  return { text, finishReason: candidate?.finishReason };
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  if (!apiKey) {
    return NextResponse.json(
      { error: "L'assistant IA n'est pas configuré : la clé GEMINI_API_KEY est absente." },
      { status: 500 }
    );
  }

  const supabase = await getSupabaseServer();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Vous devez être connecté pour utiliser l’assistant.' },
      { status: 401 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const rawPayload = formData.get('payload');
  if (typeof rawPayload !== 'string') {
    return NextResponse.json({ error: 'Le message est manquant.' }, { status: 400 });
  }

  let payload: AssistantChatPayload;
  try {
    payload = JSON.parse(rawPayload) as AssistantChatPayload;
  } catch {
    return NextResponse.json({ error: 'Le format du message est invalide.' }, { status: 400 });
  }

  const messages = normalizeHistory(payload);
  if (!messages.length || messages.at(-1)?.role !== 'user') {
    return NextResponse.json(
      { error: 'Le dernier message doit être une question.' },
      { status: 400 }
    );
  }

  const files = formData
    .getAll('files')
    .filter((value): value is File => typeof value !== 'string');

  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `Vous pouvez joindre au maximum ${MAX_FILES} fichiers par message.` },
      { status: 413 }
    );
  }

  const totalBytes = files.reduce((total, file) => total + file.size, 0);
  if (totalBytes > MAX_TOTAL_BYTES) {
    return NextResponse.json(
      { error: 'Les pièces jointes dépassent la taille maximale de 16 Mo.' },
      { status: 413 }
    );
  }

  const oversized = files.find((file) => file.size > MAX_FILE_BYTES);
  if (oversized) {
    return NextResponse.json(
      { error: `Le fichier « ${oversized.name} » dépasse la taille maximale de 8 Mo.` },
      { status: 413 }
    );
  }

  let attachmentParts: GeminiPart[] = [];
  try {
    attachmentParts = (await Promise.all(files.map(fileToParts))).flat();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Pièce jointe illisible.' },
      { status: 400 }
    );
  }

  let snapshotText: string;
  try {
    const snapshot = await buildPlatformSnapshot();
    snapshotText = serializePlatformSnapshot(snapshot);
  } catch {
    return NextResponse.json(
      { error: 'Impossible de charger les données de la plateforme. Réessayez.' },
      { status: 500 }
    );
  }

  const contents = buildContents(messages, attachmentParts);
  if (!contents.length) {
    return NextResponse.json({ error: 'Le message est vide.' }, { status: 400 });
  }

  const codeFence = '```';
  const systemText = `${ASSISTANT_SYSTEM_PROMPT}

# SNAPSHOT DES DONNÉES SBF (source de vérité)
${codeFence}json
${snapshotText}
${codeFence}`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

  let upstream: Response;
  try {
    upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        contents,
        generationConfig: {
          temperature: 0.35,
          topP: 0.9,
          maxOutputTokens: 4096
        }
      })
    });
  } catch {
    return NextResponse.json(
      { error: 'Le service Gemini est injoignable. Vérifiez votre connexion.' },
      { status: 502 }
    );
  }

  if (!upstream.ok || !upstream.body) {
    const status = upstream.status;
    if (status === 401 || status === 403) {
      return NextResponse.json(
        { error: 'La clé Gemini est invalide ou n’a pas accès au modèle demandé.' },
        { status: 502 }
      );
    }
    if (status === 429) {
      return NextResponse.json(
        { error: 'Le quota Gemini est atteint. Réessayez dans quelques instants.' },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: 'Le modèle IA n’a pas pu traiter la demande. Réessayez.' },
      { status: 502 }
    );
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstream.body.getReader();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = '';
      let sentAny = false;
      let finished = false;

      const send = (text: string) => {
        if (!text) return;
        controller.enqueue(encoder.encode(text));
        sentAny = true;
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const data = trimmed.slice(5).trim();
            if (!data || data === '[DONE]') continue;

            let event: unknown;
            try {
              event = JSON.parse(data);
            } catch {
              continue;
            }

            const parsed = sseTextFromEvent(event);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.text) send(parsed.text);

            if (parsed.finishReason && parsed.finishReason !== 'STOP') {
              finished = true;
              if (!sentAny) {
                send(
                  'Le modèle n’a pas pu produire de réponse pour cette demande. Reformulez la question ou joignez un autre document.'
                );
              }
            }
          }
        }

        if (!sentAny) {
          send(
            'Je n’ai pas pu générer de réponse à partir des données disponibles. Reformulez votre question.'
          );
        }
      } catch {
        if (!sentAny) {
          send(
            'Une erreur est survenue pendant la génération de la réponse. Vérifiez la clé Gemini puis réessayez.'
          );
        } else if (!finished) {
          send('\n\n> La réponse a été interrompue. Réessayez pour obtenir la suite.');
        }
      } finally {
        controller.close();
      }
    },
    cancel() {
      void reader.cancel();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no'
    }
  });
}
