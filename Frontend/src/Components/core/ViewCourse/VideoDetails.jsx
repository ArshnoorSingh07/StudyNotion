import React, { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'

import { BigPlayButton, Player } from 'video-react'
import 'video-react/dist/video-react.css'

import { markLectureAsComplete } from '../../../services/operations/courseDetailsAPI'
import { updateCompletedLectures } from '../../../slices/viewCourseSlice'
import IconBtn from '../../common/IconBtn'
import { HiOutlineArrowNarrowLeft, HiOutlineArrowNarrowRight } from "react-icons/hi"
import { RiCheckboxCircleFill } from "react-icons/ri"
import { AiOutlineReload } from "react-icons/ai"

const VideoDetails = () => {
  const { courseId, sectionId, subSectionId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const playerRef = useRef(null)
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { courseSectionData, courseEntireData, completedLectures } =
    useSelector((state) => state.viewCourse)

  const [videoData, setVideoData] = useState([])
  const [previewSource, setPreviewSource] = useState("")
  const [videoEnded, setVideoEnded] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    ;(async () => {
      if (!courseSectionData.length) return
      if (!courseId && !sectionId && !subSectionId) {
        navigate(`/dashboard/enrolled-courses`)
      } else {
        const filteredData = courseSectionData.filter(
          (course) => course._id === sectionId
        )
        const filteredVideoData = filteredData?.[0]?.subSection.filter(
          (data) => data._id === subSectionId
        )
        setVideoData(filteredVideoData[0])
        setPreviewSource(courseEntireData.thumbnail)
        setVideoEnded(false)
      }
    })()
  }, [courseSectionData, courseEntireData, location.pathname])

  const isFirstVideo = () => {
    const currentSectionIndx = courseSectionData.findIndex(
      (data) => data._id === sectionId
    )
    const currentSubSectionIndx = courseSectionData[
      currentSectionIndx
    ].subSection.findIndex((data) => data._id === subSectionId)

    return currentSectionIndx === 0 && currentSubSectionIndx === 0
  }

  const goToNextVideo = () => {
    const currentSectionIndx = courseSectionData.findIndex(
      (data) => data._id === sectionId
    )
    const noOfSubsections =
      courseSectionData[currentSectionIndx].subSection.length
    const currentSubSectionIndx = courseSectionData[
      currentSectionIndx
    ].subSection.findIndex((data) => data._id === subSectionId)

    if (currentSubSectionIndx !== noOfSubsections - 1) {
      const nextSubSectionId =
        courseSectionData[currentSectionIndx].subSection[
          currentSubSectionIndx + 1
        ]._id
      navigate(
        `/view-course/${courseId}/section/${sectionId}/sub-section/${nextSubSectionId}`
      )
    } else {
      const nextSectionId = courseSectionData[currentSectionIndx + 1]._id
      const nextSubSectionId =
        courseSectionData[currentSectionIndx + 1].subSection[0]._id
      navigate(
        `/view-course/${courseId}/section/${nextSectionId}/sub-section/${nextSubSectionId}`
      )
    }
  }

  const isLastVideo = () => {
    const currentSectionIndx = courseSectionData.findIndex(
      (data) => data._id === sectionId
    )
    const noOfSubsections =
      courseSectionData[currentSectionIndx].subSection.length
    const currentSubSectionIndx = courseSectionData[
      currentSectionIndx
    ].subSection.findIndex((data) => data._id === subSectionId)

    return (
      currentSectionIndx === courseSectionData.length - 1 &&
      currentSubSectionIndx === noOfSubsections - 1
    )
  }

  const goToPrevVideo = () => {
    const currentSectionIndx = courseSectionData.findIndex(
      (data) => data._id === sectionId
    )
    const currentSubSectionIndx = courseSectionData[
      currentSectionIndx
    ].subSection.findIndex((data) => data._id === subSectionId)

    if (currentSubSectionIndx !== 0) {
      const prevSubSectionId =
        courseSectionData[currentSectionIndx].subSection[
          currentSubSectionIndx - 1
        ]._id
      navigate(
        `/view-course/${courseId}/section/${sectionId}/sub-section/${prevSubSectionId}`
      )
    } else {
      const prevSectionId = courseSectionData[currentSectionIndx - 1]._id
      const prevSubSectionLength =
        courseSectionData[currentSectionIndx - 1].subSection.length
      const prevSubSectionId =
        courseSectionData[currentSectionIndx - 1].subSection[
          prevSubSectionLength - 1
        ]._id
      navigate(
        `/view-course/${courseId}/section/${prevSectionId}/sub-section/${prevSubSectionId}`
      )
    }
  }

  const handleLectureCompletion = async () => {
    setLoading(true)
    const res = await markLectureAsComplete(
      { courseId: courseId, subSectionId: subSectionId },
      token
    )
    if (res) {
      dispatch(updateCompletedLectures(subSectionId))
    }
    setLoading(false)
  }

  const isCompleted = completedLectures.includes(subSectionId)

  return (
    <div className="flex flex-col gap-6 px-4 py-6 text-richblack-5 md:px-8">
      {/* Video Player Card */}
      <div className="relative overflow-hidden rounded-xl border border-richblack-700 bg-richblack-900 shadow-lg">
        {!videoData ? (
          <img
            src={previewSource}
            alt="Preview"
            className="aspect-video h-full w-full rounded-xl object-cover"
          />
        ) : (
          <Player
            ref={playerRef}
            aspectRatio="16:9"
            playsInline
            onEnded={() => setVideoEnded(true)}
            src={videoData?.videoUrl}
          >
            <BigPlayButton position="center" className="text-yellow-50" />

            {/* Overlay when video ends */}
            {videoEnded && (
              <div
                style={{
                  backgroundImage:
                    "linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.85), rgba(0,0,0,0.55), rgba(0,0,0,0.15))",
                }}
                className="absolute inset-0 z-[100] grid h-full place-content-center px-4 font-inter"
              >
                <div className="flex flex-col items-center gap-4">
                  {!isCompleted && (
                    <IconBtn
                      disabled={loading}
                      onclick={() => handleLectureCompletion()}
                      text={!loading ? "Mark As Completed" : "Loading..."}
                      customClasses="text-base md:text-lg max-w-max px-6 py-3 mx-auto shadow-md hover:scale-95 transition-transform duration-150"
                    />
                  )}

                  {isCompleted && (
                    <div className="flex items-center gap-2 rounded-md bg-caribbeangreen-700/20 px-4 py-2 text-caribbeangreen-100">
                      <RiCheckboxCircleFill size={20} />
                      <span className="text-sm font-medium">Lecture completed</span>
                    </div>
                  )}

                  <button
                    disabled={loading}
                    onClick={() => {
                      if (playerRef?.current) {
                        playerRef?.current?.seek(0)
                        setVideoEnded(false)
                      }
                    }}
                    className="flex items-center gap-2 rounded-md border border-richblack-500 px-6 py-2 text-sm font-semibold text-richblack-50 transition-all duration-150 hover:border-richblack-300 hover:bg-richblack-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <AiOutlineReload size={16} />
                    Rewatch
                  </button>

                  <div className="mt-6 flex min-w-[250px] justify-center gap-x-4">
                    {!isFirstVideo() && (
                      <button
                        disabled={loading}
                        onClick={goToPrevVideo}
                        className="flex items-center gap-2 rounded-md bg-richblack-700 px-5 py-2 text-sm font-semibold text-richblack-5 transition-all duration-150 hover:bg-richblack-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <HiOutlineArrowNarrowLeft size={18} />
                        Prev
                      </button>
                    )}
                    {!isLastVideo() && (
                      <button
                        disabled={loading}
                        onClick={goToNextVideo}
                        className="flex items-center gap-2 rounded-md bg-yellow-50 px-5 py-2 text-sm font-semibold text-richblack-900 transition-all duration-150 hover:bg-yellow-25 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next
                        <HiOutlineArrowNarrowRight size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Player>
        )}
      </div>

      {/* Lecture Info */}
      <div className="flex flex-col gap-2 border-b border-richblack-700 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-richblack-5 md:text-3xl">
            {videoData?.title}
          </h1>

          {isCompleted && (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-caribbeangreen-700/20 px-3 py-1 text-xs font-medium text-caribbeangreen-100">
              <RiCheckboxCircleFill size={14} />
              Completed
            </span>
          )}
        </div>

        <p className="pt-1 text-sm leading-relaxed text-richblack-300 md:text-base">
          {videoData?.description}
        </p>
      </div>
    </div>
  )
}

export default VideoDetails