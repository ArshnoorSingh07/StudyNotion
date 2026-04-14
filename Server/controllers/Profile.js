const Profile = require('../models/Profile');
const User = require('../models/User');
const Course = require('../models/Course');

exports.updateProfile = async (req,res) => {
    try{

        // get data 
        const {dateOfBirth="",about="", contactNumber, gender} =req.body;

        // get userid
        const id = req.user.id;

        // validation
        if(!contactNumber || !gender || !id){
            return res.status(400).json({
                success:false,
                message:"All fields are required",
            });
        }

        const userDetails = await User.findById(id);
        if (!userDetails) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        
        // find profile
        const profileId = userDetails.additionalDetails;
        const profileDetails = await Profile.findById(profileId);
        if (!profileDetails) {
            return res.status(404).json({
                success: false,
                message: "Profile not found",
            });
        }

        // update Profile
        profileDetails.dateOfBirth = dateOfBirth;
        profileDetails.about = about;
        profileDetails.contactNumber = contactNumber;
        profileDetails.gender = gender;
        await profileDetails.save();

        // return response
        return res.status(200).json({
            success:true,
            message:"Profile Upadated Successfully",
            profileDetails
        })

    } catch(error) {
        console.log("Error while Updating Profile");
        return res.status(500).json({
            success:false,
            message:"Unable to Update Profile",
            error:error.message,
        });
    }
};


// deleteAccount
// EXPLORE -> how can we schedule this delete operation ->Cron Job
exports.deleteAccount = async(req, res) => {
    try{

        // get id
        const id = req.user.id;

        // validation
        const userDetail = await User.findById(id);
        if(!userDetail){
            return res.status(400).json({
                success:false,
                message:"Unable to fetch User Details",
            });
        }

        // delete profile
        await Profile.findByIdAndDelete({_id:userDetail.additionalDetails});
        
        // unenroll user from all enrolled courses
        await Course.updateMany(
            { studentsEnrolled: id },
            {
                $pull: {
                    studentsEnrolled: id,
                },
            }
        );

        // delete user
        await User.findByIdAndDelete({_id:id});


        // return response 
        return res.status(200).json({
            success:true,
            message:"Profile Deleted Successfully"
        })

    } catch(error) {
        console.log("Error while Deleting Profile");
        return res.status(500).json({
            success:false,
            message:"Unable to Delete Profile",
            error:error.message,
        })
    }
};


exports.getAllUserDetail = async(req, res) => {
    try {

        // get id
        const id = req.user.id;

        // validation
        const userDetail = await User.findById(id).populate("additionalDetails").exec();
        
        // return res
        return res.status(200).json({
            success:true,
            message:"User Data Fetched Successfully",
            userDetail,
        });

    } catch(error) {
        console.log("Error while Fetching all User Details");
        return res.status(500).json({
            success:false,
            message:"Unable to fetch all User Details",
            error:error.message,
        })
    }
}