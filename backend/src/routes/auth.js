import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const router = express.Router()
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const safeUser = (user) => ({ id: user._id, fullName: user.fullName, studentId: user.studentId, email: user.email, role: user.role, createdAt: user.createdAt })
const issueToken = (user) => jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' })

router.post('/register', async (req, res) => {
  try {
    const { fullName, studentId, email, password, confirmPassword } = req.body
    if (!fullName?.trim() || !studentId?.trim() || !email?.trim() || !password || !confirmPassword) return res.status(400).json({ message: 'Please complete all fields.' })
    if (!emailPattern.test(email.trim())) return res.status(400).json({ message: 'Please enter a valid email address.' })
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' })
    if (password !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match.' })

    const normalizedEmail = email.trim().toLowerCase()
    const normalizedStudentId = studentId.trim().toUpperCase()
    const existing = await User.findOne({ $or: [{ email: normalizedEmail }, { studentId: normalizedStudentId }] })
    if (existing) return res.status(409).json({ message: existing.email === normalizedEmail ? 'An account with this email already exists.' : 'This Student ID is already registered.' })

    const user = await User.create({ fullName: fullName.trim(), studentId: normalizedStudentId, email: normalizedEmail, password: await bcrypt.hash(password, 12) })
    return res.status(201).json({ token: issueToken(user), user: safeUser(user) })
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Email or Student ID is already registered.' })
    return res.status(500).json({ message: 'We could not create your account. Please try again.' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' })
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password')
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: 'The email or password is incorrect.' })
    return res.json({ token: issueToken(user), user: safeUser(user) })
  } catch {
    return res.status(500).json({ message: 'We could not sign you in. Please try again.' })
  }
})

export default router