const User = require("../models/User");
const mailSender = require("../utils/mailSender");
const bcrypt = require("bcrypt");
const crypto = require('crypto'); 

exports.resetPasswordToken = async (req, res) => {
    try {
        const email = req.body?.email;
        if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, message: 'Provide a valid email address.' });
        }
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.json({
                success: false,
                message: `This Email: ${email} is not Registered With Us Enter a Valid Email `,
            });
        }
        const token = crypto.randomBytes(20).toString("hex");

        await User.findOneAndUpdate(
            { email: email },
            {
                token: token,
                resetPasswordExpires: Date.now() + 3600000,
            },
            { new: true }
        );

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
        const { password, confirmPassword, token } = req.body || {};
        if (typeof token !== 'string' || !/^[a-f0-9]{40}$/.test(token) ||
            typeof password !== 'string' || !password.length || Buffer.byteLength(password, 'utf8') > 72 ||
            password !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'Provide a valid reset token and matching passwords (up to 72 bytes).' });
        }
        const encryptedPassword = await bcrypt.hash(password, 10);
        // Matching, expiration, password change and token consumption are one atomic write.
        const updated = await User.findOneAndUpdate(
            { token, resetPasswordExpires: { $gt: new Date() } },
            { $set: { password: encryptedPassword }, $unset: { token: '', resetPasswordExpires: '' } },
            { new: true }
        );
        if (!updated) return res.status(400).json({ success: false, message: 'Reset link is invalid or expired. Request a new link.' });
        return res.json({ success: true, message: 'Password Reset Successful' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Could not reset password. Please try again.' });
    }
};
