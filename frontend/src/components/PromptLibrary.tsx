import { useState } from 'react'
import { Plus, Copy, Trash2, Edit2, Sparkles, Loader2, Check, Search, Bot } from 'lucide-react'
import clsx from 'clsx'
import type { PromptTemplate } from '../types'
import { promptsApi, aiApi } from '../api'

const CATEGORIES = [
  { value: 'all', label: '全部' },
  { value: 'character', label: '人物' },
  { value: 'scene', label: '场景' },
  { value: 'style', label: '风格' },
  { value: 'camera', label: '镜头' },
  { value: 'lighting', label: '光影' },
  { value: 'mood', label: '情绪' },
  { value: 'effects', label: '特效' },
  { value: 'general', label: '通用' },
]

const CAT_COLORS: Record<string, string> = {
  character: 'bg-pink-100 text-pink-700',
  scene: 'bg-green-100 text-green-700',
  style: 'bg-purple-100 text-purple-700',
  camera: 'bg-amber-100 text-amber-700',
  lighting: 'bg-yellow-100 text-yellow-700',
  mood: 'bg-blue-100 text-blue-700',
  effects: 'bg-red-100 text-red-700',
  general: 'bg-gray-100 text-gray-600',
}

interface Props {
  prompts: PromptTemplate[]
  projectId: string
  onRefresh: () => void
}

const emptyForm = () => ({ title: '', category: 'general', content: '', negativePrompt: '', tags: '' })
const emptyAiForm = () => ({ description: '', category: '' })

export default function PromptLibrary({ prompts, projectId, onRefresh }: Props) {
  const [filterCat, setFilterCat] = useState('all')
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(emptyForm())
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [aiForm, setAiForm] = useState(emptyAiForm())
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<{ title: string; content: string; negativePrompt: string; category: string } | null>(null)
  const [showAi, setShowAi] = useState(false)

  const filtered = prompts.filter(p => {
    if (filterCat !== 'all' && p.category !== filterCat) return false
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.content.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleCreate = async () => {
    if (!form.title.trim() || !form.content.trim()) return
    await promptsApi.create({ ...form, tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [], projectId })
    setForm(emptyForm())
    setAdding(false)
    onRefresh()
  }

  const saveEdit = async () => {
    if (!editingId) return
    await promptsApi.update(editingId, { ...editForm, tags: editForm.tags ? editForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [] })
    setEditingId(null)
    onRefresh()
  }

  const startEdit = (p: PromptTemplate) => {
    setEditingId(p.id)
    setEditForm({ title: p.title, category: p.category, content: p.content, negativePrompt: p.negativePrompt || '', tags: p.tags.join(', ') })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除此提示词？')) return
    await promptsApi.delete(id)
    onRefresh()
  }

  const handleCopy = async (p: PromptTemplate) => {
    await navigator.clipboard.writeText(p.content)
    await promptsApi.use(p.id)
    setCopiedId(p.id)
    setTimeout(() => setCopiedId(null), 2000)
    onRefresh()
  }

  const handleAiGenerate = async () => {
    if (!aiForm.description.trim()) return
    setAiLoading(true)
    setAiResult(null)
    try {
      const result = await aiApi.generatePrompt(aiForm.description, aiForm.category || undefined)
      setAiResult(result)
    } catch {
      alert('AI 生成失败，请检查 API Key 配置')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSaveAiResult = async () => {
    if (!aiResult) return
    await promptsApi.create({
      title: aiResult.title,
      category: aiResult.category || 'general',
      content: aiResult.content,
      negativePrompt: aiResult.negativePrompt,
      tags: [],
      projectId,
    })
    setAiResult(null)
    setAiForm(emptyAiForm())
    setShowAi(false)
    onRefresh()
  }

  const input = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-300'

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索提示词..." className="border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-sm outline-none focus:border-pink-300 w-48" />
        </div>
        <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5 overflow-x-auto">
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => setFilterCat(c.value)}
              className={clsx('px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap', filterCat === c.value ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setShowAi(!showAi)} className="flex items-center gap-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-xs px-3 py-1.5 rounded-lg shadow-sm">
            <Bot size={13} /> AI 生成
          </button>
          <button onClick={() => setAdding(!adding)} className="flex items-center gap-1.5 bg-pink-500 hover:bg-pink-600 text-white text-xs px-3 py-1.5 rounded-lg">
            <Plus size={13} /> 手动添加
          </button>
        </div>
      </div>

      {/* AI Generate panel */}
      {showAi && (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-pink-200 p-5 space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Sparkles size={14} className="text-pink-500" /> AI 生成提示词</h4>
          <p className="text-xs text-gray-500">描述你的场景，AI 自动生成专业的正向/负向提示词</p>
          <textarea value={aiForm.description} onChange={e => setAiForm(p => ({ ...p, description: e.target.value }))} placeholder="例：黄昏时分，女主角站在城市天台，背景是橙红色天空和霓虹灯光，情绪复杂..." rows={3} className="w-full border border-pink-200 bg-white rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-300 resize-none" />
          <div className="flex items-center gap-3">
            <select value={aiForm.category} onChange={e => setAiForm(p => ({ ...p, category: e.target.value }))} className="border border-pink-200 bg-white rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-300">
              <option value="">自动判断分类</option>
              {CATEGORIES.slice(1).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <button onClick={handleAiGenerate} disabled={aiLoading || !aiForm.description.trim()} className="flex items-center gap-1.5 bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 text-white text-sm px-4 py-2 rounded-lg">
              {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {aiLoading ? '生成中...' : '生成'}
            </button>
          </div>

          {aiResult && (
            <div className="bg-white rounded-xl border border-pink-100 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-800">{aiResult.title}</span>
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full', CAT_COLORS[aiResult.category] || CAT_COLORS.general)}>
                    {CATEGORIES.find(c => c.value === aiResult.category)?.label || aiResult.category}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-green-700 mb-1">正向提示词</p>
                <p className="text-xs text-gray-700 bg-green-50 rounded-lg p-2 font-mono">{aiResult.content}</p>
              </div>
              {aiResult.negativePrompt && (
                <div>
                  <p className="text-xs font-medium text-red-600 mb-1">负向提示词</p>
                  <p className="text-xs text-gray-700 bg-red-50 rounded-lg p-2 font-mono">{aiResult.negativePrompt}</p>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => navigator.clipboard.writeText(aiResult.content)} className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 text-gray-600 text-xs py-2 rounded-lg hover:bg-gray-50">
                  <Copy size={12} /> 复制正向
                </button>
                <button onClick={handleSaveAiResult} className="flex-1 flex items-center justify-center gap-1.5 bg-pink-500 text-white text-xs py-2 rounded-lg hover:bg-pink-600">
                  <Plus size={12} /> 存入提示词库
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual add form */}
      {adding && (
        <div className="bg-white rounded-xl border border-pink-200 p-4 shadow-sm space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">手动添加提示词</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">标题 *</label>
              <input autoFocus value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="提示词标题" className={input} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">分类</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className={`${input} bg-white`}>
                {CATEGORIES.slice(1).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">正向提示词 *</label>
            <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="beautiful lighting, cinematic shot, 8k..." rows={3} className={`${input} resize-none font-mono text-xs`} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">负向提示词</label>
            <textarea value={form.negativePrompt} onChange={e => setForm(p => ({ ...p, negativePrompt: e.target.value }))} placeholder="blurry, low quality, distorted..." rows={2} className={`${input} resize-none font-mono text-xs`} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">标签（逗号分隔）</label>
            <input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="写实, 人像, 胶片..." className={input} />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setAdding(false)} className="text-sm text-gray-500 px-3 py-1.5 hover:text-gray-700">取消</button>
            <button onClick={handleCreate} disabled={!form.title.trim() || !form.content.trim()} className="bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 text-white text-sm px-4 py-1.5 rounded-lg">添加</button>
          </div>
        </div>
      )}

      {/* Prompt cards */}
      {filtered.length === 0
        ? <div className="text-center py-16 text-gray-400 text-sm">暂无提示词，使用 AI 生成或手动添加</div>
        : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filtered.map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-all">
                {editingId === p.id ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-pink-300" />
                      <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none bg-white">
                        {CATEGORIES.slice(1).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                    <textarea value={editForm.content} onChange={e => setEditForm(f => ({ ...f, content: e.target.value }))} rows={3} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-pink-300 resize-none font-mono" />
                    <textarea value={editForm.negativePrompt} onChange={e => setEditForm(f => ({ ...f, negativePrompt: e.target.value }))} placeholder="负向提示词..." rows={2} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-pink-300 resize-none font-mono" />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 px-2 py-1 hover:text-gray-700">取消</button>
                      <button onClick={saveEdit} className="text-xs bg-pink-500 text-white px-3 py-1 rounded-lg hover:bg-pink-600">保存</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-800">{p.title}</span>
                        <span className={clsx('text-xs px-2 py-0.5 rounded-full', CAT_COLORS[p.category] || CAT_COLORS.general)}>
                          {CATEGORIES.find(c => c.value === p.category)?.label || p.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => startEdit(p)} className="text-gray-400 hover:text-pink-500 p-1"><Edit2 size={13} /></button>
                        <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={13} /></button>
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-lg p-2.5 mb-2 group/positive relative">
                      <p className="text-xs text-gray-400 mb-1">正向</p>
                      <p className="text-xs text-gray-700 font-mono line-clamp-3">{p.content}</p>
                    </div>

                    {p.negativePrompt && (
                      <div className="bg-red-50 rounded-lg p-2.5 mb-2">
                        <p className="text-xs text-gray-400 mb-1">负向</p>
                        <p className="text-xs text-gray-600 font-mono line-clamp-2">{p.negativePrompt}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1.5">
                        {p.tags.slice(0, 3).map(t => (
                          <span key={t} className="text-xs bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded">{t}</span>
                        ))}
                        {p.usageCount > 0 && <span className="text-xs text-gray-400">{p.usageCount}次使用</span>}
                      </div>
                      <button onClick={() => handleCopy(p)} className={clsx('flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-all', copiedId === p.id ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-pink-100 hover:text-pink-600')}>
                        {copiedId === p.id ? <Check size={11} /> : <Copy size={11} />}
                        {copiedId === p.id ? '已复制' : '复制'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
