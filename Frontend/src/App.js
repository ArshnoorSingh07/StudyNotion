import "./App.css";
import { Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";
import Home from './pages/Home';
import Navbar from "./Components/common/Navbar";
import OpenRoute from './Components/core/Auth/OpenRoute'
import Login from './pages/Login';
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import UpdatePassword from "./pages/UpdatePassword";
import VerifyEmail from "./pages/VerifyEmail";
import About from "./pages/About";
import Contact from './pages/Contact';
import MyProfile from "./Components/core/Dashboard/MyProfile";
import Dashboard from "./pages/Dashboard";
import PrivateRoute from "./Components/core/Auth/PrivateRoute";
import Error from './pages/Error';
import Settings from './Components/core/Dashboard/Settings'
import EnrolledCourses from "./Components/core/Dashboard/EnrolledCourses";
import Cart from "./Components/core/Dashboard/Cart";
import { ACCOUNT_TYPE } from "./utils/constants";
import AddCourse from "./Components/core/Dashboard/AddCourse";
import MyCourses from "./Components/core/Dashboard/AddCourse/MyCourses";
import EditCourse from "./Components/core/Dashboard/AddCourse/EditCourse";
import Catalog from "./pages/Catalog";
import CourseDetails from "./pages/CourseDetails";
import ViewCourse from "./pages/ViewCourse";
import VideoDetails from "./Components/core/ViewCourse/VideoDetails";
import Instructor from "./Components/core/Dashboard/Instructor";

function App() {

    
  const { user } = useSelector((state) => state.profile)
  return (
   <div className="w-screen min-h-screen bg-richblack-900 flex flex-col font-inter pt-14">
    <Navbar/>
    <Routes>
      <Route path="/" element={<Home/>} />
      <Route path="/catalog/:catalogName" element={<Catalog/>} />
      <Route path="/courses/:courseId" element={<CourseDetails/>} />

      <Route
          path="signup"
          element={
            <OpenRoute>
              <Signup />
            </OpenRoute>
          }
        />
        
      <Route
            path="login"
            element={
              <OpenRoute>
                <Login />
              </OpenRoute>
            }
          />

      <Route
            path="forgot-password"
            element={
              <OpenRoute>
                <ForgotPassword />
              </OpenRoute>
            }
          />

      <Route
            path="update-password/:id"
            element={
              <OpenRoute>
                <UpdatePassword />
              </OpenRoute>
            }
          />

      <Route
            path="verify-email"
            element={
              <OpenRoute>
                <VerifyEmail />
              </OpenRoute>
            }
          />
          
      <Route
            path="about"
            element={
                <About/>
            }
          />
      
      <Route
        path="/contact"
        element={<Contact/>}
      />
      
      <Route
        element={
            <PrivateRoute>
                <Dashboard/>
            </PrivateRoute>
        }
      >
        <Route path="dashboard/my-profile" element={<MyProfile/>} />
        <Route path="dashboard/settings" element={<Settings/>}/>
        
        {
          user?.accountType === ACCOUNT_TYPE.STUDENT && (
            <>
              <Route path="dashboard/cart" element={<Cart/>} />
              <Route path="dashboard/enrolled-courses" element={<EnrolledCourses/>} />
            </>
          )
        }

        {
          user?.accountType === ACCOUNT_TYPE.INSTRUCTOR && (
            <>
              <Route path="dashboard/instructor" element={<Instructor/>} />
              <Route path="dashboard/add-course" element={<AddCourse/>} />
              <Route path="dashboard/my-courses" element={<MyCourses/>} />
              <Route path="dashboard/edit-course/:courseId" element={<EditCourse/>} />
            </>
          )
        }

      </Route>

        <Route element={
          <PrivateRoute>
            <ViewCourse/>
          </PrivateRoute>
        }>

        {
          user?.accountType === ACCOUNT_TYPE.STUDENT && (
            <>
              <Route 
                path="view-course/:courseId/section/:sectionId/sub-section/:subSectionId"
                element = {<VideoDetails/>}
              />
            </>
          )
        }
          
        </Route>


      <Route path="*" element={<Error/>}/>
    
    </Routes>

   </div>
  );
}

export default App;
