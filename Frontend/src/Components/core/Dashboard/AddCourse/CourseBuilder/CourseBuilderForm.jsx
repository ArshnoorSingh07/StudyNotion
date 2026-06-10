import React, { useState } from 'react'
import { useForm } from 'react-hook-form';
import IconBtn from '../../../../common/IconBtn';
import {GrAddCircle} from  'react-icons/gr'
import { useDispatch, useSelector } from 'react-redux';
import { GrLinkNext } from "react-icons/gr";
import { setCourse, setEditCourse, setStep } from '../../../../../slices/courseSlice';
import toast from 'react-hot-toast';
import { createSection, updateSection } from '../../../../../services/operations/courseDetailsAPI';
import NestedView from './NestedView';

const CourseBuilderForm = () => {

  const {register, handleSubmit, setValue, formState: {errors}} = useForm();
  const [editSectionName, setEditSectionName] = useState(null);
  const {course} = useSelector((state) => state.course);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const {token} = useSelector((state) => state.auth);

  const cancelEdit = () => {
    setEditSectionName(null);
    setValue("sectionName", "");
  }

  const goToNext = () => {
    if(course.courseContent.length === 0){
      toast.error("Please Add atleast one Section");
      return;
    }
    if(course.courseContent.some((section) => section.subSection.length === 0)){
      toast.error("Please Add atleast one lecture in each Section");
      return ;
    }

    // If Everything is good
    dispatch(setStep(3));

  }

  const onSubmit = async (data) => {
    setLoading(true);
    let result;

    if(editSectionName){
      // we are editing the section Name
      result = await updateSection(
        {
          sectionName: data.sectionName,
          sectionId: editSectionName,
          courseId: course._id,
        },token
      )
    }
    else{
      result = await createSection({
        sectionName: data.sectionName,
        courseId: course._id,
      }, token)
    }

    // update Values
    if(result){
      dispatch(setCourse(result));
      setEditSectionName(null);
      setValue("sectionName","");
    }

    // Loading false
    setLoading(false);
  }

  const goBack = () => {
    dispatch(setStep(1));
    dispatch(setEditCourse(true));
  }

  const handleChangeEditSectionName = (sectionId, sectionName) =>{

    if(editSectionName === sectionId){
      cancelEdit();
    }
    setEditSectionName(sectionId);
    setValue("sectionName",sectionName);
  }
  
  return (
    <div className='text-white'>
        <p>Course Builder</p>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label htmlFor='sectionName'>Section Name <sup>*</sup></label>
            <input    
              id='sectionName'
              placeholder='Add Section Name'
              {...register("sectionName", {required:true})}
              className='w-full text-black'
            />
            {
              errors.sectionName && (
                <span>
                  Section Name is required
                </span>
              )
            }
          </div>

          <div className='mt-10 flex '>
            <IconBtn
              type="submit"
              text={editSectionName ? "Edit Section Name" : "Create Section"}
              outline={true}
              customClasses="text-white"
            >
            <GrAddCircle className='text-yellow-50'/>
            </IconBtn>
            {
              editSectionName && (
                <button
                  type='button'
                  onClick={cancelEdit}
                  className='text-sm text-richblack-300 underline ml-5'
                >
                  Cancel Edit
                </button>
              )
            }
          </div>
        </form>

        {course.courseContent.length > 0 && (
          <NestedView handleChangeEditSectionName={handleChangeEditSectionName}/>
        )}

        <div className='flex justify-center gap-x-3 mt-10'>
            <button
              onClick={goBack}
              className='rounded-md cursor-pointer flex items-center'
            >
              Back
            </button>

            <IconBtn
              text="Next"
              onclick={goToNext}
            >
              <GrLinkNext />
            </IconBtn>
        </div>
        
    </div>
  )
}

export default CourseBuilderForm