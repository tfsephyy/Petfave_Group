import { useState } from 'react'
import { Archive, CheckSquare, RotateCcw } from 'lucide-react'
import { api } from '../lib/api'
import { useSession } from '../lib/session'
import { FormError, Modal } from './ui'

export default function BulkArchive({ records = [], resource, archived, onSaved }) {
  const { notify } = useSession()
  const [open, setOpen] = useState(false),
    [selected, setSelected] = useState([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null)
  if (!records.length) return null
  return (
    <>
      <button
        className="button secondary small"
        onClick={() => {
          setSelected([])
          setError(null)
          setOpen(true)
        }}
      >
        <CheckSquare size={14} /> Select records
      </button>
      {open && (
        <Modal
          title={`${archived ? 'Restore' : 'Archive'} selected records`}
          subtitle="Select records from this page. Their history will be preserved."
          onClose={() => setOpen(false)}
        >
          <FormError error={error} />
          <label className="bulk-check">
            <input
              type="checkbox"
              checked={selected.length === records.length}
              onChange={(e) => setSelected(e.target.checked ? records.map((r) => r.id) : [])}
            />
            <strong>Select all on this page</strong>
          </label>
          <div className="bulk-list">
            {records.map((record) => (
              <label className="bulk-check" key={record.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(record.id)}
                  onChange={(e) =>
                    setSelected((ids) =>
                      e.target.checked ? [...ids, record.id] : ids.filter((id) => id !== record.id),
                    )
                  }
                />
                {record.name}
              </label>
            ))}
          </div>
          <div className="form-actions">
            <button className="button secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              className="button"
              disabled={busy || !selected.length}
              onClick={async () => {
                setBusy(true)
                try {
                  await api('/archive-batch', {
                    method: 'POST',
                    body: { resource, ids: selected, archived: !archived },
                  })
                  notify(`${selected.length} records ${archived ? 'restored' : 'archived'}.`)
                  setOpen(false)
                  onSaved()
                } catch (err) {
                  setError(err)
                } finally {
                  setBusy(false)
                }
              }}
            >
              {archived ? <RotateCcw size={16} /> : <Archive size={16} />}{' '}
              {busy ? 'Saving…' : `${archived ? 'Restore' : 'Archive'} ${selected.length} selected`}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
