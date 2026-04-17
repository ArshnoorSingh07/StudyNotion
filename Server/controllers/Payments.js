const {instance} = require('../config/razorpay');
const Course = require('../models/Course');
const User = require('../models/User');
const mailSender = require('../utils/mailSender');
const {courseEnrollmentEmail} = require('../mail/templates/courseEnrollmentEmail');
const { default: mongoose } = require('mongoose');

// capture The payment and initiate the razorpay order
exports.capturePayment = async(req, res) => {
    // get CourseId and UserId
    const {course_id} = req.body;
    const userId = req.user.id;

    // Data Validation
    // Valid CourseId
    if(!course_id){
        return res.json({
            success:false,
            message:"Please Provide Valid Course Id",
        })
    };

    // Valid CourseDetail
    let course;
    try{

        course = await Course.findById(course_id);
        if(!course){
            return res.json({
                success:false,
                message:'Could not find the Course',
            });
        }

        // user already pay for the same course
        const uid = new mongoose.Types.ObjectId(userId);
        if(course.studentsEnrolled.includes(uid)){
            return res.status(400).json({
                success:false,
                message:"Student is already enrolled",
            });
        }
        
        // Order Create
        const amount = course.price;
        const currency = "INR";

        const options = {
            amount : amount * 100,
            currency : currency,
            receipt : Math.random(Date.now()).toString(),
            notes : {
                courseId: course_id,
                userId,
            }
        };

        try{
            // initiate the payment using Razorpay
            const paymentsResponse = await instance.orders.create(options);
            console.log(paymentsResponse);

        } catch(error) {
            console.log("Error While Creating Order: ",error);
            return res.status(500).json({
                success:false,
                message:"Error While Creating Order",
                error:error.message,
            })
        }

        // return response
        return res.status(200).json({
            success:success,
            courseName: course.courseName,
            courseDescription :course.courseDescription,
            thumbnail : course.thumbnail,
            orderId : paymentsResponse.id,
            currency: paymentsResponse.currency,
            amount : PaymentResponse.amount,
            message:"Payment Captured Successfully",
        })
        

    } catch(error){
        console.log("Error While Capturing Payment: ",error);
        return res.status(500).json({
            success:false,
            message:"Error While Capturing Payment",
            error:error.message,
        })
    }

};

// Verify Signature of Razorpay and server
exports.verifySignature = async(req, res) => {
    const webhookSecret = "12345678";

    const signature = req.headers["x-razorpay-signature"];

    const shasum = crypto.createHmac("sha256", webhookSecret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest("hex"); 

    if(signature === digest){
        console.log("Payment is Authorized");

        const {courseId, userId} = req.body.payload.payment.entity.notes;

        try{
            // fulfil action

            // find the course and enroll the student in it
            const enrolledCourse = await Course.findOneAndUpdate(
                {_id : courseId},
                {
                    $push : {
                        studentsEnrolled:userId,
                    }
                },
                {new:true},
            );

            if(!enrolledCourse){
                return res.status(500).json({
                    success:false,
                    message:'Course Not Found',
                })
            }

            console.log("Enrolled Course : ",enrolledCourse);

            // find the student and add course in list of enrolled Courses
            const enrolledStudent = await User.findOneAndUpdate(
                {_id : userId},
                {
                    $push : {
                        courses : courseId,
                    }
                },
                {new:true},
            );

            if(!enrolledStudent){
                return res.status(500).json({
                    success:false,
                    message:'Student Not Found',
                })
            }

            console.log("Enrolled Student : ",enrolledStudent);

            // Mail send of confirmation
            const emailResponse = await mailSender(
                                            enrolledStudent.email,
                                            "Congratulations from StudyNotion",
                                            "Congratulations! You are onboarded into new StudyNotion Course",
            );

            console.log("Email Response : ",emailResponse);

            return res.status(200).json({
                success:true,
                message:"Signature verified and Course Added",
            })

        } catch(error){

            console.log("Error While Verifying Signature : ",error);
            return res.status(500).json({
                success:false,
                message:"Error while Signature Verification",
                error:error.message,
            })
        }
    }
    else{
        return res.status(400).json({
            success:false,
            message:"Signatures not match",
        });
    }

};