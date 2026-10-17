import { useEffect, type ReactNode } from 'react'

export function Modal({ title, children, footer, onClose }: {
  title: string
  children: ReactNode
  footer: ReactNode
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div className="modal d-block" role="dialog" onClick={onClose}>
        <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
            </div>
            <div className="modal-body">{children}</div>
            <div className="modal-footer justify-content-between">{footer}</div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  )
}
