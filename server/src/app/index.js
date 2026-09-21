// imports modules & dependencies
const express=require('express')
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const env = require('dotenv');
const cors = require('cors');
const path = require('path');

// imports application middleware and routes
const authRoute = require('../routes/authRoutes');
const adminRoute = require('../routes/adminRoutes');
const trainerRoute = require('../routes/trainerRoutes');
const problemRoute = require('../routes/problemRoutes');
const classRoute = require('../routes/classRoutes');
const studentRoute = require('../routes/studentRoutes');
const executionRoute = require('../routes/executionRoutes');
const notificationRoute = require('../routes/notificationRoutes');

// initialize express app
const app = express();

// application database connection establishment
const connectDatabase = require('../config/connect_db');
connectDatabase();
const { APP_BASE_URL } = require('../config/env');

// parse cookies from request
app.use(cookieParser());

const allowedOrigins = ["http://localhost:5173", "http://localhost:5174"];
if (APP_BASE_URL) allowedOrigins.push(APP_BASE_URL);

app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    })
  );

// parse body of request
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// sets application API's routes
app.use('/api', authRoute); // auth routes
app.use('/api', adminRoute); // admin routes
app.use('/api', trainerRoute); // trainer routes
app.use('/api', problemRoute); // problem bank routes
app.use('/api/classes', classRoute); // class routes
app.use('/api/student', studentRoute); //student routes
app.use('/api/execution', executionRoute); //code execution (run) routes
app.use('/api', notificationRoute); // notification routes

module.exports=app
