import React, { useEffect, useState } from 'react'
import {Swiper, SwiperSlide} from "swiper/react"
import "swiper/css"
import "swiper/css/free-mode"
import "swiper/css/pagination"
import { FaStar } from "react-icons/fa"
import { Autoplay, FreeMode, Pagination } from "swiper/modules"
import ReactStars from 'react-stars'
import { apiConnector } from '../../services/apiconnector'
import { ratingsEndpoints } from '../../services/apis'

const ReviewSlider = () => {

    const [reviews, setReviews] = useState([]);
    const truncateWords = 15;


    useEffect(()=>{
        const fetchAllReviews = async() => {
            const response = await apiConnector("GET", ratingsEndpoints.REVIEWS_DETAILS_API);
            console.log("LOGGING RESPONSE IN RATING: ",response);

            const {data} = response;

            if(data?.success){
                setReviews(data?.data)
            }
        }
        
        fetchAllReviews();
        
        
    },[])
    
    // console.log("PRINTING ALL REVIEWS: ",reviews);

  return (
    <div className='text-white'>
        <div className="my-[50px] h-[184px] max-w-maxContentTab lg:max-w-maxContent">
            <Swiper
                slidesPerView={4}
                spaceBetween={25}
                freeMode={true}
                loop={true}
                modules={[Autoplay,Pagination, FreeMode]}
                autoplay={{
                delay: 2500,
                disableOnInteraction: false,
                }}
                className="w-full"
            >
                {
                    reviews.map((review, index) => (
                        <SwiperSlide key={index}>
                            <div className="flex flex-col gap-3 bg-richblack-800 p-3 text-[14px] text-richblack-25">
                              <div className="flex items-center gap-4">
                                <img
                                  src={
                                    review?.user?.[0]?.image
                                      ? review.user[0]?.image
                                      : `https://api.dicebear.com/5.x/initials/svg?seed=${review?.user?.[0]?.firstName} ${review?.user?.[0]?.lastName}`
                                  }
                                  alt=""
                                  className="h-9 w-9 rounded-full object-cover"
                                />
                                <div className="flex flex-col">
                                  <h1 className="font-semibold text-richblack-5">{`${review?.user?.[0]?.firstName} ${review?.user?.[0]?.lastName}`}</h1>
                                  <h2 className="text-[12px] font-medium text-richblack-500">
                                    {review?.course?.courseName}
                                  </h2>
                                </div>
                              </div>
                              <p className="font-medium text-richblack-25">
                                {review?.review.split(" ").length > truncateWords
                                  ? `${review?.review
                                      .split(" ")
                                      .slice(0, truncateWords)
                                      .join(" ")} ...`
                                  : `${review?.review}`}
                              </p>
                              <div className="flex items-center gap-2 ">
                                <h3 className="font-semibold text-yellow-100">
                                  {review.rating.toFixed(1)}
                                </h3>
                                <ReactStars
                                  count={5}
                                  value={review.rating}
                                  size={20}
                                  edit={false}
                                  activeColor="#ffd700"
                                  emptyIcon={<FaStar />}
                                  fullIcon={<FaStar/>}
                                />
                              </div>
                            </div>
                        </SwiperSlide>
                    ))
                }
            </Swiper>
        </div>
    </div>
  )
}

export default ReviewSlider