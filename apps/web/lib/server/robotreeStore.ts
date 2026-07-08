import type { ClassroomSession } from '../robotreeTypes';

/**
 * Server-side session storage for the Robotree route handlers.
 *
 * - Default: process-global in-memory map. Fully reliable on a single
 *   long-running server (local `next dev`/`next start`, LAN demo).
 * - Serverless (Vercel): set KV_REST_API_URL/KV_REST_API_TOKEN (Vercel KV)
 *   or UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN so all function
 *   instances share state. Uses the Upstash REST protocol via fetch —
 *   no extra dependency.
 *
 * TODO: replace in-memory store with persistent local/cloud storage.
 */

const SESSION_TTL_SECONDS = 24 * 60 * 60;

type MemoryStore = Map<string, ClassroomSession>;

const globalStore = globalThis as typeof globalThis & {
  __robotreeSessions?: MemoryStore;
  __robotreeJoinCodes?: Map<string, string>;
};

const memorySessions: MemoryStore = (globalStore.__robotreeSessions ??= new Map());
const memoryJoinCodes: Map<string, string> = (globalStore.__robotreeJoinCodes ??= new Map());

function redisConfig(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function redisCommand(command: unknown[]): Promise<unknown> {
  const config = redisConfig();
  if (!config) throw new Error('Redis is not configured');
  const response = await fetch(config.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Robotree session store error (${response.status})`);
  }
  const body = (await response.json()) as { result?: unknown; error?: string };
  if (body.error) throw new Error(body.error);
  return body.result ?? null;
}

export async function loadSession(idOrJoinCode: string): Promise<ClassroomSession | null> {
  const key = idOrJoinCode.trim();
  if (redisConfig()) {
    const direct = (await redisCommand(['GET', `rt:session:${key}`])) as string | null;
    if (direct) return JSON.parse(direct) as ClassroomSession;
    const mapped = (await redisCommand(['GET', `rt:code:${key.toUpperCase()}`])) as string | null;
    if (!mapped) return null;
    const byCode = (await redisCommand(['GET', `rt:session:${mapped}`])) as string | null;
    return byCode ? (JSON.parse(byCode) as ClassroomSession) : null;
  }
  const direct = memorySessions.get(key);
  if (direct) return direct;
  const mappedId = memoryJoinCodes.get(key.toUpperCase());
  return mappedId ? (memorySessions.get(mappedId) ?? null) : null;
}

export async function saveSession(session: ClassroomSession): Promise<void> {
  if (redisConfig()) {
    await redisCommand([
      'SET',
      `rt:session:${session.id}`,
      JSON.stringify(session),
      'EX',
      SESSION_TTL_SECONDS,
    ]);
    await redisCommand(['SET', `rt:code:${session.joinCode}`, session.id, 'EX', SESSION_TTL_SECONDS]);
    return;
  }
  memorySessions.set(session.id, session);
  memoryJoinCodes.set(session.joinCode, session.id);
}

/** True when a shared (Redis) backend is active — used for diagnostics. */
export function usingSharedStore(): boolean {
  return redisConfig() !== null;
}
