import { useState, useRef, useCallback } from 'react'
import { Trash2, History, X, ExternalLink, Image, Video, Music, FileText, File, Upload, CloudUpload, CheckCircle2, AlertCircle, Edit2, Check } from 'lucide-react'
import clsx from 'clsx'
import type { Asset, AssetType } from '../types'
import { assetsApi, uploadApi } from '../api'

// ── 类型配置 ──────────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<AssetType, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  image:    { label: '图片', icon: <Image size={14} />,    color: 'text-sky-600',     bg: 'bg-sky-100' },
  video:    { label: '视频', icon: <Video size={14} />,    color: 'text-purple-600',  bg: 'bg-purple-100' },
  audio:    { label: '音频', icon: <Music size={14} />,    color: 'text-emerald-600', bg: 'bg-emerald-100' },
  document: { label: '文档', icon: <FileText size={14} />, color: 'text-amber-600',   bg: 'bg-amber-100' },
  other:    { label: '其他', icon: <File size={14} />,     color: 'text-pink-500',    bg: 'bg-pink-100' },
}

// ── 文件类型自动识别 ──────────────────────────────────────────────────────────
function detectType(file: File): AssetType {
  const mime = file.type.toLowerCase()
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (
    mime.includes('pdf') || mime.includes('word') || mime.includes('document') ||
    mime.includes('text') || mime.includes('spreadsheet') || mime.includes('presentation') ||
    mime.includes('excel') || mime.includes('powerpoint')
  ) return 'document'
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (['jpg','jpeg','png','gif','webp','svg','bmp','heic','tiff','avif'].includes(ext)) return 'image'
  if (['mp4','mov','avi','mkv','webm','m4v','flv','wmv'].includes(ext)) return 'video'
  if (['mp3','wav','flac','aac','m4a','ogg','wma','opus'].includes(ext)) return 'audio'
  if (['pdf','doc','docx','ppt','pptx','xls','xlsx','txt','md','csv','rtf'].includes(ext)) return 'document'
  return 'other'
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function nameWithoutExt(filename: string) {
  return filename.replace(/\.[^/.]+$/, '')
}

// ── 暂存文件状态 ──────────────────────────────────────────────────────────────
type UploadStatus = 'uploading' | 'ready' | 'saving' | 'error'

interface StagedFile {
  id: string
  file: File
  name: string
  type: AssetType
  tags: string
  notes: string
  status: UploadStatus
  progress: number
  url: string
  previewUrl: string
  error?: string
  size: number
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  assets: Asset[]
  projectId: string
  onRefresh: () => void
}

export default function AssetLibrary({ assets, projectId, onRefresh }: Props) {
  const [filterType, setFilterType] = useState<string>('all')
  const [staged, setStaged] = useState<StagedFile[]>([])
  const [dragging, setDragging] = useState(false)
  const [versionTarget, setVersionTarget] = useState<Asset | null>(null)
  const [versionUploading, setVersionUploading] = useState(false)
  const [versionProgress, setVersionProgress] = useState(0)
  const [versionNotes, setVersionNotes] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ name: string; tags: string; notes: string }>({ name: '', tags: '', notes: '' })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const versionFileRef = useRef<HTMLInputElement>(null)

  const filtered = filterType === 'all' ? assets : assets.filter(a => a.type === filterType)

  // ── 文件上传逻辑 ──────────────────────────────────────────────────────────
  const handleFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files)
    const newStaged: StagedFile[] = arr.map(file => ({
      id: Math.random().toString(36).slice(2),
      file,
      name: nameWithoutExt(file.name),
      type: detectType(file),
      tags: '',
      notes: '',
      status: 'uploading' as UploadStatus,
      progress: 0,
      url: '',
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      size: file.size,
    }))

    setStaged(prev => [...prev, ...newStaged])

    // 立即开始上传每个文件
    newStaged.forEach(s => {
      uploadApi.upload(s.file, pct => {
        setStaged(prev => prev.map(f => f.id === s.id ? { ...f, progress: pct } : f))
      }).then(res => {
        setStaged(prev => prev.map(f => f.id === s.id
          ? { ...f, status: 'ready', progress: 100, url: res.url }
          : f
        ))
      }).catch(err => {
        setStaged(prev => prev.map(f => f.id === s.id
          ? { ...f, status: 'error', error: err.message }
          : f
        ))
      })
    })
  }, [])

  // ── 拖拽事件 ─────────────────────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true) }
  const handleDragLeave = () => setDragging(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
  }

  // ── 保存暂存文件 ──────────────────────────────────────────────────────────
  const handleSaveStaged = async (s: StagedFile) => {
    if (s.status !== 'ready') return
    setStaged(prev => prev.map(f => f.id === s.id ? { ...f, status: 'saving' } : f))
    try {
      await assetsApi.create({
        name: s.name.trim() || s.file.name,
        type: s.type,
        url: s.url,
        notes: s.notes || undefined,
        tags: s.tags ? s.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        projectId,
      })
      if (s.previewUrl) URL.revokeObjectURL(s.previewUrl)
      setStaged(prev => prev.filter(f => f.id !== s.id))
      onRefresh()
    } catch {
      setStaged(prev => prev.map(f => f.id === s.id ? { ...f, status: 'error', error: '保存失败' } : f))
    }
  }

  const handleSaveAll = async () => {
    const ready = staged.filter(s => s.status === 'ready')
    await Promise.all(ready.map(handleSaveStaged))
  }

  const handleRemoveStaged = (id: string) => {
    const s = staged.find(f => f.id === id)
    if (s?.previewUrl) URL.revokeObjectURL(s.previewUrl)
    setStaged(prev => prev.filter(f => f.id !== id))
  }

  // ── 版本上传 ──────────────────────────────────────────────────────────────
  const handleVersionFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !versionTarget) return
    e.target.value = ''
    setVersionUploading(true)
    setVersionProgress(0)
    try {
      const res = await uploadApi.upload(file, pct => setVersionProgress(pct))
      await assetsApi.addVersion(versionTarget.id, { url: res.url, notes: versionNotes || undefined })
      setVersionUploading(false)
      setVersionNotes('')
      onRefresh()
      // 刷新 versionTarget
      const updated = assets.find(a => a.id === versionTarget.id)
      if (updated) setVersionTarget(updated)
    } catch {
      setVersionUploading(false)
      alert('版本上传失败，请重试')
    }
  }

  // ── 编辑素材 ──────────────────────────────────────────────────────────────
  const startEdit = (asset: Asset) => {
    setEditingId(asset.id)
    setEditForm({ name: asset.name, tags: asset.tags.join(', '), notes: asset.notes || '' })
  }

  const saveEdit = async (id: string) => {
    await assetsApi.update(id, {
      name: editForm.name,
      tags: editForm.tags ? editForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      notes: editForm.notes || undefined,
    })
    setEditingId(null)
    onRefresh()
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const pill = 'text-xs px-2.5 py-1 rounded-xl font-medium whitespace-nowrap transition-all'

  return (
    <div className="space-y-5">
      {/* ── 工具栏 ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex bg-pink-50 rounded-xl p-0.5 gap-0.5 overflow-x-auto">
          {[['all', '全部', '📦'] as const, ...Object.entries(TYPE_CONFIG).map(([k, v]) => [k, v.label, ''] as const)].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setFilterType(k)}
              className={clsx(pill, filterType === k ? 'bg-white shadow-sm text-rose-700' : 'text-pink-400 hover:text-pink-600')}
            >
              {l} <span className="text-pink-300 ml-0.5">({k === 'all' ? assets.length : assets.filter(a => a.type === k).length})</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="ml-auto flex items-center gap-1.5 bg-pink-500 hover:bg-pink-600 text-white text-xs px-4 py-2 rounded-xl font-medium transition-colors"
        >
          <Upload size={13} /> 上传文件
        </button>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => e.target.files && handleFiles(e.target.files)} />
      </div>

      {/* ── 拖拽上传区（无素材时始终显示，有素材时折叠） ── */}
      {(assets.length === 0 || staged.length === 0) && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={clsx(
            'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all',
            dragging
              ? 'border-pink-400 bg-pink-50 scale-[1.01]'
              : 'border-pink-200 hover:border-pink-300 hover:bg-pink-50/40',
            assets.length > 0 && 'py-6'
          )}
        >
          <div className="flex flex-col items-center gap-2">
            <CloudUpload size={36} className={clsx('transition-colors', dragging ? 'text-pink-500' : 'text-pink-200')} />
            <p className="text-sm font-medium text-pink-400">拖拽文件到这里，或点击上传</p>
            <p className="text-xs text-pink-300">支持图片、视频、音频、文档，单次可选多个文件</p>
            <div className="flex gap-2 mt-1 flex-wrap justify-center">
              {(['image','video','audio','document'] as AssetType[]).map(t => (
                <span key={t} className={clsx('text-xs px-2 py-0.5 rounded-full', TYPE_CONFIG[t].bg, TYPE_CONFIG[t].color)}>
                  {TYPE_CONFIG[t].label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 拖拽覆盖层（有素材时拖入触发） ── */}
      {assets.length > 0 && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={clsx(
            'fixed inset-0 z-40 flex items-center justify-center transition-all pointer-events-none',
            dragging ? 'pointer-events-auto' : ''
          )}
        >
          <div className={clsx(
            'w-full h-full flex items-center justify-center transition-all',
            dragging ? 'bg-pink-500/20 backdrop-blur-sm' : 'opacity-0'
          )}>
            <div className="bg-white rounded-3xl px-12 py-8 card-soft border border-pink-200 text-center">
              <CloudUpload size={48} className="text-pink-400 mx-auto mb-3" />
              <p className="text-lg font-bold text-rose-700">松开即可上传</p>
            </div>
          </div>
        </div>
      )}

      {/* ── 暂存队列 ── */}
      {staged.length > 0 && (
        <div className="rounded-2xl border border-pink-100 overflow-hidden card-soft">
          <div className="flex items-center justify-between px-4 py-3 border-b border-pink-100/60" style={{ background: 'linear-gradient(135deg, #fff5f8 0%, #f3efff 100%)' }}>
            <span className="text-sm font-semibold text-rose-700 flex items-center gap-2">
              <Upload size={14} className="text-pink-400" /> 待保存 ({staged.length})
            </span>
            {staged.some(s => s.status === 'ready') && (
              <button
                onClick={handleSaveAll}
                className="text-xs bg-pink-500 hover:bg-pink-600 text-white px-3 py-1.5 rounded-xl flex items-center gap-1"
              >
                <CheckCircle2 size={12} /> 全部保存
              </button>
            )}
          </div>
          <div className="divide-y divide-pink-50">
            {staged.map(s => {
              const cfg = TYPE_CONFIG[s.type]
              return (
                <div key={s.id} className="p-4 bg-white flex gap-4">
                  {/* 预览 */}
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border border-pink-100 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fff5f8 0%, #f3efff 100%)' }}>
                    {s.previewUrl
                      ? <img src={s.previewUrl} alt={s.name} className="w-full h-full object-cover" />
                      : <span className={cfg.color}>{cfg.icon}</span>
                    }
                  </div>

                  {/* 信息 */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start gap-2">
                      <input
                        value={s.name}
                        onChange={e => setStaged(prev => prev.map(f => f.id === s.id ? { ...f, name: e.target.value } : f))}
                        className="flex-1 text-sm font-medium text-rose-700 border border-pink-100 rounded-xl px-2.5 py-1 outline-none focus:border-pink-300 bg-pink-50/30"
                        placeholder="素材名称"
                      />
                      <select
                        value={s.type}
                        onChange={e => setStaged(prev => prev.map(f => f.id === s.id ? { ...f, type: e.target.value as AssetType } : f))}
                        className={clsx('text-xs px-2 py-1 rounded-xl border-0 font-medium cursor-pointer outline-none', cfg.bg, cfg.color)}
                      >
                        {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={s.tags}
                        onChange={e => setStaged(prev => prev.map(f => f.id === s.id ? { ...f, tags: e.target.value } : f))}
                        placeholder="标签（逗号分隔）"
                        className="text-xs border border-pink-100 rounded-xl px-2.5 py-1.5 outline-none focus:border-pink-300 bg-pink-50/30 text-rose-600 placeholder-pink-200"
                      />
                      <input
                        value={s.notes}
                        onChange={e => setStaged(prev => prev.map(f => f.id === s.id ? { ...f, notes: e.target.value } : f))}
                        placeholder="备注"
                        className="text-xs border border-pink-100 rounded-xl px-2.5 py-1.5 outline-none focus:border-pink-300 bg-pink-50/30 text-rose-600 placeholder-pink-200"
                      />
                    </div>

                    {/* 进度 / 状态 */}
                    {s.status === 'uploading' && (
                      <div>
                        <div className="h-1.5 bg-pink-50 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-pink-300 to-pink-500 rounded-full transition-all" style={{ width: `${s.progress}%` }} />
                        </div>
                        <p className="text-xs text-pink-300 mt-1">上传中 {s.progress}% · {formatSize(s.size)}</p>
                      </div>
                    )}
                    {s.status === 'ready' && (
                      <p className="text-xs text-emerald-500 flex items-center gap-1">
                        <CheckCircle2 size={11} /> 上传完成 · {formatSize(s.size)}
                      </p>
                    )}
                    {s.status === 'saving' && (
                      <p className="text-xs text-pink-400">保存中...</p>
                    )}
                    {s.status === 'error' && (
                      <p className="text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle size={11} /> {s.error}
                      </p>
                    )}
                  </div>

                  {/* 操作 */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleSaveStaged(s)}
                      disabled={s.status !== 'ready'}
                      className="text-xs bg-pink-500 hover:bg-pink-600 disabled:bg-pink-100 disabled:text-pink-300 text-white px-3 py-1.5 rounded-xl transition-colors"
                    >
                      保存
                    </button>
                    <button onClick={() => handleRemoveStaged(s.id)} className="text-pink-200 hover:text-red-400 transition-colors self-center">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 素材网格 ── */}
      {assets.length > 0 && (
        filtered.length === 0
          ? <div className="text-center py-12 text-pink-200 text-sm">该分类暂无素材 🐰</div>
          : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map(asset => {
                const cfg = TYPE_CONFIG[asset.type] || TYPE_CONFIG.other
                const isEditing = editingId === asset.id
                return (
                  <div key={asset.id} className="bg-white rounded-2xl border border-pink-100/80 card-soft overflow-hidden hover:scale-[1.01] transition-all">
                    {/* 预览区 */}
                    {asset.type === 'image'
                      ? <div className="h-32 overflow-hidden bg-pink-50">
                          <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        </div>
                      : <div className="h-32 flex flex-col items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #fff5f8 0%, #f3efff 100%)' }}>
                          <span className={clsx('p-3 rounded-2xl', cfg.bg, cfg.color)}>{cfg.icon}</span>
                          <span className="text-xs text-pink-300">{formatSize(0)}</span>
                        </div>
                    }

                    <div className="p-3">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            autoFocus
                            value={editForm.name}
                            onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                            className="w-full text-xs border border-pink-200 rounded-xl px-2 py-1.5 outline-none focus:border-pink-300 bg-pink-50/30 text-rose-700"
                          />
                          <input
                            value={editForm.tags}
                            onChange={e => setEditForm(p => ({ ...p, tags: e.target.value }))}
                            placeholder="标签（逗号分隔）"
                            className="w-full text-xs border border-pink-100 rounded-xl px-2 py-1.5 outline-none focus:border-pink-300 bg-pink-50/30 text-rose-600 placeholder-pink-200"
                          />
                          <input
                            value={editForm.notes}
                            onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                            placeholder="备注"
                            className="w-full text-xs border border-pink-100 rounded-xl px-2 py-1.5 outline-none focus:border-pink-300 bg-pink-50/30 text-rose-600 placeholder-pink-200"
                          />
                          <div className="flex gap-1">
                            <button onClick={() => saveEdit(asset.id)} className="flex-1 bg-pink-500 text-white text-xs py-1.5 rounded-xl hover:bg-pink-600 flex items-center justify-center gap-1">
                              <Check size={11} /> 保存
                            </button>
                            <button onClick={() => setEditingId(null)} className="flex-1 border border-pink-200 text-pink-400 text-xs py-1.5 rounded-xl hover:bg-pink-50">
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start gap-1 mb-1.5">
                            <span className="font-medium text-sm text-rose-700 flex-1 truncate">{asset.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className={clsx('text-xs px-1.5 py-0.5 rounded-full', cfg.bg, cfg.color)}>{cfg.label}</span>
                            <span className="text-xs text-pink-300">v{asset.version}</span>
                          </div>
                          {asset.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {asset.tags.slice(0, 3).map(t => (
                                <span key={t} className="text-xs bg-pink-50 text-pink-400 px-1.5 py-0.5 rounded-full">{t}</span>
                              ))}
                            </div>
                          )}
                          {asset.notes && <p className="text-xs text-pink-300 line-clamp-1 mb-2">{asset.notes}</p>}
                          <div className="flex items-center gap-1 border-t border-pink-50 pt-2 mt-1">
                            <a href={asset.url} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-1 text-xs text-sky-500 hover:text-sky-600 py-1 rounded-lg hover:bg-sky-50" onClick={e => e.stopPropagation()}>
                              <ExternalLink size={11} /> 查看
                            </a>
                            <button onClick={() => setVersionTarget(asset)} className="flex-1 flex items-center justify-center gap-1 text-xs text-purple-400 hover:text-purple-600 py-1 rounded-lg hover:bg-purple-50">
                              <History size={11} /> 版本({asset.versions.length})
                            </button>
                            <button onClick={() => startEdit(asset)} className="text-pink-200 hover:text-pink-500 p-1">
                              <Edit2 size={12} />
                            </button>
                            <button onClick={() => { if (confirm('确认删除此素材及所有版本？')) assetsApi.delete(asset.id).then(onRefresh) }} className="text-pink-200 hover:text-red-400 p-1">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
      )}

      {/* ── 版本历史弹窗 ── */}
      {versionTarget && (
        <div className="fixed inset-0 bg-pink-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl card-soft border border-pink-100 w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-pink-100/60">
              <div>
                <h3 className="font-bold text-sm text-rose-700">{versionTarget.name}</h3>
                <p className="text-xs text-pink-300 mt-0.5">版本历史 · 当前 v{versionTarget.version}</p>
              </div>
              <button onClick={() => setVersionTarget(null)} className="text-pink-300 hover:text-pink-500"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* 上传新版本 */}
              <div className="rounded-2xl border border-pink-100 p-4 space-y-3" style={{ background: 'linear-gradient(135deg, #fff5f8 0%, #f3efff 100%)' }}>
                <p className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
                  <CloudUpload size={13} className="text-pink-400" /> 上传新版本
                </p>
                <input
                  value={versionNotes}
                  onChange={e => setVersionNotes(e.target.value)}
                  placeholder="版本说明（可选）"
                  className="w-full text-xs border border-pink-200 rounded-xl px-3 py-2 outline-none focus:border-pink-300 bg-white/70"
                />
                {versionUploading && (
                  <div>
                    <div className="h-1.5 bg-pink-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-pink-300 to-pink-500 rounded-full transition-all" style={{ width: `${versionProgress}%` }} />
                    </div>
                    <p className="text-xs text-pink-300 mt-1">上传中 {versionProgress}%</p>
                  </div>
                )}
                <button
                  onClick={() => versionFileRef.current?.click()}
                  disabled={versionUploading}
                  className="w-full bg-pink-500 hover:bg-pink-600 disabled:bg-pink-200 text-white text-sm py-2 rounded-xl flex items-center justify-center gap-2"
                >
                  <Upload size={13} /> {versionUploading ? '上传中...' : `选择文件上传 v${versionTarget.version + 1}`}
                </button>
                <input ref={versionFileRef} type="file" className="hidden" onChange={handleVersionFile} />
              </div>

              {/* 版本列表 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-pink-50 rounded-2xl border border-pink-100">
                  <div>
                    <span className="text-xs font-semibold text-pink-600">
                      v{versionTarget.version}
                      <span className="bg-pink-500 text-white text-xs px-1.5 py-0.5 rounded-full ml-1.5">当前</span>
                    </span>
                    {versionTarget.notes && <p className="text-xs text-pink-400 mt-0.5">{versionTarget.notes}</p>}
                  </div>
                  <a href={versionTarget.url} target="_blank" rel="noreferrer" className="text-pink-400 hover:text-pink-600 p-1"><ExternalLink size={14} /></a>
                </div>
                {[...versionTarget.versions].sort((a, b) => b.version - a.version).map(v => (
                  <div key={v.id} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-pink-50">
                    <div>
                      <span className="text-xs font-medium text-rose-600">v{v.version}</span>
                      {v.notes && <p className="text-xs text-pink-300 mt-0.5">{v.notes}</p>}
                      <p className="text-xs text-pink-200">{new Date(v.createdAt).toLocaleDateString('zh-CN')}</p>
                    </div>
                    <a href={v.url} target="_blank" rel="noreferrer" className="text-pink-300 hover:text-pink-500 p-1"><ExternalLink size={13} /></a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
