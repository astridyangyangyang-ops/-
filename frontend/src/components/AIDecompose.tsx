import { useState } from 'react'
import { Bot, Loader2, Sparkles } from 'lucide-react'
import { aiApi } from '../api'

interface Props {
  projectId: string
  onTasksCreated: () => void
}

export default function AIDecompose({ projectId, onTasksCreated }: Props) {
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleDecompose = async () => {
    if (!description.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const { tasks } = await aiApi.decompose(description, projectId)
      setResult(`✨ 已创建 ${tasks.length} 个制作任务`)
      setDescription('')
      onTasksCreated()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setResult(`失败：${msg || '请检查 DEEPSEEK_API_KEY 配置'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl p-5 border border-emerald-100 card-soft" style={{ background: 'linear-gradient(135deg, #f0fbf6 0%, #f3efff 100%)' }}>
      <h3 className="font-semibold text-emerald-700 flex items-center gap-2 mb-2">
        <Sparkles size={15} className="text-pink-400" />
        🤖 AI 制作任务拆解
      </h3>
      <p className="text-xs text-emerald-500/70 mb-3">描述制作需求，AI 自动拆解为前期筹备、拍摄、后期等阶段的具体任务</p>
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="例：需要拍摄一场追车戏，包括场地勘察、特效车辆准备、镜头设计、安全保障方案等..."
        rows={3}
        className="w-full text-sm border border-emerald-200/60 rounded-xl px-3 py-2 outline-none focus:border-pink-300 bg-white/70 resize-none text-rose-700 placeholder-emerald-300/60"
      />
      <div className="flex items-center justify-between mt-2">
        {result && <span className={`text-xs ${result.startsWith('失败') ? 'text-red-400' : 'text-emerald-600'}`}>{result}</span>}
        <button
          onClick={handleDecompose}
          disabled={loading || !description.trim()}
          className="flex items-center gap-1.5 ml-auto text-sm bg-pink-500 hover:bg-pink-600 disabled:bg-pink-200 text-white px-4 py-2 rounded-xl transition-colors"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Bot size={13} />}
          {loading ? '拆解中...' : '开始拆解'}
        </button>
      </div>
    </div>
  )
}
