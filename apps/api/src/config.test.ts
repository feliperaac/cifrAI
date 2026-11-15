import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from './config.js';

const valid = { ORACLE_SERVICE: 'ORCL', ORACLE_PASSWORD: 'p@ss-secreta' };

describe('loadConfig', () => {
  it('aplica defaults e monta connectString', () => {
    const c = loadConfig(valid);
    expect(c.port).toBe(3000);
    expect(c.oracle.user).toBe('CIFRAI_APP');
    expect(c.oracle.connectString).toBe('host.docker.internal:1521/ORCL');
    expect(c.nodeEnv).toBe('production');
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
