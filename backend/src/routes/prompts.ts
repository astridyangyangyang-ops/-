import { Router } from 'express'
import prisma from '../lib/prisma'

const router = Router()

function parse(p: Record<string, unknown>) {
  return { ...p, tags: JSON.parse((p.tags as string) || '[]') }
}

router.get('/project/:projectId', async (req, res) => {
  const items = await prisma.promptTemplate.findMany({
    where: { projectId: req.params.projectId },
    orderBy: [{ category: 'asc' }, { usageCount: 'desc' }],
  })
  res.json(items.map(parse))
})

router.post('/', async (req, res) => {
  const { title, category, content, negativePrompt, tags, projectId } = req.body
  if (!title || !content || !projectId) return res.status(400).json({ error: 'title, content, projectId required' })
  const item = await prisma.promptTemplate.create({
    data: { title, category: category || 'general', content, negativePrompt, tags: JSON.stringify(tags || []), projectId },
  })
  res.status(201).json(parse(item))
})

router.put('/:id', async (req, res) => {
  const { title, category, content, negativePrompt, tags } = req.body
  const item = await prisma.promptTemplate.update({
    where: { id: req.params.id },
    data: { title, category, content, negativePrompt, tags: tags !== undefined ? JSON.stringify(tags) : undefined },
  })
  res.json(parse(item))
})

router.delete('/:id', async (req, res) => {
  await prisma.promptTemplate.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

router.post('/:id/use', async (req, res) => {
  const item = await prisma.promptTemplate.update({
    where: { id: req.params.id },
    data: { usageCount: { increment: 1 } },
  })
  res.json(parse(item))
})

export default router
