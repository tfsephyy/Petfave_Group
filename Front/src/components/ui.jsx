import { Children, cloneElement, isValidElement, useEffect, useId, useRef, useState } from 'react'
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  PawPrint,
  Search,
  X,
} from 'lucide-react'

export function Logo({ compact = false }) {
  return (
    <span className="brand">
      <span className="brand-icon">
        <PawPrint size={23} strokeWidth={2.4} />
      </span>
      {!compact && (
        <span>
          PetFave<span className="brand-dot">.</span>
        </span>
      )}
    </span>
  )
}
export function Spinner() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={26} />
      <span>Getting things ready…</span>
    </div>
  )
}
export function Empty({
  title = 'A fresh start',
  text = 'Your records will appear here.',
  action,
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <PawPrint size={30} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  )
}
export function ErrorBox({ error, retry }) {
  if (!error) return null
  return (
    <div className="error-box" role="alert">
      <AlertCircle size={18} />
      <div>
        {typeof error === 'string' ? error : error.message}
        {retry && (
          <button className="text-button" onClick={retry}>
            Try again
          </button>
        )}
      </div>
    </div>
  )
}
export function Badge({ children, tone }) {
  return (
    <span className={`badge ${tone || String(children).toLowerCase().replaceAll(' ', '_')}`}>
      {String(children).replaceAll('_', ' ')}
    </span>
  )
}
export function Field({ label, error, children, hint }) {
  const id = useId()
  const connect = (nodes) =>
    Children.map(nodes, (child) => {
      if (!isValidElement(child)) return child
      if (['input', 'select', 'textarea'].includes(child.type))
        return cloneElement(child, {
          id,
          'aria-describedby': hint ? `${id}-hint` : undefined,
          'aria-invalid': !!error,
        })
      return child.props.children ? cloneElement(child, {}, connect(child.props.children)) : child
    })
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {connect(children)}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
      {error && <small className="field-error">{Array.isArray(error) ? error[0] : error}</small>}
    </div>
  )
}
export function FormError({ error }) {
  return (
    <ErrorBox error={error && (Object.values(error.errors || {}).flat()[0] || error.message)} />
  )
}
export function PageHead({ eyebrow, title, description, children }) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      <div className="page-actions">{children}</div>
    </div>
  )
}
export function SearchBox({ value, onChange, placeholder = 'Search records…' }) {
  return (
    <div className="search-box">
      <Search size={18} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button aria-label="Clear search" onClick={() => onChange('')}>
          <X size={15} />
        </button>
      )}
    </div>
  )
}
export function Pagination({ meta, onPage }) {
  if (!meta?.total) return null
  return (
    <div className="pagination">
      <span>
        Showing {(meta.current_page - 1) * meta.per_page + 1}–
        {Math.min(meta.current_page * meta.per_page, meta.total)} of {meta.total}
      </span>
      <div>
        <button
          disabled={meta.current_page === 1}
          onClick={() => onPage(meta.current_page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={17} />
        </button>
        <span>
          {meta.current_page} / {meta.last_page}
        </span>
        <button
          disabled={meta.current_page === meta.last_page}
          onClick={() => onPage(meta.current_page + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  )
}
export function Modal({ title, subtitle, children, onClose, wide = false }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    dialog.showModal()
    return () => dialog.close()
  }, [])
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'wide' : ''}`}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  )
}
export function Confirm({
  title,
  message,
  onConfirm,
  onClose,
  label = 'Confirm',
  cancelLabel = 'Keep record',
  busyLabel = 'Saving…',
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const close = () => {
    if (!busy) onClose()
  }
  return (
    <Modal title={title} onClose={close}>
      <p className="muted">{message}</p>
      <FormError error={error} />
      <div className="form-actions">
        <button className="button secondary" disabled={busy} onClick={close}>
          {cancelLabel}
        </button>
        <button
          className="button danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              await onConfirm()
              onClose()
            } catch (err) {
              setError(err)
            } finally {
              setBusy(false)
            }
          }}
        >
          {busy ? busyLabel : label}
        </button>
      </div>
    </Modal>
  )
}
export function PetAvatar({ animal, size = '' }) {
  return (
    <span className={`pet-avatar ${size} ${animal?.species?.name?.toLowerCase() || ''}`}>
      {animal?.photo_url ? (
        <img src={animal.photo_url} alt={animal.name} />
      ) : (
        <PawPrint size={size === 'large' ? 36 : 21} />
      )}
    </span>
  )
}
