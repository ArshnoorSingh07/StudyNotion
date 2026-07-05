const express = require('express');
const app = express();

const userRoutes = require('./routes/User');
const profileRoutes = require('./routes/Profile');
const paymentRoutes = require('./routes/Payments');
const courseRoutes = require('./routes/Course');
const contactUsRoute = require('./routes/Contact')

const database = require('./config/database');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const {cloudinaryConnect} = require('./config/cloudinary');
const fileUpload = require('express-fileupload');
const dotenv = require('dotenv');
dotenv.config();
const dns = require('dns');
dns.setServers(["8.8.8.8","1.1.1.1"]);


const PORT = process.env.PORT || 4000;

// Database Connect
database.connect();

// middlewares
app.use(express.json());
app.use(cookieParser()); 

const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);

app.use(
    fileUpload({
        useTempFiles : true,
        tempFileDir : "/tmp",
    })
);

// cloudinary connection
cloudinaryConnect();

// routes
app.use("/api/v1/auth",userRoutes);
app.use("/api/v1/profile",profileRoutes);
app.use("/api/v1/course",courseRoutes);
app.use("/api/v1/payment",paymentRoutes);
app.use("/api/v1/reach", contactUsRoute);

// default route
app.get('/',(req, res)=>{
    return res.json({
        success:true,
        message:"Your server is up and running... "
    })
});

// Activate Server
app.listen(PORT , ()=>{
    console.log(`App is running at ${PORT}`);
})