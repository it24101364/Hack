import mongoose from 'mongoose'

const categories = ['Academic', 'Hostel', 'Facilities', 'Library', 'Transport', 'Finance', 'IT Services', 'Other']
const priorities = ['Low', 'Medium', 'High']

const complaintSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, minlength: 3, maxlength: 150 },
  category: { type: String, enum: categories, required: true },
  description: { type: String, required: true, trim: true, minlength: 10, maxlength: 5000 },
  priority: { type: String, enum: priorities, required: true, default: 'Medium' },
  status: { type: String, enum: ['Pending', 'Under Review', 'Resolved', 'Closed'], default: 'Pending' },
  adminResponse: { type: String, default: '' },
}, { timestamps: true })

export { categories, priorities }
export default mongoose.model('Complaint', complaintSchema)