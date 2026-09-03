import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import authRoutes from './routes/auth.js'
import studentRoutes from './routes/student.js'
import complaintRoutes from './routes/complaints.js'
import adminRoutes from './routes/admin.js'

const app = express()
const port = process.env.PORT || 5001

app.use(cors({ origin: process.env.CLIENT_URL || 'https://hack-frontend-d3kjjm935-czonelanka-9521.vercel.app/' }))
app.use(express.json())
app.get('/api/health', (req, res) => res.json({ status: 'ok' }))
app.use('/api/auth', authRoutes)
app.use('/api/student', studentRoutes)
app.use('/api/complaints', complaintRoutes)
app.use('/api/admin', adminRoutes)

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/student-complaints')
  .then(() => app.listen(port, () => console.log(`API running on http://localhost:${port}`)))
  .catch((error) => { console.error('MongoDB connection failed:', error.message); process.exit(1) })