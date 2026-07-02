import React from "react"
import copy from "copy-to-clipboard"
import { toast } from "react-hot-toast"
import { BsFillCaretRightFill } from "react-icons/bs"
import { FaShareSquare } from "react-icons/fa"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"

import { addToCart } from "../../../slices/cartSlice"
import { ACCOUNT_TYPE } from "../../../utils/constants"

function CourseDetailsCard({course, setConfirmationModal, handleBuyCourse}){

    const {user} = useSelector((state) => state.profile);
    const {token} = useSelector( (state) => state.auth);
    const navigate = useNavigate();
    const dispatch = useDispatch();
    
    const {
        thumbnail: ThumbnailImage,
        price: CurrentPrice,
    } = course;

    const handleAddToCart = () => {
        if(user && user?.accountType === ACCOUNT_TYPE.INSTRUCTOR) {
            toast.error("You are an instructor, you can't buy an Course");
            return ;
        }
        if(token){
            dispatch(addToCart(course));
            return;
        }
        setConfirmationModal({
            text1: "You are not Logged in",
            text2: "Please login to Add to Cart",
            btn1Text: "Login",
            btn2Text: "Cancel",
            btn1Handler: () => navigate('/login'),
            btn2Handler: () => setConfirmationModal(null)
        })
    }


    const handleShare = () => {
        copy(window.location.href);
        toast.success("Link Copied to Clipboard");
    }

    return(
        <div>
            <img
                src={ThumbnailImage}
                alt='Thumbnail Image'
                className='max-h-[300px] min-h-[180px] w-[400px] rounded-xl'
            />
            <div>
                Rs. {CurrentPrice}
            </div>
            <div className='flex flex-col gap-y-6'>
                <button
                    className='bg-yellow-50 w-fit text-richblack-900'
                    onClick={
                        user && course?.studentsEnrolled.includes(user?._id) 
                        ? () => navigate('/dashboard/enrolled-courses')
                        : () => handleBuyCourse() 
                    }
                >
                    {
                        user && course?.studentsEnrolled.includes(user?._id) ? "Go to Course" : 
                        "Buy Now"
                    }
                </button>

                {
                    (!course?.studentsEnrolled.includes(user?._id)) && (
                        <button
                            onClick={handleAddToCart}
                            className='bg-yellow-50 w-fit text-richblack-900'
                        >
                            Add to Cart
                        </button>
                    )
                }
            </div>


            <div>
                <p>
                    30-Day Money Back Guarantee
                </p>
                <p>
                    This Course Includes:
                </p>
                <div className='flex flex-col gap-y-3'>
                    {
                        course?.instructions?.map((item, index) => {
                            return(
                                <p key={index} className='flex gap-x-2'> 
                                    <span>{item}</span>
                                </p>
                            )
                        })
                    }
                </div>
                <div>
                    <button
                        className='mx-auto flex items-center gap-2 p-6 text-yellow-50'
                        onClick={handleShare}
                    >
                        Share
                    </button>
                </div>
            </div>
        </div>
    );

}

export default CourseDetailsCard;