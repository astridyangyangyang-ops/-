import { useState } from 'react'
import { Film, Tv, Camera, Music, Clapperboard, Trash2, Plus } from 'lucide-react'
import clsx from 'clsx'
import type { Project } from '../types'
import { projectsApi } from '../api'
import ProjectModal from './ProjectModal'

const TYPE_ICONS: Record<string, React.ReactNode> = {
  movie: <Film size={13} />,
  tv_series: <Tv size={13} />,
  documentary: <Camera size={13} />,
  commercial: <Film size={13} />,
  music_video: <Music size={13} />,
  short_film: <Clapperboard size={13} />,
}

const PHASE_LABELS: Record<string, string> = {
  development: '开发期', pre_production: '筹备期', production: '拍摄期',
  post_production: '后期', distribution: '发行期', completed: '完成',
}

const PHASE_COLORS: Record<string, string> = {
  development: 'bg-purple-100 text-purple-600',
  pre_production: 'bg-sky-100 text-sky-600',
  production: 'bg-orange-100 text-orange-600',
  post_production: 'bg-emerald-100 text-emerald-600',
  distribution: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-pink-100 text-pink-600',
}

interface Props {
  projects: Project[]
  activeId: string | null
  onSelect: (id: string) => void
  onProjectsChange: () => void
}

export default function Sidebar({ projects, activeId, onSelect, onProjectsChange }: Props) {
  const [showModal, setShowModal] = useState(false)

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('确认删除此项目？所有相关数据将被清空。')) return
    await projectsApi.delete(id)
    onProjectsChange()
  }

  return (
    <aside
      className="w-64 flex flex-col h-screen flex-shrink-0 border-r border-pink-200/60"
      style={{ background: 'linear-gradient(160deg, #fff5f8 0%, #ffeef5 50%, #f9e8f7 100%)' }}
    >
      {/* Logo Header */}
      <div className="lace-bottom px-4 pt-4 border-b border-pink-200/40">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-2xl leading-none">🐰</span>
          <span className="font-bold text-base tracking-wide text-rose-700">影视制作管理</span>
        </div>
        <span className="text-xs text-pink-300 pl-9">Film Production Manager</span>
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 pt-3">
        {projects.map(p => (
          <div
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={clsx(
              'flex items-start gap-2.5 px-3 py-2.5 rounded-2xl cursor-pointer group transition-all',
              activeId === p.id
                ? 'bg-white/90 shadow-sm shadow-pink-100'
                : 'hover:bg-white/60'
            )}
          >
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 shadow-sm" style={{ background: p.color }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-rose-300">{TYPE_ICONS[p.type] || <Film size={13} />}</span>
                <span className="text-sm truncate text-rose-800 font-medium leading-tight">{p.name}</span>
              </div>
              <span className={clsx('text-xs px-1.5 py-0.5 rounded-full inline-block', PHASE_COLORS[p.phase] || 'bg-pink-100 text-pink-500')}>
                {PHASE_LABELS[p.phase] || p.phase}
              </span>
            </div>
            <button
              onClick={e => handleDelete(e, p.id)}
              className="opacity-0 group-hover:opacity-100 text-pink-200 hover:text-red-400 mt-0.5 flex-shrink-0 transition-opacity"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}

        {projects.length === 0 && (
          <div className="text-center text-xs text-pink-300 py-8">
            <div className="text-3xl mb-2">🐻</div>
            还没有项目哦
          </div>
        )}
      </div>

      {/* New Project Button */}
      <div className="p-3 border-t border-pink-200/40">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-pink-400 hover:text-pink-600 hover:bg-pink-50/60 rounded-2xl transition-colors font-medium"
        >
          <Plus size={16} /> 新建项目
        </button>
      </div>

      {showModal && (
        <ProjectModal
          onClose={() => setShowModal(false)}
          onSaved={id => {
            setShowModal(false)
            onProjectsChange()
            onSelect(id)
          }}
        />
      )}
    </aside>
  )
}
