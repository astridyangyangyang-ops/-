import { useState } from 'react'
import { CheckCircle2, Clock, Circle, Plus, Trash2, Bot, Loader2 } from 'lucide-react'
import type { Project, Milestone } from '../types'
import { milestonesApi, aiApi } from '../api'

interface Props {
  project: Project
  onRefresh: () => void
}

export default function ProgressView({ project, onRefresh }: Props) {
  const [newMs, setNewMs] = useState({ title: '', dueDate: '' })
  const [addingMs, setAddingMs] = useState(false)
  const [report, setReport] = useState('')
  const [loadingReport, setLoadingReport] = useState(false)

  const total = project.tasks.length
  const done = project.tasks.filter(t => t.status === 'done').length
  const inProgress = project.tasks.filter(t => t.status === 'in_progress').length
  const percent = total > 0 ? Math.round((done / total) * 100) : 0

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

  const handleDeleteMilestone = async (id: string) => {
    await milestonesApi.delete(id)
    onRefresh()
  }

  const handleReport = async () => {
    setLoadingReport(true)
    try {
      const { report } = await aiApi.report(project.id)
      setReport(report)
    } finally {
      setLoadingReport(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 进度概览 */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-700 mb-4">项目进度</h3>
        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-2xl font-bold text-indigo-600 w-14 text-right">{percent}%</span>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-gray-500"><Circle size={14} /> 待办 {project.tasks.filter(t => t.status === 'todo').length}</span>
          <span className="flex items-center gap-1.5 text-blue-500"><Clock size={14} /> 进行中 {inProgress}</span>
          <span className="flex items-center gap-1.5 text-green-500"><CheckCircle2 size={14} /> 完成 {done}</span>
        </div>
      </div>

      {/* 里程碑 */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-700">里程碑</h3>
          <button onClick={() => setAddingMs(!addingMs)} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
            <Plus size={14} /> 添加
          </button>
        </div>

        {addingMs && (
          <div className="mb-3 flex gap-2">
            <input
              autoFocus
              value={newMs.title}
              onChange={e => setNewMs(p => ({ ...p, title: e.target.value }))}
              placeholder="里程碑名称"
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400"
            />
            <input
              type="date"
              value={newMs.dueDate}
              onChange={e => setNewMs(p => ({ ...p, dueDate: e.target.value }))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400"
            />
            <button onClick={handleAddMilestone} className="bg-indigo-600 text-white text-sm px-3 rounded-lg hover:bg-indigo-700">确认</button>
          </div>
        )}

        {project.milestones.length === 0 && !addingMs && (
          <p className="text-sm text-gray-400 text-center py-4">暂无里程碑</p>
        )}

        <div className="space-y-2">
          {project.milestones.map(ms => {
            const overdue = !ms.completed && new Date(ms.dueDate) < new Date()
            return (
              <div key={ms.id} className="flex items-center gap-3 group">
                <button onClick={() => handleToggleMilestone(ms)}>
                  {ms.completed
                    ? <CheckCircle2 size={18} className="text-green-500" />
                    : <Circle size={18} className={overdue ? 'text-red-400' : 'text-gray-300'} />}
                </button>
                <span className={`flex-1 text-sm ${ms.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>{ms.title}</span>
                <span className={`text-xs ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
                  {new Date(ms.dueDate).toLocaleDateString('zh-CN')}
                </span>
                <button onClick={() => handleDeleteMilestone(ms.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400">
                  <Trash2 size={13} />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* AI 报告 */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2"><Bot size={16} className="text-indigo-400" /> AI 进度报告</h3>
          <button
            onClick={handleReport}
            disabled={loadingReport}
            className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white px-3 py-1.5 rounded-lg"
          >
            {loadingReport ? <Loader2 size={13} className="animate-spin" /> : <Bot size={13} />}
            {loadingReport ? '生成中...' : '生成报告'}
          </button>
        </div>
        {report
          ? <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{report}</p>
          : <p className="text-sm text-gray-400 text-center py-4">点击"生成报告"获取 AI 分析</p>}
      </div>
    </div>
  )
}
