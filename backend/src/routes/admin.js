import express from 'express'
import Complaint, { categories } from '../models/Complaint.js'
import User from '../models/User.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'

const router = express.Router()
const statuses = ['Pending', 'Under Review', 'Resolved', 'Closed']
const priorities = ['Low', 'Medium', 'High']
const complaintFields = 'title category description priority status adminResponse createdAt updatedAt student'

router.use(authenticate, requireAdmin)

router.get('/dashboard', async (req, res) => {
  try {
    const [total, pending, underReview, resolved, closed] = await Promise.all([
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: 'Pending' }),
      Complaint.countDocuments({ status: 'Under Review' }),
      Complaint.countDocuments({ status: 'Resolved' }),
      Complaint.countDocuments({ status: 'Closed' }),
    ])
    return res.json({ statistics: { total, pending, underReview, resolved, closed }, user: req.user })
  } catch (error) {
    console.error('Admin dashboard lookup failed:', error.message)
    return res.status(500).json({ message: 'We could not load dashboard statistics.' })
  }
})

router.get('/complaints', async (req, res) => {
  try {
    const { search = '', status, category, priority } = req.query
    const filters = {}
    if (statuses.includes(status)) filters.status = status
    if (categories.includes(category)) filters.category = category
    if (priorities.includes(priority)) filters.priority = priority
    if (search.trim()) {
      const pattern = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      const matchingStudents = await User.find({ $or: [{ fullName: pattern }, { studentId: pattern }, { email: pattern }] }).select('_id')
      filters.$or = [{ title: pattern }, { category: pattern }, { student: { $in: matchingStudents.map((student) => student._id) } }]
    }
    const complaints = await Complaint.find(filters).select(complaintFields).populate('student', 'fullName studentId email').sort({ updatedAt: -1 })
    return res.json({ complaints })
  } catch (error) {
    console.error('Admin complaint lookup failed:', error.message)
    return res.status(500).json({ message: 'We could not load complaints.' })
  }
})

router.get('/complaints/:id', async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id).select(complaintFields).populate('student', 'fullName studentId email')
    if (!complaint) return res.status(404).json({ message: 'Complaint not found.' })
    return res.json({ complaint })
  } catch (error) {
    if (error.name === 'CastError') return res.status(404).json({ message: 'Complaint not found.' })
    console.error('Admin complaint details lookup failed:', error.message)
    return res.status(500).json({ message: 'We could not load this complaint.' })
  }
})

router.patch('/complaints/:id/status', async (req, res) => {
  try {
    const { status } = req.body
    if (!statuses.includes(status)) return res.status(400).json({ message: 'Please select a valid complaint status.' })
    const complaint = await Complaint.findById(req.params.id)
    if (!complaint) return res.status(404).json({ message: 'Complaint not found.' })
    complaint.status = status
    await complaint.save()
    return res.json({ message: 'Complaint status updated.', complaint })
  } catch (error) {
    if (error.name === 'CastError') return res.status(404).json({ message: 'Complaint not found.' })
    console.error('Complaint status update failed:', error.message)
    return res.status(500).json({ message: 'We could not update the complaint status.' })
  }
})

router.patch('/complaints/:id/response', async (req, res) => {
  try {
    const response = typeof req.body.response === 'string' ? req.body.response.trim() : null
    if (response === null || response.length > 5000) return res.status(400).json({ message: 'Response must be text with a maximum of 5,000 characters.' })
    const complaint = await Complaint.findById(req.params.id)
    if (!complaint) return res.status(404).json({ message: 'Complaint not found.' })
    complaint.adminResponse = response
    await complaint.save()
    await complaint.populate('student', 'fullName studentId email')
    return res.json({ message: 'Response saved.', complaint })
  } catch (error) {
    if (error.name === 'CastError') return res.status(404).json({ message: 'Complaint not found.' })
    console.error('Complaint response update failed:', error.message)
    return res.status(500).json({ message: 'We could not save the response.' })
  }
})

export default router