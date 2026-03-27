// app/(admin)/admin/cms/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

type PageName = 'about_us' | 'terms_conditions' | 'privacy_policy' | 'faq' | 'contact'

const PAGES: { key: PageName; label: string; icon: string }[] = [
  { key: 'about_us', label: 'About Us', icon: '🏢' },
  { key: 'terms_conditions', label: 'Terms & Conditions', icon: '📋' },
  { key: 'privacy_policy', label: 'Privacy Policy', icon: '🔒' },
  { key: 'contact', label: 'Contact Info', icon: '📞' },
]

interface Faq { id?: string; question: string; answer: string; sort_order: number }

export default function AdminCms() {
  const [activePage, setActivePage] = useState<PageName>('about_us')
  const [content, setContent] = useState('')
  const [faqs, setFaqs] = useState<Faq[]>([])
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => { fetchContent() }, [activePage])

  async function fetchContent() {
    if (activePage === 'faq') {
      const { data } = await supabase.from('faqs').select('*').eq('is_active', true).order('sort_order')
      setFaqs(data || [])
    } else {
      const { data } = await supabase.from('cms_content').select('content').eq('page_name', activePage).single()
      setContent(data?.content || '')
    }
  }

  async function savePage() {
    setSaving(true)
    try {
      if (activePage === 'faq') {
        for (const faq of faqs) {
          const payload = { question: faq.question, answer: faq.answer, sort_order: faq.sort_order, is_active: true }
          const { error } = faq.id 
            ? await supabase.from('faqs').update(payload).eq('id', faq.id)
            : await supabase.from('faqs').insert(payload)
          
          if (error) throw error
        }
      } else {
        const { error } = await supabase
          .from('cms_content')
          .upsert({ page_name: activePage, content, updated_at: new Date().toISOString() }, { onConflict: 'page_name' })
        
        if (error) throw error
      }
      toast.success('Changes saved successfully!')
      fetchContent()
    } catch (err: any) {
      console.error('CMS SAVE ERROR:', err)
      toast.error(`Save failed: ${err.message || 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  function addFaq() {
    setFaqs(f => [...f, { question: '', answer: '', sort_order: f.length + 1 }])
  }

  async function deleteFaq(index: number) {
    const faq = faqs[index]
    if (faq.id) {
      await supabase.from('faqs').update({ is_active: false }).eq('id', faq.id)
    }
    setFaqs(f => f.filter((_, i) => i !== index))
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Content Management</h1>
        <button className="btn-primary" onClick={savePage} disabled={saving}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="flex gap-4">
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0">
          <div className="card p-2 space-y-1">
            {[...PAGES, { key: 'faq' as PageName, label: 'FAQs', icon: '❓' }].map(p => (
              <button
                key={p.key}
                onClick={() => setActivePage(p.key)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
                  activePage === p.key ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>{p.icon}</span>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1">
          <div className="card p-5">
            <h2 className="font-semibold mb-4">
              {[...PAGES, { key: 'faq', label: 'FAQs' }].find(p => p.key === activePage)?.label}
            </h2>

            {activePage !== 'faq' ? (
              <div>
                <p className="text-xs text-gray-400 mb-2">You can use HTML tags for formatting</p>
                <textarea
                  className="input font-mono text-sm"
                  rows={18}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Enter page content (HTML supported)..."
                />
                {content && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-gray-500 mb-2">Preview:</p>
                    <div
                      className="p-4 bg-gray-50 rounded-xl prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: content }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {faqs.map((faq, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-400">Q{i + 1}</span>
                      <input
                        className="input flex-1 bg-white"
                        placeholder="Question"
                        value={faq.question}
                        onChange={e => setFaqs(fs => fs.map((f, j) => j === i ? { ...f, question: e.target.value } : f))}
                      />
                      <button onClick={() => deleteFaq(i)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <textarea
                      className="input w-full bg-white text-sm"
                      rows={2}
                      placeholder="Answer"
                      value={faq.answer}
                      onChange={e => setFaqs(fs => fs.map((f, j) => j === i ? { ...f, answer: e.target.value } : f))}
                    />
                  </div>
                ))}
                <button className="btn-secondary w-full" onClick={addFaq}>
                  <Plus size={16} /> Add FAQ
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
