const User = require("../models/User");
const mailSender = require("../utils/mailSender");
const bcrypt = require("bcrypt");
const crypto = require('crypto'); 

exports.resetPasswordToken = async (req, res) => {
    try {
        const email = req.body.email;
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.json({
                success: false,
                message: `This Email: ${email} is not Registered With Us Enter a Valid Email `,
            });
        }
        const token = crypto.randomBytes(20).toString("hex");

        const updatedDetails = await User.findOneAndUpdate(
            { email: email },
            {
                token: token,
                resetPasswordExpires: Date.now() + 3600000,
            },
            { new: true }
        );
        console.log("DETAILS", updatedDetails);

        const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000";
        const url = `${frontendURL}/update-password/${token}`;

        await mailSender(
        email,
        "Password Reset",
        `
            <h2>Password Reset Request</h2>

            <p>You requested to reset your password.</p>

            <p>Click the button below:</p>

            <a href="${url}"
            style="
                display:inline-block;
                padding:12px 20px;
                background:#FFD60A;
                color:#000;
                text-decoration:none;
                border-radius:5px;
                font-weight:bold;
            ">
            Reset Password
            </a>

            <p>This link will expire in <b>1 hour</b>.</p>

            <p>If you didn't request this, ignore this email.</p>
        `
        );

        res.json({
            success: true,
            message:
                "Email Sent Successfully, Please Check Your Email to Continue Further",
        });
    } catch (error) {
        return res.json({
            error: error.message,
            success: false,
            message: `Some Error in Sending the Reset Message`,
        });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { password, confirmPassword, token } = req.body;

        if (confirmPassword !== password) {
            return res.json({
                success: false,
                message: "Password and Confirm Password Does not Match",
            });
        }
        const userDetails = await User.findOne({ token: token });
        if (!userDetails) {
            return res.json({
                success: false,
                message: "Token is Invalid",
            });
        }
        if (!(userDetails.resetPasswordExpires > Date.now())) {
            return res.status(403).json({
                success: false,
                message: `Token is Expired, Please Regenerate Your Token`,
            });
        }
        const encryptedPassword = await bcrypt.hash(password, 10);
        await User.findOneAndUpdate(
            { token: token },
            { password: encryptedPassword },
            { new: true }
        );
        res.json({
            success: true,
            message: `Password Reset Successful`,
        });
    } catch (error) {
        return res.json({
            error: error.message,
            success: false,
            message: `Some Error in Updating the Password`,
        });
    }
};