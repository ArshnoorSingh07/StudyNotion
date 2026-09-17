const router = require('express').Router();
const { auth, isStudent } = require('../middlewares/auth');
const assistant = require('../controllers/Assistant');

router.use(auth, isStudent);
router.get('/courses', assistant.listCourses);
router.get('/history', assistant.history);
router.delete('/history', assistant.clear);
router.post('/chat', assistant.chat);
module.exports = router;
