import {test} from 'node:test';
import assert from 'node:assert/strict';
import {syncUpstream} from './fork-sync.mjs';
const repo = 'Yueyuyu/paperclip';
test('缺少专用凭据只读比较真实上游并报告待人工同步', () => {
 const calls = [];
 const result = syncUpstream({repo, credentialConfigured:false, gh:(...args) => {
   calls.push(args); return JSON.stringify({ahead_by: args[1].includes('main...') ? 9 : 4});
 }});
 assert.equal(result.status, 'manual-sync-required');
 assert.equal(result.mainBehindUpstream, 9);
 assert.equal(calls.length, 2);
 assert.ok(calls.every(args => args[0] === 'api' && args.length === 2 && args[1].includes('paperclipai:master')));
});
test('只读检测确实无更新时才显示已包含上游', () => {
 assert.equal(syncUpstream({repo, credentialConfigured:false, gh:() => '{"ahead_by":0}'}).status, 'up-to-date');
});
test('专用凭据只更新镜像并创建草稿，不合并或重复调度', () => {
 const calls = [];
 const gh = (...args) => {
   calls.push(args);
   if (args[0] === 'api') return JSON.stringify(args[1].includes('merge-upstream') ? {merge_type:'fast-forward'} : {ahead_by:2});
   if (args[1] === 'list') return '[]';
   if (args[1] === 'view') return '{"number":3,"url":"https://github.com/Yueyuyu/paperclip/pull/3"}';
   return '';
 };
 const result = syncUpstream({repo, credentialConfigured:true, gh});
 assert.equal(result.status, 'review-required');
 assert.ok(calls.find(args => args.includes('--draft')));
 assert.equal(calls.filter(args => args.includes('--method')).length, 1);
 assert.ok(!calls.some(args => args[0] === 'workflow' || args[1] === 'merge'));
});
test('已有草稿不重复创建，权限及网络错误不伪装成成功', () => {
 const calls = [];
 syncUpstream({repo, credentialConfigured:true, gh:(...args) => {
   calls.push(args);
   if (args[0] === 'api') return '{"ahead_by":2}';
   return '[{"number":3,"url":"https://github.com/Yueyuyu/paperclip/pull/3"}]';
 }});
 assert.ok(!calls.some(args => args[1] === 'create' || args[0] === 'workflow'));
 assert.throws(() => syncUpstream({repo, credentialConfigured:true, gh:() => {throw new Error('HTTP 422');}}), /422/);
 assert.throws(() => syncUpstream({repo:'someone/other', credentialConfigured:false, gh:() => '{}'}), /restricted/);
});
