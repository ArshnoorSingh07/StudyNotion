const CourseProgress = require('../models/CourseProgress');
const Course = require('../models/Course');
const Section = require('../models/Section');
const SubSection = require('../models/SubSection');
const User = require('../models/User');
const validId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);

exports.updateCourseProgress = async (req, res) => {
  const { courseId, subSectionId } = req.body || {};
  if (!validId(courseId) || !validId(subSectionId)) {
    return res.status(400).json({ success: false, message: 'Invalid course or lecture.' });
  }
  try {
    const userId = req.user.id;
    const user = await User.exists({ _id: userId, accountType: 'Student', active: { $ne: false } });
    const course = await Course.findOne({ _id: courseId, studentsEnrolled: userId, status: 'Published' }).select('courseContent');
    if (!user || !course) return res.status(403).json({ success: false, message: 'You do not have access to this course.' });
    const section = await Section.exists({ _id: { $in: course.courseContent }, subSection: subSectionId });
    if (!section || !await SubSection.exists({ _id: subSectionId })) {
      return res.status(400).json({ success: false, message: 'That lecture does not belong to this course.' });
    }
    const progress = await CourseProgress.findOneAndUpdate(
      { courseID: courseId, userId }, { $addToSet: { completedVideos: subSectionId } }, { new: true }
    );
    if (!progress) return res.status(404).json({ success: false, message: 'Course progress does not exist.' });
    return res.json({ success: true, message: 'Course Progress Updated Successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not update course progress.' });
  }
};
