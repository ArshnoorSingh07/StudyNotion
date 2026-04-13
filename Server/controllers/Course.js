const Course = require('../models/Course');
const Category = require('../models/Category');
const User = require('../models/User');
const {uploadImageToCloudinary} = require('../utils/imageUploader');
require('dotenv').config();

// createCourse handler function
exports.createCourse = async(req,res) => {
    try{

        // fetch Data
        const {courseName, courseDescription, whatYouWillLearn, price, category} = req.body;

        // get Thumbnail
        const thumbnail = req.files.thumbnailImage;

        // Validation
        if(!courseName || !courseDescription || !whatYouWillLearn || !price || !category || !thumbnail){
            return res.status(400).json({
                success:false,
                message:"All fields are required",
            });
        }

        // check for Instructor
        const userID = req.user.id;
        const instructorDetails = await User.findById(userID);
        console.log("Instructor Details : ",instructorDetails);
        // TODO: Verify that userID and instructorDetails._id are same or different?

        if(!instructorDetails){
            return res.status(404).json({
                success:false,
                message:"Instructor details not Found",
            });
        }

        // check given Category is valid or not
        const categoryDetails = await Category.findById(category);
        if(!categoryDetails){
            return res.status(404).json({
                success:false,
                message:"Category details not Found",
            });
        }

        // Upload Image to Cloudinary
        const thumbnailImage = await uploadImageToCloudinary(thumbnail, process.env.FOLDER_NAME);

        // Create an Entry for new Course
        const newCourse = await Course.create(
            {
                courseName,
                courseDescription,
                instructor: instructorDetails._id,
                whatYouWillLearn,
                price,
                category: categoryDetails._id,
                thumbnail: thumbnailImage.secure_url,
            }
        );

        // Add the new course to the User Schema of Instructor
        await User.findByIdAndUpdate(
            {_id : instructorDetails._id},
            {
                $push : {
                    courses:newCourse._id
                }
            },
            {new:true},
        );

        // update category Schema
        await Category.findByIdAndUpdate(
            { _id: categoryDetails._id },
            {
                $push: {
                    course: newCourse._id,
                },
            },
            { new: true }
        );


        // return response
        return res.status(200).json({
            success:true,
            message:"Course Created successfully",
            data:newCourse,
        })


    } catch(error) {
        console.log("Error while Creating Course",error);
        return res.status(500).json({
            success:false,
            message:"Failed to create Course",
            error:error.message,
        })
    }
};


// getAllCourses handler function
exports.showAllCourses = async(req, res) => {
    try{

        // TODO: change the below statement incrementally
        const allCourses = await Course.find({});

        return res.status(200).json({
            success:true,
            message:"Data for all courses fetched Successfully",
            allCourses,
        })

    } catch(error){
        console.log("Error While showing all Courses: ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to fetch Course data",
            error:error.message,
        })
    }
}
