import { Router } from 'express'
import prisma from '../lib/prisma'

const router = Router()

const fullInclude = {
  tasks: { orderBy: [{ status: 'asc' as const }, { order: 'asc' as const }] },
  milestones: { orderBy: { dueDate: 'asc' as const } },
  storyboards: {
    include: { comments: { orderBy: { createdAt: 'asc' as const } } },
    orderBy: { order: 'asc' as const },
  },
  assets: {
    include: { versions: { orderBy: { version: 'desc' as const } } },
    orderBy: { createdAt: 'desc' as const },
  },
  teamMembers: { orderBy: [{ department: 'asc' as const }, { name: 'asc' as const }] },
  prompts: { orderBy: [{ category: 'asc' as const }, { usageCount: 'desc' as const }] },
  timelineEvents: { orderBy: { date: 'asc' as const } },
}

function parseTags(obj: Record<string, unknown>) {
  return { ...obj, tags: JSON.parse((obj.tags as string) || '[]') }
}

function serializeProject(p: Record<string, unknown> & {
  storyboards?: Array<Record<string, unknown> & { comments?: Array<Record<string, unknown>> }>
  assets?: Array<Record<string, unknown>>
  prompts?: Array<Record<string, unknown>>
}) {
  return {
    ...p,
    storyboards: (p.storyboards || []).map(s => ({
      ...parseTags(s),
      comments: (s.comments || []).map(c => parseTags(c as Record<string, unknown>)),
    })),
    assets: (p.assets || []).map(a => parseTags(a as Record<string, unknown>)),
    prompts: (p.prompts || []).map(pr => parseTags(pr as Record<string, unknown>)),
  }
}

router.get('/', async (_req, res) => {
  const projects = await prisma.project.findMany({
    select: {
      id: true, name: true, description: true, type: true, phase: true,
      color: true, director: true, producer: true, createdAt: true,
      _count: { select: { tasks: true, storyboards: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(projects)
})

router.get('/:id', async (req, res) => {
  const p = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: fullInclude,
  })
  if (!p) return res.status(404).json({ error: 'Project not found' })
  res.json(serializeProject(p as unknown as Parameters<typeof serializeProject>[0]))
})

router.post('/', async (req, res) => {
  const { name, description, type, phase, genre, director, producer, startDate, endDate, totalBudget, color } = req.body
  if (!name) return res.status(400).json({ error: 'Name is required' })
  const p = await prisma.project.create({
    data: {
      name, description, type: type || 'movie', phase: phase || 'development',
      genre, director, producer,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      totalBudget: totalBudget ? Number(totalBudget) : null,
      color: color || '#6366f1',
    },
  })
  res.status(201).json(p)
})

router.put('/:id', async (req, res) => {
  const { name, description, type, phase, genre, director, producer, startDate, endDate, totalBudget, color } = req.body
  const p = await prisma.project.update({
    where: { id: req.params.id },
    data: {
      name, description, type, phase, genre, director, producer,
      startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
      endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
      totalBudget: totalBudget !== undefined ? (totalBudget ? Number(totalBudget) : null) : undefined,
      color,
    },
  })
  res.json(p)
})

router.delete('/:id', async (req, res) => {
  await prisma.project.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

export default router
