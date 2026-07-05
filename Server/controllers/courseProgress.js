const CourseProgress = require('../models/CourseProgress');
const SubSection = require('../models/SubSection');

exports.updateCourseProgress  = async(req, res) => {
    const {courseId, subSectionId} = req.body;
    const userId = req.user.id;

    try{
        // check if valid subSection or not
        const subSection = await SubSection.findById(subSectionId);

        if(!subSection){
            return res.status(400).json({
                error:"Invalid SubSection",
            })
        }

        // Check for old entry
        let courseProgress = await CourseProgress.findOne({
            courseID:courseId,
            userId:userId,
        });

        if(!courseProgress){
            return res.status(400).json({
                success:false,
                message:"Course Progress Does not Exist"
            })
        }
        else{
            // check for recompleting video or SubSection
            if(courseProgress.completedVideos.includes(subSectionId)){
                return res.status(400).json({
                    errror:"SubSection already completed",
                });
            }

            // push into completed video
            courseProgress.completedVideos.push(subSectionId);
        }

        await courseProgress.save();

        return res.status(200).json(
            {
                success:true,
                message:"Course Progress Updated Successfully",
            }
        )

    }
    catch(error){
        console.error(error);
        return res.status(400).json({
            error:"Internal Server Error",
        })
    }
}