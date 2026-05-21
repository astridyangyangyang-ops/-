import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import ProjectView from './components/ProjectView'
import { projectsApi } from './api'
import type { Project } from './types'

export default function App() {
  const [projects, setProjects] = useState<Project[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  const loadProjects = async () => {
    try {
      const list = await projectsApi.list()
      const items = Array.isArray(list) ? list : []
      setProjects(items as Project[])
      if (items.length > 0 && !activeId) setActiveId(items[0].id)
    } catch (err) {
      console.error('加载项目失败，请检查后端 API 是否已启动:', err)
      setProjects([])
    }
  }

  useEffect(() => { loadProjects() }, [])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar
        projects={projects}
        activeId={activeId}
        onSelect={setActiveId}
        onProjectsChange={loadProjects}
      />
      <main className="flex-1 overflow-hidden p-6">
        {activeId
          ? <ProjectView key={activeId} projectId={activeId} />
          : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-7xl mb-4 animate-bounce">🐰</div>
              <h2 className="text-xl font-bold text-pink-400">还没有项目哦～</h2>
              <p className="text-sm text-pink-300 mt-1">在左侧创建你的第一个影视项目吧 🌸</p>
            </div>
          )}
      </main>
    </div>
  )
}
