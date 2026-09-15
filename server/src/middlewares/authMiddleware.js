const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { JWT_SECRET_KEY, JWT_REFRESH_TOKEN_SECRET_KEY,JWT_ACCESS_TOKEN_EXPIRES } = require('../config/env');
const { generateAccessToken } = require('../utils/jwt');
const { getDateAfterDuration } = require('../utils/date');
// Middleware for detecting authenticated logged-in user
exports.isAuthenticatedUser = async (req, res, next) => {
  try {
    // get access token from cookie
    const accesstoken = req.cookies.accessToken;

    if (!accesstoken) {
      return tryRefreshAccessToken(req, res, next);
    }
    // verify token
    jwt.verify(accesstoken, JWT_SECRET_KEY, async (err, dec) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return tryRefreshAccessToken(req, res, next);
        }
        return res.status(401).json({ status: 'error', message: 'JWT access token is invalid. Please logout and login again' });
      }

      try {      
        // check if user exists
        const user = await User.findById(dec.id);

        if (!user) {
          return res.status(404).json({ status: 'error', message: 'User not found with the provided token' });
        }
        // Check if user is active
        if (!user.isActive) {
          return res.status(403).json({ status: 'error', message: 'User is not active. Please contact administrator' });
        }
        req.user = user;
        return next(); 
      } catch (dbError) {
        console.error(dbError);
        res.status(500).json({ status: 'error', message: 'SERVER SIDE ERROR' });
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: 'error',
      message: 'SERVER SIDE ERROR'
    });
  }
}

// Middleware for validating refresh token
exports.isRefreshTokenValid = async (req, res, next) => {
  try {
    // get refresh token from cookie
    const token = req.cookies.refreshToken;
    if (!token) {
    return res.status(403).json({ status: 'error', message: 'Refresh token is required' });
  }
    // Verify refresh token
    jwt.verify(token, JWT_REFRESH_TOKEN_SECRET_KEY, async (err, decoded) => {
      if (err) {
        return res.status(401).json({ status: 'error', message: 'JWT refresh token is expired or invalid. Please logout and login again' });
      }

      try {
        // Check if user exists
        const user = await User.findById(decoded.id);

        if (!user) {
          return res.status(404).json({ status: 'error', message: 'User not found with the provided token' });
        }

        if (!user.isActive) {
          return res.status(403).json({ 
            status: 'error', 
            message: 'User is not active. Please contact administrator' });
        }

        req.user = user;  
        return next(); // Proceed to the next middleware or route handler
      } catch (dbError) {
        console.error(dbError);
        return res.status(500).json({ status: 'error', message: 'SERVER SIDE ERROR' });
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ 
      status: 'error',
      message: 'SERVER SIDE ERROR'
    });
  }
};

// Middleware to check if user is an admin
exports.verifyAdmin = async (req, res, next) => {
  try {
    // Retrieve the user from the request object
    const { user } = req;

    // Check if user exists
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Sorry, User does not exist' });
    }

    // Check if user has admin privileges
    if (user.role === 'admin') {
      return next(); // Proceed if the user is an admin
    } else {
      return res.status(403).json({ status: 'error', message: 'Access denied. Only admin can access.' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'SERVER SIDE ERROR' });
  }
};

// Middleware to check if user is a trainer OR an admin (both are allowed through)
exports.verifyTrainerOrAdmin = async (req, res, next) => {
  try {
    // Retrieve the user from the request object
    const { user } = req;

    // Check if user exists
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'Sorry, User does not exist' });
    }

    // Check if user has trainer or admin privileges
    if (user.role === 'trainer' || user.role === 'admin') {
      return next(); // Proceed if the user is a trainer or an admin
    } else {
      return res.status(403).json({ status: 'error', message: 'Access denied. Only trainer or admin can access.' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'SERVER SIDE ERROR' });
  }
};

// Middleware to check if user is an trainer
exports.verifyTrainer = async (req, res, next) => {
  try {
    // Retrieve the user from the request object
    const { user } = req;

    // Check if user exists
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Sorry, User does not exist' });
    }

    // Check if user has trainer privileges
    if (user.role === 'trainer') {
      return next(); // Proceed if the user is a trainer
    } else {
      return res.status(403).json({ status: 'error', message: 'Access denied. Only trainer can access.' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'SERVER SIDE ERROR' });
  }
};
// Helper: Auto refresh access token if expired and refresh token is valid
const tryRefreshAccessToken = (req, res, next) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ status: 'error', message: 'Session expired. Please login again' });
  }

  jwt.verify(refreshToken, JWT_REFRESH_TOKEN_SECRET_KEY, async (err, dec) => {
    if (err) {
      // Refresh token is expired -> force user to logout and login again
      return res.status(401).json({ status: 'error', message: 'Session expired. Please login again' });
    }
    try {
      const user = await User.findById(dec.id);
      if (!user) {
        return res.status(404).json({ status: 'error', message: 'User not found with the provided token' });
      }
      if (!user.isActive) {
        return res.status(403).json({ status: 'error', message: 'User is not active. Please contact administrator' });
      }

      // Provide new access token and overwrite the cookie
      const newAccessToken = generateAccessToken(user._id);
      res.cookie('accessToken', newAccessToken, {
        expires: getDateAfterDuration(JWT_ACCESS_TOKEN_EXPIRES),
        httpOnly: true,
        sameSite: 'strict',
      });

      req.user = user;
      return next(); 
    } catch (dbError) {
      console.error(dbError);
      return res.status(500).json({ status: 'error', message: 'SERVER SIDE ERROR' });
    }
  });
};