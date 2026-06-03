const jwt = require('jsonwebtoken');
require('dotenv').config();
const user = require('../models/User');

// auth
exports.auth = async(req, res, next)=>{
    try{

        // extract token
        const token =req.cookies?.token 
                    || req.body?.token 
                    || req.headers.authorization?.replace("Bearer ", "");
        
        // token missing, return response
        if(!token){
            return res.status(401).json({
                success:false,
                message:"Token is missing",
            })
        }

        // Verify token
        try{

            const decode = jwt.verify(token, process.env.JWT_SECRET);
            console.log(decode);

            req.user = decode;

        } catch(error) {
            // Verification issue
            return res.status(401).json({
                success:false,
                message:"Token is invalid",
            })
        }
        next();

    } catch(error) {
        return res.status(401).json({
            success:false,
            message:"Something went Wrong while validating the token",
        })
    }
}


// isStudent
exports.isStudent = async(req, res, next) =>{
    try{

        if(req.user.accountType !== 'Student'){
            return res.status(401).json({
                success:false,
                message:"This is a protected Route for Students Only",
            })
        }

        next();

    } catch(error) {
        return res.status(500).json({
            success:false,
            message:"User Role can not be verified",
        })
    }
}

// isInstructor
exports.isInstructor = async(req, res, next) =>{
    try{

        if(req.user.accountType !== 'Instructor'){
            return res.status(401).json({
                success:false,
                message:"This is a protected Route for Instructor Only",
            })
        }

        next();

    } catch(error) {
        return res.status(500).json({
            success:false,
            message:"User Role can not be verified",
        })
    }
}

// isAdmin
exports.isAdmin = async(req, res, next) =>{
    try{
        console.log("Printing Account Type : ",req.user.accountType);
        if(req.user.accountType !== 'Admin'){
            return res.status(401).json({
                success:false,
                message:"This is a protected Route for Admin Only",
            })
        }

        next();

    } catch(error) {
        return res.status(500).json({
            success:false,
            message:"User Role can not be verified",
        })
    }
}

