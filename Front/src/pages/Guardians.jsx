import BulkArchive from '../components/BulkArchive'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Archive,
  ArrowRight,
  Edit3,
  Mail,
  MapPin,
  Phone,
  Plus,
  RotateCcw,
  Users,
} from 'lucide-react'
import { api, date } from '../lib/api'
import { useSession } from '../lib/session'
import { useDebounce, useResource } from '../lib/hooks'
import { GuardianForm } from '../components/forms'
import {
  Badge,
  Confirm,
  Empty,
  ErrorBox,
  Modal,
  PageHead,
  Pagination,
  PetAvatar,
  SearchBox,
  Spinner,
} from '../components/ui'

export default function Guardians() {
  const { notify } = useSession()
  const [search, setSearch] = useState(''),
    [page, setPage] = useState(1),
    [archived, setArchived] = useState(false)
  const [sort, setSort] = useState('created_at'),
    [edit, setEdit] = useState(null),
    [view, setView] = useState(null),
    [confirm, setConfirm] = useState(null)
  const query = useDebounce(search)
  const { data, error, loading, reload } = useResource(
    `/guardians?search=${encodeURIComponent(query)}&page=${page}&archived=${Number(archived)}&sort=${sort}&direction=${sort === 'name' ? 'asc' : 'desc'}`,
  )
  return (
    <>
      <PageHead
        eyebrow="GOOD PEOPLE. VERY GOOD PETS."
        title="Our pet parents"
        description="The families behind every familiar face."
      >
        <button className="button" onClick={() => setEdit({})}>
          <Plus size={17} /> Add pet parent
        </button>
      </PageHead>
      <section className="panel">
        <div className="list-toolbar">
          <div className="segmented">
            <button
              className={!archived ? 'selected' : ''}
              onClick={() => {
                setArchived(false)
                setPage(1)
              }}
            >
              Active families
            </button>
            <button
              className={archived ? 'selected' : ''}
              onClick={() => {
                setArchived(true)
                setPage(1)
              }}
            >
              Archived
            </button>
          </div>
          <div className="toolbar-right">
            <BulkArchive
              records={data?.data}
              resource="guardians"
              archived={archived}
              onSaved={reload}
            />
            <SearchBox
              value={search}
              onChange={(v) => {
                setSearch(v)
                setPage(1)
              }}
              placeholder="Search pet parents…"
            />
            <select
              aria-label="Sort pet parents"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value)
                setPage(1)
              }}
            >
              <option value="created_at">Newest first</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
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
                    <th>Pet parent</th>
                    <th>Contact</th>
                    <th>Pets</th>
                    <th>Portal</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((g) => (
                    <tr key={g.id}>
                      <td>
                        <button className="table-person table-link" onClick={() => setView(g.id)}>
                          <span className="owner-avatar">
                            {g.name
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')}
                          </span>
                          <span>
                            <strong>{g.name}</strong>
                            <small>PF-{g.id.slice(-8)}</small>
                          </span>
                        </button>
                      </td>
                      <td>
                        <span>{g.email}</span>
                        <small>{g.phone || 'No phone recorded'}</small>
                      </td>
                      <td>
                        <span className="pet-count">
                          {g.animals_count} {g.animals_count === 1 ? 'pet' : 'pets'}
                        </span>
                      </td>
                      <td>
                        <Badge tone={g.account_id ? 'active' : 'neutral'}>
                          {g.account_id ? 'Connected' : 'Contact only'}
                        </Badge>
                      </td>
                      <td>{date(g.created_at)}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-button"
                            aria-label={`Edit ${g.name}`}
                            onClick={() => setEdit(g)}
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`${archived ? 'Restore' : 'Archive'} ${g.name}`}
                            onClick={() => setConfirm(g)}
                          >
                            {archived ? <RotateCcw size={16} /> : <Archive size={16} />}
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`View ${g.name}`}
                            onClick={() => setView(g.id)}
                          >
                            <ArrowRight size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={data} onPage={setPage} />
          </>
        ) : (
          !error && (
            <Empty
              title={search ? 'No families found' : 'Room for a growing family'}
              text="Add a pet parent’s contact details to get started."
              action={
                <button className="button secondary" onClick={() => setEdit({})}>
                  <Users size={16} /> Add pet parent
                </button>
              }
            />
          )
        )}
      </section>
      {edit && (
        <GuardianForm
          guardian={edit.id ? edit : null}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null)
            reload()
          }}
        />
      )}{' '}
      {view && <GuardianDetail id={view} onClose={() => setView(null)} />}{' '}
      {confirm && (
        <Confirm
          title={`${archived ? 'Restore' : 'Archive'} ${confirm.name}?`}
          message={
            archived
              ? 'The contact will return to the active pet parent list.'
              : 'Their contact and pet records will be preserved. Existing pets and appointments remain available; archiving does not disable their account.'
          }
          label={archived ? 'Restore contact' : 'Archive contact'}
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            await api(`/guardians/${confirm.id}/archive`, {
              method: 'PATCH',
              body: { archived: !archived },
            })
            notify('Pet parent updated.')
            reload()
          }}
        />
      )}
    </>
  )
}
function GuardianDetail({ id, onClose }) {
  const { data: g, error, loading, reload } = useResource(`/guardians/${id}`)
  return (
    <Modal title={g?.name || 'Pet parent'} onClose={onClose} wide>
      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorBox error={error} retry={reload} />
      ) : (
        <>
          <div className="contact-details">
            <p>
              <Mail size={17} />
              {g.email}
            </p>
            <p>
              <Phone size={17} />
              {g.phone || 'No phone recorded'}
            </p>
            <p>
              <MapPin size={17} />
              {g.address || 'No address recorded'}
            </p>
          </div>
          {g.notes && (
            <div className="profile-notes">
              <h3>Clinic notes</h3>
              <p>{g.notes}</p>
            </div>
          )}
          <h3 className="section-label">Their little family</h3>
          {g.animals.length ? (
            <div className="guardian-pets">
              {g.animals.map((p) => (
                <Link to={`/app/pets/${p.id}`} className="recent-pet" key={p.id}>
                  <PetAvatar animal={p} />
                  <div>
                    <strong>{p.name}</strong>
                    <small>{p.breed?.name || p.species?.name}</small>
                  </div>
                  {p.archived_at && <Badge tone="cancelled">Archived</Badge>}
                  <ArrowRight size={16} />
                </Link>
              ))}
            </div>
          ) : (
            <Empty title="A story yet to begin" text="Registered pets will appear here." />
          )}
        </>
      )}
    </Modal>
  )
}
