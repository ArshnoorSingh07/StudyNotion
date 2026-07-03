import React, { useEffect, useRef, useState } from 'react'
import { Player } from 'video-react';
import 'video-react/dist/video-react.css';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { markLectureAsComplete } from '../../../services/operations/courseDetailsAPI';
import { updateCompletedLectures } from '../../../slices/viewCourseSlice';
import { FaPlayCircle } from "react-icons/fa";
import IconBtn from '../../common/IconBtn';


const VideoDetails = () => {

  const {courseId, sectionId, subSectionId} = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const playerRef = useRef();
  const {token} = useSelector((state) => state.auth);
  const {courseSectionData, courseEntireData, completedLectures } = useSelector( (state) => state.viewCourse);

  const [videoData, setVideoData] = useState([]);
  const [videoEnded, setVideoEnded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const setVideoSpecificDetails = async () => {
      if(!courseSectionData.length)
        return;
      if(!courseId || !sectionId || !subSectionId){
        navigate('/dashboard/enrolled-courses');
      }
      else{
        // lets assume all 3 fields are present

        const filteredData = courseSectionData?.filter(
          (course) => course._id === sectionId
        )

        const filteredVideoData = filteredData?.[0].subSection.filter(
          (data) => data._id === subSectionId
        )
        
        setVideoData(filteredVideoData[0]);
        setVideoEnded(false);
      }
    }

    setVideoSpecificDetails();

  }, [courseSectionData, courseEntireData, location.pathname])


  const isFirstVideo = () => {
    const currentSectionIndex = courseSectionData.findIndex(
      (data) => data._id === sectionId
    )

    const currentSubSectionIndex = courseSectionData[currentSectionIndex].subSection.findIndex(
      (data) => data._id === subSectionId
    )

    if(currentSectionIndex === 0 && currentSubSectionIndex === 0)
    {
      return true;
    }
    else return false;

  }

  const isLastVideo = () => {
    const currentSectionIndex = courseSectionData.findIndex(
      (data) => data._id === sectionId
    )

    const noOfSubSections = courseSectionData[currentSectionIndex].subSection.length;

    const currentSubSectionIndex = courseSectionData[currentSectionIndex].subSection.findIndex(
      (data) => data._id === subSectionId
    )

    if(currentSectionIndex === courseSectionData.length - 1 &&
      currentSubSectionIndex === noOfSubSections - 1
    ){
      return true;
    }
    else{
      return false;
    }

  }

  const goToNextVideo = () => {
    const currentSectionIndex = courseSectionData.findIndex(
      (data) => data._id === sectionId
    )

    const noOfSubSections = courseSectionData[currentSectionIndex].subSection.length;

    const currentSubSectionIndex = courseSectionData[currentSectionIndex].subSection.findIndex(
      (data) => data._id === subSectionId
    )

    if(currentSubSectionIndex !== noOfSubSections - 1)
    {
      // Same section Next Video
      const nextSubSectionId = courseSectionData[currentSectionIndex].
      subSection[currentSectionIndex + 1]._id;

      navigate(`/view-course/${courseId}/section/${sectionId}/sub-section/${nextSubSectionId}`);
    }
    else{
      // Different Section first Video
      const nextSectionId = courseSectionData[currentSectionIndex + 1]._id;
      const nextSubSectionId = courseSectionData[currentSectionIndex + 1].subSection[0]._id;
      // navigate
      navigate(`/view-course/${courseId}/section/${nextSectionId}/sub-section/${nextSubSectionId}`); 
    }
  }

  const goToPrevVideo = () => {
    const currentSectionIndex = courseSectionData.findIndex(
      (data) => data._id === sectionId
    )

    const noOfSubSections = courseSectionData[currentSectionIndex].subSection.length;

    const currentSubSectionIndex = courseSectionData[currentSectionIndex].subSection.findIndex(
      (data) => data._id === subSectionId
    )

    if(currentSubSectionIndex !== 0 ){
      // Same section previous Video
      const previousSubSectionId = courseSectionData[currentSectionIndex].subSection[currentSubSectionIndex - 1]._id;
      navigate(`/view-course/${courseId}/section/${sectionId}/sub-section/${previousSubSectionId}`);
    }
    else{
      // different Section Last Video
      const prevSectionId = courseSectionData[currentSectionIndex - 1]._id;
      const prevSubSectionLength = courseSectionData[currentSectionIndex - 1].subSection.length;
      const prevSubSectionId = courseSectionData[currentSectionIndex - 1].subSection[prevSubSectionLength - 1]._id;
      navigate(`/view-course/${courseId}/section/${prevSectionId}/sub-section/${prevSubSectionId}`);
    }
  }

  const handleLectureCompletion = async () => {
    // PENDING
    // dummy code, Tomorrow I replace it with the Actual Call
    setLoading(true);

    const res = await markLectureAsComplete({courseId: courseId, subSectionId: subSectionId},token);
    // state update
    if(res){
      dispatch(updateCompletedLectures(subSectionId));
    }

    setLoading(false);

  }

  return (
    <div>
      {
        !videoData ? (
          <div>
            No Data Found
          </div>
        )
        :
        (
          <Player
            ref = {playerRef}
            aspectRatio = "16:9"
            playsInLine
            onEnded={() => setVideoEnded(true)}
            src={videoData?.videoUrl}
          >
            <FaPlayCircle />

            {
              videoEnded && (
                <div>
                  {
                    !completedLectures.includes(subSectionId) && (
                      <IconBtn
                        disabled={loading}
                        onclick={() => handleLectureCompletion()}
                        text={!loading ? "Mark as Completed" : "Loading ..."}
                      />
                    )
                  }

                  <IconBtn
                    disabled={loading}
                    onclick={() => {
                      if(playerRef?.current){
                        playerRef.current?.seek(0);
                        setVideoEnded(false);
                      }
                    }}
                    text="Rewatch"
                    customClasses={"text-xl"}
                  />

                  <div>
                    {
                      !isFirstVideo() && (
                        <button
                          disabled={loading}
                          onClick={goToPrevVideo}
                          className='blackButton'
                        >
                          Prev
                        </button>
                      )
                    }
                    {
                      !isLastVideo() && (
                        <button
                          disabled={loading}
                          onClick={goToNextVideo}
                          className='blackButton'
                        >
                          Next
                        </button>
                      )
                    }
                  </div>

                </div>
              )
            }
          </Player>
        )
      }

      <h1>
        {videoData?.title}
      </h1>
      <p>
        {videoData?.description}
      </p>


    </div>
  )
}

export default VideoDetails