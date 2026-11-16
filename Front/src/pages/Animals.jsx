import BulkArchive from '../components/BulkArchive'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Camera,
  ClipboardPlus,
  Edit3,
  Heart,
  ImagePlus,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { api, date } from '../lib/api'
import { useSession } from '../lib/session'
import { useDebounce, useResource } from '../lib/hooks'
import { AnimalForm, ClinicalForm, EncounterForm, SaveForm } from '../components/forms'
import {
  Badge,
  Confirm,
  Empty,
  ErrorBox,
  Field,
  Modal,
  PageHead,
  Pagination,
  PetAvatar,
  SearchBox,
  Spinner,
} from '../components/ui'

export function Animals() {
  const { staff, notify } = useSession()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('search') || '')
  const [page, setPage] = useState(1)
  const [archived, setArchived] = useState(false)
  const [sort, setSort] = useState('created_at')
  const [edit, setEdit] = useState(params.get('new') ? {} : null)
  const [confirm, setConfirm] = useState(null)
  const query = useDebounce(search)
  const { data, error, loading, reload } = useResource(
    `/animals?search=${encodeURIComponent(query)}&page=${page}&archived=${archived ? 1 : 0}&sort=${sort}&direction=${sort === 'name' ? 'asc' : 'desc'}`,
  )
  const close = () => {
    setEdit(null)
    setParams({})
  }
  return (
    <>
      <PageHead
        eyebrow={
          staff ? 'EVERY PATIENT, A LITTLE PERSONALITY' : 'THE ONES WHO MAKE YOUR HOUSE A HOME'
        }
        title={staff ? 'Our patients' : 'My companions'}
        description="Their stories, their milestones, their care. All together."
      >
        <button className="button" onClick={() => setEdit({})}>
          <Plus size={17} /> Register a pet
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
              Active patients
            </button>
            {staff && (
              <button
                className={archived ? 'selected' : ''}
                onClick={() => {
                  setArchived(true)
                  setPage(1)
                }}
              >
                <Archive size={14} /> Archived
              </button>
            )}
          </div>
          <div className="toolbar-right">
            {staff && (
              <BulkArchive
                records={data?.data}
                resource="animals"
                archived={archived}
                onSaved={reload}
              />
            )}
            <SearchBox
              value={search}
              onChange={(v) => {
                setSearch(v)
                setPage(1)
              }}
              placeholder="Find a little friend…"
            />
            <select
              aria-label="Sort pets"
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
            <div className="pet-grid">
              {data.data.map((p) => (
                <article className="pet-card" key={p.id}>
                  <div className="pet-card-top">
                    <PetAvatar animal={p} size="large" />
                    <Badge tone={p.archived_at ? 'cancelled' : 'active'}>
                      {p.archived_at ? 'Archived' : 'Active'}
                    </Badge>
                  </div>
                  <Link to={`/app/pets/${p.id}`}>
                    <h2>{p.name}</h2>
                    <p>
                      {p.breed?.name || 'Unspecified breed'} <span>·</span> {p.species?.name}
                    </p>
                  </Link>
                  <div className="pet-card-details">
                    <span>
                      Pet parent<strong>{p.guardian?.name}</strong>
                    </span>
                    <span>
                      Sex<strong>{p.sex}</strong>
                    </span>
                    <span>
                      Weight<strong>{p.weight_kg ? `${p.weight_kg} kg` : 'Not recorded'}</strong>
                    </span>
                    <span>
                      Born<strong>{date(p.birth_date)}</strong>
                    </span>
                  </div>
                  <div className="pet-card-bottom">
                    <Link className="text-button" to={`/app/pets/${p.id}`}>
                      Meet {p.name}
                      <ArrowRight size={15} />
                    </Link>
                    {staff && (
                      <button
                        className="icon-button"
                        aria-label={`${archived ? 'Restore' : 'Archive'} ${p.name}`}
                        onClick={() => setConfirm(p)}
                      >
                        {archived ? <RotateCcw size={17} /> : <Archive size={17} />}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
            <Pagination meta={data} onPage={setPage} />
          </>
        ) : (
          !error && (
            <Empty
              title={
                search
                  ? 'No little faces found'
                  : archived
                    ? 'No archived patients'
                    : 'A new care journey starts here'
              }
              text={
                search
                  ? 'Try a different name.'
                  : 'Register a pet to keep their health story together.'
              }
              action={
                !archived && (
                  <button className="button secondary" onClick={() => setEdit({})}>
                    <Plus size={16} /> Register a pet
                  </button>
                )
              }
            />
          )
        )}
      </section>
      {edit && (
        <AnimalForm
          onClose={close}
          onSaved={() => {
            close()
            reload()
          }}
        />
      )}{' '}
      {confirm && (
        <Confirm
          title={`${archived ? 'Restore' : 'Archive'} ${confirm.name}?`}
          message={
            archived
              ? 'This pet will return to the active list.'
              : 'Their health records will be preserved. Staff can restore the profile from the archive.'
          }
          label={archived ? 'Restore pet' : 'Archive pet'}
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            await api(`/animals/${confirm.id}/archive`, {
              method: 'PATCH',
              body: { archived: !archived },
            })
            notify('Pet profile updated.')
            reload()
          }}
        />
      )}
    </>
  )
}

export function AnimalDetail() {
  const { id } = useParams()
  const { staff, clinician, notify } = useSession()
  const { data: p, error, loading, reload } = useResource(`/animals/${id}`)
  const [tab, setTab] = useState('overview')
  const [modal, setModal] = useState(null)
  const [entry, setEntry] = useState(null)
  if (loading) return <Spinner />
  if (error) return <ErrorBox error={error} retry={reload} />
  const close = () => {
    setModal(null)
    setEntry(null)
  }
  const saved = () => {
    close()
    reload()
  }
  const tabs = [
    ['overview', 'Overview'],
    ['visits', 'Clinic visits'],
    ['consultation', 'Medical history'],
    ['vaccination', 'Vaccinations'],
    ['medication', 'Medications'],
    ['surgery', 'Surgery'],
    ['gallery', 'Gallery'],
  ]
  const entries = p.entries?.filter((e) => e.kind === tab) || []
  return (
    <>
      <Link className="back-link" to="/app/pets">
        <ArrowLeft size={16} /> Back to {staff ? 'patients' : 'my pets'}
      </Link>
      <section className="pet-profile panel">
        <div className="pet-profile-main">
          <div className="profile-photo">
            <PetAvatar animal={p} size="large" />
            {!p.archived_at && (
              <button
                className="photo-edit"
                aria-label="Change profile photo"
                onClick={() => setModal('photo')}
              >
                <Camera size={14} />
              </button>
            )}
          </div>
          <div>
            <p className="eyebrow">ONE VERY GOOD {p.species?.name?.toUpperCase() || 'COMPANION'}</p>
            <h1>
              {p.name} <Heart size={23} />
            </h1>
            <p>
              {p.breed?.name || p.species?.name} <span>·</span> {p.sex} <span>·</span>{' '}
              {p.weight_kg ? `${p.weight_kg} kg` : 'Weight not recorded'}
            </p>
            <small>Pet parent: {p.guardian?.name}</small>
          </div>
        </div>
        <div className="profile-actions">
          <Badge tone={p.archived_at ? 'cancelled' : 'active'}>
            {p.archived_at ? 'Archived' : 'Active patient'}
          </Badge>
          {!p.archived_at && (
            <button className="button secondary" onClick={() => setModal('edit')}>
              <Edit3 size={16} /> Edit profile
            </button>
          )}
        </div>
      </section>
      <div className="tabs" role="tablist">
        {tabs.map(([key, name]) => (
          <button
            role="tab"
            aria-selected={tab === key}
            key={key}
            onClick={() => setTab(key)}
            className={tab === key ? 'selected' : ''}
          >
            {name}
            {key === 'vaccination' && (
              <span>{p.entries.filter((e) => e.kind === key && !e.voided_at).length}</span>
            )}
          </button>
        ))}
      </div>
      {tab === 'overview' ? (
        <div className="profile-grid">
          <section className="panel info-panel">
            <div className="panel-heading">
              <h2>A little about {p.name}</h2>
            </div>
            <dl className="details-grid">
              <div>
                <dt>Date of birth</dt>
                <dd>{date(p.birth_date)}</dd>
              </div>
              <div>
                <dt>Species</dt>
                <dd>{p.species?.name}</dd>
              </div>
              <div>
                <dt>Microchip</dt>
                <dd>{p.microchip || 'Not recorded'}</dd>
              </div>
              <div>
                <dt>Color / markings</dt>
                <dd>{p.color || 'Not recorded'}</dd>
              </div>
              <div>
                <dt>Registered</dt>
                <dd>{date(p.created_at)}</dd>
              </div>
              <div>
                <dt>Patient reference</dt>
                <dd title={p.id}>PF-{p.id.slice(-8)}</dd>
              </div>
            </dl>
            {p.notes && (
              <div className="profile-notes">
                <h3>Getting to know them</h3>
                <p>{p.notes}</p>
              </div>
            )}
          </section>
          <section className="panel info-panel">
            <div className="panel-heading">
              <h2>Care, at a glance</h2>
              <ShieldCheck size={21} />
            </div>
            <div className="health-summary">
              <span>
                <strong>{p.encounters.length}</strong>Clinic visits
              </span>
              <span>
                <strong>
                  {p.entries.filter((e) => e.kind === 'vaccination' && !e.voided_at).length}
                </strong>
                Vaccinations
              </span>
              <span>
                <strong>{p.entries.filter((e) => !e.voided_at).length}</strong>Health records
              </span>
            </div>
            <div className="care-note">
              <Heart size={17} />
              <span>Records are maintained by your clinic’s care team.</span>
            </div>
            {clinician && !p.archived_at && (
              <button className="button full" onClick={() => setModal('visit')}>
                <ClipboardPlus size={17} /> Record a clinic visit
              </button>
            )}
            <Link className="button secondary full" to={`/app/appointments?new=1&pet=${p.id}`}>
              <CalendarDays size={17} /> Plan their next visit
            </Link>
          </section>
        </div>
      ) : tab === 'gallery' ? (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Little moments, big memories</h2>
              <p>Photos from their care journey</p>
            </div>
            {!p.archived_at && (
              <button className="button secondary" onClick={() => setModal('gallery')}>
                <ImagePlus size={16} /> Add a photo
              </button>
            )}
          </div>
          {p.media.length ? (
            <div className="gallery-grid">
              {p.media.map((image) => (
                <figure key={image.id}>
                  <a href={image.url} target="_blank" rel="noreferrer">
                    <img
                      src={image.url}
                      alt={image.caption || `${p.name} gallery photo`}
                      loading="lazy"
                    />
                  </a>
                  <figcaption>
                    <span>{image.caption || date(image.created_at)}</span>
                    {!p.archived_at && (
                      <button
                        className="icon-button"
                        aria-label="Remove photo"
                        onClick={() => {
                          setEntry(image)
                          setModal('delete-photo')
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <Empty title="Save a little memory" text="Upload a photo to begin their gallery." />
          )}
        </section>
      ) : tab === 'visits' ? (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Every visit, connected</h2>
              <p>Diagnosis, treatment, and care plans</p>
            </div>
            {clinician && !p.archived_at && (
              <button className="button" onClick={() => setModal('visit')}>
                <Plus size={16} /> Record visit
              </button>
            )}
          </div>
          {p.encounters.length ? (
            <div className="record-list">
              {p.encounters.map((v) => (
                <article className="clinical-card" key={v.id}>
                  <div className="clinical-heading">
                    <span className="record-icon">
                      <ClipboardPlus size={20} />
                    </span>
                    <div>
                      <h3>{v.summary}</h3>
                      <small>
                        {date(v.seen_on)} · {v.author?.name}
                        {v.weight_kg ? ` · ${v.weight_kg} kg` : ''}
                      </small>
                    </div>
                    <Badge tone="completed">Recorded</Badge>
                  </div>
                  <div className="clinical-content">
                    {v.diagnosis && (
                      <div>
                        <strong>Diagnosis</strong>
                        <p>{v.diagnosis}</p>
                      </div>
                    )}
                    {v.plan && (
                      <div>
                        <strong>Care plan</strong>
                        <p>{v.plan}</p>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty
              title="Ready for their first visit"
              text="Clinic visits and care plans will appear here."
            />
          )}
        </section>
      ) : (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>{tabs.find(([key]) => key === tab)?.[1]}</h2>
              <p>A careful record of every step forward</p>
            </div>
            {clinician && !p.archived_at && (
              <button className="button" onClick={() => setModal('clinical')}>
                <Plus size={16} /> Add record
              </button>
            )}
          </div>
          {entries.length ? (
            <div className="record-list">
              {entries.map((e) => (
                <article className={`clinical-card ${e.voided_at ? 'voided' : ''}`} key={e.id}>
                  <div className="clinical-heading">
                    <span className="record-icon">
                      <ShieldCheck size={20} />
                    </span>
                    <div>
                      <h3>{e.title}</h3>
                      <small>
                        {date(e.recorded_on)} · Recorded by {e.author?.name}
                      </small>
                    </div>
                    {e.voided_at ? (
                      <Badge tone="cancelled">Voided</Badge>
                    ) : e.due_on ? (
                      <Badge tone="pending">Next due {date(e.due_on)}</Badge>
                    ) : (
                      <Badge tone="completed">Recorded</Badge>
                    )}
                    {clinician && !p.archived_at && !e.voided_at && (
                      <div className="row-actions">
                        <button
                          className="icon-button"
                          aria-label="Correct record"
                          onClick={() => {
                            setEntry(e)
                            setModal('clinical')
                          }}
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label="Void record"
                          onClick={() => {
                            setEntry(e)
                            setModal('void')
                          }}
                        >
                          <Archive size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="clinical-content">
                    {[
                      ['findings', 'Findings'],
                      ['treatment', 'Treatment'],
                      ['dosage', 'Dosage'],
                      ['frequency', 'Frequency'],
                      ['batch_number', 'Batch number'],
                      ['notes', 'Notes'],
                      ['void_reason', 'Reason for voiding'],
                    ].map(
                      ([key, label]) =>
                        e[key] && (
                          <div key={key}>
                            <strong>{label}</strong>
                            <p>{e[key]}</p>
                          </div>
                        ),
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty
              title="A healthy story is taking shape"
              text="Records added by your care team will appear here."
            />
          )}
        </section>
      )}
      {modal === 'edit' && <AnimalForm animal={p} onClose={close} onSaved={saved} />}
      {modal === 'clinical' && (
        <ClinicalForm animal={p} entry={entry} kind={tab} onClose={close} onSaved={saved} />
      )}
      {modal === 'visit' && <EncounterForm animal={p} onClose={close} onSaved={saved} />}
      {(modal === 'photo' || modal === 'gallery') && (
        <PhotoForm animal={p} gallery={modal === 'gallery'} onClose={close} onSaved={saved} />
      )}
      {modal === 'delete-photo' && (
        <Confirm
          title="Remove this photo?"
          message="The image will be removed from the gallery and storage."
          label="Remove photo"
          onClose={close}
          onConfirm={async () => {
            await api(`/animals/${p.id}/media/${entry.id}`, { method: 'DELETE' })
            notify('Photo removed.')
            reload()
          }}
        />
      )}
      {modal === 'void' && (
        <Modal
          title="Void this record"
          subtitle="The original record is preserved for accountability."
          onClose={close}
        >
          <SaveForm
            path={`/animals/${p.id}/entries/${entry.id}/void`}
            method="PATCH"
            onClose={close}
            onSaved={() => {
              notify('Record voided and retained in history.')
              saved()
            }}
            label="Void record"
          >
            <Field label="Reason">
              <textarea name="reason" required minLength={5} maxLength={500} rows={3} />
            </Field>
          </SaveForm>
        </Modal>
      )}
    </>
  )
}

function PhotoForm({ animal, gallery, onClose, onSaved }) {
  const { notify } = useSession()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  return (
    <Modal
      title={gallery ? 'A moment worth keeping' : 'Give their profile a face'}
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          try {
            await api(`/animals/${animal.id}/${gallery ? 'media' : 'photo'}`, {
              method: 'POST',
              body: new FormData(e.currentTarget),
            })
            notify('Photo uploaded.')
            onSaved()
          } catch (err) {
            setError(err)
          } finally {
            setBusy(false)
          }
        }}
      >
        <ErrorBox error={error} />
        <Field label="Choose a photo" hint="JPEG, PNG, or WebP. Up to 5 MB.">
          <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required />
        </Field>
        {gallery && (
          <Field label="Caption (optional)">
            <input name="caption" maxLength={180} placeholder="A little story behind the photo" />
          </Field>
        )}
        <div className="form-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button" disabled={busy}>
            {busy ? 'Uploading…' : 'Save photo'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
