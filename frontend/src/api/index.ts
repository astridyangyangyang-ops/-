import axios from 'axios'
import type { Project, Task, Milestone, Storyboard, StoryboardComment, Asset, AssetVersion, TeamMember, PromptTemplate, TimelineEvent } from '../types'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({ baseURL: API_BASE })

export const projectsApi = {
  list: () => api.get<Project[]>('/projects').then(r => r.data),
  get: (id: string) => api.get<Project>(`/projects/${id}`).then(r => r.data),
  create: (data: Partial<Project>) => api.post<Project>('/projects', data).then(r => r.data),
  update: (id: string, data: Partial<Project>) => api.put<Project>(`/projects/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/projects/${id}`),
}

export const tasksApi = {
  list: (projectId: string) => api.get<Task[]>(`/tasks/project/${projectId}`).then(r => r.data),
  create: (data: Partial<Task>) => api.post<Task>('/tasks', data).then(r => r.data),
  update: (id: string, data: Partial<Task>) => api.put<Task>(`/tasks/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
}

export const milestonesApi = {
  create: (data: { title: string; dueDate: string; projectId: string }) =>
    api.post<Milestone>('/milestones', data).then(r => r.data),
  update: (id: string, data: Partial<Milestone>) => api.put<Milestone>(`/milestones/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/milestones/${id}`),
}

export const storyboardsApi = {
  list: (projectId: string) => api.get<Storyboard[]>(`/storyboards/project/${projectId}`).then(r => r.data),
  create: (data: Partial<Storyboard>) => api.post<Storyboard>('/storyboards', data).then(r => r.data),
  update: (id: string, data: Partial<Storyboard>) => api.put<Storyboard>(`/storyboards/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/storyboards/${id}`),
  batchCreate: (items: Record<string, string | number | null>[], projectId: string) =>
    api.post<Storyboard[]>('/storyboards/batch', { items, projectId }).then(r => r.data),
}

export const commentsApi = {
  list: (storyboardId: string) => api.get<StoryboardComment[]>(`/comments/storyboard/${storyboardId}`).then(r => r.data),
  create: (data: { author: string; content: string; tags: string[]; storyboardId: string }) =>
    api.post<StoryboardComment>('/comments', data).then(r => r.data),
  update: (id: string, data: Partial<StoryboardComment>) => api.put<StoryboardComment>(`/comments/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/comments/${id}`),
}

export const assetsApi = {
  list: (projectId: string) => api.get<Asset[]>(`/assets/project/${projectId}`).then(r => r.data),
  create: (data: Partial<Asset>) => api.post<Asset>('/assets', data).then(r => r.data),
  update: (id: string, data: Partial<Asset>) => api.put<Asset>(`/assets/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/assets/${id}`),
  addVersion: (id: string, data: { url: string; notes?: string }) =>
    api.post<AssetVersion>(`/assets/${id}/versions`, data).then(r => r.data),
}

export const uploadApi = {
  upload: (
    file: File,
    onProgress?: (pct: number) => void,
  ): Promise<{ url: string; originalName: string; mimeType: string; size: number }> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData()
      formData.append('file', file)
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${API_BASE}/upload`)
      xhr.upload.onprogress = e => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
      }
      xhr.onload = () => {
        if (xhr.status === 200) resolve(JSON.parse(xhr.responseText))
        else reject(new Error(JSON.parse(xhr.responseText)?.error || '上传失败'))
      }
      xhr.onerror = () => reject(new Error('网络错误'))
      xhr.send(formData)
    })
  },
}

export const teamApi = {
  list: (projectId: string) => api.get<TeamMember[]>(`/team/project/${projectId}`).then(r => r.data),
  create: (data: Partial<TeamMember>) => api.post<TeamMember>('/team', data).then(r => r.data),
  update: (id: string, data: Partial<TeamMember>) => api.put<TeamMember>(`/team/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/team/${id}`),
}

export const promptsApi = {
  list: (projectId: string) => api.get<PromptTemplate[]>(`/prompts/project/${projectId}`).then(r => r.data),
  create: (data: Partial<PromptTemplate>) => api.post<PromptTemplate>('/prompts', data).then(r => r.data),
  update: (id: string, data: Partial<PromptTemplate>) => api.put<PromptTemplate>(`/prompts/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/prompts/${id}`),
  use: (id: string) => api.post<PromptTemplate>(`/prompts/${id}/use`).then(r => r.data),
}

export const timelineApi = {
  list: (projectId: string) => api.get<TimelineEvent[]>(`/timeline/project/${projectId}`).then(r => r.data),
  create: (data: Partial<TimelineEvent>) => api.post<TimelineEvent>('/timeline', data).then(r => r.data),
  update: (id: string, data: Partial<TimelineEvent>) => api.put<TimelineEvent>(`/timeline/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/timeline/${id}`),
}

export const aiApi = {
  decompose: (description: string, projectId: string) =>
    api.post<{ tasks: Task[] }>('/ai/decompose', { description, projectId }).then(r => r.data),
  report: (projectId: string) =>
    api.post<{ report: string }>(`/ai/report/${projectId}`).then(r => r.data),
  generatePrompt: (description: string, category?: string) =>
    api.post<{ title: string; content: string; negativePrompt: string; category: string }>('/ai/generate-prompt', { description, category }).then(r => r.data),
}
