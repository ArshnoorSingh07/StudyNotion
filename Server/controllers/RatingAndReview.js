const RatingAndReview = require('../models/RatingAndReview');
const Course = require('../models/Course');
const { default: mongoose } = require('mongoose');

// createRating
exports.createRating = async(req, res) => {
    try{

        // getuserId
        const userId = req.user.id;

        // fetch Data from req body
        const {review, rating, courseId} = req.body;

        // check if user is enrolled or not
        const courseDetails = await Course.findOne(
                                            {
                                                _id : courseId,
                                                studentsEnrolled:{$elemMatch: {$eq : userId}},
                                            });

        if(!courseDetails){
            return res.status(404).json({
                success:false,
                message:"Student is not enrolled in the Course",
            });
        }    

        // check if user already reviewed the course or not
        const alreadyReviewed = await RatingAndReview.findOne({
                                                user:userId,
                                                course:courseId,
        });

        if(alreadyReviewed){
            return res.status(403).json({
                success:false,
                message:"Course is already reviewed by the user",
            })
        }
        
        // create rating 
        const ratingReview = await RatingAndReview.create({
                                        rating, review, 
                                        course: courseId,
                                        user: userId,
        });

        // update course with rating review
        const updatedCourseDetails = await Course.findByIdAndUpdate(
            {_id : courseId},
            $push={
                ratingReview:ratingReview._id,
            },
            {new:true},
        );
        console.log("updated Course Details : ",updatedCourseDetails);

        // return response
        return res.status(200).json({
            success:true,
            message:"Rating and Review Created Successfully",
            ratingReview, 
        })

    } catch(error){
        console.log("Error while creating Rating: ",error);
        return res.status(500).json({
            success:false,
            message:"Error While Creating Rating",
            error:error.message,
        })

    }
};


// getAverageRating
exports.getAverageRating = async(req, res) =>{
    try{

        // get Course id
        const courseId = req.body.courseId;

        // calculate average rating
        const result = await RatingAndReview.aggregate([
            {
                $match:{
                    course:new mongoose.Types.ObjectId(courseId),
                },
            },
            {
                $group:{
                    _id:null,
                    averageRating : {$avg: "$rating"},
                }
            }
        ])

        // return rating
        if(result.length > 0){

            return res.status(200).json({
                success:true,
                averageRating: result[0].averageRating,
            })
        }

        // if no rating review exists
        return res.status(200).json({
            success:true,
            message:"average Rating is zero, No ratings given till now",
        })

    } catch(error){
        console.log("Error while geting Average Rating: ",error);
        return res.status(500).json({
            success:false,
            message:"Error While geting Average Rating",
            error:error.message,
        })
    }
}

// getAllRating And Reviews
exports.getAllRating = async(req, res) => {
    try{

        const allReviews = await RatingAndReview.find({})  
                                        .sort({rating:"desc"})
                                        .populate({
                                            path:"user",
                                            select:"firstName lastName email image",
                                        })
                                        .populate({
                                            path:"course",
                                            select: "courseName"
                                        })
                                        .exec();

        return res.status(200).json({
            success:true,
            message:"All reviews fetched successfully",
        })

    } catch(error){
        console.log("Error while geting All Rating: ",error);
        return res.status(500).json({
            success:false,
            message:"Error While geting All Rating",
            error:error.message,
        })

    }
}