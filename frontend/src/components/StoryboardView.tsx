import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Plus, X, Trash2, MessageSquare, CheckCircle2, Clock, XCircle, FileText, Check, Send, Upload, Download, AlertCircle } from 'lucide-react'
import clsx from 'clsx'
import type { Storyboard, StoryboardComment } from '../types'
import { storyboardsApi, commentsApi } from '../api'

const STATUS_CONFIG = {
  draft: { label: '草稿', color: 'bg-pink-100 text-pink-600', icon: FileText },
  review: { label: '评审中', color: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: '已通过', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  rejected: { label: '已驳回', color: 'bg-red-100 text-red-700', icon: XCircle },
}

const CAMERA_ANGLES = ['大全景', '全景', '中景', '近景', '特写', '大特写', '俯拍', '仰拍', '鸟瞰']
const CAMERA_MOVES = ['静止', '推镜', '拉镜', '摇镜', '移镜', '跟镜', '升降', '手持', '航拍']
const COMMENT_TAGS = ['修改', '通过', '疑问', '建议']
const COMMENT_TAG_COLORS: Record<string, string> = {
  修改: 'bg-red-100 text-red-700',
  通过: 'bg-green-100 text-green-700',
  疑问: 'bg-blue-100 text-blue-700',
  建议: 'bg-purple-100 text-purple-700',
}

// ── Excel column alias detection ──────────────────────────────────────────────
interface ParsedShot {
  shotNumber: string; title: string; description: string
  cameraAngle: string; cameraMove: string; duration: string
  dialogueScript: string; notes: string; imageUrl: string; status: string
}

const COLUMN_ALIASES: Record<string, keyof ParsedShot> = {
  '镜号': 'shotNumber', '场号': 'shotNumber', '序号': 'shotNumber', 'shot': 'shotNumber', 'sc': 'shotNumber', 'no': 'shotNumber', '#': 'shotNumber',
  '标题': 'title', 'title': 'title', '名称': 'title',
  '描述': 'description', '内容': 'description', '场景': 'description', '场景描述': 'description', '说明': 'description', 'description': 'description',
  '机位': 'cameraAngle', '景别': 'cameraAngle', 'angle': 'cameraAngle', 'camera angle': 'cameraAngle',
  '运镜': 'cameraMove', '镜头运动': 'cameraMove', 'move': 'cameraMove', 'camera move': 'cameraMove',
  '时长': 'duration', '秒': 'duration', '时间': 'duration', 'duration': 'duration',
  '台词': 'dialogueScript', '对白': 'dialogueScript', '旁白': 'dialogueScript', 'dialogue': 'dialogueScript', '对话': 'dialogueScript',
  '备注': 'notes', '注释': 'notes', 'notes': 'notes', '说明备注': 'notes',
  '参考图': 'imageUrl', '图片': 'imageUrl', '图片url': 'imageUrl', 'image': 'imageUrl', 'url': 'imageUrl', 'imageurl': 'imageUrl',
  '状态': 'status', 'status': 'status',
}

function parseExcelRows(rows: (string | number | null | undefined)[][]): { shots: ParsedShot[]; mappedCols: string[]; unmappedCols: string[] } {
  if (rows.length < 2) return { shots: [], mappedCols: [], unmappedCols: [] }

  const rawHeaders = rows[0].map(h => String(h ?? ''))
  const headers = rawHeaders.map(h => h.toLowerCase().replace(/\s+/g, ' ').trim())

  const fieldMap: Record<number, keyof ParsedShot> = {}
  const mappedCols: string[] = []
  const unmappedCols: string[] = []

  headers.forEach((h, i) => {
    if (!rawHeaders[i]) return
    const field = COLUMN_ALIASES[h]
    if (field) {
      fieldMap[i] = field
      mappedCols.push(rawHeaders[i])
    } else if (rawHeaders[i]) {
      unmappedCols.push(rawHeaders[i])
    }
  })

  const shots = rows.slice(1)
    .filter(row => row.some(cell => cell != null && cell !== ''))
    .map((row, idx) => {
      const shot: ParsedShot = {
        shotNumber: String(idx + 1), title: '', description: '', cameraAngle: '',
        cameraMove: '', duration: '', dialogueScript: '', notes: '', imageUrl: '', status: 'draft',
      }
      row.forEach((cell, i) => {
        const field = fieldMap[i]
        if (field && cell != null && cell !== '') {
          shot[field] = String(cell)
        }
      })
      return shot
    })
    .filter(s => s.shotNumber || s.description)

  return { shots, mappedCols, unmappedCols }
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props { storyboards: Storyboard[]; projectId: string; onRefresh: () => void }
type FilterStatus = 'all' | 'draft' | 'review' | 'approved' | 'rejected'
const emptyForm = () => ({
  shotNumber: '', title: '', description: '', imageUrl: '',
  cameraAngle: '', cameraMove: '', duration: '', dialogueScript: '', notes: '', status: 'draft', tags: [] as string[],
})

export default function StoryboardView({ storyboards, projectId, onRefresh }: Props) {
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(emptyForm())
  const [commentForm, setCommentForm] = useState({ author: '', content: '', tags: [] as string[] })
  const [savingComment, setSavingComment] = useState(false)

  // Excel import state
  const fileRef = useRef<HTMLInputElement>(null)
  const [importPreview, setImportPreview] = useState<{
    shots: ParsedShot[]; mappedCols: string[]; unmappedCols: string[]; filename: string
  } | null>(null)
  const [importing, setImporting] = useState(false)

  const filtered = filter === 'all' ? storyboards : storyboards.filter(s => s.status === filter)
  const selected = storyboards.find(s => s.id === selectedId)

  // ── Excel template download ────────────────────────────────────────────────
  const handleDownloadTemplate = () => {
    const headers = ['镜号', '标题', '描述', '机位', '运镜', '时长(秒)', '台词/旁白', '备注', '参考图URL', '状态']
    const sample = [
      ['1-A', '开场镜头', '宇宙飞船缓缓进入画面，背景是深邃星空', '大全景', '推镜', '5', '旁白：故事开始于遥远的星系...', '夜间布光', '', 'draft'],
      ['1-B', '地球全景', '蓝色地球悬浮在宇宙中，云层缓慢流动', '全景', '静止', '3', '', '', '', 'draft'],
      ['2-A', '主角特写', '女主角回望镜头，表情复杂', '特写', '拉镜', '4', '台词：我会回来的', '', '', 'review'],
    ]
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sample])
    // Set column widths
    ws['!cols'] = [8, 10, 30, 10, 10, 10, 30, 15, 20, 10].map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '分镜表')
    XLSX.writeFile(wb, '分镜表模板.xlsx')
  }

  // ── Excel file parsing ─────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const reader = new FileReader()
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer)
      try {
        const wb = XLSX.read(data, { type: 'array', cellText: true, cellDates: false })
        const sheetName = wb.SheetNames[0]
        const ws = wb.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, { header: 1, defval: null, blankrows: false })
        const result = parseExcelRows(rows as (string | number | null)[][])
        if (result.shots.length === 0) {
          alert('未能识别到有效数据，请确保 Excel 第一行为列标题，请参考模板格式。')
          return
        }
        setImportPreview({ ...result, filename: file.name })
      } catch {
        alert('文件解析失败，请确保上传的是有效的 Excel 文件（.xlsx 或 .xls）')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleImport = async () => {
    if (!importPreview || importPreview.shots.length === 0) return
    setImporting(true)
    try {
      await storyboardsApi.batchCreate(
        importPreview.shots.map(s => ({
          shotNumber: s.shotNumber || null,
          title: s.title || null,
          description: s.description || null,
          cameraAngle: s.cameraAngle || null,
          cameraMove: s.cameraMove || null,
          duration: s.duration ? Number(s.duration) : null,
          dialogueScript: s.dialogueScript || null,
          notes: s.notes || null,
          imageUrl: s.imageUrl || null,
          status: s.status || 'draft',
        })),
        projectId
      )
      setImportPreview(null)
      onRefresh()
    } catch {
      alert('导入失败，请重试')
    } finally {
      setImporting(false)
    }
  }

  // ── Form helpers ───────────────────────────────────────────────────────────
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleCreate = async () => {
    if (!form.shotNumber.trim()) return
    await storyboardsApi.create({ ...form, status: form.status as import('../types').StoryboardStatus, duration: form.duration ? Number(form.duration) : undefined, order: storyboards.length, projectId })
    setForm(emptyForm())
    setAdding(false)
    onRefresh()
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('确认删除此分镜？')) return
    await storyboardsApi.delete(id)
    if (selectedId === id) setSelectedId(null)
    onRefresh()
  }

  const handleStatusChange = async (id: string, status: string) => {
    await storyboardsApi.update(id, { status: status as Storyboard['status'] })
    onRefresh()
  }

  const startEdit = (s: Storyboard, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(s.id)
    setEditForm({ shotNumber: s.shotNumber, title: s.title || '', description: s.description || '', imageUrl: s.imageUrl || '', cameraAngle: s.cameraAngle || '', cameraMove: s.cameraMove || '', duration: s.duration ? String(s.duration) : '', dialogueScript: s.dialogueScript || '', notes: s.notes || '', status: s.status, tags: s.tags })
  }

  const saveEdit = async () => {
    if (!editingId) return
    await storyboardsApi.update(editingId, { ...editForm, status: editForm.status as import('../types').StoryboardStatus, duration: editForm.duration ? Number(editForm.duration) : undefined })
    setEditingId(null)
    onRefresh()
  }

  const handleAddComment = async () => {
    if (!commentForm.author.trim() || !commentForm.content.trim() || !selectedId) return
    setSavingComment(true)
    await commentsApi.create({ ...commentForm, storyboardId: selectedId })
    setCommentForm({ author: '', content: '', tags: [] })
    setSavingComment(false)
    onRefresh()
  }

  const handleToggleResolve = async (c: StoryboardComment) => {
    await commentsApi.update(c.id, { resolved: !c.resolved })
    onRefresh()
  }

  const handleDeleteComment = async (id: string) => {
    await commentsApi.delete(id)
    onRefresh()
  }

  const toggleCommentTag = (tag: string) =>
    setCommentForm(p => ({ ...p, tags: p.tags.includes(tag) ? p.tags.filter(t => t !== tag) : [...p.tags, tag] }))

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex gap-5 h-full min-h-0">
      {/* Left panel */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex bg-pink-50 rounded-xl p-0.5 gap-0.5">
            {(['all', 'draft', 'review', 'approved', 'rejected'] as FilterStatus[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx('px-2.5 py-1 rounded-lg text-xs font-medium transition-all', filter === f ? 'bg-white shadow-sm text-rose-700' : 'text-pink-400 hover:text-pink-600')}
              >
                {f === 'all' ? `全部 (${storyboards.length})` : `${STATUS_CONFIG[f].label} (${storyboards.filter(s => s.status === f).length})`}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 text-xs px-3 py-1.5 rounded-lg bg-white transition-colors"
            >
              <Download size={12} /> 下载模板
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 text-pink-600 hover:text-pink-700 border border-pink-200 hover:border-pink-300 text-xs px-3 py-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 transition-colors"
            >
              <Upload size={12} /> 导入 Excel
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
            <button
              onClick={() => setAdding(!adding)}
              className="flex items-center gap-1.5 bg-pink-500 hover:bg-pink-600 text-white text-xs px-3 py-1.5 rounded-lg"
            >
              <Plus size={13} /> 添加分镜
            </button>
          </div>
        </div>

        {/* Add form */}
        {adding && (
          <div className="mb-4 bg-white rounded-xl border border-pink-200 p-4 shadow-sm">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">镜号 *</label>
                <input autoFocus value={form.shotNumber} onChange={e => set('shotNumber', e.target.value)} placeholder="例：1-A" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-300" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">标题</label>
                <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="分镜标题" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-300" />
              </div>
            </div>
            <div className="mb-3">
              <label className="text-xs text-gray-500 mb-1 block">场景描述</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="描述镜头内容..." rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-300 resize-none" />
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">机位</label>
                <select value={form.cameraAngle} onChange={e => set('cameraAngle', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-300 bg-white">
                  <option value="">不限</option>
                  {CAMERA_ANGLES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">运镜</label>
                <select value={form.cameraMove} onChange={e => set('cameraMove', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-300 bg-white">
                  <option value="">不限</option>
                  {CAMERA_MOVES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">时长（秒）</label>
                <input type="number" value={form.duration} onChange={e => set('duration', e.target.value)} placeholder="5" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-300" />
              </div>
            </div>
            <div className="mb-3">
              <label className="text-xs text-gray-500 mb-1 block">参考图 URL</label>
              <input value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)} placeholder="https://..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-300" />
            </div>
            <div className="mb-3">
              <label className="text-xs text-gray-500 mb-1 block">台词 / 旁白</label>
              <textarea value={form.dialogueScript} onChange={e => set('dialogueScript', e.target.value)} placeholder="对话或旁白文本..." rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-300 resize-none" />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setAdding(false)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5">取消</button>
              <button onClick={handleCreate} className="bg-pink-500 hover:bg-pink-600 text-white text-sm px-4 py-1.5 rounded-lg">创建</button>
            </div>
          </div>
        )}

        {/* Cards grid */}
        {filtered.length === 0
          ? <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
              <p className="text-sm">暂无分镜</p>
              <div className="flex gap-2">
                <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 text-xs border border-dashed border-pink-200 text-pink-500 px-4 py-2 rounded-lg hover:bg-pink-50">
                  <Upload size={13} /> 导入 Excel 分镜表
                </button>
                <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 text-xs border border-dashed border-gray-300 text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-50">
                  <Plus size={13} /> 手动添加
                </button>
              </div>
            </div>
          : (
            <div className="flex-1 overflow-y-auto grid grid-cols-2 xl:grid-cols-3 gap-3 content-start">
              {filtered.map(s => {
                const cfg = STATUS_CONFIG[s.status]
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedId(selectedId === s.id ? null : s.id)}
                    className={clsx('bg-white rounded-2xl border cursor-pointer transition-all card-soft hover:scale-[1.01]', selectedId === s.id ? 'border-pink-300 ring-2 ring-pink-100' : 'border-pink-100/70')}
                  >
                    {s.imageUrl
                      ? <img src={s.imageUrl} alt={s.shotNumber} className="w-full h-28 object-cover rounded-t-2xl" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      : <div className="w-full h-28 rounded-t-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fff5f8 0%, #f3efff 100%)' }}>
                          <span className="text-pink-200 text-2xl font-bold">{s.shotNumber}</span>
                        </div>
                    }
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-rose-700">{s.shotNumber}</span>
                          {s.title && <span className="text-xs text-pink-400 truncate max-w-20">{s.title}</span>}
                        </div>
                        <span className={clsx('text-xs px-1.5 py-0.5 rounded-full font-medium', cfg.color)}>{cfg.label}</span>
                      </div>
                      {s.description && <p className="text-xs text-pink-400 line-clamp-2 mb-2">{s.description}</p>}
                      <div className="flex items-center gap-2 text-xs text-pink-300 flex-wrap">
                        {s.cameraAngle && <span className="bg-pink-50 text-pink-400 px-1.5 py-0.5 rounded-full">{s.cameraAngle}</span>}
                        {s.cameraMove && <span className="bg-purple-50 text-purple-400 px-1.5 py-0.5 rounded-full">{s.cameraMove}</span>}
                        {s.duration && <span>{s.duration}s</span>}
                        <span className="ml-auto flex items-center gap-0.5">
                          <MessageSquare size={11} />
                          {s.comments.filter(c => !c.resolved).length}/{s.comments.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-2" onClick={e => e.stopPropagation()}>
                        {(['draft', 'review', 'approved', 'rejected'] as const).map(st => (
                          <button
                            key={st}
                            onClick={() => handleStatusChange(s.id, st)}
                            className={clsx('flex-1 text-xs py-0.5 rounded-full transition-colors', s.status === st ? STATUS_CONFIG[st].color : 'text-pink-200 hover:text-pink-400')}
                          >{STATUS_CONFIG[st].label}</button>
                        ))}
                        <button onClick={e => editingId === s.id ? saveEdit() : startEdit(s, e)} className="text-gray-400 hover:text-pink-500 p-0.5">
                          {editingId === s.id ? <Check size={13} /> : <FileText size={13} />}
                        </button>
                        <button onClick={e => handleDelete(s.id, e)} className="text-gray-400 hover:text-red-500 p-0.5"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
      </div>

      {/* Right: detail + comments panel */}
      {selected && (
        <div className="w-80 flex-shrink-0 bg-white rounded-2xl border border-pink-100 card-soft flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-pink-100/60">
            <span className="font-semibold text-sm text-rose-700">🎞️ #{selected.shotNumber} 详情 & 评审</span>
            <button onClick={() => setSelectedId(null)} className="text-pink-300 hover:text-pink-500"><X size={16} /></button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 border-b border-pink-50 space-y-2">
              {editingId === selected.id ? (
                <div className="space-y-2">
                  <input value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} placeholder="标题" className="w-full text-xs border border-pink-200 rounded-xl px-2 py-1.5 outline-none focus:border-pink-300 bg-pink-50/30" />
                  <textarea value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} placeholder="场景描述" rows={3} className="w-full text-xs border border-pink-200 rounded-xl px-2 py-1.5 outline-none focus:border-pink-300 resize-none bg-pink-50/30" />
                  <div className="grid grid-cols-2 gap-2">
                    <select value={editForm.cameraAngle} onChange={e => setEditForm(p => ({ ...p, cameraAngle: e.target.value }))} className="text-xs border border-pink-200 rounded-xl px-2 py-1.5 outline-none bg-pink-50/30">
                      <option value="">机位</option>{CAMERA_ANGLES.map(a => <option key={a}>{a}</option>)}
                    </select>
                    <select value={editForm.cameraMove} onChange={e => setEditForm(p => ({ ...p, cameraMove: e.target.value }))} className="text-xs border border-pink-200 rounded-xl px-2 py-1.5 outline-none bg-pink-50/30">
                      <option value="">运镜</option>{CAMERA_MOVES.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <input type="number" value={editForm.duration} onChange={e => setEditForm(p => ({ ...p, duration: e.target.value }))} placeholder="时长（秒）" className="w-full text-xs border border-pink-200 rounded-xl px-2 py-1.5 outline-none focus:border-pink-300 bg-pink-50/30" />
                  <textarea value={editForm.dialogueScript} onChange={e => setEditForm(p => ({ ...p, dialogueScript: e.target.value }))} placeholder="台词 / 旁白" rows={2} className="w-full text-xs border border-pink-200 rounded-xl px-2 py-1.5 outline-none focus:border-pink-300 resize-none bg-pink-50/30" />
                  <input value={editForm.imageUrl} onChange={e => setEditForm(p => ({ ...p, imageUrl: e.target.value }))} placeholder="参考图 URL" className="w-full text-xs border border-pink-200 rounded-xl px-2 py-1.5 outline-none focus:border-pink-300 bg-pink-50/30" />
                  <textarea value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} placeholder="备注" rows={2} className="w-full text-xs border border-pink-200 rounded-xl px-2 py-1.5 outline-none focus:border-pink-300 resize-none bg-pink-50/30" />
                  <button onClick={saveEdit} className="w-full bg-pink-500 text-white text-xs py-1.5 rounded-xl hover:bg-pink-600">保存</button>
                </div>
              ) : (
                <>
                  {selected.description && <p className="text-xs text-rose-600">{selected.description}</p>}
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {selected.cameraAngle && <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">机位：{selected.cameraAngle}</span>}
                    {selected.cameraMove && <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">运镜：{selected.cameraMove}</span>}
                    {selected.duration && <span className="bg-pink-50 text-pink-500 px-2 py-0.5 rounded-full">⏱ {selected.duration}s</span>}
                  </div>
                  {selected.dialogueScript && (
                    <div className="bg-pink-50/50 rounded-xl p-2">
                      <p className="text-xs text-pink-300 mb-1">台词 / 旁白</p>
                      <p className="text-xs text-rose-700">{selected.dialogueScript}</p>
                    </div>
                  )}
                  {selected.notes && <p className="text-xs text-pink-300 italic">{selected.notes}</p>}
                </>
              )}
            </div>
            <div className="p-4">
              <p className="text-xs font-semibold text-pink-400 mb-3">💬 评审意见 ({selected.comments.length})</p>
              <div className="space-y-3 mb-4">
                {selected.comments.map(c => (
                  <div key={c.id} className={clsx('rounded-2xl p-3 text-xs', c.resolved ? 'bg-pink-50/40 opacity-60' : 'bg-white border border-pink-100')}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-rose-700">{c.author}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleToggleResolve(c)}><Check size={12} className={c.resolved ? 'text-emerald-500' : 'text-pink-200 hover:text-emerald-500'} /></button>
                        <button onClick={() => handleDeleteComment(c.id)}><X size={12} className="text-pink-200 hover:text-red-400" /></button>
                      </div>
                    </div>
                    <p className="text-rose-600 mb-1.5">{c.content}</p>
                    <div className="flex gap-1 flex-wrap">
                      {c.tags.map(t => <span key={t} className={clsx('px-1.5 py-0.5 rounded-full text-xs', COMMENT_TAG_COLORS[t] || 'bg-pink-100 text-pink-600')}>{t}</span>)}
                    </div>
                    <div className="text-pink-200 mt-1">{new Date(c.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                ))}
              </div>
              <div className="border-t border-pink-100/50 pt-3 space-y-2">
                <input value={commentForm.author} onChange={e => setCommentForm(p => ({ ...p, author: e.target.value }))} placeholder="你的名字" className="w-full text-xs border border-pink-200 rounded-xl px-3 py-2 outline-none focus:border-pink-300 bg-pink-50/30" />
                <textarea value={commentForm.content} onChange={e => setCommentForm(p => ({ ...p, content: e.target.value }))} placeholder="写下评审意见..." rows={2} className="w-full text-xs border border-pink-200 rounded-xl px-3 py-2 outline-none focus:border-pink-300 resize-none bg-pink-50/30" />
                <div className="flex gap-1 flex-wrap">
                  {COMMENT_TAGS.map(t => (
                    <button key={t} onClick={() => toggleCommentTag(t)} className={clsx('text-xs px-2 py-0.5 rounded-full border transition-all', commentForm.tags.includes(t) ? COMMENT_TAG_COLORS[t] + ' border-transparent' : 'border-pink-200 text-pink-400 hover:border-pink-300')}>{t}</button>
                  ))}
                </div>
                <button onClick={handleAddComment} disabled={savingComment || !commentForm.author.trim() || !commentForm.content.trim()} className="w-full flex items-center justify-center gap-1.5 bg-pink-500 hover:bg-pink-600 disabled:bg-pink-200 text-white text-xs py-2 rounded-xl">
                  <Send size={11} /> {savingComment ? '提交中...' : '提交评论'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Preview Modal */}
      {importPreview && (
        <div className="fixed inset-0 bg-pink-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl card-soft border border-pink-100 w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-pink-100/60">
              <div>
                <h3 className="font-bold text-base text-rose-700">🎬 导入分镜表预览</h3>
                <p className="text-xs text-pink-300 mt-0.5">{importPreview.filename}</p>
              </div>
              <button onClick={() => setImportPreview(null)} className="text-pink-300 hover:text-pink-500"><X size={20} /></button>
            </div>

            <div className="p-5 flex-1 overflow-hidden flex flex-col gap-4">
              {/* Summary */}
              <div className="flex items-start gap-4">
                <div className="flex-1 bg-green-50 rounded-xl p-3 border border-green-100">
                  <p className="text-sm font-semibold text-green-700">✓ 识别到 {importPreview.shots.length} 个分镜</p>
                  <p className="text-xs text-green-600 mt-0.5">已匹配列：{importPreview.mappedCols.join('、') || '无'}</p>
                </div>
                {importPreview.unmappedCols.length > 0 && (
                  <div className="flex-1 bg-amber-50 rounded-xl p-3 border border-amber-100">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle size={13} className="text-amber-600" />
                      <p className="text-xs font-semibold text-amber-700">未识别列（将被跳过）</p>
                    </div>
                    <p className="text-xs text-amber-600 mt-0.5">{importPreview.unmappedCols.join('、')}</p>
                    <p className="text-xs text-amber-500 mt-1">可下载模板查看支持的列名</p>
                  </div>
                )}
              </div>

              {/* Preview table */}
              <div className="flex-1 overflow-auto border border-gray-200 rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium border-b border-gray-200 whitespace-nowrap">#</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium border-b border-gray-200 whitespace-nowrap">镜号</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium border-b border-gray-200 whitespace-nowrap">标题</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium border-b border-gray-200 w-48">描述</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium border-b border-gray-200 whitespace-nowrap">机位</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium border-b border-gray-200 whitespace-nowrap">运镜</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium border-b border-gray-200 whitespace-nowrap">时长</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium border-b border-gray-200">台词</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium border-b border-gray-200 whitespace-nowrap">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.shots.map((s, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <td className="px-3 py-2 text-gray-400 border-b border-gray-100">{i + 1}</td>
                        <td className="px-3 py-2 font-semibold text-gray-800 border-b border-gray-100 whitespace-nowrap">{s.shotNumber || '—'}</td>
                        <td className="px-3 py-2 text-gray-600 border-b border-gray-100 whitespace-nowrap">{s.title || '—'}</td>
                        <td className="px-3 py-2 text-gray-600 border-b border-gray-100 max-w-48 truncate" title={s.description}>{s.description || '—'}</td>
                        <td className="px-3 py-2 text-gray-600 border-b border-gray-100 whitespace-nowrap">{s.cameraAngle || '—'}</td>
                        <td className="px-3 py-2 text-gray-600 border-b border-gray-100 whitespace-nowrap">{s.cameraMove || '—'}</td>
                        <td className="px-3 py-2 text-gray-600 border-b border-gray-100 whitespace-nowrap">{s.duration ? `${s.duration}s` : '—'}</td>
                        <td className="px-3 py-2 text-gray-500 border-b border-gray-100 max-w-32 truncate" title={s.dialogueScript}>{s.dialogueScript || '—'}</td>
                        <td className="px-3 py-2 border-b border-gray-100">
                          <span className={clsx('px-1.5 py-0.5 rounded-full text-xs', STATUS_CONFIG[(s.status as keyof typeof STATUS_CONFIG) || 'draft']?.color || 'bg-gray-100 text-gray-600')}>
                            {STATUS_CONFIG[(s.status as keyof typeof STATUS_CONFIG) || 'draft']?.label || s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-pink-100/60">
              <button onClick={() => setImportPreview(null)} className="flex-1 border border-pink-200 text-pink-400 rounded-2xl py-2.5 text-sm hover:bg-pink-50 font-medium">取消</button>
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex-1 bg-pink-500 hover:bg-pink-600 disabled:bg-pink-200 text-white rounded-2xl py-2.5 text-sm font-semibold"
              >
                {importing ? '导入中...' : `确认导入 ${importPreview.shots.length} 个分镜`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
