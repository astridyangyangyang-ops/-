import { Router } from 'express'
import prisma from '../lib/prisma'

const router = Router()

function parse(s: Record<string, unknown>) {
  return { ...s, tags: JSON.parse((s.tags as string) || '[]') }
}

router.get('/project/:projectId', async (req, res) => {
  const items = await prisma.storyboard.findMany({
    where: { projectId: req.params.projectId },
    include: {
      comments: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { order: 'asc' },
  })
  res.json(items.map(s => ({
    ...parse(s),
    comments: s.comments.map(c => ({ ...c, tags: JSON.parse(c.tags || '[]') })),
  })))
})

router.post('/', async (req, res) => {
  const { shotNumber, title, description, imageUrl, cameraAngle, cameraMove, duration, dialogueScript, notes, status, tags, projectId, order } = req.body
  if (!shotNumber || !projectId) return res.status(400).json({ error: 'shotNumber and projectId required' })
  const item = await prisma.storyboard.create({
    data: {
      shotNumber, title, description, imageUrl, cameraAngle, cameraMove,
      duration: duration ? Number(duration) : null,
      dialogueScript, notes,
      status: status || 'draft',
      tags: JSON.stringify(tags || []),
      projectId,
      order: order ?? 0,
    },
  })
  res.status(201).json(parse(item))
})

router.put('/:id', async (req, res) => {
  const { shotNumber, title, description, imageUrl, cameraAngle, cameraMove, duration, dialogueScript, notes, status, tags, order } = req.body
  const item = await prisma.storyboard.update({
    where: { id: req.params.id },
    data: {
      shotNumber, title, description, imageUrl, cameraAngle, cameraMove,
      duration: duration !== undefined ? (duration ? Number(duration) : null) : undefined,
      dialogueScript, notes, status, order,
      tags: tags !== undefined ? JSON.stringify(tags) : undefined,
    },
  })
  res.json(parse(item))
})

router.delete('/:id', async (req, res) => {
  await prisma.storyboard.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

// Batch create from Excel import
router.post('/batch', async (req, res) => {
  const { items, projectId } = req.body
  if (!Array.isArray(items) || !projectId) return res.status(400).json({ error: 'items array and projectId required' })
  const baseOrder = await prisma.storyboard.count({ where: { projectId } })
  const created = await Promise.all(
    items.map((item: Record<string, string | number | null>, i: number) =>
      prisma.storyboard.create({
        data: {
          shotNumber: String(item.shotNumber || i + 1),
          title: (item.title as string) || null,
          description: (item.description as string) || null,
          imageUrl: (item.imageUrl as string) || null,
          cameraAngle: (item.cameraAngle as string) || null,
          cameraMove: (item.cameraMove as string) || null,
          duration: item.duration ? Number(item.duration) : null,
          dialogueScript: (item.dialogueScript as string) || null,
          notes: (item.notes as string) || null,
          status: (item.status as string) || 'draft',
          tags: '[]',
          projectId,
          order: baseOrder + i,
        },
      })
    )
  )
  res.status(201).json(created.map(parse))
})

export default router
