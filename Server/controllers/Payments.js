const {instance} = require('../config/razorpay');
const Course = require('../models/Course');
const User = require('../models/User');
const mailSender = require('../utils/mailSender');
const {courseEnrollmentEmail} = require('../mail/templates/courseEnrollmentEmail');
const { default: mongoose } = require('mongoose');
const {paymentSuccessEmail} = require('../mail/templates/paymentSuccessEmail')
const crypto = require("crypto");
const CourseProgress = require('../models/CourseProgress');

// initiate the razorpay order 
exports.capturePayment = async(req, res) => {
     
    const {courses} = req.body;
    const userId = req.user.id;
    
    if(courses.length === 0){
        return res.json({
            success:false,
            message:"Please Provide Course Id",
        })
    }

    let totalAmount = 0;

    console.log(courses);

    for(const course_id of courses){
        let course;
        try{
            course = await Course.findById(course_id);
            if(!course){
                return res.status(200).json({
                    success:false,
                    message:"Could not find the Course",
                })
            }

            const uid = new mongoose.Types.ObjectId(userId);
            if(course.studentsEnrolled.includes(uid)){
                return res.status(200).json({
                    success:false,
                    message:"Student is already enrolled",
                })
            }

            totalAmount+=course.price;

        } catch(error){
            console.log("Error while Finding Total Amount: ",error);
            return res.status(500).json({
                success:false,
                message:error.message ,
            })
        }
    }
    

    const options = {
        amount:totalAmount*100,
        currency:"INR",
        receipt: Math.random(Date.now()).toString(),
    }

    try{
        const paymentResponse = await instance.orders.create(options);
        res.json({
            success:true,
            data: paymentResponse,
        })
    } catch(error){
        console.log("RAZORPAY ERROR:", error);

        return res.status(500).json({
            success:false,
            message:error.message,
            error:error,
        })
    }
}

// verify the payment
exports.verifyPayment = async(req, res) => {
    const razorpay_order_id = req.body?.razorpay_order_id;
    const razorpay_payment_id = req.body?.razorpay_payment_id;
    const razorpay_signature = req.body?.razorpay_signature;
    const courses = req.body?.courses;
    const userId = req.user.id;

    if(!razorpay_order_id ||
        !razorpay_payment_id||
        !razorpay_signature || !courses || !userId
    ){
        return res.status(200).json({
            success:false,
            message:"Payment Failed",
        })
    }

    let body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac("sha256",process.env.RAZORPAY_SECRET)
        .update(body.toString())
        .digest("hex");

    if(expectedSignature === razorpay_signature){
        // enroll student
        await enrollStudents(courses, userId, res);

        // return response
        return res.status(200).json({
            success:true,
            message:"Payment Verified"
        })
    }

    return res.status(200).json({
        success:false,
        message:"Payment Failed"
    })

}

const enrollStudents = async(courses, userId, res) => {

    if(!courses || !userId){
        return res.status(400).json({
            success:false,
            message:"Please Provide Data for Courses or UserID",
        });
    }

    for(const course_id of courses){
        try{
            // find the student and enroll the student in it
            const enrolledCourse = await Course.findOneAndUpdate(
                {_id:course_id},
                {$push:{studentsEnrolled:userId}},
                {new:true}
            )
            if(!enrolledCourse){
                return res.status(500).json({
                    success:false,
                    message:"Course Not find",
                })
            }

            const courseProgress = await CourseProgress.create({
                courseID:course_id,
                userId: userId,
                completedVideos:[],
            })

            // find the student and the course to their list of enrolledCourses
            const enrolledStudents = await User.findByIdAndUpdate(
                userId,
                {$push:{
                    courses : course_id,
                    courseProgress:courseProgress._id,
                }},
                {new: true},
            )

            // Send mail to student
            const emailResponse = await mailSender(
                enrolledStudents.email,
                `Successfully Enrolled into ${enrolledCourse.courseName}`,
                courseEnrollmentEmail(enrolledCourse.courseName, `${enrolledStudents.firstName}`)
            )

            console.log("Email Sent Successfully", emailResponse);
        } catch(error){
            console.log(error);
            return res.status(500).json({
                success:false,
                message:error.message,
            })
        }
    } 

}

exports.sendPaymentSuccessEmail = async(req, res) => {
    console.log("BODY RECEIVED:", req.body);
    const {orderId, paymentId, amount} = req.body;

    const userId = req.user.id;

    if(!orderId || !paymentId || !amount){
        return res.status(400).json({
            success:false,
            message:"Please provide all the fields",
        })
    }

    try{
        
        const enrolledStudent = await User.findById(userId);
        await mailSender(
            enrolledStudent.email,
            `Payment Successfull`,
            paymentSuccessEmail(`${enrolledStudent.firstName}`,
                amount/100,orderId,paymentId
            )
        )

        return res.status(200).json({
            success: true,
            message: "Payment success email sent",
        });

    } catch(err){
        console.log("Error in sending payment Successfull Email: ",err);
        return res.status(500).json({
            success:false,
            message:"Could not send payment Successfull Email",
        })
    }
}

