const test = require('node:test');
const assert = require('node:assert/strict');
const Course = require('../models/Course');
const User = require('../models/User');
const Section = require('../models/Section');
const { courseOwnership } = require('../middlewares/courseOwnership');
const userId = '111111111111111111111111';
const courseId = '222222222222222222222222';
const sectionId = '333333333333333333333333';
const subSectionId = '444444444444444444444444';
const query = value => ({ select() { return this; }, lean: async () => value });
async function run(t, body, options = {}) {
  const filters = [];
  t.mock.method(User, 'findById', () => query(options.deleted ? null : { accountType: options.role || 'Instructor', active: !options.inactive }));
  t.mock.method(Course, 'findOne', filter => { filters.push(filter); return query(options.foreign ? null : { _id: courseId }); });
  t.mock.method(Section, 'exists', async filter => { assert.deepEqual(filter, { _id: sectionId, subSection: subSectionId }); return !options.foreignLecture; });
  const res = { status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
  let next = false;
  await courseOwnership({ user: { id: userId }, body }, res, () => { next = true; });
  return { res, next, filters };
}
test('owner can edit a course, a section, and a lecture with scoped queries', async t => {
  for (const body of [{ courseId }, { sectionId }, { courseId, sectionId, subSectionId }]) {
    const result = await run(t, body);
    assert.equal(result.next, true);
    assert.deepEqual(result.filters[0], { instructor: userId, ...(body.courseId ? { _id: courseId } : {}), ...(body.sectionId ? { courseContent: sectionId } : {}) });
  }
});
test('rejects malformed IDs, object injection, and lectures without their section', async t => {
  for (const body of [{}, { courseId: { $ne: null } }, { courseId, sectionId: '' }, { courseId, subSectionId }, { sectionId, subSectionId: 'bad' }]) {
    const result = await run(t, body);
    assert.equal(result.res.code, 400); assert.equal(result.next, false); assert.equal(result.filters.length, 0);
  }
});
test('rejects foreign courses, mismatched lectures, and ineligible accounts', async t => {
  for (const options of [{ foreign: true }, { foreignLecture: true }, { deleted: true }, { inactive: true }, { role: 'Student' }]) {
    const result = await run(t, { courseId, sectionId, subSectionId }, options);
    assert.equal(result.res.code, 403); assert.equal(result.next, false);
  }
});
test('database failure fails closed', async t => {
  t.mock.method(User, 'findById', () => { throw new Error('database unavailable'); });
  let next = false;
  const res = { status(code) { this.code = code; return this; }, json() { return this; } };
  await courseOwnership({ user: { id: userId }, body: { courseId } }, res, () => { next = true; });
  assert.equal(res.code, 500); assert.equal(next, false);
});
