import React, { useEffect, useState, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import IconBtn from '../../common/IconBtn'
import { BsChevronDown, BsFillPlayCircleFill, BsCheckCircleFill } from "react-icons/bs"
import { IoIosArrowBack } from "react-icons/io"
import { MdOutlineDesktopWindows } from "react-icons/md"
import { HiOutlineChevronDoubleLeft, HiOutlineChevronDoubleRight } from "react-icons/hi"


export default function VideoDetailsSidebar({ setReviewModal }) {
  const [activeStatus, setActiveStatus] = useState("")
  const [videoBarActive, setVideoBarActive] = useState("")
  const [isCollapsed, setIsCollapsed] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const { sectionId, subSectionId } = useParams()
  const {
    courseSectionData,
    courseEntireData,
    totalNoOfLectures,
    completedLectures,
  } = useSelector((state) => state.viewCourse)

  useEffect(() => {
    ;(() => {
      if (!courseSectionData.length) return
      const currentSectionIndx = courseSectionData.findIndex(
        (data) => data._id === sectionId
      )
      const currentSubSectionIndx = courseSectionData?.[
        currentSectionIndx
      ]?.subSection.findIndex((data) => data._id === subSectionId)
      const activeSubSectionId =
        courseSectionData[currentSectionIndx]?.subSection?.[
          currentSubSectionIndx
        ]?._id
      setActiveStatus(courseSectionData?.[currentSectionIndx]?._id)
      setVideoBarActive(activeSubSectionId)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseSectionData, courseEntireData, location.pathname])

  const toggleSection = useCallback((id) => {
    setActiveStatus((prev) => (prev === id ? "" : id))
  }, [])

  const progressPercent =
    totalNoOfLectures > 0
      ? Math.round(((completedLectures?.length || 0) / totalNoOfLectures) * 100)
      : 0

  return (
    <div
      className={`relative flex h-[calc(100vh-3.5rem)] flex-col border-r border-richblack-700 bg-richblack-800 transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-[70px]" : "w-[320px] max-w-[350px]"
      }`}
    >
      {/* Collapse / expand handle */}
      <button
        onClick={() => setIsCollapsed((prev) => !prev)}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-8 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-richblack-600 bg-richblack-700 text-richblack-100 shadow-md transition-all hover:scale-110 hover:bg-richblack-600 hover:text-yellow-50"
      >
        {isCollapsed ? (
          <HiOutlineChevronDoubleRight size={14} />
        ) : (
          <HiOutlineChevronDoubleLeft size={14} />
        )}
      </button>

      {/* Header */}
      <div
        className={`flex flex-col gap-y-4 border-b border-richblack-600 py-5 text-richblack-25 ${
          isCollapsed ? "items-center px-2" : "mx-5"
        }`}
      >
        <div className={`flex w-full items-center ${isCollapsed ? "flex-col gap-3" : "justify-between"}`}>
          <div
            onClick={() => navigate(`/dashboard/enrolled-courses`)}
            className="flex h-[35px] w-[35px] shrink-0 items-center justify-center rounded-full bg-richblack-100 p-1 text-richblack-700 transition-transform duration-200 hover:scale-90"
            title="Back to enrolled courses"
          >
            <IoIosArrowBack size={26} />
          </div>

          {!isCollapsed && (
            <IconBtn
              text="Add Review"
              customClasses="ml-auto text-sm px-4 py-[6px]"
              onclick={() => setReviewModal(true)}
            />
          )}
        </div>

        {!isCollapsed && (
          <div className="flex flex-col gap-y-2">
            <p className="text-lg font-bold leading-tight line-clamp-2">
              {courseEntireData?.courseName}
            </p>

            <div className="flex items-center justify-between text-sm font-semibold text-richblack-300">
              <span>
                {completedLectures?.length || 0} / {totalNoOfLectures} lectures
              </span>
              <span className="text-caribbeangreen-100">{progressPercent}%</span>
            </div>

            {/* Progress bar */}
            <div className="h-[6px] w-full overflow-hidden rounded-full bg-richblack-700">
              <div
                className="h-full rounded-full bg-caribbeangreen-400 transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Section / subsection list */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {courseSectionData.map((course, index) => {
          const isSectionOpen = activeStatus === course?._id
          const sectionCompletedCount = course?.subSection?.filter((s) =>
            completedLectures.includes(s._id)
          ).length

          return (
            <div key={course?._id || index} className="border-b border-richblack-700 last:border-b-0">
              {/* Section header */}
              <div
                className={`flex cursor-pointer flex-row items-center justify-between bg-richblack-700 px-5 py-4 transition-colors duration-200 hover:bg-richblack-600 ${
                  isCollapsed ? "justify-center px-2" : ""
                }`}
                onClick={() => toggleSection(course?._id)}
                title={isCollapsed ? course?.sectionName : undefined}
              >
                {isCollapsed ? (
                  <span className="text-xs font-bold text-richblack-100">{index + 1}</span>
                ) : (
                  <>
                    <div className="flex flex-col gap-[2px] pr-2">
                      <span className="text-sm font-semibold text-richblack-5 line-clamp-1">
                        {course?.sectionName}
                      </span>
                      <span className="text-xs text-richblack-400">
                        {sectionCompletedCount}/{course?.subSection?.length || 0} done
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      
                      <span
                        className={`text-richblack-300 transition-transform duration-300 ${
                          isSectionOpen ? "rotate-0" : "rotate-180"
                        }`}
                      >
                        <BsChevronDown size={14} />
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Subsections */}
              {isSectionOpen && !isCollapsed && (
                <div className="flex flex-col bg-richblack-800 py-1 transition-all duration-300 ease-in-out">
                  {course?.subSection?.map((topic, i) => {
                    const isCompleted = completedLectures.includes(topic?._id)
                    const isPlaying = videoBarActive === topic._id

                    return (
                      <div
                        key={topic?._id || i}
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(
                            `/view-course/${courseEntireData?._id}/section/${course?._id}/sub-section/${topic?._id}`
                          )
                          setVideoBarActive(topic._id)
                        }}
                        className={`group flex cursor-pointer items-center gap-3 border-l-[3px] px-5 py-3 text-sm transition-colors duration-150 ${
                          isPlaying
                            ? "border-yellow-50 bg-richblack-700 font-semibold text-yellow-50"
                            : isCompleted
                            ? "border-transparent text-richblack-400 hover:bg-richblack-700"
                            : "border-transparent text-richblack-100 hover:bg-richblack-700"
                        }`}
                      >
                        {/* isPlaying is checked first so an active lecture is always
                            highlighted, even if it's already marked completed */}
                        <span className="shrink-0 text-lg">
                          {isPlaying ? (
                            isCompleted ? (
                              <BsCheckCircleFill className="text-yellow-50" />
                            ) : (
                              <BsFillPlayCircleFill className="text-yellow-50" />
                            )
                          ) : isCompleted ? (
                            <BsCheckCircleFill className="text-caribbeangreen-300" />
                          ) : (
                            <span className="block h-4 w-4 rounded-full border-2 border-richblack-500" />
                          )}
                        </span>

                        <span
                          className={`flex-1 line-clamp-2 ${
                            isCompleted && !isPlaying ? "line-through decoration-richblack-500" : ""
                          }`}
                        >
                          {topic?.title}
                        </span>

                        <MdOutlineDesktopWindows
                          className={`shrink-0 text-base ${
                            isPlaying ? "text-yellow-50" : "text-richblack-500 group-hover:text-richblack-300"
                          }`}
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}