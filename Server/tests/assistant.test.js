const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { chunkText, retrieve } = require('../services/ai/retrievalService');
const { createAssistantController } = require('../controllers/Assistant');
const { generateAnswer } = require('../services/ai/groqClient');

const userId = '111111111111111111111111';
const courseId = '222222222222222222222222';
const lectureId = '333333333333333333333333';
const course = { _id: courseId, courseName: 'JavaScript', courseDescription: 'Learn JavaScript',
  courseContent: [{ _id: '444444444444444444444444', sectionName: 'Functions', subSection: [
    { _id: lectureId, title: 'Closures', description: 'Lexical scope', assistantNotes: 'A closure retains access to variables from the surrounding lexical scope after its outer function returns.' },
    { _id: '555555555555555555555555', title: 'Arrays', assistantNotes: 'Arrays store ordered collections. Use map to transform each element.' },
  ] }] };
const query = value => ({ select() { return this; }, populate() { return this; }, sort() { return this; }, lean: async () => value });
function response() {
  return Object.assign(new EventEmitter(), {
    statusCode: 200, headersSent: false, destroyed: false, writableEnded: false, chunks: [],
    status(code) { this.statusCode = code; return this; }, set() { return this; },
    json(value) { this.data = value; return this; }, flushHeaders() { this.headersSent = true; },
    write(value) { this.chunks.push(value); }, end() { this.writableEnded = true; },
  });
}
function harness(options = {}) {
  const writes = []; const filters = []; const calls = []; let generated = 0;
  const session = { _id: 'session', messages: options.messages || [] };
  const controller = createAssistantController({
    User: { findById: () => query(options.deleted ? null : { accountType: 'Student', active: !options.inactive }) },
    Course: { findOne(filter) { filters.push(filter); return query(options.denied ? null : course); }, find: () => query([course]) },
    ChatSession: {
      updateOne: async (filter, update) => { writes.push({ filter, update }); },
      findOneAndUpdate: () => query(options.locked ? null : session),
      findOne: () => query(session), exists: async () => false,
    },
    AssistantUsage: { findOneAndUpdate: async () => ({ count: options.quota || 1 }) },
    generateAnswer: async function* (data) { generated++; calls.push(data);
      if (options.failure) throw Error('provider secret must not leak');
      yield 'A closure remembers its lexical scope [1].'; },
  });
  return { controller, writes, filters, calls, generated: () => generated };
}
const request = body => ({ user: { id: userId }, body: { courseId, question: 'How do closures retain lexical scope?', ...body } });

test('passages overlap and retrieval selects the relevant lecture', () => {
  const words = Array.from({ length: 500 }, (_, i) => `word${i}`).join(' ');
  const chunks = chunkText(words);
  assert.equal(chunks[0].split(' ').length, 220);
  assert.equal(chunks[1].split(' ')[0], 'word185');
  const result = retrieve(course, 'closure lexical scope', lectureId);
  assert.equal(result[0].lectureId, lectureId);
  assert.match(result[0].url, new RegExp(courseId));
  assert.equal(retrieve(course, 'quantum photosynthesis').length, 0);
});
test('lecture summaries and short follow-ups retain course context', () => {
  assert.equal(retrieve(course, 'Summarize this lecture', lectureId)[0].lectureId, lectureId);
  assert.equal(retrieve(course, 'Explain again', undefined, [{ role: 'user', content: 'closure lexical scope' }])[0].lectureId, lectureId);
});
test('notes edits and deletions affect the next retrieval', () => {
  const updated = structuredClone(course);
  updated.courseContent[0].subSection[0].assistantNotes = 'Updated material about generators';
  assert.ok(retrieve(updated, 'generators')[0].content.includes('Updated material'));
  updated.courseContent[0].subSection = [];
  assert.equal(retrieve(updated, 'generators').length, 0);
});
test('unenrolled, inactive, and deleted students cannot call the provider', async () => {
  for (const options of [{ denied: true }, { inactive: true }, { deleted: true }]) {
    const h = harness(options); const res = response();
    await h.controller.chat(request(), res);
    assert.equal(res.statusCode, 403); assert.equal(h.generated(), 0); assert.equal(h.writes.length, 0);
  }
});
test('valid chat streams and saves a bounded history with course references', async () => {
  const h = harness({ messages: Array.from({ length: 40 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'older message' })) });
  const res = response(); await h.controller.chat(request({ lectureId }), res);
  assert.equal(h.filters[0].studentsEnrolled, userId); assert.equal(h.filters[0].status, 'Published');
  assert.ok(res.chunks.some(chunk => chunk.includes('"type":"done"')));
  const saved = h.writes.find(write => write.update.$set?.messages)?.update.$set.messages;
  assert.equal(saved.length, 40); assert.match(saved.at(-1).sources[0].url, /view-course/);
  assert.equal(h.writes.at(-1).update.$set.lockedUntil.getTime(), 0);
});
test('questions absent from notes reach the model with history and no fabricated sources', async () => {
  for (const question of ['What is useEffect?', 'What is useState hook?', 'quantum photosynthesis']) {
    const messages = [{ role: 'user', content: 'Explain closures' }, { role: 'assistant', content: 'A closure retains scope.' }];
    const h = harness({ messages }); const res = response();
    await h.controller.chat(request({ question }), res);
    assert.equal(h.generated(), 1);
    assert.deepEqual(h.calls[0].passages, []);
    assert.deepEqual(h.calls[0].history, messages);
    assert.equal(h.calls[0].question, question);
    assert.equal(h.calls[0].courseName, course.courseName);
    assert.ok(res.chunks.join('').includes('"type":"done"'));
    const saved = h.writes.find(write => write.update.$set?.messages).update.$set.messages;
    assert.deepEqual(saved.at(-1).sources, []);
    assert.equal(h.writes.at(-1).update.$set.lockedUntil.getTime(), 0);
  }
});

test('rejects object injection, oversized questions, and unrelated lectures before generation', async () => {
  for (const body of [{ courseId: { $ne: null } }, { question: 'x'.repeat(2001) }, { lectureId: 'aaaaaaaaaaaaaaaaaaaaaaaa' }]) {
    const h = harness(); const res = response(); await h.controller.chat(request(body), res);
    assert.equal(res.statusCode, 400); assert.equal(h.generated(), 0);
  }
});
test('rate limit and active-session lock reject duplicate requests', async () => {
  for (const [options, code] of [[{ quota: 11 }, 429], [{ locked: true }, 409]]) {
    const h = harness(options); const res = response(); await h.controller.chat(request(), res);
    assert.equal(res.statusCode, code); assert.equal(h.generated(), 0);
  }
});
test('provider failure releases the session without persisting partial messages or secrets', async () => {
  const h = harness({ failure: true }); const res = response(); await h.controller.chat(request(), res);
  assert.ok(res.chunks.join('').includes('"type":"error"'));
  assert.ok(!res.chunks.join('').includes('provider secret'));
  assert.ok(!h.writes.some(write => write.update.$set?.messages));
  assert.equal(h.writes.at(-1).update.$set.lockedUntil.getTime(), 0);
});
test('history authorization is enforced before returning saved messages', async () => {
  const h = harness({ denied: true }); const res = response();
  await h.controller.history({ user: { id: userId }, query: { courseId } }, res);
  assert.equal(res.statusCode, 403);
});
test('vague follow-up questions reuse prior course context instead of emptying the retrieval set', () => {
  const history = [
    { role: 'user', content: 'What is a closure?' },
    { role: 'assistant', content: 'A closure is a function that remembers its outer scope.' },
    { role: 'user', content: 'Can you explain it simply?' },
    { role: 'assistant', content: 'It keeps access to variables from the surrounding function.' },
  ];
  const result = retrieve(course, 'What does that mean?', undefined, history);
  assert.ok(result.length > 0);
  assert.equal(result[0].title, 'Closures');
});
test('Groq client parses split SSE frames and sends bounded server-only context', async t => {
  const priorKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = 'local-test-only';
  t.after(() => { if (priorKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = priorKey; });
  t.mock.method(global, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
    const body = JSON.parse(options.body); assert.equal(body.messages.length, 8); assert.equal(body.stream, true);
    const text = 'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\ndata: [DONE]\n\n';
    return { ok: true, body: (async function* () { yield Buffer.from(text.slice(0, 20)); yield Buffer.from(text.slice(20)); })() };
  });
  let answer = '';
  for await (const text of generateAnswer({ question: 'Hi', passages: [], history: Array.from({ length: 10 }, () => ({ role: 'user', content: 'hello' })), signal: new AbortController().signal })) answer += text;
  assert.equal(answer, 'Hello');
});

test('explicit topic changes do not retrieve earlier unrelated questions', () => {
  const history = [{ role: 'user', content: 'Arrays store ordered collections map transform each element' }];
  assert.deepEqual(retrieve(course, 'Explain closures and lexical scope', undefined, history).map(p => p.title), ['Closures']);
  assert.deepEqual(retrieve(course, 'quantum photosynthesis', undefined, history), []);
});
test('vague follow-ups use the latest topic rather than older topics', () => {
  const history = [{ role: 'user', content: 'closure lexical scope' }, { role: 'user', content: 'Explain arrays' }, { role: 'user', content: 'Explain it simply' }];
  assert.equal(retrieve(course, 'What does that mean?', undefined, history)[0].title, 'Arrays');
});
