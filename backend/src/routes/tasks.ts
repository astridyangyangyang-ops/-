import { Router } from 'express'
import prisma from '../lib/prisma'

const router = Router()

router.get('/project/:projectId', async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: { projectId: req.params.projectId },
    orderBy: [{ status: 'asc' }, { order: 'asc' }],
  })
  res.json(tasks)
})

router.post('/', async (req, res) => {
  const { title, description, status, priority, dueDate, projectId, order } = req.body
  if (!title || !projectId) return res.status(400).json({ error: 'title and projectId are required' })
  const task = await prisma.task.create({
    data: { title, description, status: status || 'todo', priority: priority || 'medium', dueDate: dueDate ? new Date(dueDate) : null, projectId, order: order || 0 },
  })
  res.status(201).json(task)
})

router.put('/:id', async (req, res) => {
  const { title, description, status, priority, dueDate, order } = req.body
  const task = await prisma.task.update({
    where: { id: req.params.id },
    data: { title, description, status, priority, dueDate: dueDate ? new Date(dueDate) : undefined, order },
  })
  res.json(task)
})

router.delete('/:id', async (req, res) => {
  await prisma.task.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

export default router
