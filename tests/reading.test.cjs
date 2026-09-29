const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const context = vm.createContext({ document: { querySelector: () => ({ content: '' }) }, location: { hostname: 'localhost' } });
// Run the real app definitions without browser startup or a network/model call.
vm.runInContext(fs.readFileSync(path.join(root, 'web/app.js'), 'utf8').replace(/\binit\(\);\s*$/, ''), context);
const run = code => vm.runInContext(code, context);
context.fixturePics = JSON.parse(fs.readFileSync(path.join(root, 'web/stimuli.json'))).pictures.filter(p => ['c05','c07','c18','c15'].includes(p.id));
const score = (motives = [], scores = {}) => ({ motives, scores });
const row = (picture_id, motives, extra = {}) => ({ picture_id, source: '原句', direct: score(motives), translated: null, ...extra });
const assess = (rows, pics = context.fixturePics, failed = false) => {
  context.rows = rows; context.pics = pics; context.failed = failed;
  return run('assessReading(rows, pics, failed)');
};

test('faint detections stay out of main counts', () => {
  context.rows = [row('c05', [], { direct: score([], {ach:.31, aff:.29}) })];
  assert.equal(run('combined(rows).ach'), 0);
  assert.equal(run('faintOf(rows[0].direct).join()'), 'ach');
});
test('three labels in one sentence do not unlock a profile', () => {
  assert.equal(assess([row('c05', ['ach','aff','pow'])]).kind, 'sparse');
});
test('one story cannot earn a strong reading despite many sentences', () => {
  assert.equal(assess(Array.from({length:12}, () => row('c05',['aff']))).kind, 'sparse');
});
test('repeated theme across four stories survives every story omission', () => {
  const rows = context.fixturePics.flatMap(p => [row(p.id,['aff']), row(p.id,['aff'])]);
  const result = assess(rows);
  assert.equal(result.kind, 'lean');
  assert.equal(result.focus.join(), 'aff');
  assert.equal(result.support.aff, 4);
});
test('dominance concentrated in one story remains tentative', () => {
  const rows = [...Array.from({length:10}, () => row('c05',['aff'])),row('c07',['ach']),row('c18',['pow']),row('c15',['pow'])];
  assert.equal(assess(rows).kind, 'tentative');
});
test('translation failure cannot use strongest wording', () => {
  const rows = context.fixturePics.flatMap(p => [row(p.id,['aff']), row(p.id,['aff'])]);
  assert.equal(assess(rows, context.fixturePics, true).kind, 'tentative');
});
test('missing picture reference does not invent or partially match a benchmark', () => {
  const pics = context.fixturePics.map((p,i) => i ? p : {...p,pull:null});
  const rows = pics.flatMap(p => [row(p.id,['aff']),row(p.id,['aff'])]);
  assert.equal(assess(rows,pics).kind, 'unbenchmarked');
  context.pics = pics;
  assert.equal(run('typicalShares(pics)'), null);
});
test('faint additions cannot flatten or change a supported headline', () => {
  const rows = context.fixturePics.flatMap(p => [row(p.id,['aff']),row(p.id,['aff'])]);
  const more = rows.map(s => ({...s, translated:score([], {ach:.49,pow:.4})}));
  assert.equal(assess(more).kind, 'lean');
  assert.equal(assess(more).focus.join(), 'aff');
});
test('tied themes both need repeated support', () => {
  const pics = context.fixturePics.map(p => ({...p,pull:{ach:1,aff:1,pow:1}}));
  const rows = pics.flatMap(p => [row(p.id,['ach']),row(p.id,['aff'])]);
  assert.equal(assess(rows,pics).kind,'lean');
  assert.equal(assess(rows,pics).focus.join(),'ach,aff');
});
test('three-story support is insufficient when omission changes the leading theme', () => {
  const pics = context.fixturePics.map(p => ({...p,pull:{ach:1,aff:1,pow:1}}));
  const repeated = (id, motive, n) => Array.from({length:n},()=>row(id,[motive]));
  const rows = [...repeated('c05','aff',10),row('c07',['aff']),...repeated('c07','ach',3),
    row('c18',['aff']),...repeated('c18','pow',3),...repeated('c15','ach',3)];
  const result = assess(rows,pics);
  assert.equal(result.support.aff,3);
  assert.equal(result.focus.join(),'aff');
  assert.equal(result.kind,'tentative');
});
test('one unstable member prevents a tied headline from getting strongest wording', () => {
  const pics = context.fixturePics.map(p => ({...p,pull:{ach:1,aff:1,pow:1}}));
  const rows = pics.flatMap((p,i) => [
    ...Array.from({length:[10,1,1,0][i]},()=>row(p.id,['ach'])),
    ...Array.from({length:3},()=>row(p.id,['aff']))]);
  const result = assess(rows,pics);
  assert.equal(result.focus.join(),'ach,aff');
  assert.equal(result.support.ach,3);
  assert.equal(result.support.aff,4);
  assert.equal(result.kind,'tentative');
});
test('omission that leaves too few sentences cannot support a strong headline', () => {
  assert.equal(assess(['c05','c07','c18'].map(id=>row(id,['aff']))).kind,'tentative');
});
test('zero reference totals disable comparison', () => {
  const pics = context.fixturePics.map(p => ({...p,pull:{ach:0,aff:0,pow:0}}));
  assert.equal(assess(pics.flatMap(p=>[row(p.id,['aff']),row(p.id,['aff'])]),pics).kind,'unbenchmarked');
});
test('download preserves exact evidence and method with missing references and fallback', () => {
  const rows = context.fixturePics.flatMap(p=>[row(p.id,['aff']),row(p.id,['aff'])]);
  rows[0].source = '<img src=x> 原句';
  rows[0].direct.scores = {ach:.4};
  context.data = {sentences:rows,translation_failed:true,meta:{amc_model:'fixture',amc_revision:'1234567',translator:'fixture',prompt_version:'v1'},summary:{direct:{ach:0,aff:8,pow:0},translated:null,agreement:null}};
  run('pictures = fixturePics.map((p,i) => i ? p : {...p,pull:null})');
  const text = run('resultText(data)');
  assert.match(text, /<img src=x> 原句/);
  assert.match(text, /未有完整參照/);
  assert.match(text, /隱約成就/);
  assert.match(text, /唔計入主題比例/);
  assert.match(text, /翻譯未能完成/);
  assert.doesNotMatch(text, /undefined|NaN|一般人/);
});
