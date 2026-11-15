import { Writable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { buildApp } from './app.js';
import type { Database } from './db/oracle.js';

const config = { logLevel: 'info', readyTimeoutMs: 200 } as const;
const fakeDb = (ping: Database['ping']): Database => ({ ping, close: async () => {} });

describe('GET /health', () => {
  it('responde 200 sem tocar no banco', async () => {
    const ping = vi.fn();
    const app = buildApp({ config, db: fakeDb(ping), silent: true });
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
    expect(ping).not.toHaveBeenCalled();
    expect(res.headers['x-request-id']).toBeTruthy();
  });
});

describe('GET /ready', () => {
  it('200 quando o banco responde', async () => {
    const app = buildApp({ config, db: fakeDb(async () => {}), silent: true });
    const res = await app.inject({ method: 'GET', url: '/ready' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ready' });
  });

  it('503 sem vazar detalhes quando o banco falha', async () => {
    const db = fakeDb(async () => {
      throw new Error('ORA-12514: segredo-interno host=10.0.0.1');
    });
    const app = buildApp({ config, db, silent: true });
    const res = await app.inject({ method: 'GET', url: '/ready' });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({
      error: { code: 'NOT_READY', message: 'Servico indisponivel.' },
    });
    expect(res.body).not.toContain('ORA-');
    expect(res.body).not.toContain('10.0.0.1');
  });

  it('503 quando o banco excede o timeout', async () => {
    const db = fakeDb(() => new Promise<void>(() => {}));
    const app = buildApp({ config, db, silent: true });
    const res = await app.inject({ method: 'GET', url: '/ready' });
    expect(res.statusCode).toBe(503);
    expect(res.json().error.code).toBe('NOT_READY');
  });
});

describe('tratamento de erros', () => {
  it('404 no formato unico', async () => {
    const app = buildApp({ config, db: fakeDb(async () => {}), silent: true });
    const res = await app.inject({ method: 'GET', url: '/nao-existe' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: { code: 'NOT_FOUND', message: 'Rota inexistente.' } });
  });

  it('500 generico sem stack nem mensagem interna', async () => {
    const app = buildApp({ config, db: fakeDb(async () => {}), silent: true });
    app.get('/boom', async () => {
      throw new Error('SELECT * FROM segredo falhou');
    });
    const res = await app.inject({ method: 'GET', url: '/boom' });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' },
    });
    expect(res.body).not.toContain('SELECT');
    expect(res.body).not.toContain('at ');
  });

  it('400 VALIDATION_ERROR para ZodError', async () => {
    const app = buildApp({ config, db: fakeDb(async () => {}), silent: true });
    app.post('/echo', async (req) => z.object({ name: z.string().min(1) }).parse(req.body));
    const res = await app.inject({ method: 'POST', url: '/echo', payload: { name: '' } });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('400 para JSON malformado e 413 para payload grande', async () => {
    const app = buildApp({ config, db: fakeDb(async () => {}), silent: true });
    app.post('/echo', async (req) => req.body);
    const bad = await app.inject({
      method: 'POST',
      url: '/echo',
      headers: { 'content-type': 'application/json' },
      payload: '{oops',
    });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().error.code).toBe('BAD_REQUEST');
    const big = await app.inject({
      method: 'POST',
      url: '/echo',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ x: 'a'.repeat(200 * 1024) }),
    });
    expect(big.statusCode).toBe(413);
    expect(big.json().error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});

describe('logging', () => {
  it('emite JSON com requestId e redige credenciais', async () => {
    const chunks: string[] = [];
    const logStream = new Writable({
      write(chunk, _enc, cb) {
        chunks.push(String(chunk));
        cb();
      },
    });
    const app = buildApp({ config, db: fakeDb(async () => {}), logStream });
    app.post('/login', async (req) => {
      req.log.info({ body: { password: 'senha-super-secreta' } }, 'login attempt');
      return {};
    });
    await app.inject({
      method: 'POST',
      url: '/login',
      headers: { authorization: 'Bearer abc123', cookie: 'sid=xyz789' },
      payload: {},
    });
    await app.close();
    const out = chunks.join('');
    const lines = out
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(lines.every((l) => typeof l.requestId === 'string')).toBe(true);
    expect(out).not.toContain('senha-super-secreta');
    expect(out).not.toContain('abc123');
    expect(out).not.toContain('xyz789');
  });
});
