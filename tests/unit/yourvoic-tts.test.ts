import { describe, expect, it, vi } from 'vitest';

import {
  classroomVoiceConfig,
  generateClassroomVoice,
  parseClassroomVoiceRequest,
  YOURVOIC_TTS_ENDPOINT,
} from '../../apps/web/lib/server/yourVoicTts';

describe('YourVoic classroom TTS', () => {
  it('normalizes teacher and student requests', () => {
    expect(parseClassroomVoiceRequest({ role: 'teacher', text: '  Welcome   class! ' }))
      .toEqual({ role: 'teacher', text: 'Welcome class!' });
    expect(() => parseClassroomVoiceRequest({ role: 'narrator', text: 'Hello' }))
      .toThrow('Role must be either teacher or student.');
  });

  it('uses Indian-English role defaults and server-side overrides', () => {
    expect(classroomVoiceConfig('teacher', {})).toMatchObject({
      language: 'en-IN',
      voice: 'Deepika',
      speed: 0.94,
    });
    expect(classroomVoiceConfig('student', {
      YOURVOIC_STUDENT_VOICE: 'Arjun',
      YOURVOIC_MODEL: 'aura-max',
    })).toMatchObject({ voice: 'Arjun', model: 'aura-max', language: 'en-IN' });
  });

  it('keeps the API key in a server header and returns the provider audio URL', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      audio_url: 'https://cdn.example.com/classroom.mp3',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    const generated = await generateClassroomVoice(
      { role: 'student', text: 'May I answer the question?' },
      { apiKey: 'private-test-key', fetchImpl },
    );

    expect(generated.audioUrl).toBe('https://cdn.example.com/classroom.mp3');
    expect(fetchImpl).toHaveBeenCalledWith(
      YOURVOIC_TTS_ENDPOINT,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-API-Key': 'private-test-key' }),
      }),
    );
    const request = fetchImpl.mock.calls[0]?.[1];
    expect(String(request?.body)).toContain('"language":"en-IN"');
    expect(String(request?.body)).toContain('"voice":"Rahul"');
  });
});
