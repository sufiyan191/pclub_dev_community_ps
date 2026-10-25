import jwt from 'jsonwebtoken';

export const requireAuth = (req, res, next) => {
  try {
    // 1. Check for token in HttpOnly cookie OR Authorization Bearer header
    let token = req.cookies?.token;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
      });
    }

    // 2. Verify token cryptographic signature
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Attach user info to req object for downstream controllers
    req.user = {
      id: decoded.userId,
      username: decoded.username,
      role: decoded.role,
    };

    next(); // Pass control to the next middleware or route controller
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please log in again.',
    });
  }
};