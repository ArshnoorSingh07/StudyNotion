import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import GetAvgRating from '../../../utils/avgRating';
import RatingStars from '../../common/RatingStars';

const Course_Card = ({course, Height}) => {

    const [averageReviewCount, setAverageReviewCount] = useState(0);

    useEffect( () => {
        const count = GetAvgRating(course.ratingAndReviews);
        setAverageReviewCount(count);
    },[course])

  return (
    <div>

        <Link to={`/courses/${course._id}`}>
            <div>
                <img
                    src={course?.thumbnail}
                    alt='Course Thumbnail'
                    className={`${Height} w-full rounded-xl object-cover`}
                />
            </div>
            <div>
                <p>{course?.courseName}</p>
                <p>{course?.instructor?.firstName} {course?.instructor?.lastName}</p>
                <div className='flex gap-x-3'>
                    <span>{averageReviewCount || 0}</span>
                    <RatingStars Review_Count={averageReviewCount}/>
                    <span>{course?.ratingAndReviews?.length}</span>
                </div>
                <p>{course?.price}</p>
            </div>
        </Link>

    </div>
  )
}

export default Course_Card