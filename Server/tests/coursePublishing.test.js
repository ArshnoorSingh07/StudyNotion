const test = require('node:test');
const assert = require('node:assert/strict');
const User = require('../models/User');
const Course = require('../models/Course');
const { createCourse, editCourse } = require('../controllers/Course');
const query = value => ({ select() { return this; }, lean: async () => value });
const response = () => ({ status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } });
test('unapproved instructors cannot create or publish a published course', async t => {
  t.mock.method(User, 'findById', () => query({ accountType: 'Instructor', active: true, approved: false }));
  const lookup = t.mock.method(Course, 'findById', async () => { throw new Error('must not read course'); });
  for (const handler of [createCourse, editCourse]) {
    const res = response();
    await handler({ user: { id: 'instructor' }, body: { status: 'Published' } }, res);
    assert.equal(res.code, 403); assert.match(res.data.message, /approved/);
  }
  assert.equal(lookup.mock.calls.length, 0);
});
test('approved instructors can publish and pending instructors can save drafts', async t => {
  for (const approved of [false, true]) {
    t.mock.method(User, 'findById', () => query({ accountType: 'Instructor', active: true, approved }));
    let saved = false;
    const course = { save: async () => { saved = true; } };
    t.mock.method(Course, 'findById', async () => course);
    t.mock.method(Course, 'findOne', () => ({ populate() { return this; }, exec: async () => course }));
    const res = response();
    await editCourse({ user: { id: 'instructor' }, body: { courseId: 'course', status: approved ? 'Published' : 'Draft' } }, res);
    assert.equal(saved, true); assert.equal(res.data.success, true);
    assert.equal(course.status, approved ? 'Published' : 'Draft');
  }
});
test('inactive, deleted, or non-instructor accounts cannot create courses', async t => {
  for (const user of [null, { accountType: 'Student', approved: true }, { accountType: 'Instructor', approved: true, active: false }]) {
    t.mock.method(User, 'findById', () => query(user));
    const res = response();
    await createCourse({ user: { id: 'user' }, body: { status: 'Draft' } }, res);
    assert.equal(res.code, 403);
  }
});
