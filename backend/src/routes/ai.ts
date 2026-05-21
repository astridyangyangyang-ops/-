import { Router } from 'express'
import OpenAI from 'openai'
import prisma from '../lib/prisma'

const router = Router()
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
})

async function chat(messages: OpenAI.Chat.ChatCompletionMessageParam[], maxTokens = 1024) {
  const res = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
    max_tokens: maxTokens,
    messages,
  })
  return res.choices[0]?.message?.content || ''
}

// 影视制作任务拆解
router.post('/decompose', async (req, res) => {
  const { description, projectId } = req.body
  if (!description || !projectId) return res.status(400).json({ error: 'description and projectId required' })

  let text = ''
  try {
    text = await chat([
      {
        role: 'system',
        content: '你是一名资深影视制片人。根据用户提供的影视项目描述，拆解出具体的制作任务列表，涵盖前期筹备、拍摄、后期制作等阶段。以 JSON 数组格式返回，每个任务包含 title（string）、description（string）、priority（low/medium/high）三个字段。只返回 JSON，不要有其他文字。',
      },
      { role: 'user', content: `影视项目描述：${description}` },
    ])
  } catch (err: unknown) {
    const e = err as { error?: { message?: string }; message?: string }
    return res.status(502).json({ error: e?.error?.message || e?.message || 'AI 调用失败' })
  }

  let tasks: { title: string; description: string; priority: string }[]
  try {
    tasks = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
  } catch {
    return res.status(500).json({ error: 'Failed to parse AI response', raw: text })
  }

  const created = await Promise.all(
    tasks.map((t, i) =>
      prisma.task.create({
        data: { title: t.title, description: t.description, priority: t.priority || 'medium', projectId, order: i },
      })
    )
  )
  res.json({ tasks: created })
})

// 影视项目 AI 进度报告
router.post('/report/:projectId', async (req, res) => {
  const p = await prisma.project.findUnique({
    where: { id: req.params.projectId },
    include: { tasks: true, milestones: true, storyboards: true, teamMembers: true },
  })
  if (!p) return res.status(404).json({ error: 'Project not found' })

  const totalTasks = p.tasks.length
  const doneTasks = p.tasks.filter(t => t.status === 'done').length
  const totalShots = p.storyboards.length
  const approvedShots = p.storyboards.filter(s => s.status === 'approved').length
  const overdueMilestones = p.milestones.filter(m => !m.completed && new Date(m.dueDate) < new Date())

  const PHASE_MAP: Record<string, string> = {
    development: '开发期', pre_production: '筹备期', production: '拍摄期',
    post_production: '后期制作', distribution: '发行期', completed: '已完成',
  }
  const TYPE_MAP: Record<string, string> = {
    movie: '电影', tv_series: '剧集', documentary: '纪录片',
    commercial: '广告片', music_video: 'MV', short_film: '短片',
  }

  const prompt = `项目名称：${p.name}（${TYPE_MAP[p.type] || p.type}）
当前阶段：${PHASE_MAP[p.phase] || p.phase}
导演：${p.director || '未填写'}，制片：${p.producer || '未填写'}
剧组人员：${p.teamMembers.length} 人
任务完成：${doneTasks}/${totalTasks}（${totalTasks > 0 ? Math.round(doneTasks / totalTasks * 100) : 0}%）
分镜通过：${approvedShots}/${totalShots}
逾期里程碑：${overdueMilestones.length} 个
里程碑：${p.milestones.map(m => `[${m.completed ? '完成' : '未完成'}] ${m.title}`).join('、') || '无'}

请生成一份专业的影视项目进度报告（250字以内），包含：当前制作状态、完成情况评估、风险提示、推进建议。`

  let report = ''
  try {
    report = await chat([{ role: 'user', content: prompt }], 600)
  } catch (err: unknown) {
    const e = err as { error?: { message?: string }; message?: string }
    return res.status(502).json({ error: e?.error?.message || e?.message || 'AI 调用失败' })
  }

  res.json({ report })
})

// AI 生成提示词
router.post('/generate-prompt', async (req, res) => {
  const { description, category } = req.body
  if (!description) return res.status(400).json({ error: 'description required' })

  let text = ''
  try {
    text = await chat([
      {
        role: 'system',
        content: `你是一位专业的 AI 图像/视频生成提示词工程师，擅长为影视制作团队生成高质量的 Stable Diffusion、Midjourney、Sora 等 AI 生成工具的提示词。
根据用户提供的场景描述，生成专业的正向提示词和负向提示词。
以 JSON 格式返回，包含：
- title: 提示词标题（中文，10字以内）
- content: 正向提示词（英文，专业术语，逗号分隔）
- negativePrompt: 负向提示词（英文，专业术语，逗号分隔）
- category: 分类，从以下选择之一：character / scene / style / camera / lighting / mood / effects / general
只返回 JSON，不要有其他文字。`,
      },
      { role: 'user', content: `场景描述：${description}${category ? `\n期望分类：${category}` : ''}` },
    ])
  } catch (err: unknown) {
    const e = err as { error?: { message?: string }; message?: string }
    return res.status(502).json({ error: e?.error?.message || e?.message || 'AI 调用失败' })
  }

  try {
    const result = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
    res.json(result)
  } catch {
    return res.status(500).json({ error: 'Failed to parse AI response', raw: text })
  }
})

export default router
