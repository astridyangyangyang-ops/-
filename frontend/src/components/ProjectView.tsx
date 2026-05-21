import { useState, useEffect, useCallback } from 'react'
import { LayoutDashboard, Clapperboard, FolderOpen, Users, Sparkles, GitBranch, Kanban, Download, Film, Tv, Camera, Music, Edit2 } from 'lucide-react'
import clsx from 'clsx'
import type { Project } from '../types'
import { projectsApi } from '../api'
import Overview from './Overview'
import StoryboardView from './StoryboardView'
import AssetLibrary from './AssetLibrary'
import TeamView from './TeamView'
import PromptLibrary from './PromptLibrary'
import TimelineView from './TimelineView'
import KanbanBoard from './KanbanBoard'
import AIDecompose from './AIDecompose'
import ExportView from './ExportView'
import ProjectModal from './ProjectModal'

const TYPE_LABELS: Record<string, string> = {
  movie: '电影', tv_series: '剧集', documentary: '纪录片',
  commercial: '广告片', music_video: 'MV', short_film: '短片',
}

const PHASE_LABELS: Record<string, string> = {
  development: '开发期', pre_production: '筹备期', production: '拍摄期',
  post_production: '后期制作', distribution: '发行期', completed: '已完成',
}

const PHASE_COLORS: Record<string, string> = {
  development: 'bg-purple-100 text-purple-600',
  pre_production: 'bg-sky-100 text-sky-600',
  production: 'bg-orange-100 text-orange-600',
  post_production: 'bg-emerald-100 text-emerald-600',
  distribution: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-pink-100 text-pink-600',
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  movie: <Film size={14} />, tv_series: <Tv size={14} />, documentary: <Camera size={14} />,
  commercial: <Film size={14} />, music_video: <Music size={14} />, short_film: <Clapperboard size={14} />,
}

const TABS = [
  { id: 'overview', label: '概览', icon: LayoutDashboard, emoji: '🏠' },
  { id: 'storyboard', label: '分镜', icon: Clapperboard, emoji: '🎬' },
  { id: 'assets', label: '素材', icon: FolderOpen, emoji: '📁' },
  { id: 'team', label: '团队', icon: Users, emoji: '🐾' },
  { id: 'prompts', label: '提示词', icon: Sparkles, emoji: '✨' },
  { id: 'timeline', label: '时间线', icon: GitBranch, emoji: '🌿' },
  { id: 'tasks', label: '任务', icon: Kanban, emoji: '📋' },
  { id: 'export', label: '导出', icon: Download, emoji: '🎀' },
] as const

type TabId = typeof TABS[number]['id']

interface Props { projectId: string }

export default function ProjectView({ projectId }: Props) {
  const [project, setProject] = useState<Project | null>(null)
  const [tab, setTab] = useState<TabId>('overview')
  const [showEdit, setShowEdit] = useState(false)

  const load = useCallback(async () => {
    const p = await projectsApi.get(projectId)
    setProject(p)
  }, [projectId])

  useEffect(() => { load() }, [load])

  if (!project) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-4xl animate-spin">🌸</div>
    </div>
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 pb-0 mb-0">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3">
            <span className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0 shadow-sm" style={{ background: project.color }} />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-rose-800 leading-tight">{project.name}</h1>
                <span className="flex items-center gap-1 text-xs bg-pink-50 text-pink-500 px-2 py-0.5 rounded-full border border-pink-100">
                  {TYPE_ICONS[project.type]} {TYPE_LABELS[project.type] || project.type}
                </span>
                <span className={clsx('text-xs px-2 py-0.5 rounded-full', PHASE_COLORS[project.phase] || 'bg-pink-50 text-pink-500')}>
                  {PHASE_LABELS[project.phase] || project.phase}
                </span>
              </div>
              {(project.director || project.producer || project.genre) && (
                <p className="text-xs text-pink-300 mt-0.5">
                  {[project.director && `导演：${project.director}`, project.producer && `制片：${project.producer}`, project.genre].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-1.5 text-xs text-pink-400 hover:text-pink-600 hover:bg-pink-50 px-3 py-1.5 rounded-xl transition-colors flex-shrink-0 border border-pink-100"
          >
            <Edit2 size={13} /> 编辑
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 overflow-x-auto border-b border-pink-100">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                'flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-t-xl transition-all whitespace-nowrap border-b-2 -mb-px',
                tab === t.id
                  ? 'text-pink-600 border-pink-400 bg-white'
                  : 'text-rose-300 border-transparent hover:text-pink-500 hover:bg-pink-50/50'
              )}
            >
              <span className="text-sm">{t.emoji}</span> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto pt-5">
        {tab === 'overview' && <Overview project={project} onEdit={() => setShowEdit(true)} onRefresh={load} />}
        {tab === 'storyboard' && <StoryboardView storyboards={project.storyboards} projectId={projectId} onRefresh={load} />}
        {tab === 'assets' && <AssetLibrary assets={project.assets} projectId={projectId} onRefresh={load} />}
        {tab === 'team' && <TeamView teamMembers={project.teamMembers} projectId={projectId} onRefresh={load} />}
        {tab === 'prompts' && <PromptLibrary prompts={project.prompts} projectId={projectId} onRefresh={load} />}
        {tab === 'timeline' && <TimelineView timelineEvents={project.timelineEvents} milestones={project.milestones} projectId={projectId} onRefresh={load} />}
        {tab === 'tasks' && (
          <div className="space-y-5">
            <AIDecompose projectId={projectId} onTasksCreated={load} />
            <KanbanBoard tasks={project.tasks} projectId={projectId} onTasksChange={load} />
          </div>
        )}
        {tab === 'export' && <ExportView project={project} />}
      </div>

      {showEdit && (
        <ProjectModal
          project={project}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); load() }}
        />
      )}
    </div>
  )
}
