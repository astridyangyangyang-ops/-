import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import projectsRouter from './routes/projects'
import tasksRouter from './routes/tasks'
import milestonesRouter from './routes/milestones'
import aiRouter from './routes/ai'
import storyboardsRouter from './routes/storyboards'
import commentsRouter from './routes/comments'
import assetsRouter from './routes/assets'
import teamRouter from './routes/team'
import promptsRouter from './routes/prompts'
import timelineRouter from './routes/timeline'
import uploadRouter from './routes/upload'

const app = express()
app.use(cors())
app.use(express.json())

// 静态托管上传文件
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')))

app.use('/api/projects', projectsRouter)
app.use('/api/tasks', tasksRouter)
app.use('/api/milestones', milestonesRouter)
app.use('/api/ai', aiRouter)
app.use('/api/storyboards', storyboardsRouter)
app.use('/api/comments', commentsRouter)
app.use('/api/assets', assetsRouter)
app.use('/api/team', teamRouter)
app.use('/api/prompts', promptsRouter)
app.use('/api/timeline', timelineRouter)
app.use('/api/upload', uploadRouter)

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

// 生产环境：静态托管 React 构建产物
if (process.env.NODE_ENV === 'production') {
  const dist = path.resolve(__dirname, '../../frontend/dist')
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
