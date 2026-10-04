const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const { NextResponse } = require('next/server');
const { loader, root } = require('./helpers.cjs');

 test('private pilot access, concurrent setup/lockout, cookie revocation, and observation isolation', async () => {
  const db = new PGlite();
  let cookieJar = new Map();
  const database = { query: async (sql, params = []) => (await db.query(sql, params)).rows, one: async (sql, params = []) => (await db.query(sql, params)).rows[0] ?? null, DbNotConfigured: class extends Error {} };
  const load = loader({ [path.join(root, 'src/lib/db.ts')]: database, 'next/headers': { cookies: async () => ({ get: (name) => cookieJar.has(name) ? { value: cookieJar.get(name) } : undefined }) } });
  const schema = load('src/lib/schema.ts').SCHEMA;
  try {
    await db.exec(schema); await db.exec(schema); // Additive migration is repeatable.
    const auth = load('src/lib/auth.ts');
    const data = load('src/lib/data.ts');
    const pinRoute = load('src/app/api/pin/route.ts');
    const parentRoute = load('src/app/api/grownup/route.ts');
    const kidRoute = load('src/app/api/kid/route.ts');
    const access = load('src/lib/pilot-access.ts');
    const env = process.env.NODE_ENV, key = process.env.PILOT_ACCESS_KEY;
    process.env.NODE_ENV = 'production'; delete process.env.PILOT_ACCESS_KEY;
    const call = (body, origin = 'https://bookquest.test') => pinRoute.POST(new Request('https://bookquest.test/api/pin', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) }));
    const useCookies = (res) => { cookieJar = new Map(res.cookies.getAll().map(c => [c.name, c.value])); };
    const pin = '739281';
    assert.equal((await call({ action: 'setup', pin })).status, 503);
    process.env.PILOT_ACCESS_KEY = 'k'.repeat(48);
    assert.equal(access.validPilotAccessKey('wrong'), false);
    assert.equal((await call({ action: 'setup', pin })).status, 403);
    assert.equal((await call({ action: 'setup', pin, accessKey: process.env.PILOT_ACCESS_KEY }, 'https://evil.test')).status, 403);
    assert.equal((await call({ action: 'setup', pin: '1234', accessKey: process.env.PILOT_ACCESS_KEY })).status, 400);
    const setup = await Promise.all([call({ action: 'setup', pin, accessKey: process.env.PILOT_ACCESS_KEY }), call({ action: 'setup', pin, accessKey: process.env.PILOT_ACCESS_KEY })]);
    assert.deepEqual(setup.map(r => r.status).sort(), [200, 409]);
    useCookies(setup.find(r => r.status === 200));
    const familyId = await auth.requireGrownup();
    const firstCookies = new Map(cookieJar);
    const cookie = setup.find(r=>r.status===200).cookies.get('bq_device');
    assert.equal(cookie.httpOnly, true); assert.equal(cookie.secure, true); assert.equal(cookie.sameSite, 'lax');
    cookieJar = new Map();
    assert.equal((await kidRoute.GET()).status, 401);
    assert.equal((await parentRoute.GET()).status, 401);
    cookieJar = new Map(firstCookies); cookieJar.set('bq_device', cookieJar.get('bq_device') + 'tampered'); cookieJar.delete('bq_grownup');
    assert.equal(await auth.deviceFamily(), null);
    cookieJar = new Map(firstCookies); cookieJar.delete('bq_grownup');
    assert.equal((await parentRoute.POST(new Request('https://bookquest.test/api/grownup', { method: 'POST', headers: { origin:'https://bookquest.test','content-type':'application/json' }, body:'{"op":"addObservation"}' }))).status, 401);
    // A trusted device can re-enter with its PIN alone.
    const reentry = await call({ action:'unlock', pin }); assert.equal(reentry.status, 200); useCookies(reentry);
    await data.grownupOp(familyId,{op:'addChild',nickname:'Test Reader',age_band:'6-7',reading_mode:'together',color:'teal'});
    const child=(await data.grownupData(familyId)).children[0];
    const observation={op:'addObservation',child_id:child.id,observed_on:'2026-10-03',started_by:'child',help_needed:'none',enjoyment:'yes',repeat_quest:'not_yet',experiment:'guided',notes:'Wanted another story.'};
    await assert.rejects(()=>data.grownupOp(familyId,{...observation,observed_on:'2026-02-30'}),e=>e.status===400);
    await assert.rejects(()=>data.grownupOp(familyId,{...observation,enjoyment:'made-up'}),e=>e.status===400);
    await assert.rejects(()=>data.grownupOp(familyId,{...observation,notes:'x'.repeat(501)}),e=>e.status===400);
    const outsider='00000000-0000-0000-0000-000000000099';
    await assert.rejects(()=>data.grownupOp(outsider,observation),e=>e.status===404);
    const added=await data.grownupOp(familyId,observation);
    assert.equal((await data.grownupData(familyId)).observations[0].notes, observation.notes);
    assert.equal((await data.grownupData(outsider)).observations.length, 0);
    await data.grownupOp(outsider,{op:'deleteObservation',id:added.id});
    assert.equal((await data.grownupData(familyId)).observations.length,1);
    await data.grownupOp(familyId,{op:'deleteObservation',id:added.id});
    assert.equal((await data.grownupData(familyId)).observations.length,0);
    // Revocation invalidates old signatures, retaining the current device.
    const beforeRevoke=new Map(cookieJar);
    const revoked=await call({action:'revokeDevices'});assert.equal(revoked.status,200);useCookies(revoked);const current=new Map(cookieJar);
    cookieJar=beforeRevoke;assert.equal(await auth.deviceFamily(),null);assert.equal(await auth.grownupFamily(),null);
    cookieJar=current;assert.equal(await auth.requireGrownup(),familyId);
    const changed=await call({action:'change',pin:'846291'});assert.equal(changed.status,200);useCookies(changed);const changedCookies=new Map(cookieJar);
    cookieJar=current;assert.equal(await auth.deviceFamily(),null);
    cookieJar=changedCookies;assert.equal(await auth.requireGrownup(),familyId);
    // Parallel failures cannot bypass the counter by overwriting it.
    cookieJar=new Map();
    const failures=await Promise.all(Array.from({length:8},()=>call({action:'unlock',pin:'000000',accessKey:process.env.PILOT_ACCESS_KEY})));
    assert.ok(failures.some(r=>r.status===429));
    assert.equal((await call({action:'unlock',pin:'846291',accessKey:process.env.PILOT_ACCESS_KEY})).status,429);
    if(env===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=env;
    if(key===undefined)delete process.env.PILOT_ACCESS_KEY;else process.env.PILOT_ACCESS_KEY=key;
  } finally { await db.close(); }
});
