const Course = require('../models/Course');
const User = require('../models/User');
const Section = require('../models/Section');
const id = value => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);

// Protect the content that feeds the tutor as well as the instructor editor.
exports.courseOwnership = async (req, res, next) => {
  try {
    const { courseId, sectionId, subSectionId } = req.body || {};
    if ((!courseId && !sectionId) || (courseId !== undefined && !id(courseId)) || (sectionId !== undefined && !id(sectionId)) || (subSectionId !== undefined && (!id(subSectionId) || !id(sectionId)))) {
      return res.status(400).json({ success: false, message: 'Invalid course or lecture.' });
    }
    const user = await User.findById(req.user.id).select('accountType active').lean();
    if (!user || user.active === false || user.accountType !== 'Instructor') {
      return res.status(403).json({ success: false, message: 'An active instructor account is required.' });
    }
    const course = await Course.findOne({ instructor: req.user.id,
      ...(courseId ? { _id: courseId } : {}), ...(sectionId ? { courseContent: sectionId } : {}),
    }).select('_id').lean();
    if (!course || (subSectionId && !await Section.exists({ _id: sectionId, subSection: subSectionId }))) {
      return res.status(403).json({ success: false, message: 'You can only manage content in your own course.' });
    }
    next();
  } catch (_) {
    res.status(500).json({ success: false, message: 'Could not verify course ownership.' });
  }
};
