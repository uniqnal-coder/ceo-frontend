import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'

// A submitted daily report and its attachments. The storage bucket is
// private, so each `[attachment:<path>]` marker is exchanged for a
// short-lived signed URL before the photo shows or the voice note plays.
const URL_RE = /https?:\/\/\S+/g
const ATTACHMENT_RE = /\[attachment:([^\]]+)\]/g
const isImage = (u) => /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u)
const isAudio = (u) => /\.(m4a|aac|mp3|wav|ogg|webm)(\?|$)/i.test(u)

function useSignedUrls(paths) {
  const key = paths.join('|')
  const [urls, setUrls] = useState({})

  useEffect(() => {
    let live = true
    if (!key) {
      setUrls({})
      return undefined
    }
    Promise.all(
      key.split('|').map((p) =>
        api
          .get(`/api/uploads/signed?path=${encodeURIComponent(p)}`)
          .then((d) => [p, d?.url || ''])
          .catch(() => [p, ''])
      )
    ).then((pairs) => live && setUrls(Object.fromEntries(pairs)))
    return () => {
      live = false
    }
  }, [key])

  return urls
}

export function ReportCard({ report }) {
  const text = report.content || ''
  // Attachments come as `[attachment:<storage path>]`; older reports may still
  // carry raw links.
  const paths = useMemo(
    () => [...text.matchAll(ATTACHMENT_RE)].map((m) => m[1].trim()),
    [text]
  )
  const signed = useSignedUrls(paths)

  // Classify by the original name (the signed URL has query params), keeping
  // raw-link attachments from older reports working too.
  const items = [
    ...paths.map((p) => ({ name: p, url: signed[p] })),
    ...(text.match(URL_RE) || []).map((u) => ({ name: u, url: u })),
  ]
  const ready = items.filter((it) => it.url)
  const images = ready.filter((it) => isImage(it.name))
  const audios = ready.filter((it) => isAudio(it.name))
  const files = ready.filter((it) => !isImage(it.name) && !isAudio(it.name))
  const pending = items.length - ready.length
  const prose = text
    .replace(ATTACHMENT_RE, '')
    .replace(URL_RE, '')
    .replace(/^[ \t]*(📷 Image:|🎙 Voice report:)[ \t]*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-slate-500">
          {String(report.date || '').slice(0, 10)}
        </span>
        {report.tasks_total > 0 && (
          <span className="rounded-full bg-white px-2 py-0.5 text-[10.5px] font-semibold text-slate-500">
            {report.tasks_completed}/{report.tasks_total} tasks
          </span>
        )}
      </div>
      {prose && (
        <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-slate-600">{prose}</p>
      )}
      {pending > 0 && (
        <p className="mt-2 text-[11.5px] text-slate-400">Loading {pending} attachment(s)…</p>
      )}
      {images.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {images.map((it) => (
            <a key={it.name} href={it.url} target="_blank" rel="noreferrer">
              <img
                src={it.url}
                alt="Report attachment"
                className="h-20 w-20 rounded-lg border border-slate-200 object-cover hover:opacity-90"
              />
            </a>
          ))}
        </div>
      )}
      {audios.map((it) => (
        <audio key={it.name} controls preload="none" src={it.url} className="mt-2 h-9 w-full" />
      ))}
      {files.map((it) => (
        <a
          key={it.name}
          href={it.url}
          target="_blank"
          rel="noreferrer"
          className="mt-1 block truncate text-[12px] font-semibold text-brand hover:underline"
        >
          📎 {it.name}
        </a>
      ))}
    </div>
  )
}
