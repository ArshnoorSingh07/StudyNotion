const Section = require('../models/Section');
const Course = require('../models/Course');

exports.createSection = async(req, res) => {
    try{

        // data fetch
        const {sectionName, courseId} = req.body;

        // data validation
        if(!sectionName || !courseId) {
            return res.status(400).json({
                success:false,
                message:"All fields are required",
            })
        }
        
        // create Section
        const newSection = await Section.create({sectionName})

        // update Course with section ObjectID
        const updatedCourseDetails = await Course.findByIdAndUpdate(
            courseId,
            {
                $push:{courseContent:newSection._id},
            },
            {new:true}, 
        ).populate({ // used populate to replace section/subsection both in the updatedCourseDetails
            path: "courseContent", // populate sections
            populate: {
                path: "subSection", // populate subsections inside sections
            },
        })
        .exec();
    
        // return successfull response
        return res.status(200).json({
            success:true,
            message:"Section created Successfully",
            updatedCourseDetails,
        })

    } catch(error) {
        console.log("Error While Creating Section : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to Create Section",
            error:error.message,
        })
    }
};


exports.updateSection = async(req, res) =>{
    try{

        // data input
        const {sectionName, sectionId} = req.body;

        // data validation
        if(!sectionName || !sectionId) {
            return res.status(400).json({
                success:false,
                message:"All fields are required",
            })
        }

        // update data
        const section= await Section.findByIdAndUpdate(
            sectionId,
            {sectionName},
            {new:true},
        )

        // return response
        return res.status(200).json({
            success:true,
            message:"Section Updated Successfully",
        })


    } catch(error) {
        console.log("Error While Updating Section : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to Update Section",
            error:error.message,
        })
    }
};

exports.deleteSection = async(req, res) => {
    try{

        // getId - assuming that we are sending id in params
        const {sectionId} = req.params;

        // use findByIdAndDelete
        await Section.findByIdAndDelete(sectionId);

        // TODO[Testing]: do we need to delete the entry from the course schema?

        // return response
        return res.status(200).json({
            success:true,
            message:"Section Deleted Successfully",
        })

    } catch(error) {
        console.log("Error While Deleting Section : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to Delete Section",
            error:error.message,
        })
    }
}