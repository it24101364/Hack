import express from 'express'
import Complaint, { categories, priorities } from '../models/Complaint.js'
import { authenticate, requireStudent } from '../middleware/auth.js'

const router = express.Router()

const complaintFields = 'title category description priority status adminResponse createdAt updatedAt'

router.get('/my', authenticate, requireStudent, async (req, res) => {
  try {
    const complaints = await Complaint.find({ student: req.user.id })
      .select(complaintFields)
      .sort({ createdAt: -1 })
    return res.json({ complaints })
  } catch (error) {
    console.error('Complaint lookup failed:', error.message)
    return res.status(500).json({ message: 'We could not load your complaints. Please try again.' })
  }
})

router.get('/:id', authenticate, requireStudent, async (req, res) => {
  try {
    const complaint = await Complaint.findOne({ _id: req.params.id, student: req.user.id }).select(complaintFields)
    if (!complaint) return res.status(404).json({ message: 'Complaint not found.' })
    return res.json({ complaint })
  } catch (error) {
    if (error.name === 'CastError') return res.status(404).json({ message: 'Complaint not found.' })
    console.error('Complaint details lookup failed:', error.message)
    return res.status(500).json({ message: 'We could not load this complaint. Please try again.' })
  }
})

router.post('/', authenticate, requireStudent, async (req, res) => {
  try {
    const { title, category, description, priority } = req.body
    if (!title?.trim() || !category || !description?.trim() || !priority) {
      return res.status(400).json({ message: 'Please complete all complaint fields.' })
    }
    if (!categories.includes(category)) return res.status(400).json({ message: 'Please select a valid complaint category.' })
    if (!priorities.includes(priority)) return res.status(400).json({ message: 'Please select a valid complaint priority.' })
    if (title.trim().length < 3) return res.status(400).json({ message: 'Complaint title must be at least 3 characters.' })
    if (description.trim().length < 10) return res.status(400).json({ message: 'Description must be at least 10 characters.' })

    const complaint = await Complaint.create({
      student: req.user.id,
      title: title.trim(),
      category,
      description: description.trim(),
      priority,
      status: 'Pending',
      adminResponse: '',
    })
    return res.status(201).json({ message: 'Complaint submitted successfully', complaint })
  } catch (error) {
    console.error('Complaint creation failed:', error.message)
    return res.status(500).json({ message: 'We could not submit your complaint. Please try again.' })
  }
})

export default router