import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from '@bluebird/shared';
describe('shared contracts', () => { it('rejects weak credentials', () => { expect(() => loginSchema.parse({login:'a',password:'1'})).toThrow(); }); it('accepts registration contract', () => { expect(registerSchema.parse({email:'a@b.com',username:'alex_1',displayName:'Alex',password:'secret1'}).username).toBe('alex_1'); }); });
