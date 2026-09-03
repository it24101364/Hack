import express from 'express'
import { authenticate, requireStudent } from '../middleware/auth.js'

const router = express.Router()
router.get('/dashboard', authenticate, requireStudent, (req, res) => res.json({ user: req.user }))
export default router