const test = require('node:test');
const assert = require('node:assert/strict');

const { signup } = require('../controllers/Auth');
const User = require('../models/User');
const OTP = require('../models/Otp');
const Profile = require('../models/Profile');

function resFactory() {
  return {
    status(code) {
      this.code = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
    send(payload) {
      this.payload = payload;
      return this;
    },
  };
}

test('signup marks instructor accounts pending approval and student accounts approved', async (t) => {
  t.mock.method(User, 'findOne', async () => null);
  t.mock.method(OTP, 'find', () => ({
    sort: () => ({
      limit: async () => [{ otp: '123456' }],
    }),
  }));
  t.mock.method(Profile, 'create', async () => ({ _id: 'profile-123' }));
  const userCreate = t.mock.method(User, 'create', async (data) => ({ ...data, _id: 'user-123' }));

  let req = {
    body: {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@school.com',
      password: 'password123',
      confirmPassword: 'password123',
      accountType: 'Instructor',
      contactNumber: '1234567890',
      otp: '123456',
    },
  };
  let response = resFactory();
  await signup(req, response);
  assert.equal(response.payload.success, true);
  assert.equal(response.payload.user.approved, false);
  assert.equal(userCreate.mock.calls.at(-1).arguments[0].accountType, 'Instructor');

  req = {
    body: {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john@school.com',
      password: 'password123',
      confirmPassword: 'password123',
      accountType: 'Student',
      contactNumber: '0987654321',
      otp: '123456',
    },
  };
  response = resFactory();
  await signup(req, response);
  assert.equal(response.payload.success, true);
  assert.equal(response.payload.user.approved, true);
  assert.equal(userCreate.mock.calls.at(-1).arguments[0].accountType, 'Student');
});

test('public signup rejects admin and unknown account types before database access', async t => {
  const lookup = t.mock.method(User, 'findOne', async () => { throw new Error('must not access database'); });
  for (const accountType of ['Admin', 'admin', '', undefined, { $ne: 'Student' }]) {
    const res = resFactory();
    await signup({ body: { accountType } }, res);
    assert.equal(res.code, 400);
  }
  assert.equal(lookup.mock.calls.length, 0);
});
