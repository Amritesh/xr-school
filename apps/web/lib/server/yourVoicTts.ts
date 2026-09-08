export type ClassroomVoiceRole = 'teacher' | 'student';

export const YOURVOIC_TTS_ENDPOINT = 'https://yourvoic.com/api/v1/tts/generate';

export const CLASSROOM_VOICE_DEFAULTS: Record<
  ClassroomVoiceRole,
  { voice: string; language: string; model: string; speed: number }
> = {
  teacher: {
    voice: 'Deepika',
    language: 'en-IN',
    model: 'aura-prime',
    speed: 0.94,
  },
  student: {
    voice: 'Rahul',
    language: 'en-IN',
    model: 'aura-prime',
    speed: 1.04,
  },
};

export interface ClassroomVoiceRequest {
  role: ClassroomVoiceRole;
  text: string;
}

export interface GeneratedClassroomVoice {
  audioUrl: string;
  language: string;
  model: string;
  role: ClassroomVoiceRole;
  voice: string;
}

interface GenerateOptions {
  apiKey: string;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseClassroomVoiceRequest(value: unknown): ClassroomVoiceRequest {
  if (!isRecord(value)) {
    throw new Error('Request body must be a JSON object.');
  }

  const role = value.role;
  if (role !== 'teacher' && role !== 'student') {
    throw new Error('Role must be either teacher or student.');
  }

  if (typeof value.text !== 'string') {
    throw new Error('Text is required.');
  }

  const text = value.text.replace(/\s+/g, ' ').trim();
  if (text.length < 2 || text.length > 600) {
    throw new Error('Text must contain between 2 and 600 characters.');
  }

  return { role, text };
}

export function classroomVoiceConfig(
  role: ClassroomVoiceRole,
  env: NodeJS.ProcessEnv = process.env,
) {
  const defaults = CLASSROOM_VOICE_DEFAULTS[role];
  const voice = role === 'teacher'
    ? env.YOURVOIC_TEACHER_VOICE
    : env.YOURVOIC_STUDENT_VOICE;

  return {
    ...defaults,
    model: env.YOURVOIC_MODEL?.trim() || defaults.model,
    voice: voice?.trim() || defaults.voice,
  };
}

function readAudioUrl(payload: unknown): string | null {
  if (!isRecord(payload)) return null;

  const direct = payload.audio_url ?? payload.audioUrl;
  if (typeof direct === 'string' && direct.startsWith('https://')) return direct;

  const data = payload.data;
  if (!isRecord(data)) return null;
  const nested = data.audio_url ?? data.audioUrl;
  return typeof nested === 'string' && nested.startsWith('https://') ? nested : null;
}

export async function generateClassroomVoice(
  request: ClassroomVoiceRequest,
  options: GenerateOptions,
): Promise<GeneratedClassroomVoice> {
  const config = classroomVoiceConfig(request.role, options.env);
  const response = await (options.fetchImpl ?? fetch)(YOURVOIC_TTS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': options.apiKey,
    },
    body: JSON.stringify({
      text: request.text,
      voice: config.voice,
      language: config.language,
      model: config.model,
      speed: config.speed,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // A sanitized error is returned below if the provider did not send JSON.
  }

  if (!response.ok) {
    throw new Error(`YourVoic request failed with status ${response.status}.`);
  }

  const audioUrl = readAudioUrl(payload);
  if (!audioUrl) {
    throw new Error('YourVoic returned no playable audio URL.');
  }

  return {
    audioUrl,
    language: config.language,
    model: config.model,
    role: request.role,
    voice: config.voice,
  };
}
