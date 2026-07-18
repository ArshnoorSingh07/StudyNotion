import React from 'react'
import { Link } from 'react-router-dom'
import { FaArrowRightLong } from "react-icons/fa6";
import HighlightText from '../Components/core/HomePage/HighlightText';
import CTAButton from '../Components/core/HomePage/Button';
import Banner from '../assets/Images/banner.mp4';
import CodeBlocks from '../Components/core/HomePage/CodeBlocks';
import TimeLineSection from '../Components/core/HomePage/TimeLineSection';
import LearningLanguageSection from '../Components/core/HomePage/LearningLanguageSection';
import InstructorSection from '../Components/core/HomePage/InstructorSection';
import Footer from '../Components/common/Footer';
import ExploreMore from '../Components/core/HomePage/ExploreMore';
import ReviewSlider from '../Components/common/ReviewSlider';

const Home = () => {
  return (
    <div>

        {/* Section 1 */}
        <div className='relative mx-auto flex w-11/12 max-w-maxContent flex-col items-center justify-between gap-8 text-white'>
        
            {/* Become a Instructor Button */}
            <Link to={"/signup"}>
                <div className="group mx-auto mt-16 w-fit rounded-full border border-richblack-600/50 bg-richblack-800/70 p-[1px] font-bold text-richblack-100 backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-95 hover:border-yellow-50/40">

                    <div className="flex flex-row items-center gap-2 rounded-full px-10 py-[6px] transition-all duration-300 group-hover:bg-richblack-700/80">

                        <p>Become an Instructor</p>

                        <FaArrowRightLong className="transition-transform duration-300 group-hover:translate-x-1" />

                    </div>

                </div>
            </Link>

            {/* Heading */}
            <div className="mt-7 text-center text-4xl font-semibold tracking-tight">

                Empower Your Future with{" "}

                <HighlightText text={"Coding Skills"} />

            </div>

            {/* Sub Heading */}
            <div className="mt-1 w-[90%] text-center text-lg font-bold leading-8 text-richblack-200">

                With our online coding courses, you can learn at your own pace,
                from anywhere in the world, and get access to a wealth of
                resources, including hands-on projects, quizzes, and
                personalized feedback from instructors.

            </div>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-row gap-7">

                <CTAButton active={true} linkto={"/signup"}>
                    Learn More
                </CTAButton>

                <CTAButton active={false} linkto={"/login"}>
                    Book a Demo
                </CTAButton>

            </div>

            {/* Video */}
            <div className="mx-3 my-7 overflow-hidden rounded-2xl border border-richblack-700 shadow-[0_20px_60px_rgba(14,165,233,0.18)] transition-all duration-500 hover:shadow-[0_20px_80px_rgba(59,130,246,0.3)]">

                <video
                    className="rounded-2xl transition-transform duration-700 hover:scale-[1.02]"
                    muted
                    loop
                    autoPlay
                    playsInline
                >
                    <source src={Banner} type="video/mp4" />
                </video>

            </div>

            {/* Code Section - 1 */}

            <div>

                <CodeBlocks

                    position={"lg:flex-row"}

                    heading={
                        <div className='text-4xl font-semibold'>

                            Unlock your{" "}

                            <HighlightText text={"coding potential"} />

                            <br />

                            with our online courses.

                        </div>
                    }

                    subheading={
                        "Our courses are designed and taught by industry experts who have years of experience in coding and are passionate about sharing their knowledge with you."
                    }

                    ctabtn1={
                        {
                            btnText: "Try it Yourself",
                            linkto: "/signup",
                            active: true,
                        }
                    }

                    ctabtn2={
                        {
                            btnText: "Learn More",
                            linkto: "/login",
                            active: false,
                        }
                    }

                    codeblock={`<!DOCTYPE html>
<html>
<head><title>Example</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<h1><a href="/">Header</a></h1>
<nav>
<a href="one/">One</a>
<a href="two/">Two</a>
<a href="three/">Three</a>
</nav>`}

                    codeColor={"text-yellow-25"}
                    backgroundGradient={<div className="codeblock1 absolute"></div>}

                />

            </div>

            {/* Code Section - 2 */}

            <div>

                <CodeBlocks

                    position={"lg:flex-row-reverse"}

                    heading={
                        <div className="w-[100%] text-4xl font-semibold lg:w-[50%]">

                            Start{" "}

                            <HighlightText text={"coding in seconds"} />

                        </div>
                    }

                    subheading={
                        "Go ahead, give it a try. Our hands-on learning environment means you'll be writing real code from your very first lesson."
                    }

                    ctabtn1={
                        {
                            btnText: "Continue Lesson",
                            linkto: "/signup",
                            active: true,
                        }
                    }

                    ctabtn2={
                        {
                            btnText: "Learn More",
                            linkto: "/login",
                            active: false,
                        }
                    }

                    codeblock={`<!DOCTYPE html>
<html>
<head><title>Example</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<h1><a href="/">Header</a></h1>
<nav>
<a href="one/">One</a>
<a href="two/">Two</a>
<a href="three/">Three</a>
</nav>`}

                    codeColor={"text-[#E2E8F0]"}
                    backgroundGradient={<div className="codeblock2 absolute"></div>}

                />

            </div>

            <ExploreMore/>

        </div>

        {/* Section 2 */}
        <div className=' bg-pure-greys-5 text-richblack-700'>
            <div className='homepage_bg h-[320px]'>
                <div className="mx-auto flex w-11/12 max-w-maxContent flex-col items-center justify-between gap-8">
                    <div className='lg:h-[150px]'></div>
                    {/* Explore Full Catagory Section */}
                    <div className='flex flex-row gap-7 text-white lg:mt-8'>
                        <CTAButton active={true} linkto={'/signup'}>
                            <div className='flex items-center gap-2'>
                                Explore Full Catalog
                                <FaArrowRightLong/>
                            </div>
                        </CTAButton>

                        <CTAButton active={false} linkto={'/login'}>
                            <div>
                                Learn More
                            </div>
                        </CTAButton>

                    </div>
                </div>     
            </div>

            <div className='mx-auto flex w-11/12 max-w-maxContent flex-col items-center justify-between gap-8 '>
                {/* Job that is in Demand - Section 1 */}    
                <div className='mb-10 mt-[-100px] flex flex-col justify-between gap-7 lg:mt-20 lg:flex-row lg:gap-0'>
                    <div className='text-4xl font-semibold lg:w-[45%] '>
                        Get the Skills you need for a
                        <HighlightText text={"job that is in demand."}/>
                    </div>
                    <div className='flex flex-col items-start gap-10 lg:w-[40%]'>
                        <div className='text-[16px]'>
                            The modern StudyNotion is the dictates its own terms. 
                            Today, to be a competitive specialist requires more than professional skills.
                        </div>
                        <CTAButton active={true} linkto={'/signup'}>
                            Learn More
                        </CTAButton>
                    </div>
                </div>

                {/* Timeline Section - Section 2 */}
                <TimeLineSection />
                
                {/* Learning Language Section - Section 3 */}
                <LearningLanguageSection />
            </div> 

            

        </div>

        {/* Section 3 */}
        <div className="relative mx-auto my-20 flex w-11/12 max-w-maxContent flex-col items-center justify-between gap-8 bg-richblack-900 text-white">
            {/* Become a instructor section */}
            <InstructorSection />

            {/* Reviws from Other Learner */}
            <h2 className="text-center text-4xl font-semibold mt-8">
                Reviews from other learners
            </h2>

            {/* Review Slider Here */}
            <ReviewSlider/>

        </div>

        {/* Footer */}
        <Footer/>

    </div>
  )
}

export default Home