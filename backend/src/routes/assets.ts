import { Router } from 'express'
import prisma from '../lib/prisma'

const router = Router()

function parse(a: Record<string, unknown>) {
  return { ...a, tags: JSON.parse((a.tags as string) || '[]') }
}

router.get('/project/:projectId', async (req, res) => {
  const items = await prisma.asset.findMany({
    where: { projectId: req.params.projectId },
    include: { versions: { orderBy: { version: 'desc' } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(items.map(parse))
})

router.post('/', async (req, res) => {
  const { name, type, url, notes, tags, projectId } = req.body
  if (!name || !url || !projectId) return res.status(400).json({ error: 'name, url, projectId required' })
  const item = await prisma.asset.create({
    data: { name, type: type || 'image', url, notes, tags: JSON.stringify(tags || []), projectId },
    include: { versions: true },
  })
  res.status(201).json(parse(item))
})

router.put('/:id', async (req, res) => {
  const { name, type, url, notes, tags } = req.body
  const item = await prisma.asset.update({
    where: { id: req.params.id },
    data: {
      name, type, url, notes,
      tags: tags !== undefined ? JSON.stringify(tags) : undefined,
    },
    include: { versions: { orderBy: { version: 'desc' } } },
  })
  res.json(parse(item))
})

router.delete('/:id', async (req, res) => {
  await prisma.asset.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

// Add a new version to an existing asset
router.post('/:id/versions', async (req, res) => {
  const { url, notes } = req.body
  if (!url) return res.status(400).json({ error: 'url required' })

  const asset = await prisma.asset.findUnique({ where: { id: req.params.id } })
  if (!asset) return res.status(404).json({ error: 'Asset not found' })

  const newVersion = asset.version + 1

  const [version] = await prisma.$transaction([
    prisma.assetVersion.create({
      data: { version: newVersion, url, notes, assetId: req.params.id },
    }),
    prisma.asset.update({
      where: { id: req.params.id },
      data: { version: newVersion, url },
    }),
  ])

  res.status(201).json(version)
})

export default router
