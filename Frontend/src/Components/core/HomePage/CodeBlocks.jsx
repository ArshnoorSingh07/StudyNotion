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
        let interval;

        const startTyping = () => {

            interval = setInterval(() => {

                setText(codeblock.slice(0, currentIndex + 1));

                currentIndex++;

                // Stop at end
                if (currentIndex > codeblock.length) {

                    clearInterval(interval);

                    // Pause for 2 seconds
                    setTimeout(() => {

                        currentIndex = 0;
                        setText("");

                        startTyping();

                    }, 2000);
                }

            }, 50);
        };

        startTyping();

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


                {/* Main Code Box */}

                <div
                    className='relative flex w-full rounded-2xl
                    border border-white/10
                    bg-gradient-to-br from-[#0f172a] via-[#0b1f35] to-[#020617]
                    backdrop-blur-sm
                    shadow-[0_0_40px_rgba(59,130,246,0.15)]
                    overflow-hidden'
                >

                    {/* Line Numbers */}

                    <div
                        className='flex flex-col items-center px-4 py-4
                        text-richblack-400 font-inter font-bold
                        bg-white/5 border-r border-white/10'
                    >

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

                    <div
                        className='py-4 pr-6 pl-4 text-sm font-mono font-bold
                        w-full overflow-x-auto overflow-y-hidden'
                    >

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