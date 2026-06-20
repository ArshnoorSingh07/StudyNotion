import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { buyCourse } from '../services/operations/studentFeaturesAPI';
import { fetchCourseDetails } from '../services/operations/courseDetailsAPI';
import GetAvgRating from '../utils/avgRating';
import Error from './Error';
import ConfirmationModal from '../Components/common/ConfirmationModal';
import RatingStars from '../Components/common/RatingStars';
import { formatDate } from '../services/formatDate';
import CourseDetailsCard from '../Components/core/Course/CourseDetailsCard';

const CourseDetails = () => {

    const {user} = useSelector((state) => state.profile);
    const {token} = useSelector((state) => state.auth);
    const {loading} = useSelector((state) => state.profile);
    const {paymentLoading} = useSelector((state) => state.course);
    
    const [courseData, setCourseData] = useState(null);
    const [averageReviewCount, setAverageReviewCount] = useState(0);
    const [totalNumberOfLectures, setTotalNumberOfLectures] = useState(0);
    const [confirmationModal, setConfirmationModal] = useState(null);

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const {courseId} = useParams(); 

    useEffect( () => {
        const getCourseFullDetails = async () => {
            try{
                const result = await fetchCourseDetails(courseId);
                setCourseData(result);

            } catch(err){
                console.log("Could not fetch Course Details");
            }
        }

        getCourseFullDetails();

    },[courseId]);


    useEffect( () => {
        const count = GetAvgRating(courseData?.data?.courseDetails?.ratingAndReviews);
        setAverageReviewCount(count);

    }, [courseData]);


    useEffect( () => {
        let lectures = 0;
        courseData?.data?.courseDetails?.courseContent?.forEach( (sec) => {
            lectures += sec.subSection.length || 0;
        })

        setTotalNumberOfLectures(lectures);
        
    },[courseData])


    const [isActive, setIsActive] = useState(Array(0));
    const handleActive = (id) => {
        setIsActive(
            !isActive.includes(id)
            ? isActive.concat(id)
            : isActive.filter( (e) => e !== id)
        )
    }

    const handleBuyCourse = () => {
        if(token) {
            buyCourse(token, [courseId], user, navigate, dispatch);
            return;
        }
        else{
            setConfirmationModal({
                text1:"You are not Logged in",
                text2:"Please Login to purchase the course",
                btn1Text:"Login",
                btn2Text:"Cancel",
                btn1Handler:() => navigate('/login'),
                btn2Handler:() => setConfirmationModal(null)
            })
        }

    }


    if(loading || !courseData){
        return(
            <div className='spinner'></div>
        )
    }

    if(!courseData.success){
        return(
            <div>
                <Error/>
            </div>
        )
    }

    const {
        _id: course_id,
        courseName,
        courseDescription,
        thumbnail,
        price,
        whatYouWillLearn,
        courseContent,
        ratingAndReviews,
        instructor,
        studentsEnrolled,
        createdAt,
    } = courseData?.data?.courseDetails;


  return (
    <div className='flex flex-col text-white'>
        
        <div className='relative flex flex-col justify-start p-8'>
            <p>{courseName}</p>
            <p>{courseDescription}</p>
            <div className='flex gap-x-2'>
                <span>
                    {averageReviewCount}
                </span>
                <RatingStars Review_Count={averageReviewCount} Star_Size={24}/>
                <span>{`(${ratingAndReviews.length} reviews)`}</span>
                <span>{`(${studentsEnrolled.length} students enrolled)`}</span>
            </div>

            <div>
                <p>Created By {`${instructor.firstName}`}</p>
            </div>

            <div className='flex gap-x-3'>
                <p>
                    Created At {formatDate(createdAt)}
                </p>
                <p>
                    {" "} English
                </p>
            </div>

            <div >
                <CourseDetailsCard
                    course={courseData?.data?.courseDetails}
                    setConfirmationModal={setConfirmationModal}
                    handleBuyCourse={handleBuyCourse}
                />
            </div>
            
        </div>

        <div>
            <p>What You Will Learn</p>
            <div>
                {whatYouWillLearn}
            </div>
        </div>

        <div>
            <div>
                <p>Course Content:</p>
            </div>

            <div className='flex gap-x-3 justify-between'>
                <div >
                    <span>
                        {courseContent.length} section(s)
                    </span>
                
                    <span>
                        {totalNumberOfLectures} lecture(s)
                    </span>
                
                    <span>
                        {courseData.data?.totalDuration} total length
                    </span>
                </div>

                <div>
                    <button
                        onClick={ () => setIsActive([])}
                    >
                        Collapse All Sections
                    </button>
                </div>

            </div>
        </div>

        {confirmationModal && <ConfirmationModal modalData={confirmationModal}/>}
    </div>
  )
}

export default CourseDetails