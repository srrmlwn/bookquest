const { test } = require('node:test');
const assert = require('node:assert/strict');
require('fake-indexeddb/auto');
const { loader } = require('./helpers.cjs');

test('recording opt-in, retention on existing audio, deletion, and storage failures', async () => {
  const values=new Map();
  global.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
  global.window=new EventTarget();
  const load=loader();
  const prefs=load('src/lib/client/recording-preferences.ts');
  const recordings=load('src/lib/client/recordings.ts');
  const audio=[{question:'Tell me about the book.',blob:new Blob(['audio'])}];
  assert.deepEqual(prefs.getRecordingPreferences(),{enabled:false,retentionDays:7});
  await recordings.saveRecordings('off',audio);
  assert.equal((await recordings.getRecordings('off')).length,0);
  prefs.setRecordingPreferences({enabled:true,retentionDays:7});
  await recordings.saveRecordings('on',audio);
  assert.equal((await recordings.getRecordings('on'))[0].blob.size,5);
  // Simulate recordings made before retention controls existed.
  const db=await new Promise((resolve,reject)=>{const req=indexedDB.open('bookquest',1);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
  await new Promise((resolve,reject)=>{const t=db.transaction('recordings','readwrite'),s=t.objectStore('recordings');
    for(const [id,days] of [['eight-days',8],['two-days',2]])s.put({key:id+':0',completionId:id,index:0,question:'Story?',blob:new Blob(['audio']),createdAt:Date.now()-days*86400000});
    t.oncomplete=resolve;t.onerror=()=>reject(t.error);
  });db.close();
  assert.equal((await recordings.getRecordings('eight-days')).length,0);
  assert.equal((await recordings.getRecordings('two-days')).length,1);
  prefs.setRecordingPreferences({enabled:false,retentionDays:1});
  await recordings.purgeExpiredRecordings();
  assert.equal((await recordings.getRecordings('two-days')).length,0);
  assert.equal((await recordings.getRecordings('on')).length,1,'turning off keeps unexpired existing audio');
  await recordings.saveRecordings('off-again',audio);
  assert.equal((await recordings.getRecordings('off-again')).length,0);
  assert.deepEqual([...await recordings.recordingCompletionIds()],['on']);
  await recordings.deleteRecordings('on');
  assert.equal((await recordings.getRecordings('on')).length,0);
  prefs.setRecordingPreferences({enabled:true,retentionDays:30});
  await recordings.saveRecordings('all',audio);
  await recordings.deleteAllRecordings();
  assert.equal((await recordings.recordingCompletionIds()).size,0);
  const original=indexedDB;
  global.indexedDB={open:()=>{const request={};setTimeout(()=>{request.error=new Error('Storage unavailable');request.onerror()},0);return request;}};
  await assert.rejects(recordings.deleteAllRecordings(),/Storage unavailable/);
  global.indexedDB=original;
  global.localStorage.setItem=()=>{throw new Error('Storage disabled')};
  assert.throws(()=>prefs.setRecordingPreferences({enabled:false,retentionDays:7}),/Storage disabled/);
});

test('microphone tracks are released when MediaRecorder cannot start', async () => {
  let stopped=0;
  Object.defineProperty(global.navigator,'mediaDevices',{value:{getUserMedia:async()=>({getTracks:()=>[{stop:()=>stopped++}]})},configurable:true});
  global.MediaRecorder=class {static isTypeSupported(){return true}constructor(){throw new Error('Unsupported recorder')}};
  const recorder=loader()('src/lib/client/recorder.ts');
  await assert.rejects(recorder.startRecording(),/Unsupported recorder/);
  assert.equal(stopped,1);
});
