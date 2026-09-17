import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { Link, Outlet, useParams } from 'react-router-dom';
import { getFullDetailsOfCourse } from '../services/operations/courseDetailsAPI';
import { setCompletedLectures, setCourseSectionData, setEntireCourseData, setTotalNoOfLectures } from '../slices/viewCourseSlice';
import VideoDetailsSidebar from '../Components/core/ViewCourse/VideoDetailsSidebar';
import CourseReviewModal from '../Components/core/ViewCourse/CourseReviewModal';

const ViewCourse = () => {

    const [reviewModal, setReviewModal] = useState(false);
    const {courseId} = useParams();
    const {token} = useSelector( (state) => state.auth);
    const dispatch = useDispatch();
    const [loadingCourse, setLoadingCourse] = useState(true);
    const [courseError, setCourseError] = useState('');

    
    useEffect(()=>{
        let current = true;
        setLoadingCourse(true);
        setCourseError('');
        setReviewModal(false);
        const setCourseSpecificDetails = async() => {
          try {
            const courseData = await getFullDetailsOfCourse(courseId, token);
            if (!current) return;
            if (!courseData?.courseDetails) throw new Error('This course is unavailable or you no longer have access.');
            dispatch(setCourseSectionData(courseData.courseDetails.courseContent));
            dispatch(setEntireCourseData(courseData.courseDetails));
            dispatch(setCompletedLectures(courseData.completedVideos));
            let lectures = 0;
            courseData?.courseDetails?.courseContent?.forEach((sec) => {
                lectures += sec.subSection.length
            })
            dispatch(setTotalNoOfLectures(lectures));
          } catch (error) {
            if (current) setCourseError(error.message || 'Could not load this course.');
          } finally {
            if (current) setLoadingCourse(false);
          }
        }

        setCourseSpecificDetails();
        return () => { current = false; };
    },[courseId, token, dispatch]);



  if (loadingCourse) return <div className="grid min-h-[60vh] place-items-center"><div className="spinner" /></div>;
  if (courseError) return <div className="mx-auto py-20 text-center text-richblack-100"><p>{courseError}</p><Link className="mt-4 inline-block text-yellow-50" to="/dashboard/enrolled-courses">Back to enrolled courses</Link></div>;

  return (
    <>
        <div className="relative flex min-h-[calc(100vh-3.5rem)]">
            <VideoDetailsSidebar setReviewModal={setReviewModal}/>

            <div className="h-[calc(100vh-3.5rem)] flex-1 overflow-auto">
                <div className="mx-6">
                  <Outlet />
                </div>
            </div>
            {reviewModal && <CourseReviewModal setReviewModal={setReviewModal}/>}
        </div>
    </>
  )
}

export default ViewCourse;
