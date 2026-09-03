import 'dotenv/config'
import mongoose from 'mongoose'
import User from '../models/User.js'

const email = process.argv[2]?.trim().toLowerCase()
if (!email) {
  console.error('Usage: npm run make-admin -- user@example.com')
  process.exit(1)
}

await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/student-complaints')
const result = await User.updateOne({ email }, { role: 'admin' })
console.log(result.matchedCount ? `${email} can now access the admin dashboard.` : `No user found for ${email}.`)
await mongoose.disconnect()