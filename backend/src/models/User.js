import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  studentId: { type: String, required: true, unique: true, trim: true, uppercase: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
}, { timestamps: true })

export default mongoose.model('User', userSchema)