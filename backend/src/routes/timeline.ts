import { Router } from 'express'
import prisma from '../lib/prisma'

const router = Router()

router.get('/project/:projectId', async (req, res) => {
  const items = await prisma.timelineEvent.findMany({
    where: { projectId: req.params.projectId },
    orderBy: { date: 'asc' },
  })
  res.json(items)
})

router.post('/', async (req, res) => {
  const { date, title, description, type, status, projectId } = req.body
  if (!date || !title || !projectId) return res.status(400).json({ error: 'date, title, projectId required' })
  const item = await prisma.timelineEvent.create({
    data: { date: new Date(date), title, description, type: type || 'event', status: status || 'pending', projectId },
  })
  res.status(201).json(item)
})

router.put('/:id', async (req, res) => {
  const { date, title, description, type, status } = req.body
  const item = await prisma.timelineEvent.update({
    where: { id: req.params.id },
    data: { date: date ? new Date(date) : undefined, title, description, type, status },
  })
  res.json(item)
})

router.delete('/:id', async (req, res) => {
  await prisma.timelineEvent.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

export default router
