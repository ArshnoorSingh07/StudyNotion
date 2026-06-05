import React from 'react'
import IconBtn from '../../../common/IconBtn';
import { useSelector } from 'react-redux';

const RenderTotalAmount = () => {
    const {total} = useSelector( (state) => state.cart);
    const {cart} = useSelector( (state) => state.cart);

    const handleBuyCourse = () => {
        const courses = cart.map((course)=> course._id);
        console.log("Bought these Courses: ",courses);
        // TODO: Api Integrate -> Payment Gateway
    }

  return (
    <div>

        <p>Total: </p>
        <p>Rs {total}</p>
    
        <IconBtn
            text="Buy Now"
            onclick={handleBuyCourse}
            customClasses={"w-full justify center"}

        />
    </div>
  )
}

export default RenderTotalAmount