import { Download, FileJson, FileText, Users, Sparkles, Printer } from 'lucide-react'
import clsx from 'clsx'
import type { Project } from '../types'

interface Props {
  project: Project
}

export default function ExportView({ project }: Props) {
  const download = (filename: string, content: string, mime = 'application/json') => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 200)
  }

  const exportJSON = () => {
    download(`${project.name}-项目数据.json`, JSON.stringify(project, null, 2))
  }

  const exportTeamCSV = () => {
    const header = '姓名,职务,部门,邮箱,电话,备注'
    const rows = project.teamMembers.map(m =>
      [m.name, m.role, m.department, m.email || '', m.phone || '', m.notes || ''].join(',')
    )
    download(`${project.name}-团队名单.csv`, [header, ...rows].join('\n'), 'text/csv;charset=utf-8')
  }

  const exportPromptsTXT = () => {
    const lines = project.prompts.map(p =>
      `【${p.title}】(${p.category})\n正向：${p.content}${p.negativePrompt ? `\n负向：${p.negativePrompt}` : ''}\n`
    )
    download(`${project.name}-提示词库.txt`, lines.join('\n---\n'), 'text/plain;charset=utf-8')
  }

  const exportStoryboardHTML = () => {
    const TYPE_LABELS: Record<string, string> = { movie: '电影', tv_series: '剧集', documentary: '纪录片', commercial: '广告片', music_video: 'MV', short_film: '短片' }
    const PHASE_LABELS: Record<string, string> = { development: '开发期', pre_production: '筹备期', production: '拍摄期', post_production: '后期制作', distribution: '发行期', completed: '已完成' }
    const STATUS_LABELS: Record<string, string> = { draft: '草稿', review: '评审中', approved: '已通过', rejected: '已驳回' }

    const html = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<title>${project.name} — 分镜表</title>
<style>
  body { font-family: "PingFang SC", "Microsoft YaHei", sans-serif; padding: 40px; color: #1a1a1a; }
  h1 { font-size: 24px; margin-bottom: 4px; }
  .meta { color: #666; font-size: 13px; margin-bottom: 32px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .card { border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; break-inside: avoid; }
  .card-img { width: 100%; height: 140px; object-fit: cover; background: #f3f4f6; display: flex; align-items: center; justify-content: center; color: #ccc; font-size: 24px; font-weight: bold; }
  .card-body { padding: 12px; }
  .shot-num { font-size: 18px; font-weight: bold; }
  .badge { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 99px; margin-left: 6px; }
  .draft { background: #f3f4f6; color: #666; }
  .review { background: #fef3c7; color: #b45309; }
  .approved { background: #d1fae5; color: #065f46; }
  .rejected { background: #fee2e2; color: #991b1b; }
  .desc { font-size: 12px; color: #555; margin: 6px 0; }
  .tags { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px; }
  .tag { font-size: 11px; background: #f3f4f6; color: #555; padding: 2px 6px; border-radius: 4px; }
  .comments { margin-top: 8px; border-top: 1px solid #f3f4f6; padding-top: 8px; }
  .comment { font-size: 11px; color: #555; margin: 3px 0; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<h1>${project.name}</h1>
<div class="meta">
  ${TYPE_LABELS[project.type] || project.type} · ${PHASE_LABELS[project.phase] || project.phase}
  ${project.director ? ` · 导演：${project.director}` : ''}
  ${project.producer ? ` · 制片：${project.producer}` : ''}
  · 共 ${project.storyboards.length} 个分镜
  · 导出时间：${new Date().toLocaleString('zh-CN')}
</div>
<div class="grid">
${project.storyboards.map(s => `
  <div class="card">
    ${s.imageUrl ? `<img src="${s.imageUrl}" class="card-img" onerror="this.style.display='none'" />` : `<div class="card-img">${s.shotNumber}</div>`}
    <div class="card-body">
      <div>
        <span class="shot-num">${s.shotNumber}</span>
        <span class="badge ${s.status}">${STATUS_LABELS[s.status] || s.status}</span>
      </div>
      ${s.title ? `<div style="font-size:13px;font-weight:600;margin-top:4px;">${s.title}</div>` : ''}
      ${s.description ? `<div class="desc">${s.description}</div>` : ''}
      <div class="tags">
        ${s.cameraAngle ? `<span class="tag">机位：${s.cameraAngle}</span>` : ''}
        ${s.cameraMove ? `<span class="tag">运镜：${s.cameraMove}</span>` : ''}
        ${s.duration ? `<span class="tag">⏱ ${s.duration}s</span>` : ''}
      </div>
      ${s.dialogueScript ? `<div style="font-size:11px;color:#888;margin-top:6px;font-style:italic">${s.dialogueScript}</div>` : ''}
      ${s.comments.length > 0 ? `<div class="comments">${s.comments.map(c => `<div class="comment">💬 <b>${c.author}</b>：${c.content}</div>`).join('')}</div>` : ''}
    </div>
  </div>`).join('')}
</div>
</body>
</html>`

    download(`${project.name}-分镜表.html`, html, 'text/html;charset=utf-8')
  }

  const exportAssetList = () => {
    const lines = project.assets.map(a =>
      `[${a.type.toUpperCase()}] ${a.name} v${a.version}\nURL: ${a.url}${a.notes ? `\n备注: ${a.notes}` : ''}${a.tags.length ? `\n标签: ${a.tags.join(', ')}` : ''}`
    )
    download(`${project.name}-素材清单.txt`, lines.join('\n\n---\n\n'), 'text/plain;charset=utf-8')
  }

  const EXPORT_OPTIONS = [
    {
      icon: <FileJson size={22} className="text-pink-500" />,
      title: '完整项目数据',
      desc: '导出所有数据为 JSON 格式，包含分镜、素材、团队、提示词、时间线等全部信息',
      btn: '导出 JSON',
      action: exportJSON,
      color: 'border-pink-100 hover:border-pink-300 hover:bg-pink-50',
    },
    {
      icon: <Printer size={22} className="text-amber-500" />,
      title: '分镜表（可打印）',
      desc: '导出所有分镜为 HTML 页面，包含图片、机位运镜、台词、评审意见，可直接打印',
      btn: '导出分镜表',
      action: exportStoryboardHTML,
      color: 'border-amber-100 hover:border-amber-300 hover:bg-amber-50',
    },
    {
      icon: <Users size={22} className="text-blue-500" />,
      title: '团队名单',
      desc: '导出所有团队成员信息为 CSV 格式，可用 Excel/Numbers 打开编辑',
      btn: '导出 CSV',
      action: exportTeamCSV,
      color: 'border-blue-100 hover:border-blue-300 hover:bg-blue-50',
    },
    {
      icon: <Sparkles size={22} className="text-purple-500" />,
      title: '提示词库',
      desc: '导出所有 AI 提示词为文本格式，包含正向/负向提示词及分类标注',
      btn: '导出 TXT',
      action: exportPromptsTXT,
      color: 'border-purple-100 hover:border-purple-300 hover:bg-purple-50',
    },
    {
      icon: <FileText size={22} className="text-green-500" />,
      title: '素材清单',
      desc: '导出所有素材资源列表，包含文件路径、版本号、标签等信息',
      btn: '导出清单',
      action: exportAssetList,
      color: 'border-green-100 hover:border-green-300 hover:bg-green-50',
    },
  ]

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="font-semibold text-gray-700 mb-1">导出项目数据</h3>
        <p className="text-sm text-gray-400">所有导出均在浏览器本地完成，数据不会上传到任何服务器</p>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-gray-800">{project.storyboards.length}</div>
          <div className="text-xs text-gray-400 mt-0.5">个分镜</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-800">{project.teamMembers.length}</div>
          <div className="text-xs text-gray-400 mt-0.5">位团队成员</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-800">{project.prompts.length}</div>
          <div className="text-xs text-gray-400 mt-0.5">条提示词</div>
        </div>
      </div>

      <div className="space-y-3">
        {EXPORT_OPTIONS.map((opt, i) => (
          <div key={i} className={clsx('bg-white rounded-xl border p-4 transition-all cursor-default', opt.color)}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="mt-0.5">{opt.icon}</div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-800 mb-1">{opt.title}</h4>
                  <p className="text-xs text-gray-500">{opt.desc}</p>
                </div>
              </div>
              <button
                onClick={opt.action}
                className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-700 text-white text-xs px-4 py-2 rounded-lg whitespace-nowrap transition-colors flex-shrink-0"
              >
                <Download size={12} /> {opt.btn}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
