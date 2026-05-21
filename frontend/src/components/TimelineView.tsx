import { useState } from 'react'
import { Plus, Trash2, Edit2, CheckCircle2, Clock, AlertCircle, Circle, Flag, Package, Calendar, Zap } from 'lucide-react'
import clsx from 'clsx'
import type { TimelineEvent, Milestone } from '../types'
import { timelineApi, milestonesApi } from '../api'

const EVENT_TYPES = [
  { value: 'event', label: '事件', icon: Zap, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'milestone', label: '里程碑', icon: Flag, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'delivery', label: '交付', icon: Package, color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'task', label: '任务', icon: CheckCircle2, color: 'bg-amber-100 text-amber-700 border-amber-200' },
]

const STATUS_CONFIG = {
  pending: { label: '待开始', icon: Circle, color: 'text-gray-400' },
  in_progress: { label: '进行中', icon: Clock, color: 'text-blue-500' },
  completed: { label: '已完成', icon: CheckCircle2, color: 'text-green-500' },
  overdue: { label: '已逾期', icon: AlertCircle, color: 'text-red-500' },
}

interface TimelineItem {
  id: string
  date: string
  title: string
  description?: string
  type: string
  status: string
  source: 'event' | 'milestone'
}

interface Props {
  timelineEvents: TimelineEvent[]
  milestones: Milestone[]
  projectId: string
  onRefresh: () => void
}

const emptyForm = () => ({ date: '', title: '', description: '', type: 'event', status: 'pending' })

export default function TimelineView({ timelineEvents, milestones, projectId, onRefresh }: Props) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  const now = new Date()

  // Merge milestones + timeline events into unified list
  const items: TimelineItem[] = [
    ...timelineEvents.map(e => ({
      id: e.id, date: e.date, title: e.title, description: e.description,
      type: e.type, status: e.status, source: 'event' as const,
    })),
    ...milestones.map(m => ({
      id: m.id, date: m.dueDate, title: m.title,
      type: 'milestone',
      status: m.completed ? 'completed' : new Date(m.dueDate) < now ? 'overdue' : 'pending',
      source: 'milestone' as const,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const handleCreate = async () => {
    if (!form.date || !form.title.trim()) return
    setSaving(true)
    await timelineApi.create({ ...form, type: form.type as import('../types').TimelineEventType, status: form.status as import('../types').TimelineEventStatus, projectId })
    setForm(emptyForm())
    setAdding(false)
    setSaving(false)
    onRefresh()
  }

  const handleDelete = async (item: TimelineItem) => {
    if (!confirm('确认删除此事件？')) return
    if (item.source === 'event') await timelineApi.delete(item.id)
    else await milestonesApi.delete(item.id)
    onRefresh()
  }

  const startEdit = (item: TimelineItem) => {
    setEditingId(item.id)
    setEditForm({ date: item.date.slice(0, 10), title: item.title, description: item.description || '', type: item.type, status: item.status })
  }

  const saveEdit = async (item: TimelineItem) => {
    if (item.source === 'event') {
      await timelineApi.update(item.id, { ...editForm, type: editForm.type as import('../types').TimelineEventType, status: editForm.status as import('../types').TimelineEventStatus })
    } else {
      await milestonesApi.update(item.id, { title: editForm.title, dueDate: editForm.date, completed: editForm.status === 'completed' })
    }
    setEditingId(null)
    onRefresh()
  }

  const handleToggleMilestone = async (item: TimelineItem) => {
    if (item.source !== 'milestone') return
    await milestonesApi.update(item.id, { completed: item.status !== 'completed' })
    onRefresh()
  }

  const input = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-300'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-pink-500" />
          <span className="font-semibold text-gray-700">进度时间线</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{items.length} 个事件</span>
        </div>
        <button onClick={() => setAdding(!adding)} className="flex items-center gap-1.5 bg-pink-500 hover:bg-pink-600 text-white text-xs px-3 py-1.5 rounded-lg">
          <Plus size={13} /> 添加事件
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-white rounded-xl border border-pink-200 p-4 shadow-sm space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">添加时间线事件</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">标题 *</label>
              <input autoFocus value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="事件名称" className={input} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">日期 *</label>
              <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className={input} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">类型</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className={`${input} bg-white`}>
                {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">状态</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className={`${input} bg-white`}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">描述</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="事件详情..." rows={2} className={`${input} resize-none`} />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setAdding(false)} className="text-sm text-gray-500 px-3 py-1.5 hover:text-gray-700">取消</button>
            <button onClick={handleCreate} disabled={saving || !form.date || !form.title.trim()} className="bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 text-white text-sm px-4 py-1.5 rounded-lg">
              {saving ? '保存中...' : '添加'}
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-3 flex-wrap">
        {EVENT_TYPES.map(t => (
          <span key={t.value} className={clsx('flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border', t.color)}>
            <t.icon size={11} /> {t.label}
          </span>
        ))}
      </div>

      {/* Timeline */}
      {items.length === 0
        ? <div className="text-center py-16 text-gray-400 text-sm">暂无时间线事件，点击「添加事件」开始规划</div>
        : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-200" />

            <div className="space-y-3">
              {items.map(item => {
                const eventType = EVENT_TYPES.find(t => t.value === item.type) || EVENT_TYPES[0]
                const statusCfg = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
                const isEdit = editingId === item.id
                const itemDate = new Date(item.date)
                const isPast = itemDate < now

                return (
                  <div key={`${item.source}-${item.id}`} className="relative flex gap-4 group">
                    {/* Node */}
                    <div className={clsx('w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2', isPast && item.status === 'completed' ? 'bg-green-100 border-green-300' : item.status === 'overdue' ? 'bg-red-100 border-red-300' : 'bg-white border-gray-200')}>
                      <eventType.icon size={18} className={item.status === 'completed' ? 'text-green-600' : item.status === 'overdue' ? 'text-red-500' : 'text-gray-400'} />
                    </div>

                    {/* Content */}
                    <div className={clsx('flex-1 bg-white rounded-xl border shadow-sm p-4 min-w-0', item.status === 'overdue' ? 'border-red-100' : 'border-gray-100')}>
                      {isEdit ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-pink-300" />
                            <input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-pink-300" />
                          </div>
                          {item.source === 'event' && (
                            <div className="grid grid-cols-2 gap-2">
                              <select value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none bg-white">
                                {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                              </select>
                              <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none bg-white">
                                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                              </select>
                            </div>
                          )}
                          <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-pink-300 resize-none" />
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 px-2 py-1">取消</button>
                            <button onClick={() => saveEdit(item)} className="text-xs bg-pink-500 text-white px-3 py-1 rounded-lg">保存</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-semibold text-sm text-gray-800">{item.title}</span>
                              <span className={clsx('text-xs px-2 py-0.5 rounded-full border', eventType.color)}>{eventType.label}</span>
                              <span className={clsx('text-xs flex items-center gap-0.5', statusCfg.color)}>
                                <statusCfg.icon size={11} /> {statusCfg.label}
                              </span>
                            </div>
                            {item.description && <p className="text-xs text-gray-500 mb-1">{item.description}</p>}
                            <p className={clsx('text-xs', item.status === 'overdue' ? 'text-red-500' : 'text-gray-400')}>
                              {itemDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                              {item.status === 'overdue' && ' · 已逾期'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                            {item.source === 'milestone' && (
                              <button onClick={() => handleToggleMilestone(item)} title="切换完成状态" className="text-gray-400 hover:text-green-500 p-1">
                                <CheckCircle2 size={13} />
                              </button>
                            )}
                            <button onClick={() => startEdit(item)} className="text-gray-400 hover:text-pink-500 p-1"><Edit2 size={13} /></button>
                            <button onClick={() => handleDelete(item)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={13} /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
    </div>
  )
}
