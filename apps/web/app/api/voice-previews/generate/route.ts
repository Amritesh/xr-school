import { NextResponse, type NextRequest } from 'next/server';

import {
  generateClassroomVoice,
  parseClassroomVoiceRequest,
} from '../../../../lib/server/yourVoicTts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 8;
const requestWindows = new Map<string, { count: number; resetAt: number }>();

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function requestIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const current = requestWindows.get(ip);
  if (!current || current.resetAt <= now) {
    requestWindows.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  current.count += 1;
  return current.count > MAX_REQUESTS_PER_WINDOW;
}

export async function POST(request: NextRequest) {
  if (isRateLimited(requestIp(request))) {
    return json(
      { code: 'RATE_LIMITED', error: 'Please wait before generating another preview.' },
      429,
    );
  }

  const apiKey = process.env.YOURVOIC_API_KEY?.trim();
  if (!apiKey) {
    return json(
      {
        code: 'VOICE_SERVICE_NOT_CONFIGURED',
        error: 'YourVoic is connected, but its private API key has not been configured yet.',
      },
      503,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ code: 'INVALID_JSON', error: 'Send a valid JSON request.' }, 400);
  }

  try {
    const voiceRequest = parseClassroomVoiceRequest(body);
    const generated = await generateClassroomVoice(voiceRequest, { apiKey });
    return json(generated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Voice generation failed.';
    const isInputError = message.startsWith('Role')
      || message.startsWith('Text')
      || message.startsWith('Request body');
    return json(
      {
        code: isInputError ? 'INVALID_REQUEST' : 'VOICE_GENERATION_FAILED',
        error: message,
      },
      isInputError ? 400 : 502,
    );
  }
}
