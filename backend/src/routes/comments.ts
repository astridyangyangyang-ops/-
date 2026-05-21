import { Router } from 'express'
import prisma from '../lib/prisma'

const router = Router()

function parse(c: Record<string, unknown>) {
  return { ...c, tags: JSON.parse((c.tags as string) || '[]') }
}

router.get('/storyboard/:storyboardId', async (req, res) => {
  const items = await prisma.storyboardComment.findMany({
    where: { storyboardId: req.params.storyboardId },
    orderBy: { createdAt: 'asc' },
  })
  res.json(items.map(parse))
})

router.post('/', async (req, res) => {
  const { author, content, tags, storyboardId } = req.body
  if (!author || !content || !storyboardId) return res.status(400).json({ error: 'author, content, storyboardId required' })
  const item = await prisma.storyboardComment.create({
    data: { author, content, tags: JSON.stringify(tags || []), storyboardId },
  })
  res.status(201).json(parse(item))
})

router.put('/:id', async (req, res) => {
  const { author, content, tags, resolved } = req.body
  const item = await prisma.storyboardComment.update({
    where: { id: req.params.id },
    data: {
      author, content, resolved,
      tags: tags !== undefined ? JSON.stringify(tags) : undefined,
    },
  })
  res.json(parse(item))
})

router.delete('/:id', async (req, res) => {
  await prisma.storyboardComment.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

export default router
