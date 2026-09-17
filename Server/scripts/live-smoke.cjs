// Explicit live integration check. Uses real MongoDB and Groq, never existing user data.
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const express = require('express');
const jwt = require('jsonwebtoken');
const dns = require('node:dns');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Course = require('../models/Course');
const Section = require('../models/Section');
const SubSection = require('../models/SubSection');
const ChatSession = require('../models/ChatSession');
const AssistantUsage = require('../models/AssistantUsage');
const report = message => process.stdout.write(message + '\n');
const databaseName = 'sn_live_' + crypto.randomBytes(10).toString('hex');
let server;
let connected = false;
let failures = 0;
let providerCalls = 0;
const originalFetch = global.fetch;
const originalLog = console.log;
console.log = () => {}; // Controllers log decoded JWTs; only synthetic test summaries are useful here.
global.fetch = async (url, options) => {
  if (String(url).startsWith('https://api.groq.com/')) providerCalls++;
  return originalFetch(url, options);
};
async function check(name, action) {
  try { await action(); report('PASS ' + name); }
  catch (error) { failures++; report('FAIL ' + name + ': ' + error.message); }
}
async function main() {
  if (!process.argv.includes('--run')) throw new Error('Use --run to opt in to a temporary live database and billable Groq requests.');
  for (const key of ['MONGODB_URL', 'GROQ_API_KEY', 'JWT_SECRET']) {
    if (!process.env[key]) throw new Error(key + ' is not configured');
  }
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  report('Connecting to MongoDB using an isolated temporary database...');
  try {
    await mongoose.connect(process.env.MONGODB_URL, { dbName: databaseName, serverSelectionTimeoutMS: 15000, connectTimeoutMS: 15000 });
  } catch (error) {
    throw new Error('MongoDB connection failed (' + error.name + ', ' + (error.code || error.cause?.code || 'connection unavailable') + '). Credentials were not logged.');
  }
  connected = true;
  assert.equal(mongoose.connection.name, databaseName);
  const verifyAbsent = process.argv.find(value => value.startsWith('--verify-absent='))?.split('=')[1];
  if (verifyAbsent) {
    assert.match(verifyAbsent, /^studynotion_live_test_[a-f0-9]{20}$/);
    const listed = await mongoose.connection.db.admin().listDatabases({ filter: { name: verifyAbsent }, nameOnly: true });
    assert.equal(listed.databases.length, 0);
    report('PASS Previous failed test database does not exist');
  }
  const app = express();
  app.use(express.json());
  app.use('/api/v1/assistant', require('../routes/Assistant'));
  app.use('/api/v1/course', require('../routes/Course'));
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  await mongoose.connection.db.command({ ping: 1 });
  report('PASS MongoDB connection, model indexes, and ping');
  const makeUser = async (role, approved = true) => {
    const profile = await Profile.create({ about: 'Temporary integration test' });
    return User.create({ firstName: 'Live', lastName: 'Test', email: crypto.randomUUID() + '@example.invalid', password: crypto.randomBytes(32).toString('hex'), accountType: role, approved, additionalDetails: profile._id, image: 'https://example.invalid/test.png' });
  };
  const instructor = await makeUser('Instructor');
  const pendingInstructor = await makeUser('Instructor', false);
  const student = await makeUser('Student');
  const outsider = await makeUser('Student');
  const lecture = await SubSection.create({ title: 'Closures', timeDuration: '120', description: 'JavaScript lexical scope', assistantNotes: 'A closure retains access to variables in its outer lexical scope after the outer function returns. Example: function makeCounter() { let count = 0; return () => ++count; } Each call to makeCounter creates an independent counter.', videoUrl: 'https://example.invalid/test.mp4' });
  const section = await Section.create({ sectionName: 'Functions', subSection: [lecture._id] });
  const course = await Course.create({ courseName: 'Temporary JavaScript Test', courseDescription: 'JavaScript functions', instructor: instructor._id, tag: ['test'], status: 'Published', courseContent: [section._id], studentsEnrolled: [student._id] });
  const draft = await Course.create({ courseName: 'Temporary Draft', instructor: pendingInstructor._id, tag: ['test'], status: 'Draft' });
  server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  const base = 'http://127.0.0.1:' + server.address().port + '/api/v1';
  async function api(route, user, method = 'GET', body) {
    const token = user ? jwt.sign({ id: String(user._id), accountType: user.accountType }, process.env.JWT_SECRET, { expiresIn: '5m' }) : null;
    const res = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(65000) });
    if (res.headers.get('content-type')?.includes('text/event-stream')) {
      const text = await res.text();
      return { status: res.status, events: text.split('\n').filter(line => line.startsWith('data:')).map(line => JSON.parse(line.slice(5))) };
    }
    return { status: res.status, data: await res.json() };
  }
  const courseId = String(course._id), sectionId = String(section._id), lectureId = String(lecture._id);
  const chat = question => api('/assistant/chat', student, 'POST', { courseId, lectureId, question });
  const assertAnswer = result => {
    assert.equal(result.status, 200);
    const failure = result.events?.find(event => event.type === 'error');
    assert.ok(!failure, failure?.message || 'Unexpected stream error');
    assert.ok(result.events?.some(event => event.type === 'done'), 'Missing completed stream');
    const answer = result.events.filter(event => event.type === 'delta').map(event => event.text).join('');
    assert.ok(answer.length > 20, 'Empty or unexpectedly short provider answer');
    return answer;
  };
  await check('HTTP authentication and enrollment restrictions', async () => {
    assert.equal((await api('/assistant/courses', null)).status, 401);
    assert.equal((await api('/assistant/history?courseId=' + courseId, outsider)).status, 403);
    assert.equal((await api('/assistant/chat', outsider, 'POST', { courseId, question: 'Explain closures' })).status, 403);
    const courses = await api('/assistant/courses', student);
    assert.equal(courses.status, 200);
    assert.deepEqual(courses.data.courses.map(item => item._id), [courseId]);
    assert.equal(providerCalls, 0);
  });
  await check('real ownership and publishing checks', async () => {
    const edit = status => api('/course/editCourse', pendingInstructor, 'POST', { courseId: String(draft._id), status });
    assert.equal((await edit('Published')).status, 403);
    assert.equal((await edit('Draft')).status, 200);
    assert.equal((await api('/course/createCourse', pendingInstructor, 'POST', { status: 'Published' })).status, 403);
    assert.equal((await api('/course/updateSubSection', pendingInstructor, 'POST', { sectionId, subSectionId: lectureId, title: 'Foreign edit' })).status, 403);
    await User.updateOne({ _id: pendingInstructor._id }, { $set: { approved: true } });
    assert.equal((await edit('Published')).status, 200);
    assert.equal((await Course.findById(draft._id)).status, 'Published');
    const ownEdit = await api('/course/updateSubSection', instructor, 'POST', { sectionId, subSectionId: lectureId, title: 'Closures' });
    assert.equal(ownEdit.status, 200);
  });
  await check('live Groq stream, citations, and persisted history', async () => {
    const result = await chat('Explain closures and lexical scope with the counter example.');
    const answer = assertAnswer(result);
    assert.match(answer, /\[\d+\]/, 'Provider answer should cite course material');
    const done = result.events.find(event => event.type === 'done');
    assert.ok(done.sources.some(source => source.url.includes('/sub-section/' + lectureId)));
    const stored = await ChatSession.findOne({ user: student._id, course: course._id }).lean();
    assert.equal(stored.messages.length, 2);
    assert.equal(stored.messages[1].content, answer);
    assert.equal(stored.lockedUntil.getTime(), 0);
    const history = await api('/assistant/history?courseId=' + courseId, student);
    assert.equal(history.data.messages[1].content, answer);
    report('INFO Live answer received (' + answer.length + ' characters, ' + done.sources.length + ' sources)');
  });
  await check('live follow-up uses saved course context', async () => {
    const answer = assertAnswer(await chat('Can you explain it simply?'));
    assert.match(answer, /counter|closure|scope|remember|variable/i);
  });
  await check('unsupported topic avoids the provider', async () => {
    const before = providerCalls;
    const answer = assertAnswer(await chat('quantum photosynthesis'));
    assert.match(answer, /find enough relevant material/);
    assert.equal(providerCalls, before);
  });
  await check('source destination course access and private note filtering', async () => {
    const result = await api('/course/getFullCourseDetails', student, 'POST', { courseId });
    assert.equal(result.status, 200);
    const found = result.data.data.courseDetails.courseContent[0].subSection[0];
    assert.equal(found._id, lectureId);
    assert.equal(found.assistantNotes, undefined);
    assert.equal(result.data.data.courseDetails.instructor.password, undefined);
    assert.equal((await api('/course/getFullCourseDetails', outsider, 'POST', { courseId })).status, 403);
  });
  await check('database lock blocks overlapping chat and history clearing', async () => {
    await ChatSession.updateOne({ user: student._id, course: course._id }, { $set: { lockedUntil: new Date(Date.now() + 90000) } });
    try {
      assert.equal((await chat('Explain closures')).status, 409);
      assert.equal((await api('/assistant/history', student, 'DELETE', { courseId })).status, 409);
    } finally {
      await ChatSession.updateOne({ user: student._id, course: course._id }, { $set: { lockedUntil: new Date(0) } });
    }
  });
  await check('revoked enrollment immediately blocks saved history', async () => {
    await Course.updateOne({ _id: course._id }, { $pull: { studentsEnrolled: student._id } });
    try { assert.equal((await api('/assistant/history?courseId=' + courseId, student)).status, 403); }
    finally { await Course.updateOne({ _id: course._id }, { $addToSet: { studentsEnrolled: student._id } }); }
  });
  await check('daily usage quota is enforced by MongoDB', async () => {
    const period = 86400000, bucket = Math.floor(Date.now() / period);
    await AssistantUsage.updateOne({ _id: String(student._id) + ':' + period + ':' + bucket }, { $set: { count: 100, expiresAt: new Date(Date.now() + period) } }, { upsert: true });
    assert.equal((await chat('Explain closures')).status, 429);
  });
  await check('chat clearing persists to MongoDB', async () => {
    assert.equal((await api('/assistant/history', student, 'DELETE', { courseId })).status, 200);
    const history = await api('/assistant/history?courseId=' + courseId, student);
    assert.deepEqual(history.data.messages, []);
  });
  report('INFO Real Groq requests: ' + providerCalls);
}
main().catch(error => { failures++; report('FAIL ' + error.message); }).finally(async () => {
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  if (connected) {
    try {
      // Only the random database created by this exact invocation may be dropped.
      assert.match(databaseName, /^sn_live_[a-f0-9]{20}$/);
      assert.equal(mongoose.connection.name, databaseName);
      await mongoose.connection.dropDatabase();
      const collections = await mongoose.connection.db.listCollections().toArray();
      assert.equal(collections.length, 0);
      report('PASS Temporary database removed; no test records remain');
    } catch (_) { failures++; report('FAIL Cleanup failed for ' + databaseName); }
  }
  await mongoose.disconnect();
  global.fetch = originalFetch;
  console.log = originalLog;
  report(failures ? 'RESULT ' + failures + ' check(s) failed' : 'RESULT All live checks passed');
  process.exitCode = failures ? 1 : 0;
});
