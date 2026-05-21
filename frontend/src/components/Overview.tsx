import { useState } from 'react'
import { Clapperboard, Calendar, User, Tag, Edit2, CheckCircle2, Circle, Bot, Loader2, Film, Tv, Camera, Music } from 'lucide-react'
import clsx from 'clsx'
import type { Project, Milestone } from '../types'
import { aiApi, milestonesApi } from '../api'

const PHASES = [
  { id: 'development', label: '开发期' },
  { id: 'pre_production', label: '筹备期' },
  { id: 'production', label: '拍摄期' },
  { id: 'post_production', label: '后期' },
  { id: 'distribution', label: '发行期' },
  { id: 'completed', label: '已完成' },
]

const TYPE_LABELS: Record<string, string> = {
  movie: '电影', tv_series: '剧集', documentary: '纪录片',
  commercial: '广告片', music_video: 'MV', short_film: '短片',
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  movie: <Film size={14} />, tv_series: <Tv size={14} />, documentary: <Camera size={14} />,
  commercial: <Film size={14} />, music_video: <Music size={14} />, short_film: <Film size={14} />,
}

interface Props {
  project: Project
  onEdit: () => void
  onRefresh: () => void
}

export default function Overview({ project, onEdit, onRefresh }: Props) {
  const [report, setReport] = useState('')
  const [loadingReport, setLoadingReport] = useState(false)
  const [addingMs, setAddingMs] = useState(false)
  const [newMs, setNewMs] = useState({ title: '', dueDate: '' })

  const currentPhaseIdx = PHASES.findIndex(p => p.id === project.phase)
  const totalBudget = project.totalBudget || 0
  const totalScenes = project.storyboards.length
  const approvedScenes = project.storyboards.filter(s => s.status === 'approved' || s.status === 'review').length
  const scenePercent = totalScenes > 0 ? Math.round((approvedScenes / totalScenes) * 100) : 0
  const doneTasks = project.tasks.filter(t => t.status === 'done').length
  const taskPercent = project.tasks.length > 0 ? Math.round((doneTasks / project.tasks.length) * 100) : 0

  const handleReport = async () => {
    setLoadingReport(true)
    try {
      const { report: r } = await aiApi.report(project.id)
      setReport(r)
    } catch { setReport('生成失败，请检查 API Key 配置') }
    finally { setLoadingReport(false) }
  }

  const handleAddMilestone = async () => {
    if (!newMs.title.trim() || !newMs.dueDate) return
    await milestonesApi.create({ title: newMs.title.trim(), dueDate: newMs.dueDate, projectId: project.id })
    setNewMs({ title: '', dueDate: '' })
    setAddingMs(false)
    onRefresh()
  }

  const handleToggleMilestone = async (ms: Milestone) => {
    await milestonesApi.update(ms.id, { completed: !ms.completed })
    onRefresh()
  }

  const card = 'bg-white rounded-2xl p-5 border border-pink-100/80 card-soft'

  return (
    <div className="space-y-5">
      {/* Phase Timeline */}
      <div className={card}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-rose-700 flex items-center gap-2">🎬 制作阶段</h3>
          <button onClick={onEdit} className="flex items-center gap-1.5 text-xs text-pink-500 hover:text-pink-700 px-3 py-1.5 rounded-xl hover:bg-pink-50 border border-pink-100">
            <Edit2 size={12} /> 编辑项目
          </button>
        </div>
        <div className="flex items-start">
          {PHASES.map((phase, i) => {
            const isActive = phase.id === project.phase
            const isDone = i < currentPhaseIdx
            return (
              <div key={phase.id} className="flex-1 flex items-start">
                <div className="flex flex-col items-center flex-1">
                  <div className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1.5 transition-all',
                    isActive ? 'bg-pink-400 text-white ring-4 ring-pink-100 shadow-md' :
                    isDone ? 'bg-emerald-400 text-white shadow-sm' : 'bg-pink-50 text-pink-300'
                  )}>
                    {isDone ? '✓' : i + 1}
                  </div>
                  <span className={clsx('text-xs text-center leading-tight', isActive ? 'font-semibold text-pink-600' : isDone ? 'text-emerald-600' : 'text-pink-200')}>
                    {phase.label}
                  </span>
                </div>
                {i < PHASES.length - 1 && (
                  <div className={clsx('h-0.5 flex-none', i < currentPhaseIdx ? 'bg-emerald-300' : 'bg-pink-100')} style={{ width: '100%', marginTop: '14px' }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className={card}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🎞️</span>
            <span className="text-xs font-medium text-rose-500">分镜进度</span>
          </div>
          <div className="text-2xl font-bold text-rose-700">{approvedScenes}<span className="text-sm font-normal text-pink-300">/{totalScenes}</span></div>
          <div className="mt-2 h-2 bg-pink-50 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-pink-300 to-pink-400 rounded-full transition-all" style={{ width: `${scenePercent}%` }} />
          </div>
          <div className="text-xs text-pink-300 mt-1">{scenePercent}% 已评审</div>
        </div>

        <div className={card}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🐾</span>
            <span className="text-xs font-medium text-purple-500">剧组成员</span>
          </div>
          <div className="text-2xl font-bold text-purple-600">{project.teamMembers.length}<span className="text-sm font-normal text-purple-300 ml-1">人</span></div>
          <div className="mt-2 h-2 bg-purple-50 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-300 to-purple-400 rounded-full transition-all" style={{ width: `${taskPercent}%` }} />
          </div>
          <div className="text-xs text-purple-300 mt-1">{project.tasks.length} 个任务 · {taskPercent}% 完成</div>
        </div>

        <div className={card}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">💰</span>
            <span className="text-xs font-medium text-emerald-600">项目预算</span>
          </div>
          {totalBudget > 0 ? (
            <>
              <div className="text-2xl font-bold text-emerald-600">¥{(totalBudget / 10000).toFixed(0)}<span className="text-sm font-normal text-emerald-300">万</span></div>
              <div className="text-xs text-emerald-400 mt-3">{project.prompts.length} 条提示词</div>
            </>
          ) : (
            <div className="text-sm text-emerald-300 mt-2">未设预算</div>
          )}
        </div>
      </div>

      {/* Project Info + Milestones */}
      <div className="grid grid-cols-2 gap-4">
        <div className={card}>
          <h3 className="font-semibold text-rose-700 mb-4 flex items-center gap-2">🎭 项目信息</h3>
          <div className="space-y-2.5">
            <Row icon={<span className="text-pink-300">{TYPE_ICONS[project.type]}</span>} label="类型" value={TYPE_LABELS[project.type] || project.type} />
            {project.genre && <Row icon={<Tag size={13} className="text-pink-300" />} label="题材" value={project.genre} />}
            {project.director && <Row icon={<User size={13} className="text-pink-300" />} label="导演" value={project.director} />}
            {project.producer && <Row icon={<User size={13} className="text-pink-300" />} label="制片" value={project.producer} />}
            {(project.startDate || project.endDate) && (
              <Row
                icon={<Calendar size={13} className="text-pink-300" />}
                label="周期"
                value={`${project.startDate ? new Date(project.startDate).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) : '—'} → ${project.endDate ? new Date(project.endDate).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) : '—'}`}
              />
            )}
            <Row icon={<Clapperboard size={13} className="text-pink-300" />} label="素材" value={`${project.assets.length} 个文件`} />
          </div>
        </div>

        <div className={card}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-rose-700 flex items-center gap-2">🌿 里程碑</h3>
            <button onClick={() => setAddingMs(!addingMs)} className="text-xs text-pink-500 hover:text-pink-700 px-2 py-1 rounded-lg hover:bg-pink-50">+ 添加</button>
          </div>
          {addingMs && (
            <div className="mb-3 space-y-2">
              <input autoFocus value={newMs.title} onChange={e => setNewMs(p => ({ ...p, title: e.target.value }))} placeholder="里程碑名称" className="w-full text-xs border border-pink-200 rounded-xl px-3 py-2 outline-none focus:border-pink-300 bg-pink-50/30" />
              <div className="flex gap-2">
                <input type="date" value={newMs.dueDate} onChange={e => setNewMs(p => ({ ...p, dueDate: e.target.value }))} className="flex-1 text-xs border border-pink-200 rounded-xl px-3 py-2 outline-none focus:border-pink-300 bg-pink-50/30" />
                <button onClick={handleAddMilestone} className="bg-pink-500 text-white text-xs px-3 rounded-xl hover:bg-pink-600">确认</button>
              </div>
            </div>
          )}
          {project.milestones.length === 0 && !addingMs
            ? <p className="text-xs text-pink-200 text-center py-4">暂无里程碑 🌸</p>
            : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {project.milestones.map(ms => {
                  const overdue = !ms.completed && new Date(ms.dueDate) < new Date()
                  return (
                    <div key={ms.id} className="flex items-center gap-2 group">
                      <button onClick={() => handleToggleMilestone(ms)}>
                        {ms.completed
                          ? <CheckCircle2 size={15} className="text-emerald-400" />
                          : <Circle size={15} className={overdue ? 'text-red-400' : 'text-pink-200'} />}
                      </button>
                      <span className={clsx('text-xs flex-1', ms.completed ? 'line-through text-pink-200' : 'text-rose-700')}>{ms.title}</span>
                      <span className={clsx('text-xs', overdue ? 'text-red-400' : 'text-pink-300')}>
                        {new Date(ms.dueDate).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
        </div>
      </div>

      {/* AI Report */}
      <div className="rounded-2xl p-5 border border-pink-100 card-soft" style={{ background: 'linear-gradient(135deg, #fff5f8 0%, #f3efff 100%)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-rose-700 flex items-center gap-2">
            <Bot size={15} className="text-purple-400" /> ✨ AI 进度报告
          </h3>
          <button onClick={handleReport} disabled={loadingReport} className="flex items-center gap-1.5 text-xs bg-pink-500 hover:bg-pink-600 disabled:bg-pink-200 text-white px-3 py-1.5 rounded-xl">
            {loadingReport ? <Loader2 size={12} className="animate-spin" /> : <Bot size={12} />}
            {loadingReport ? '生成中...' : '生成报告'}
          </button>
        </div>
        {report
          ? <p className="text-sm text-rose-700 leading-relaxed whitespace-pre-wrap">{report}</p>
          : <p className="text-xs text-pink-300 text-center py-3">点击「生成报告」获取 AI 项目分析 🐰</p>}
      </div>
    </div>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-xs text-pink-300 w-10 flex-shrink-0">{label}</span>
      <span className="text-xs font-medium text-rose-700 ml-auto text-right">{value}</span>
    </div>
  )
}
