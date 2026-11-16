import BulkArchive from '../components/BulkArchive'
import { useState } from 'react'
import {
  Archive,
  ArrowDownLeft,
  ArrowUpRight,
  Edit3,
  History,
  Package,
  Plus,
  RotateCcw,
} from 'lucide-react'
import { api, date, money } from '../lib/api'
import { useSession } from '../lib/session'
import { useDebounce, useResource } from '../lib/hooks'
import { SaveForm } from '../components/forms'
import {
  Badge,
  Confirm,
  Empty,
  ErrorBox,
  Field,
  Modal,
  PageHead,
  Pagination,
  SearchBox,
  Spinner,
} from '../components/ui'

export default function Inventory() {
  const { notify, now } = useSession()
  const [tab, setTab] = useState('products'),
    [page, setPage] = useState(1),
    [search, setSearch] = useState(''),
    [low, setLow] = useState(false)
  const [edit, setEdit] = useState(null),
    [movement, setMovement] = useState(null),
    [confirm, setConfirm] = useState(null)
  const query = useDebounce(search)
  const history = tab === 'history',
    archived = tab === 'archived'
  const { data, error, loading, reload } = useResource(
    history
      ? `/stock-movements?page=${page}`
      : `/inventory?page=${page}&search=${encodeURIComponent(query)}&archived=${Number(archived)}&low_stock=${Number(low)}&sort=name&direction=asc`,
  )
  return (
    <>
      <PageHead
        eyebrow="READY FOR EVERY LITTLE NEED"
        title="The supply cupboard"
        description="Thoughtful stock management, with every movement accounted for."
      >
        <button className="button" onClick={() => setEdit({})}>
          <Plus size={17} /> Add product
        </button>
      </PageHead>
      <section className="panel">
        <div className="list-toolbar">
          <div className="segmented">
            {[
              ['products', 'Products', Package],
              ['history', 'Movement history', History],
              ['archived', 'Archived', Archive],
            ].map(([key, text, Icon]) => (
              <button
                className={tab === key ? 'selected' : ''}
                key={key}
                onClick={() => {
                  setTab(key)
                  setPage(1)
                }}
              >
                <Icon size={14} />
                {text}
              </button>
            ))}
          </div>
          {!history && (
            <div className="toolbar-right">
              <BulkArchive
                records={data?.data}
                resource="inventory"
                archived={archived}
                onSaved={reload}
              />
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={low}
                  onChange={(e) => {
                    setLow(e.target.checked)
                    setPage(1)
                  }}
                />{' '}
                Low stock
              </label>
              <SearchBox
                value={search}
                onChange={(v) => {
                  setSearch(v)
                  setPage(1)
                }}
                placeholder="Search name or SKU…"
              />
            </div>
          )}
        </div>
        <ErrorBox error={error} retry={reload} />
        {loading ? (
          <Spinner />
        ) : data?.data?.length ? (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {history ? (
                      <>
                        <th>Product</th>
                        <th>Movement</th>
                        <th>Quantity</th>
                        <th>Balance</th>
                        <th>Reason / recipient</th>
                        <th>Recorded by</th>
                      </>
                    ) : (
                      <>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Stock on hand</th>
                        <th>Unit price</th>
                        <th>Expiry</th>
                        <th>Actions</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((p) =>
                    history ? (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.product?.name}</strong>
                          <small>{p.product?.sku}</small>
                        </td>
                        <td>
                          <Badge tone={p.type === 'restock' ? 'completed' : 'pending'}>
                            {p.type}
                          </Badge>
                        </td>
                        <td className={p.delta > 0 ? 'positive' : 'negative'}>
                          {p.delta > 0 ? '+' : ''}
                          {p.delta}
                        </td>
                        <td>
                          {p.balance} {p.product?.unit}
                        </td>
                        <td className="reason-cell">
                          {p.reason}
                          {p.encounter_id && <small>Linked to a clinical visit</small>}
                        </td>
                        <td>
                          {p.actor?.name}
                          <small>
                            {date(p.created_at)} ·{' '}
                            {date(p.created_at, { hour: 'numeric', minute: '2-digit' })}
                          </small>
                        </td>
                      </tr>
                    ) : (
                      <tr key={p.id}>
                        <td>
                          <div className="table-person">
                            <span className="product-icon">
                              <Package size={20} />
                            </span>
                            <span>
                              <strong>{p.name}</strong>
                              <small>{p.sku}</small>
                            </span>
                          </div>
                        </td>
                        <td>{p.category}</td>
                        <td>
                          <strong>
                            {p.quantity} <span className="muted">{p.unit}</span>
                          </strong>
                          <small>
                            {p.quantity <= p.reorder_level ? (
                              <span className="negative">
                                Low stock · reorder at {p.reorder_level}
                              </span>
                            ) : (
                              <span className="positive">Stock looks good</span>
                            )}
                          </small>
                        </td>
                        <td>{money(p.unit_price)}</td>
                        <td>
                          {p.expires_on ? (
                            <>
                              <span>{date(p.expires_on)}</span>
                              {p.expires_on <
                                now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }) && (
                                <small className="negative">Expired · issue blocked</small>
                              )}
                            </>
                          ) : (
                            'No expiry recorded'
                          )}
                        </td>
                        <td>
                          <div className="row-actions">
                            {!archived && (
                              <>
                                <button
                                  className="icon-button"
                                  aria-label={`Restock ${p.name}`}
                                  title="Restock"
                                  onClick={() => setMovement({ product: p, type: 'restock' })}
                                >
                                  <ArrowDownLeft size={17} />
                                </button>
                                <button
                                  className="icon-button"
                                  aria-label={`Issue ${p.name}`}
                                  title="Issue stock"
                                  onClick={() => setMovement({ product: p, type: 'issue' })}
                                >
                                  <ArrowUpRight size={17} />
                                </button>
                              </>
                            )}
                            <button
                              className="icon-button"
                              aria-label={`Edit ${p.name}`}
                              onClick={() => setEdit(p)}
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              className="icon-button"
                              aria-label={`${archived ? 'Restore' : 'Archive'} ${p.name}`}
                              onClick={() => setConfirm(p)}
                            >
                              {archived ? <RotateCcw size={16} /> : <Archive size={16} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
            <Pagination meta={data} onPage={setPage} />
          </>
        ) : (
          !error && (
            <Empty
              title={history ? 'Every movement tells a story' : 'A little room on the shelf'}
              text={
                history
                  ? 'Restock and issue entries will appear here. History is preserved with every change.'
                  : 'Add a product to start keeping track of your clinic’s supplies.'
              }
              action={
                !history && (
                  <button className="button secondary" onClick={() => setEdit({})}>
                    <Plus size={16} /> Add product
                  </button>
                )
              }
            />
          )
        )}
      </section>
      <div className="schedule-note">
        <History size={16} />
        <span>
          Quantities change through the stock ledger. Zero stock stays visible; archiving is always
          a separate decision.
        </span>
      </div>
      {edit && (
        <ProductForm
          product={edit.id ? edit : null}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null)
            reload()
          }}
        />
      )}{' '}
      {movement && (
        <Modal
          title={
            movement.type === 'restock'
              ? 'A little top-up for the cupboard'
              : 'Record supplies used'
          }
          subtitle={`${movement.product.name} · ${movement.product.quantity} ${movement.product.unit} available`}
          onClose={() => setMovement(null)}
        >
          <SaveForm
            path={`/inventory/${movement.product.id}/movements`}
            onClose={() => setMovement(null)}
            label={movement.type === 'restock' ? 'Restock product' : 'Issue stock'}
            onSaved={() => {
              notify('Stock and movement history updated.')
              setMovement(null)
              reload()
            }}
          >
            <input name="type" type="hidden" value={movement.type} />
            <Field label="Quantity">
              <input
                name="quantity"
                type="number"
                min={1}
                max={movement.type === 'issue' ? movement.product.quantity : 1000000}
                required
              />
            </Field>
            <Field
              label={
                movement.type === 'issue'
                  ? 'Recipient / reason for use'
                  : 'Restock reference / reason'
              }
            >
              <textarea name="reason" required minLength={3} maxLength={500} rows={3} />
            </Field>
          </SaveForm>
        </Modal>
      )}{' '}
      {confirm && (
        <Confirm
          title={`${archived ? 'Restore' : 'Archive'} ${confirm.name}?`}
          message="Stock quantities and movement history will be preserved. Archived products cannot be restocked or issued until restored."
          label={archived ? 'Restore product' : 'Archive product'}
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            await api(`/inventory/${confirm.id}/archive`, {
              method: 'PATCH',
              body: { archived: !archived },
            })
            notify('Product updated.')
            reload()
          }}
        />
      )}
    </>
  )
}
function ProductForm({ product, onClose, onSaved }) {
  const { notify } = useSession()
  return (
    <Modal
      title={product ? 'Update a cupboard essential' : 'Make room for a new essential'}
      onClose={onClose}
      wide
    >
      <SaveForm
        path={product ? `/inventory/${product.id}` : '/inventory'}
        method={product ? 'PUT' : 'POST'}
        onClose={onClose}
        onSaved={() => {
          notify('Product saved.')
          onSaved()
        }}
        label="Save product"
      >
        <div className="form-grid">
          <Field label="Product name">
            <input name="name" defaultValue={product?.name} required maxLength={140} />
          </Field>
          <Field label="SKU / product code">
            <input name="sku" defaultValue={product?.sku} required maxLength={60} />
          </Field>
          <Field label="Category">
            <input
              name="category"
              defaultValue={product?.category || ''}
              required
              maxLength={60}
              list="product-categories"
            />
            <datalist id="product-categories">
              {['Vaccines', 'Medications', 'Consumables', 'Nutrition', 'Grooming', 'Equipment'].map(
                (s) => (
                  <option key={s} value={s} />
                ),
              )}
            </datalist>
          </Field>
          <Field label="Unit">
            <input
              name="unit"
              defaultValue={product?.unit || 'unit'}
              required
              maxLength={30}
              placeholder="e.g. vial, tablet, bag"
            />
          </Field>
          <Field label="Unit price (PHP)">
            <input
              name="unit_price"
              type="number"
              min={0}
              step="0.01"
              max={9999999999.99}
              defaultValue={product?.unit_price || 0}
              required
            />
          </Field>
          <Field label="Reorder level">
            <input
              name="reorder_level"
              type="number"
              min={0}
              max={1000000}
              defaultValue={product?.reorder_level ?? 5}
              required
            />
          </Field>
          {!product && (
            <Field label="Opening stock">
              <input name="initial_quantity" type="number" min={0} max={1000000} defaultValue={0} />
            </Field>
          )}
          <Field label="Expiry date (optional)">
            <input name="expires_on" type="date" defaultValue={product?.expires_on || ''} />
          </Field>
        </div>
        <Field label="Description">
          <textarea
            name="description"
            rows={3}
            maxLength={3000}
            defaultValue={product?.description || ''}
          />
        </Field>
      </SaveForm>
    </Modal>
  )
}
