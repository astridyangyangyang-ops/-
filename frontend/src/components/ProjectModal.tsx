import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'
import { projectsApi } from '../api'
import type { Project } from '../types'

const PROJECT_TYPES = [
  { value: 'movie', label: '🎬 电影' },
  { value: 'tv_series', label: '📺 剧集' },
  { value: 'documentary', label: '📷 纪录片' },
  { value: 'commercial', label: '🎥 广告片' },
  { value: 'music_video', label: '🎵 MV' },
  { value: 'short_film', label: '🎞️ 短片' },
]

const PHASES = [
  { value: 'development', label: '🌱 开发期' },
  { value: 'pre_production', label: '📝 筹备期' },
  { value: 'production', label: '🎬 拍摄期' },
  { value: 'post_production', label: '✂️ 后期制作' },
  { value: 'distribution', label: '🚀 发行期' },
  { value: 'completed', label: '✅ 已完成' },
]

/* 马卡龙色系 */
const COLORS = ['#FFB7C5', '#A8E6CF', '#C4AAFF', '#FFCBA4', '#93C5FD', '#FDE68A', '#F9A8D4', '#6EE7B7']

interface Props {
  project?: Project
  onClose: () => void
  onSaved: (id: string) => void
}

type FormState = {
  name: string; type: string; phase: string; genre: string
  director: string; producer: string; startDate: string
  endDate: string; totalBudget: string; description: string; color: string
}

export default function ProjectModal({ project, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>({
    name: '', type: 'movie', phase: 'development', genre: '',
    director: '', producer: '', startDate: '', endDate: '',
    totalBudget: '', description: '', color: COLORS[0],
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name || '',
        type: project.type || 'movie',
        phase: project.phase || 'development',
        genre: project.genre || '',
        director: project.director || '',
        producer: project.producer || '',
        startDate: project.startDate ? project.startDate.slice(0, 10) : '',
        endDate: project.endDate ? project.endDate.slice(0, 10) : '',
        totalBudget: project.totalBudget != null ? String(project.totalBudget) : '',
        description: project.description || '',
        color: project.color || COLORS[0],
      })
    }
  }, [project])

  const set = (key: keyof FormState, value: string) => setForm(p => ({ ...p, [key]: value }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    setLoading(true)
    try {
      const payload = {
        ...form,
        type: form.type as import('../types').ProjectType,
        phase: form.phase as import('../types').ProductionPhase,
        totalBudget: form.totalBudget ? parseFloat(form.totalBudget) : undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      }
      if (project) {
        await projectsApi.update(project.id, payload)
        onSaved(project.id)
      } else {
        const p = await projectsApi.create(payload)
        onSaved(p.id)
      }
    } finally {
      setLoading(false)
    }
  }

  const label = 'text-xs font-medium text-rose-600 mb-1 block'
  const input = 'w-full border border-pink-200/70 rounded-xl px-3 py-2 text-sm outline-none focus:border-pink-400 bg-pink-50/30 text-rose-700 placeholder-pink-200'

  return (
    <div className="fixed inset-0 bg-pink-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-xl max-h-[92vh] overflow-y-auto card-soft border border-pink-100">
        {/* Header */}
        <div className="lace-bottom flex items-center justify-between px-6 pt-5 border-b border-pink-100/60">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐰</span>
            <h2 className="font-bold text-base text-rose-700">{project ? '编辑项目' : '新建影视项目'}</h2>
          </div>
          <button onClick={onClose} className="text-pink-300 hover:text-pink-500 p-1 rounded-xl hover:bg-pink-50">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className={label}>项目名称 *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="例：《流浪地球3》" className={input} autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>项目类型</label>
              <select value={form.type} onChange={e => set('type', e.target.value)} className={input}>
                {PROJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>制作阶段</label>
              <select value={form.phase} onChange={e => set('phase', e.target.value)} className={input}>
                {PHASES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>导演</label>
              <input value={form.director} onChange={e => set('director', e.target.value)} placeholder="导演姓名" className={input} />
            </div>
            <div>
              <label className={label}>制片人</label>
              <input value={form.producer} onChange={e => set('producer', e.target.value)} placeholder="制片人姓名" className={input} />
            </div>
          </div>

          <div>
            <label className={label}>类型 / 题材</label>
            <input value={form.genre} onChange={e => set('genre', e.target.value)} placeholder="例：科幻、爱情、动作..." className={input} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>开机日期</label>
              <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} className={input} />
            </div>
            <div>
              <label className={label}>杀青日期</label>
              <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} className={input} />
            </div>
          </div>

          <div>
            <label className={label}>总预算（元）</label>
            <input type="number" value={form.totalBudget} onChange={e => set('totalBudget', e.target.value)} placeholder="例：5000000" className={input} />
          </div>

          <div>
            <label className={label}>项目简介</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="项目概述..." rows={2} className={`${input} resize-none`} />
          </div>

          <div>
            <label className={label}>🎨 标识颜色</label>
            <div className="flex gap-2 flex-wrap mt-1">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => set('color', c)}
                  className={clsx('w-7 h-7 rounded-full transition-all shadow-sm hover:scale-110', form.color === c && 'ring-2 ring-offset-2 ring-pink-400 scale-110')}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-pink-100/60">
          <button onClick={onClose} className="flex-1 border border-pink-200 text-pink-400 rounded-2xl py-2.5 text-sm hover:bg-pink-50 font-medium transition-colors">取消</button>
          <button
            onClick={handleSave}
            disabled={loading || !form.name.trim()}
            className="flex-1 bg-pink-500 hover:bg-pink-600 disabled:bg-pink-200 text-white rounded-2xl py-2.5 text-sm font-semibold transition-colors"
          >
            {loading ? '保存中...' : (project ? '保存修改' : '✨ 创建项目')}
          </button>
        </div>
      </div>
    </div>
  )
}
