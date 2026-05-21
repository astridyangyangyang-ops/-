import { useState } from 'react'
import { Plus, Trash2, Edit2, Mail, Phone, Users } from 'lucide-react'
import clsx from 'clsx'
import type { TeamMember } from '../types'
import { teamApi } from '../api'

const DEPARTMENTS = ['导演组', '制片组', '摄影组', '灯光组', '美术组', '服化道', '录音组', '演员', '后期', '宣传', '其他']
const DEPT_COLORS: Record<string, string> = {
  导演组: 'bg-pink-100 text-pink-600',
  制片组: 'bg-blue-100 text-blue-700',
  摄影组: 'bg-amber-100 text-amber-700',
  灯光组: 'bg-yellow-100 text-yellow-700',
  美术组: 'bg-green-100 text-green-700',
  服化道: 'bg-pink-100 text-pink-700',
  录音组: 'bg-teal-100 text-teal-700',
  演员: 'bg-purple-100 text-purple-700',
  后期: 'bg-red-100 text-red-700',
  宣传: 'bg-orange-100 text-orange-700',
  其他: 'bg-gray-100 text-gray-600',
}

interface Props {
  teamMembers: TeamMember[]
  projectId: string
  onRefresh: () => void
}

const emptyForm = () => ({ name: '', role: '', department: '导演组', email: '', phone: '', notes: '' })

export default function TeamView({ teamMembers, projectId, onRefresh }: Props) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  const grouped = DEPARTMENTS.reduce<Record<string, TeamMember[]>>((acc, dept) => {
    const members = teamMembers.filter(m => m.department === dept)
    if (members.length > 0) acc[dept] = members
    return acc
  }, {})

  const ungrouped = teamMembers.filter(m => !DEPARTMENTS.includes(m.department))
  if (ungrouped.length > 0) grouped['其他'] = [...(grouped['其他'] || []), ...ungrouped]

  const handleCreate = async () => {
    if (!form.name.trim() || !form.role.trim()) return
    setSaving(true)
    await teamApi.create({ ...form, projectId })
    setForm(emptyForm())
    setAdding(false)
    setSaving(false)
    onRefresh()
  }

  const startEdit = (m: TeamMember) => {
    setEditingId(m.id)
    setEditForm({ name: m.name, role: m.role, department: m.department, email: m.email || '', phone: m.phone || '', notes: m.notes || '' })
  }

  const saveEdit = async () => {
    if (!editingId) return
    await teamApi.update(editingId, editForm)
    setEditingId(null)
    onRefresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确认移除该成员？')) return
    await teamApi.delete(id)
    onRefresh()
  }

  const input = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-300'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-pink-500" />
          <span className="font-semibold text-gray-700">团队成员</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{teamMembers.length} 人</span>
        </div>
        <button onClick={() => setAdding(!adding)} className="flex items-center gap-1.5 bg-pink-500 hover:bg-pink-600 text-white text-xs px-3 py-1.5 rounded-lg">
          <Plus size={13} /> 添加成员
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-white rounded-xl border border-pink-200 p-4 shadow-sm space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">添加团队成员</h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">姓名 *</label>
              <input autoFocus value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="姓名" className={input} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">职务 *</label>
              <input value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} placeholder="例：导演、摄影指导" className={input} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">部门</label>
              <select value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} className={`${input} bg-white`}>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">邮箱</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" className={input} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">电话</label>
              <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="手机号码" className={input} />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">备注</label>
            <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="备注信息" className={input} />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setAdding(false)} className="text-sm text-gray-500 px-3 py-1.5 hover:text-gray-700">取消</button>
            <button onClick={handleCreate} disabled={saving || !form.name.trim() || !form.role.trim()} className="bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 text-white text-sm px-4 py-1.5 rounded-lg">
              {saving ? '保存中...' : '添加'}
            </button>
          </div>
        </div>
      )}

      {/* Department groups */}
      {teamMembers.length === 0 && !adding
        ? <div className="text-center py-16 text-gray-400 text-sm">暂无成员，点击「添加成员」开始组建团队</div>
        : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([dept, members]) => (
              <div key={dept} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full', DEPT_COLORS[dept] || 'bg-gray-100 text-gray-600')}>{dept}</span>
                  <span className="text-xs text-gray-400">{members.length} 人</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {members.map(m => (
                    <div key={m.id} className="px-4 py-3">
                      {editingId === m.id ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-2">
                            <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-pink-300" />
                            <input value={editForm.role} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-pink-300" />
                            <select value={editForm.department} onChange={e => setEditForm(p => ({ ...p, department: e.target.value }))} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none bg-white">
                              {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} placeholder="邮箱" className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-pink-300" />
                            <input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} placeholder="电话" className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-pink-300" />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 px-2 py-1 hover:text-gray-700">取消</button>
                            <button onClick={saveEdit} className="text-xs bg-pink-500 text-white px-3 py-1 rounded-lg hover:bg-pink-600">保存</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 group">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                            {m.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-gray-800">{m.name}</span>
                              <span className="text-xs text-gray-500">{m.role}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                              {m.email && <span className="flex items-center gap-1"><Mail size={10} />{m.email}</span>}
                              {m.phone && <span className="flex items-center gap-1"><Phone size={10} />{m.phone}</span>}
                            </div>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                            <button onClick={() => startEdit(m)} className="text-gray-400 hover:text-pink-500 p-1"><Edit2 size={13} /></button>
                            <button onClick={() => handleDelete(m.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={13} /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
