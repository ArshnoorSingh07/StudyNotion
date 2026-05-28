import React, { useEffect, useState } from 'react';
import { FaArrowRightLong } from "react-icons/fa6";
import CTAButton from '../HomePage/Button';
import HighlightText from './HighlightText';

const CodeBlocks = ({
    position,
    heading,
    subheading,
    ctabtn1,
    ctabtn2,
    codeblock,
    backgroundGradient,
    codeColor
}) => {

    const [text, setText] = useState("");

    useEffect(() => {

        let currentIndex = 0;

        const interval = setInterval(() => {

            setText(codeblock.slice(0, currentIndex + 1));

            currentIndex++;

            // Restart typing infinitely
            if (currentIndex > codeblock.length) {
                currentIndex = 0;
                setText("");
            }

        }, 50);

        return () => clearInterval(interval);

    }, [codeblock]);

    return (

        <div className={`flex ${position} items-center my-20 justify-between gap-10`}>

            {/* Section 1 */}

            <div className='w-[50%] flex flex-col gap-8'>

                {heading}

                <div className='text-richblack-300 font-bold'>
                    {subheading}
                </div>

                <div className='flex gap-7 mt-7'>

                    <CTAButton
                        active={ctabtn1.active}
                        linkto={ctabtn1.linkto}
                    >
                        <div className='flex gap-2 items-center'>
                            {ctabtn1.btnText}
                            <FaArrowRightLong />
                        </div>
                    </CTAButton>

                    <CTAButton
                        active={ctabtn2.active}
                        linkto={ctabtn2.linkto}
                    >
                        {ctabtn2.btnText}
                    </CTAButton>

                </div>

            </div>

            {/* Section 2 */}

            <div className='relative flex w-[100%] py-4 lg:w-[500px]'>

                {/* Background Gradient Blur */}

                <div className='absolute inset-0 bg-gradient-to-r from-yellow-500/20 via-transparent to-blue-500/20 blur-2xl'></div>

                {/* Main Code Box */}

                <div className='relative flex w-full rounded-xl0 overflow-hidden'>

                    {/* Line Numbers */}

                    <div className='flex flex-col items-center px-4 py-4 text-richblack-400 font-inter font-bold'>

                        <p>1</p>
                        <p>2</p>
                        <p>3</p>
                        <p>4</p>
                        <p>5</p>
                        <p>6</p>
                        <p>7</p>
                        <p>8</p>
                        <p>9</p>
                        <p>10</p>
                        <p>11</p>
                        <p>12</p>

                    </div>

                    {/* Code Content */}

                    <div className='py-4 pr-4 text-sm font-mono font-bold w-full overflow-x-auto overflow-y-hidden'>

                        <pre className={`whitespace-pre-wrap break-words max-w-full leading-6 ${codeColor}`}>

                            <code>
                                {text}
                                <span className='animate-pulse text-white'>|</span>
                            </code>

                        </pre>

                    </div>

                </div>

            </div>

        </div>

    )
}

export default CodeBlocks