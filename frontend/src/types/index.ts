export type ProjectType = 'movie' | 'tv_series' | 'documentary' | 'commercial' | 'music_video' | 'short_film'
export type ProductionPhase = 'development' | 'pre_production' | 'production' | 'post_production' | 'distribution' | 'completed'

export interface Project {
  id: string
  name: string
  description?: string
  type: ProjectType
  phase: ProductionPhase
  genre?: string
  director?: string
  producer?: string
  startDate?: string
  endDate?: string
  totalBudget?: number
  color: string
  createdAt: string
  updatedAt: string
  tasks: Task[]
  milestones: Milestone[]
  storyboards: Storyboard[]
  assets: Asset[]
  teamMembers: TeamMember[]
  prompts: PromptTemplate[]
  timelineEvents: TimelineEvent[]
}

export type StoryboardStatus = 'draft' | 'review' | 'approved' | 'rejected'

export interface Storyboard {
  id: string
  order: number
  shotNumber: string
  title?: string
  description?: string
  imageUrl?: string
  cameraAngle?: string
  cameraMove?: string
  duration?: number
  dialogueScript?: string
  notes?: string
  status: StoryboardStatus
  tags: string[]
  projectId: string
  createdAt: string
  updatedAt: string
  comments: StoryboardComment[]
}

export interface StoryboardComment {
  id: string
  author: string
  content: string
  tags: string[]
  resolved: boolean
  storyboardId: string
  createdAt: string
}

export type AssetType = 'image' | 'video' | 'audio' | 'document' | 'other'

export interface Asset {
  id: string
  name: string
  type: AssetType
  url: string
  version: number
  notes?: string
  tags: string[]
  projectId: string
  createdAt: string
  updatedAt: string
  versions: AssetVersion[]
}

export interface AssetVersion {
  id: string
  version: number
  url: string
  notes?: string
  assetId: string
  createdAt: string
}

export interface TeamMember {
  id: string
  name: string
  role: string
  department: string
  email?: string
  phone?: string
  notes?: string
  projectId: string
  createdAt: string
}

export interface PromptTemplate {
  id: string
  title: string
  category: string
  content: string
  negativePrompt?: string
  tags: string[]
  usageCount: number
  projectId: string
  createdAt: string
  updatedAt: string
}

export type TimelineEventType = 'milestone' | 'task' | 'event' | 'delivery'
export type TimelineEventStatus = 'pending' | 'in_progress' | 'completed' | 'overdue'

export interface TimelineEvent {
  id: string
  date: string
  title: string
  description?: string
  type: TimelineEventType
  status: TimelineEventStatus
  projectId: string
  createdAt: string
}

export interface Task {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  dueDate?: string
  order: number
  projectId: string
  createdAt: string
}

export interface Milestone {
  id: string
  title: string
  dueDate: string
  completed: boolean
  projectId: string
}
