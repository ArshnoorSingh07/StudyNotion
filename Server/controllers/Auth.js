const User = require('../models/User');
const OTP = require('../models/Otp');
const otpGenerator = require('otp-generator');
const bcrypt = require('bcrypt');
const Profile = require('../models/Profile');
const jwt = require('jsonwebtoken');
require('dotenv').config();


// sendOTP
exports.sendOtp = async(req,res)=>{
    try{

        // fetch email from request body
        const {email} = req.body;

        // Check if user already exist 
        const checkUserPresent = await User.findOne({email});

        // if User already exist then return response
        if(checkUserPresent){
            return res.status(401).json({
                success:false,
                message:"User already Registered",
            });
        }

        // generate Otp
        var otp = otpGenerator.generate(6, {
            upperCaseAlphabets:false,
            lowerCaseAlphabets:false,
            specialChars:false,
        });
        console.log("Otp Generated : ",otp);

        // Check unique otp or not
        const result = await OTP.findOne({otp: otp});

        while(result){
            otp = otpGenerator.generate(6, {
                upperCaseAlphabets:false,
                lowerCaseAlphabets:false,
                specialChars:false,
            });

            result = await OTP.findOne({otp: otp});
        }

        const otpPayload = {email, otp};

        // Create in Entry in DB
        const otpBody = await OTP.create(otpPayload);
        console.log(otpBody);

        // return response successfully
        return res.status(200).json({
            success:true,
            message:"Otp Sent Successfully",
            otp,
        })


    } catch(error){
        console.log("Error while sending OTP",error);
        return res.status(500).json({
            success:false,
            message:error.message,
        })
    }
}

// Sign up
exports.signUp = async(req,res)=>{
    try{

        // data fetch
        const {
            firstName,
            lastName,
            email,
            password,
            confirmPassword,
            accountType,
            contactNumber,
            otp
        } = req.body;

        // Data validation
        if(!firstName || !lastName || !email || !password || !confirmPassword
             || !otp) {
                return res.status(403).json({
                    success:false,
                    message:"All fields are required",
                })
             }

        // match both password and confirmPassword
        if(password !== confirmPassword) {
            return res.status(400).json({
                success:false,
                message:"Password and ConfirmPassword value does not match, Please Try Again!",
            })
        }

        // check user already exist or not
        const existingUser = await User.findOne({email});
        if(existingUser) {
            return res.status(400).json({
                success:false,
                message:"User is already registered",
            })
        }

        // find most recent otp stored for the user
        const recentOtp = await OTP.find({email}).sort({createdAt:-1}).limit(1);
        console.log(recentOtp);

        // Validate OTP
        if(recentOtp.length === 0){
            // OTP not found
            return res.status(400).json({
                success:false,
                message:"OTP not found",
            })
        } else if( otp !== recentOtp.otp) {
            // Invalid OTP
            return res.status(400).json({
                success:false,
                message:"Invalid Otp",
            });
        }

        // Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create Entry in DB
        const profileDetails = await Profile.create({
            gender:null,
            dateOfBirth:null,
            about:null,
            contactNumber:null,
        }) ;

        const user = await User.create({
            firstName,
            lastName,
            email,
            contactNumber,
            password:hashedPassword,
            accountType,
            additionalDetails : profileDetails._id,
            image:`https://api.dicebear.com/5.x/initials/svg?seed=${firstName} ${lastName}`
        }) 

        // Return successfull response
        return res.status(200).json({
            success:true,
            message:"User is registered Successfully",
            user,
        });

    } catch(error){
        console.log("Error while signUp: ",error);
        return res.status(500).json({
            success:false,
            message:"User cannot be registered, Please try again",
        })
    }
}

// Login
exports.login = async(req,res)=>{
    try{

        // fetch data from request body
        const {email, password} = req.body;

        // data validation
        if(!email || !password){
            return res.status(403).json({
                success:false,
                message:"All fields are required, Please try again",
            })
        }

        // check user exists or not
        const user = await User.findOne({email}).populate("additionalDetails");
        if(!user){
            return res.status(401).json({
                success:false,
                message:"User is not registered, Please signup first"
            })
        }

        // generate JWT token, after matching password
        if(await bcrypt.compare(password,user.password)){
            const payload = {
                email : user.email,
                id : user._id,
                role : user.role,
            };

            const token = jwt.sign(payload, process.env.JWT_SECRET, {
                expiresIn:"2h",
            })

            user.token = token;
            user.password = undefined;
            
            // create cookie and send response
            const options = {
                expiresIn : new Date(Date.now() + 3*24*60*60*1000),
                httpOnly:true,
            }
    
            res.cookie('token', token, options).status(200).json({
                success:true,
                token,
                user,
                message:"Logged in Successfully",
            })
        }
        else{
            return res.status(400).json({
                success:false,
                message:"Password is incorrect",
            })
        }

    } catch(error){
        console.log("Error while Login: ",error);
        return res.status(500).json({
            success:false,
            message:"Login failure, Please try again",
        })
    }
};

// ChangePassword
exports.changePassword = async(req,res) => {
    try{

        // get data from request
        // get oldPassword, newPassword, confirmPassword
        const {oldPassword, newPassword, confirmPassword} = req.body;

        // get UserID
        const userID = req.user.id;

        // data Validation
        if(!oldPassword || !newPassword || !confirmPassword){
            return res.status(403).json({
                success:false,
                message:"All fields are required",
            })
        }
        
        // check newPassword == confirmPassword
        if(newPassword !== confirmPassword){
            return res.status(400).json({
                success:false,
                message:"New password and confirm password do not match",
            })
        }

        // get user from userid
        const user = await User.findById(userID);

        // Compare old password
        const isPassword = await bcrypt.compare(oldPassword, user.password);
        if(!isPassword){
            return res.status(401).json({
                success: false,
                message: "Old password is incorrect",
            });
        }

        if (oldPassword === newPassword) {
            return res.status(400).json({
                success: false,
                message: "New password must be different from old password",
            });
        }

        // Hash newPassword
        const hashedPassword = await bcrypt.hash(newPassword,10);     

        // update pwd in DB
        user.password = hashedPassword;
        await user.save();

        // send mail -> Password Updated
        try {
            await mailSender(
                user.email,
                "Password Updated Successfully",
                `<p>Your password has been updated successfully.</p>`
            );
        } catch (error) {
            console.log("Error sending email:", error);
        }
        
        // return response
        return res.status(200).json({
            success: true,
            message: "Password updated successfully",
        });

    } catch(err){

    }
}
