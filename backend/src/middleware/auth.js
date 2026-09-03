import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null
    if (!token) return res.status(401).json({ message: 'Authentication required.' })

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id).select('-password')
    if (!user) return res.status(401).json({ message: 'Your session is no longer valid.' })
    req.user = user
    next()
  } catch (error) {
    const message = error.name === 'TokenExpiredError' ? 'Your session has expired. Please sign in again.' : 'Invalid authentication token.'
    return res.status(401).json({ message })
  }
}

export const requireStudent = (req, res, next) => {
  if (req.user.role !== 'student') return res.status(403).json({ message: 'This area is for students only.' })
  next()
}

export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Administrator access is required.' })
  next()
}