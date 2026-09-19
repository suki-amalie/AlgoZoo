require('dotenv').config();

module.exports = {
    APP_PORT: process.env.APP_PORT,
    APP_BASE_URL: process.env.APP_BASE_URL,
    MONGO_URI: process.env.MONGO_URI,
    JWT_TOKEN_COOKIE_EXPIRES: process.env.JWT_TOKEN_COOKIE_EXPIRES,
    JWT_SECRET_KEY: process.env.JWT_SECRET_KEY,
    JWT_REFRESH_TOKEN_SECRET_KEY: process.env.JWT_REFRESH_TOKEN_SECRET_KEY,
    JWT_ACCESS_TOKEN_EXPIRES: process.env.JWT_ACCESS_TOKEN_EXPIRES,
    JWT_REFRESH_TOKEN_EXPIRES: process.env.JWT_REFRESH_TOKEN_EXPIRES,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,

};