import { lazy, Suspense } from "react";
import "./App.css";
import { Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";
import Home from './pages/Home';
import Navbar from "./Components/common/Navbar";
import OpenRoute from './Components/core/Auth/OpenRoute'
import PrivateRoute from "./Components/core/Auth/PrivateRoute";
import { ACCOUNT_TYPE } from "./utils/constants";
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const UpdatePassword = lazy(() => import("./pages/UpdatePassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import('./pages/Contact'));
const MyProfile = lazy(() => import("./Components/core/Dashboard/MyProfile"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Error = lazy(() => import('./pages/Error'));
const Settings = lazy(() => import('./Components/core/Dashboard/Settings'));
const EnrolledCourses = lazy(() => import("./Components/core/Dashboard/EnrolledCourses"));
const Cart = lazy(() => import("./Components/core/Dashboard/Cart"));
const AddCourse = lazy(() => import("./Components/core/Dashboard/AddCourse"));
const MyCourses = lazy(() => import("./Components/core/Dashboard/AddCourse/MyCourses"));
const EditCourse = lazy(() => import("./Components/core/Dashboard/AddCourse/EditCourse"));
const Catalog = lazy(() => import("./pages/Catalog"));
const CourseDetails = lazy(() => import("./pages/CourseDetails"));
const ViewCourse = lazy(() => import("./pages/ViewCourse"));
const VideoDetails = lazy(() => import("./Components/core/ViewCourse/VideoDetails"));
const Instructor = lazy(() => import("./Components/core/Dashboard/Instructor"));
const AssistantWidget = lazy(() => import("./Components/core/Assistant/AssistantWidget"));

function App() {

    
  const { user } = useSelector((state) => state.profile)
  return (
   <div className="w-screen min-h-screen bg-richblack-900 flex flex-col font-inter pt-14">
    <Navbar/>
    <Suspense fallback={<div className="grid min-h-[60vh] place-items-center"><div className="spinner" /></div>}>
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
    </Suspense>
    <Suspense fallback={null}><AssistantWidget /></Suspense>

   </div>
  );
}

export default App;
