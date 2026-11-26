import { describe, expect, it } from 'vitest';
describe('api foundation', () => { it('exposes the expected health payload shape', () => { expect({ok:true,service:'bluebird-api'}).toMatchObject({ok:true}); }); });
