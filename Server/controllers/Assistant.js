const Course = require('../models/Course');
const User = require('../models/User');
const ChatSession = require('../models/ChatSession');
const AssistantUsage = require('../models/AssistantUsage');
const { retrieve } = require('../services/ai/retrievalService');
const { generateAnswer } = require('../services/ai/groqClient');

const fail = (status, message) => Object.assign(new Error(message), { status });
const validId = value => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);

// Dependency injection keeps access-control and streaming tests independent of live services.
function createAssistantController(deps = {}) {
  const courses = deps.Course || Course;
  const users = deps.User || User;
  const sessions = deps.ChatSession || ChatSession;
  const usage = deps.AssistantUsage || AssistantUsage;
  const generate = deps.generateAnswer || generateAnswer;

  async function student(req) {
    const user = await users.findById(req.user.id).select('accountType active').lean();
    if (!user || user.active === false || user.accountType !== 'Student') {
      throw fail(403, 'The study assistant is available to active student accounts.');
    }
  }
  async function authorizedCourse(req, courseId, content = false) {
    if (!validId(courseId)) throw fail(400, 'Please choose a valid course.');
    await student(req);
    let query = courses.findOne({ _id: courseId, studentsEnrolled: req.user.id, status: 'Published' })
      .select('courseName courseDescription whatYouWillLearn courseContent');
    if (content) query = query.populate({ path: 'courseContent', select: 'sectionName subSection',
      populate: { path: 'subSection', select: 'title description +assistantNotes' } });
    const course = await query.lean();
    if (!course) throw fail(403, 'Choose a published course you are enrolled in.');
    return course;
  }
  async function quota(userId) {
    const now = Date.now();
    for (const [period, limit] of [[60000, 10], [86400000, 100]]) {
      const bucket = Math.floor(now / period);
      const record = await usage.findOneAndUpdate({ _id: `${userId}:${period}:${bucket}` },
        { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 2) * period) } },
        { upsert: true, new: true });
      if (record.count > limit) throw fail(429, period === 60000
        ? 'Please wait a minute before asking another question.' : 'You have reached today’s assistant limit. Try again tomorrow.');
    }
  }
  const handle = fn => async (req, res) => {
    try { await fn(req, res); }
    catch (error) { res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Could not load the assistant. Please try again.' }); }
  };

  return {
    listCourses: handle(async (req, res) => {
      await student(req);
      const data = await courses.find({ studentsEnrolled: req.user.id, status: 'Published' })
        .select('courseName').sort({ courseName: 1 }).lean();
      res.json({ success: true, courses: data });
    }),
    history: handle(async (req, res) => {
      await authorizedCourse(req, req.query.courseId);
      const session = await sessions.findOne({ user: req.user.id, course: req.query.courseId }).lean();
      res.set('Cache-Control', 'no-store').json({ success: true, messages: session?.messages || [] });
    }),
    clear: handle(async (req, res) => {
      await authorizedCourse(req, req.body.courseId);
      const session = await sessions.findOneAndUpdate({ user: req.user.id, course: req.body.courseId,
        lockedUntil: { $lte: new Date() } }, { $set: { messages: [] } });
      if (!session && await sessions.exists({ user: req.user.id, course: req.body.courseId })) {
        throw fail(409, 'Wait for the current answer before starting a new chat.');
      }
      res.json({ success: true });
    }),
    chat: async (req, res) => {
      let lock;
      const abort = new AbortController();
      const timeout = setTimeout(() => abort.abort(), 55000);
      const onClose = () => { if (!res.writableEnded) abort.abort(); };
      res.on('close', onClose);
      const send = (type, data) => {
        if (!res.destroyed) res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
      };
      try {
        const { question, courseId, lectureId } = req.body || {};
        if (typeof question !== 'string' || !question.trim() || question.length > 2000) {
          throw fail(400, 'Ask a question between 1 and 2,000 characters.');
        }
        if (lectureId && !validId(lectureId)) throw fail(400, 'Invalid lecture.');
        const course = await authorizedCourse(req, courseId, true);
        if (lectureId && !course.courseContent.some(section => section.subSection.some(lecture => String(lecture._id) === lectureId))) {
          throw fail(400, 'That lecture does not belong to this course.');
        }
        if (!deps.generateAnswer && !process.env.GROQ_API_KEY) throw fail(503, 'The study assistant is not configured yet. Please try again later.');
        await quota(req.user.id);
        const filter = { user: req.user.id, course: courseId };
        // Ensure a single session exists; a concurrent initial request can lose the unique-index race.
        try { await sessions.updateOne(filter, { $setOnInsert: { ...filter, messages: [], lockedUntil: new Date(0) } }, { upsert: true }); }
        catch (error) { if (error.code !== 11000) throw error; }
        lock = await sessions.findOneAndUpdate({ ...filter, lockedUntil: { $lte: new Date() } },
          { $set: { lockedUntil: new Date(Date.now() + 90000) } }, { new: true }).lean();
        if (!lock) throw fail(409, 'An answer is already being prepared for this course.');
        const passages = retrieve(course, question, lectureId, lock.messages);
        const sources = passages.map(({ id, title, url, content }) => ({ id, title, url, excerpt: content.slice(0, 180) }));
        res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' });
        res.flushHeaders();
        let answer = '';
        for await (const text of generate({ question: question.trim(), passages, courseName: course.courseName, history: lock.messages, signal: abort.signal })) {
          if (abort.signal.aborted) throw fail(504, 'The answer took too long. Please try again.');
          answer += text;
          if (answer.length > 16000) throw fail(502, 'The answer was too long. Try asking a more specific question.');
          send('delta', { text });
        }
        if (!answer.trim()) throw fail(502, 'No answer was returned. Please try again.');
        // Recheck access/content after generation so revoked or deleted courses are not saved as a new response.
        await authorizedCourse(req, courseId);
        if (abort.signal.aborted) throw fail(504, 'The answer was interrupted. Please try again.');
        const messages = [...lock.messages, { role: 'user', content: question.trim(), sources: [] },
          { role: 'assistant', content: answer, sources }].slice(-40);
        await sessions.updateOne({ _id: lock._id }, { $set: { messages } });
        await sessions.updateOne({ _id: lock._id }, { $set: { lockedUntil: new Date(0) } });
        lock = null;
        send('done', { sources });
        res.end();
      } catch (error) {
        const message = abort.signal.aborted ? 'The answer was interrupted. Please try again.'
          : error.status ? error.message : 'The assistant could not answer right now. Please try again.';
        if (res.headersSent) { send('error', { message }); res.end(); }
        else if (!res.destroyed) res.status(error.status || 502).json({ success: false, message });
      } finally {
        clearTimeout(timeout);
        res.off('close', onClose);
        if (lock) await sessions.updateOne({ _id: lock._id }, { $set: { lockedUntil: new Date(0) } }).catch(() => {});
      }
    },
  };
}

module.exports = { ...createAssistantController(), createAssistantController, validId };
