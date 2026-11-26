import { describe, expect, it } from 'vitest';
describe('web foundation', () => { it('uses a same-origin API by default or an explicit API URL', () => { expect(import.meta.env.VITE_API_URL || '/api').toContain('/api'); }); });
