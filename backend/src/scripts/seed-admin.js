import 'dotenv/config'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import User from '../models/User.js'

const admin = {
  fullName: process.env.ADMIN_NAME || 'System Administrator',
  studentId: (process.env.ADMIN_STUDENT_ID || 'ADMIN-001').trim().toUpperCase(),
  email: (process.env.ADMIN_EMAIL || 'admin@studentcare.local').trim().toLowerCase(),
  password: process.env.ADMIN_PASSWORD || 'Admin@12345',
}

if (admin.password.length < 6) {
  console.error('ADMIN_PASSWORD must be at least 6 characters.')
  process.exit(1)
}

await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/student-complaints')
const password = await bcrypt.hash(admin.password, 12)
const user = await User.findOneAndUpdate(
  { email: admin.email },
  { ...admin, password, role: 'admin' },
  { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
)

console.log(`Admin ready: ${user.email}`)
await mongoose.disconnect()