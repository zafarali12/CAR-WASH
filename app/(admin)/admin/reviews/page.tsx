// app/(admin)/admin/reviews/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Star, Flag, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminReviews() {
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [ratingFilter, setRatingFilter] = useState(0)
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [respondId, setRespondId] = useState<string | null>(null)
  const [response, setResponse] = useState('')

  const supabase = createClient()

  useEffect(() => { fetchReviews() }, [ratingFilter, flaggedOnly])

  async function fetchReviews() {
    setLoading(true)
    let query = supabase
      .from('reviews')
      .select(`
        id, rating, comment, is_flagged, flag_reason, admin_response, created_at,
        customers(name),
        drivers(name),
        bookings(services(name))
      `)
      .order('created_at', { ascending: false })

    if (ratingFilter > 0) query = query.eq('rating', ratingFilter)
    if (flaggedOnly) query = query.eq('is_flagged', true)

    const { data } = await query
    setReviews(data || [])
    setLoading(false)
  }

  async function flagReview(id: string, isFlagged: boolean) {
    await supabase.from('reviews').update({ is_flagged: !isFlagged }).eq('id', id)
    setReviews(rs => rs.map(r => r.id === id ? { ...r, is_flagged: !isFlagged } : r))
    toast.success(isFlagged ? 'Review unflagged' : 'Review flagged')
  }

  async function submitResponse() {
    if (!response.trim() || !respondId) return
    await supabase.from('reviews').update({ admin_response: response }).eq('id', respondId)
    setReviews(rs => rs.map(r => r.id === respondId ? { ...r, admin_response: response } : r))
    toast.success('Response submitted')
    setRespondId(null)
    setResponse('')
  }

  function renderStars(rating: number) {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} size={14} className={i < rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />
    ))
  }

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '—'

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Reviews</h1>
        <div className="flex items-center gap-1">
          <Star size={18} className="text-amber-400 fill-amber-400" />
          <span className="text-lg font-semibold">{avgRating}</span>
          <span className="text-sm text-gray-400">({reviews.length})</span>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-500 mr-1">Rating:</span>
            {[0, 5, 4, 3, 2, 1].map(r => (
              <button
                key={r}
                onClick={() => setRatingFilter(r)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                  ratingFilter === r ? 'bg-primary-50 text-primary-700 border border-primary-200' : 'bg-gray-50 text-gray-500 border border-gray-100'
                }`}
              >
                {r === 0 ? 'All' : r}
              </button>
            ))}
          </div>
          <button
            onClick={() => setFlaggedOnly(!flaggedOnly)}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-all ${
              flaggedOnly ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-500 border-gray-100'
            }`}
          >
            <Flag size={14} /> Flagged Only
          </button>
        </div>
      </div>

      {/* Reviews */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.id} className={`card p-4 ${r.is_flagged ? 'border-red-100' : ''}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{r.customers?.name || 'Unknown'}</span>
                    <span className="text-xs text-gray-400">→</span>
                    <span className="text-sm text-gray-600">{r.drivers?.name || 'Unknown Driver'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {renderStars(r.rating)}
                    <span className="text-xs text-gray-400 ml-1">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.is_flagged && <span className="badge-cancelled text-xs flex items-center gap-1"><Flag size={10} /> Flagged</span>}
                  <button
                    onClick={() => flagReview(r.id, r.is_flagged)}
                    className={`text-xs px-2 py-1 rounded-lg border transition-all ${
                      r.is_flagged ? 'border-gray-200 text-gray-500' : 'border-red-100 text-red-400 hover:bg-red-50'
                    }`}
                  >
                    <Flag size={12} />
                  </button>
                </div>
              </div>

              {r.bookings?.services?.name && (
                <p className="text-xs text-gray-400 mb-2">Service: {r.bookings.services.name}</p>
              )}

              {r.comment && (
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 mb-3">"{r.comment}"</p>
              )}

              {r.admin_response && (
                <div className="bg-primary-50 rounded-lg p-3 text-sm">
                  <p className="text-xs font-medium text-primary-600 mb-1">Admin Response:</p>
                  <p className="text-gray-700">{r.admin_response}</p>
                </div>
              )}

              {!r.admin_response && respondId !== r.id && (
                <button
                  onClick={() => setRespondId(r.id)}
                  className="btn-secondary text-xs mt-1 gap-1"
                >
                  <MessageSquare size={12} /> Respond
                </button>
              )}

              {respondId === r.id && (
                <div className="mt-3">
                  <textarea
                    className="input text-sm"
                    rows={2}
                    placeholder="Write your response..."
                    value={response}
                    onChange={e => setResponse(e.target.value)}
                  />
                  <div className="flex gap-2 mt-2">
                    <button className="btn-secondary text-xs" onClick={() => setRespondId(null)}>Cancel</button>
                    <button className="btn-primary text-xs" onClick={submitResponse}>Submit Response</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
