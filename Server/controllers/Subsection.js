const Subsection = require('../models/SubSection');
const Section = require('../models/Section');
const { uploadImageToCloudinary } = require('../utils/imageUploader');
require('dotenv').config();

// create subSection
exports.createSubsection = async(req, res)=> {
    try{

        // fetch data from req body
        const {sectionId, title, timeDuration, description} = req.body;

        // extract file/video
        const video = req.files.videoFile;

        // validation of data
        if(!sectionId || !title || !timeDuration || !description || !video){
            return res.status(400).json({
                success:false,
                message:"All fields are required",
            })
        }

        // upload video to cloudinary
        const uploadDetails = await uploadImageToCloudinary(video, process.env.FOLDER_NAME);

        // create sub-section 
        const subSectionDetails = await Subsection.create({
            title:title,
            timeDuration:timeDuration,
            description:description,
            videoUrl:uploadDetails.secure_url,
        })

        // update section with this subsectionId
        const updatedSection = await Section.findByIdAndUpdate(
            sectionId,
            {
                $push: {
                    subSection:subSectionDetails._id,
                }
            },
            {new:true},
        ).populate("subSection").exec();


        // return response
        return res.status(200).json({
            success:true,
            message:"Sub-Section Created Successfully",
            updatedSection,
        })

    } catch(error){
        console.log("Error While Creating Subsection : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to Create Subsection",
            error:error.message,
        })
    }
}


// update Subsection 
exports.updateSubsection = async (req, res) => {
    try {
        const { subsectionId, title, timeDuration, description } = req.body;

        // optional video
        const video = req.files?.videoFile;

        // validation
        if (!subsectionId) {
            return res.status(400).json({
                success: false,
                message: "Subsection ID is required",
            });
        }

        // find subsection
        const subsection = await Subsection.findById(subsectionId);
        if (!subsection) {
            return res.status(404).json({
                success: false,
                message: "Subsection not found",
            });
        }

        // update fields (only if provided)
        if (title) subsection.title = title;
        if (timeDuration) subsection.timeDuration = timeDuration;
        if (description) subsection.description = description;

        // update video if provided
        if (video) {
            const uploadDetails = await uploadImageToCloudinary(
                video,
                process.env.FOLDER_NAME
            );
            subsection.videoUrl = uploadDetails.secure_url;
        }

        await subsection.save();

        return res.status(200).json({
            success: true,
            message: "Subsection Updated Successfully",
            data: subsection,
        });

    } catch (error) {
        console.log("Error While Updating Subsection : ", error);
        return res.status(500).json({
            success: false,
            message: "Unable to Update Subsection",
            error: error.message,
        });
    }
};

// delete Subsection
exports.deleteSubsection = async (req, res) => {
    try {
        const { subsectionId, sectionId } = req.body;

        if (!subsectionId || !sectionId) {
            return res.status(400).json({
                success: false,
                message: "SubsectionId and SectionId are required",
            });
        }

        // delete subsection
        await Subsection.findByIdAndDelete(subsectionId);

        // remove from section
        const updatedSection = await Section.findByIdAndUpdate(
            sectionId,
            {
                $pull: {
                    subSection: subsectionId,
                },
            },
            { new: true }
        ).populate("subSection");

        return res.status(200).json({
            success: true,
            message: "Subsection Deleted Successfully",
            data: updatedSection,
        });

    } catch (error) {
        console.log("Error While Deleting Subsection : ", error);
        return res.status(500).json({
            success: false,
            message: "Unable to Delete Subsection",
            error: error.message,
        });
    }
};
