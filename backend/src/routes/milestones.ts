import { Router } from 'express'
import prisma from '../lib/prisma'

const router = Router()

router.post('/', async (req, res) => {
  const { title, dueDate, projectId } = req.body
  if (!title || !dueDate || !projectId) return res.status(400).json({ error: 'title, dueDate, projectId required' })
  const milestone = await prisma.milestone.create({
    data: { title, dueDate: new Date(dueDate), projectId },
  })
  res.status(201).json(milestone)
})

router.put('/:id', async (req, res) => {
  const { title, dueDate, completed } = req.body
  const milestone = await prisma.milestone.update({
    where: { id: req.params.id },
    data: { title, dueDate: dueDate ? new Date(dueDate) : undefined, completed },
  })
  res.json(milestone)
})

router.delete('/:id', async (req, res) => {
  await prisma.milestone.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

export default router
