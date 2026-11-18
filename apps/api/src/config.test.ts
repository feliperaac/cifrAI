import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from './config.js';

const valid = {
  ORACLE_SERVICE: 'ORCL',
  ORACLE_PASSWORD: 'p@ss-secreta',
  SESSION_SECRET: 'segredo-de-teste-com-mais-de-32-caracteres',
};

describe('loadConfig', () => {
  it('aplica defaults e monta connectString', () => {
    const c = loadConfig(valid);
    expect(c.port).toBe(3000);
    expect(c.oracle.user).toBe('CIFRAI_APP');
    expect(c.oracle.connectString).toBe('host.docker.internal:1521/ORCL');
    expect(c.nodeEnv).toBe('production');
  });

  it('le os campos de sessao, proxy e origens', () => {
    const c = loadConfig({
      ...valid,
      TRUST_PROXY: 'true',
      APP_ORIGINS: ' https://a.test , ,https://b.test',
    });
    expect(c.sessionSecret).toBe(valid.SESSION_SECRET);
    expect(c.trustProxy).toBe(true);
    expect(c.allowedOrigins).toEqual(['https://a.test', 'https://b.test']);
    expect(c.oracle.schema).toBe('CIFRAI_MIG');
    expect(loadConfig(valid).trustProxy).toBe(false);
  });

  it('rejeita SESSION_SECRET curto sem vazar o valor', () => {
    try {
      loadConfig({ ...valid, SESSION_SECRET: 'curto' });
      expect.unreachable();
    } catch (e) {
      expect((e as ConfigError).message).toContain('SESSION_SECRET');
      expect((e as ConfigError).message).not.toContain('curto');
    }
  });

  it('rejeita o placeholder do .env.example como SESSION_SECRET', () => {
    expect(() =>
      loadConfig({ ...valid, SESSION_SECRET: 'CHANGE_ME_gerar_com_openssl_rand_base64_48' }),
    ).toThrow(/SESSION_SECRET/);
  });

  it('trata string vazia como ausente', () => {
    const c = loadConfig({ ...valid, API_PORT: '', ORACLE_USER: '' });
    expect(c.port).toBe(3000);
    expect(c.oracle.user).toBe('CIFRAI_APP');
  });

  it('falha rapido quando faltam variaveis obrigatorias', () => {
    expect(() => loadConfig({})).toThrow(ConfigError);
    try {
      loadConfig({});
    } catch (e) {
      const msg = (e as ConfigError).message;
      expect(msg).toContain('ORACLE_SERVICE');
      expect(msg).toContain('ORACLE_PASSWORD');
      expect(msg).toContain('SESSION_SECRET');
    }
  });

  it('falha com porta invalida sem vazar a senha', () => {
    try {
      loadConfig({ ...valid, API_PORT: 'abc' });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigError);
      expect((e as ConfigError).message).toContain('API_PORT');
      expect((e as ConfigError).message).not.toContain('p@ss-secreta');
    }
  });
});
