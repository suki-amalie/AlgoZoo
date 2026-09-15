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

// initialize express app
const app = express();

// application database connection establishment
const connectDatabase = require('../config/connect_db');
connectDatabase();

// parse cookies from request
app.use(cookieParser());

app.use(
    cors({
      origin: ["http://localhost:4200", "http://localhost:8473"],
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

module.exports=app
