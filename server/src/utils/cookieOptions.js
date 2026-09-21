// Cross-origin cookies (client and server deployed on different domains) require
// SameSite=None + Secure. That combination is rejected by browsers over plain HTTP,
// so local dev (http://localhost) keeps Lax + non-secure instead.
const isProduction = process.env.NODE_ENV === 'production';

const baseCookieOptions = {
  httpOnly: true,
  sameSite: isProduction ? 'none' : 'lax',
  secure: isProduction,
};

module.exports = { baseCookieOptions };
