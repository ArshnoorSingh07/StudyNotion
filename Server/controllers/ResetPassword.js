const User = require('../models/User');
const mailSender = require('../utils/mailSender');
const bcrypt = require('bcrypt');


// reset Password Token
exports.resetPassword = async(req, res) => {
    try{

        // get email from req body
        const email = req.body.email;

        // check whether user exists or not ? , email validation
        const user = await User.findOne({email});
        if(!user){
            return res.json({
                success:false,
                message:"Your email is registered with us",
            })
        }

        // generate token
        const token = crypto.randomUUID();

        // Update User by adding token and expiration time
        const updatedDetails = await User.findOneAndUpdate(
                                                        {email:email},
                                                        {
                                                            token:token,
                                                            resetPasswordExpires: Date.now() +5*60*1000,
                                                        },
                                                        {new:true}
        );
        console.log("Updated Details : ",updatedDetails);

        // Create Url
        const url = `http://localhost:3000/update-password/${token}`
        
        // Send mail containing url 
        await mailSender(email,
                        "Password Reset Link",
                        `Password Reset Link: ${url}`
                    )

        // return response
        return res.status(200).json({
            success:true,
            message:"Email sent successfully, Please check email and change password",
        })

    } catch(error) {
        console.log("Error while resetting password : ",error);
        return res.status(500).json({
            success:false,
            message:"Something went Wrong while sending reset password mail",
        })
    }       
}


// reset Password
exports.resetPassword = async(req, res) => {
    try{

        // data fetch
        const {password, confirmPassword, token} = req.body;

        // data validation
        if(password !== confirmPassword){
            return res.json({
                success:false,
                message:"Passwords do not match",
            });
        }

        // get userDetails from db using token
        const userDetails = await User.findOne({token:token});

        // if no entry -> invalid token
        if(!userDetails){
            return res.json({
                success:false,
                message:"Token is invalid",
            })
        };

        // token time check
        if(userDetails.resetPasswordExpires < Date.now()) {
            return res.json({
                success:false,
                message:"Token is expired, Please regenerate your token"
            })
        }
        
        // hash password 
        const hashedPassword = await bcrypt.hash(password, 10);

        // update pwd in DB
        await User.findOneAndUpdate(
            {token:token},
            {password:hashedPassword},
            {new:true}
        );

        // return response
        return res.status(200).json({
            success:true,
            message:"Password reset successfull",
        });
        
    } catch(error) {
        return res.status(500).json({
            success:false,
            message:"Something went wrong in resetting password",
        })
    }
}