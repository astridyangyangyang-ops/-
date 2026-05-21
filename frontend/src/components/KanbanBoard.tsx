import { useState } from 'react'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { Plus, Trash2, Calendar, Flag } from 'lucide-react'
import clsx from 'clsx'
import type { Task } from '../types'
import { tasksApi } from '../api'

const COLUMNS = [
  { id: 'todo', label: '待办', emoji: '🌸', headerColor: 'bg-pink-100 text-pink-700', bgColor: 'bg-pink-50/40', dragBg: 'bg-pink-100/60' },
  { id: 'in_progress', label: '进行中', emoji: '🌿', headerColor: 'bg-purple-100 text-purple-700', bgColor: 'bg-purple-50/40', dragBg: 'bg-purple-100/60' },
  { id: 'done', label: '已完成', emoji: '🎀', headerColor: 'bg-emerald-100 text-emerald-700', bgColor: 'bg-emerald-50/40', dragBg: 'bg-emerald-100/60' },
]

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-emerald-400',
  medium: 'text-amber-400',
  high: 'text-pink-500',
}

interface Props {
  tasks: Task[]
  projectId: string
  onTasksChange: () => void
}

interface NewTaskState { [col: string]: string }

export default function KanbanBoard({ tasks, projectId, onTasksChange }: Props) {
  const [newTask, setNewTask] = useState<NewTaskState>({})
  const [adding, setAdding] = useState<string | null>(null)

  const getColumnTasks = (status: string) =>
    tasks.filter(t => t.status === status).sort((a, b) => a.order - b.order)

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return
    const { draggableId, destination } = result
    await tasksApi.update(draggableId, { status: destination.droppableId as Task['status'], order: destination.index })
    onTasksChange()
  }

  const handleAddTask = async (status: string) => {
    const title = newTask[status]?.trim()
    if (!title) return
    await tasksApi.create({ title, status: status as Task['status'], projectId, order: getColumnTasks(status).length })
    setNewTask(prev => ({ ...prev, [status]: '' }))
    setAdding(null)
    onTasksChange()
  }

  const handleDelete = async (id: string) => {
    await tasksApi.delete(id)
    onTasksChange()
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 h-full">
        {COLUMNS.map(col => {
          const colTasks = getColumnTasks(col.id)
          return (
            <div key={col.id} className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-3">
                <span className={clsx('text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1', col.headerColor)}>
                  {col.emoji} {col.label} · {colTasks.length}
                </span>
                <button
                  onClick={() => setAdding(adding === col.id ? null : col.id)}
                  className="text-pink-300 hover:text-pink-500 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>

              {adding === col.id && (
                <div className="mb-2 p-3 bg-white rounded-2xl border border-pink-100 card-soft">
                  <input
                    autoFocus
                    value={newTask[col.id] || ''}
                    onChange={e => setNewTask(p => ({ ...p, [col.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddTask(col.id); if (e.key === 'Escape') setAdding(null) }}
                    placeholder="任务名称，回车确认"
                    className="w-full text-sm outline-none text-rose-700 placeholder-pink-200"
                  />
                </div>
              )}

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={clsx(
                      'flex-1 rounded-2xl p-2 space-y-2 overflow-y-auto transition-colors',
                      snapshot.isDraggingOver ? col.dragBg : col.bgColor
                    )}
                  >
                    {colTasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={clsx(
                              'bg-white rounded-2xl p-3 border border-pink-100/80 group transition-all card-soft',
                              snapshot.isDragging && 'shadow-lg shadow-pink-200/40 rotate-1 scale-105'
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-rose-700 flex-1">{task.title}</p>
                              <button
                                onClick={() => handleDelete(task.id)}
                                className="opacity-0 group-hover:opacity-100 text-pink-200 hover:text-red-400 flex-shrink-0 transition-opacity"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                            {task.description && (
                              <p className="text-xs text-pink-300 mt-1 line-clamp-2">{task.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Flag size={11} className={PRIORITY_COLORS[task.priority]} />
                              <span className="text-xs text-pink-300 capitalize">{task.priority}</span>
                              {task.dueDate && (
                                <>
                                  <Calendar size={11} className="text-pink-200 ml-auto" />
                                  <span className="text-xs text-pink-300">
                                    {new Date(task.dueDate).toLocaleDateString('zh-CN')}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          )
        })}
      </div>
    </DragDropContext>
  )
}
