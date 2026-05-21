import { Router } from 'express'
import prisma from '../lib/prisma'

const router = Router()

router.get('/project/:projectId', async (req, res) => {
  const items = await prisma.teamMember.findMany({
    where: { projectId: req.params.projectId },
    orderBy: [{ department: 'asc' }, { name: 'asc' }],
  })
  res.json(items)
})

router.post('/', async (req, res) => {
  const { name, role, department, email, phone, notes, projectId } = req.body
  if (!name || !role || !department || !projectId) return res.status(400).json({ error: 'name, role, department, projectId required' })
  const item = await prisma.teamMember.create({ data: { name, role, department, email, phone, notes, projectId } })
  res.status(201).json(item)
})

router.put('/:id', async (req, res) => {
  const { name, role, department, email, phone, notes } = req.body
  const item = await prisma.teamMember.update({
    where: { id: req.params.id },
    data: { name, role, department, email, phone, notes },
  })
  res.json(item)
})

router.delete('/:id', async (req, res) => {
  await prisma.teamMember.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

export default router
