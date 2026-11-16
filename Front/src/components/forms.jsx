import { useState } from 'react'
import { api, date } from '../lib/api'
import { useResource } from '../lib/hooks'
import { useSession } from '../lib/session'
import { ErrorBox, Field, FormError, Modal, Spinner } from './ui'

export function SaveForm({
  path,
  method = 'POST',
  onSaved,
  onClose,
  children,
  label = 'Save changes',
  transform,
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        setError(null)
        try {
          const values = Object.fromEntries(new FormData(e.currentTarget))
          const data = await api(path, { method, body: transform ? transform(values) : values })
          await onSaved(data)
        } catch (err) {
          setError(err)
        } finally {
          setBusy(false)
        }
      }}
    >
      <FormError error={error} />
      {children}
      <div className="form-actions">
        <button type="button" className="button secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="button" disabled={busy}>
          {busy ? 'Saving…' : label}
        </button>
      </div>
    </form>
  )
}

export function AnimalForm({ animal, onClose, onSaved }) {
  const { staff, notify, now } = useSession()
  const { data, error, loading, reload } = useResource('/options')
  const [species, setSpecies] = useState(String(animal?.species_id || ''))
  const [breed, setBreed] = useState(String(animal?.breed_id || ''))
  return (
    <Modal
      title={animal ? `A little update for ${animal.name}` : 'Meet your newest companion'}
      subtitle="The start of a healthier, happier story."
      onClose={onClose}
      wide
    >
      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorBox error={error} retry={reload} />
      ) : (
        <SaveForm
          path={animal ? `/animals/${animal.id}` : '/animals'}
          method={animal ? 'PUT' : 'POST'}
          onSaved={(p) => {
            notify(animal ? 'Pet profile updated.' : 'A new little face in the family!')
            onSaved(p)
          }}
          onClose={onClose}
          label={animal ? 'Save pet profile' : 'Register pet'}
          transform={(values) => {
            if (values.species_id === '__custom') delete values.species_id
            if (values.breed_id === '__custom') delete values.breed_id
            return values
          }}
        >
          <div className="form-grid">
            <Field label="Pet’s name">
              <input
                name="name"
                defaultValue={animal?.name}
                required
                maxLength={100}
                placeholder="e.g. Mochi"
              />
            </Field>
            {staff && (
              <Field label="Pet parent">
                <select name="guardian_id" defaultValue={animal?.guardian_id || ''} required>
                  <option value="">Select a pet parent</option>
                  {data.guardians.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} · {g.email}
                    </option>
                  ))}
                </select>
                {!data.guardians.length && (
                  <small>Add a pet parent before registering a patient.</small>
                )}
              </Field>
            )}
            <Field label="Species">
              <select
                name="species_id"
                value={species}
                onChange={(e) => {
                  setSpecies(e.target.value)
                  setBreed('')
                }}
                required
              >
                <option value="">Choose a species</option>
                {data.species.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
                <option value="__custom">Other — specify a species</option>
              </select>
            </Field>
            {species === '__custom' && (
              <Field label="Specify species">
                <input name="custom_species" required maxLength={80} placeholder="e.g. Hedgehog" />
              </Field>
            )}
            <Field label="Breed (optional)">
              <select
                key={species}
                name="breed_id"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
              >
                <option value="">Unspecified / other</option>
                {data.species
                  .find((s) => String(s.id) === species)
                  ?.breeds.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                <option value="__custom">Other — specify a breed</option>
              </select>
            </Field>
            {breed === '__custom' && (
              <Field label="Specify breed">
                <input name="custom_breed" required maxLength={100} placeholder="Breed name" />
              </Field>
            )}
            <Field label="Sex">
              <select name="sex" defaultValue={animal?.sex || 'unknown'}>
                <option value="unknown">Unknown</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </Field>
            <Field label="Date of birth (optional)">
              <input
                name="birth_date"
                type="date"
                max={now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })}
                defaultValue={animal?.birth_date || ''}
              />
            </Field>
            <Field label="Weight in kg (optional)">
              <input
                name="weight_kg"
                type="number"
                step="0.01"
                min="0.01"
                max="99999"
                defaultValue={animal?.weight_kg || ''}
                placeholder="0.00"
              />
            </Field>
            <Field label="Color / markings">
              <input
                name="color"
                maxLength={80}
                defaultValue={animal?.color || ''}
                placeholder="e.g. Golden, white paws"
              />
            </Field>
            <Field label="Microchip number (optional)">
              <input name="microchip" maxLength={40} defaultValue={animal?.microchip || ''} />
            </Field>
          </div>
          <Field label="Profile notes">
            <textarea
              name="notes"
              rows={3}
              maxLength={5000}
              defaultValue={animal?.notes || ''}
              placeholder="Anything that helps us get to know them better."
            />
          </Field>
        </SaveForm>
      )}
    </Modal>
  )
}

export function GuardianForm({ guardian, onClose, onSaved }) {
  const { notify } = useSession()
  return (
    <Modal
      title={guardian ? 'Update pet parent' : 'Welcome a pet parent'}
      subtitle="A friendly face behind every happy pet."
      onClose={onClose}
    >
      <SaveForm
        path={guardian ? `/guardians/${guardian.id}` : '/guardians'}
        method={guardian ? 'PUT' : 'POST'}
        onClose={onClose}
        onSaved={(g) => {
          notify('Pet parent saved.')
          onSaved(g)
        }}
        label="Save pet parent"
        transform={(v) => ({ ...v, email: v.email.toLowerCase() })}
      >
        <Field label="Full name">
          <input name="name" defaultValue={guardian?.name} maxLength={120} required />
        </Field>
        <div className="form-grid">
          <Field label="Email address">
            <input
              name="email"
              type="email"
              defaultValue={guardian?.email}
              maxLength={254}
              required
            />
          </Field>
          <Field label="Phone number">
            <input
              name="phone"
              defaultValue={guardian?.phone || ''}
              maxLength={40}
              placeholder="+63"
            />
          </Field>
        </div>
        <Field label="Address">
          <input name="address" maxLength={500} defaultValue={guardian?.address || ''} />
        </Field>
        <Field label="Clinic notes">
          <textarea name="notes" rows={3} maxLength={5000} defaultValue={guardian?.notes || ''} />
        </Field>
        <p className="form-hint">
          This creates a contact record. Pet parents can create their own portal account separately.
        </p>
      </SaveForm>
    </Modal>
  )
}

export function ClinicalForm({ animal, entry, kind = 'consultation', onClose, onSaved }) {
  const { notify, now } = useSession()
  const [selectedKind, setSelectedKind] = useState(entry?.kind || kind)
  return (
    <Modal
      title={entry ? 'Correct a clinical record' : 'A little more to their story'}
      subtitle="Clinical records remain linked to their original author."
      onClose={onClose}
      wide
    >
      <SaveForm
        path={`/animals/${animal.id}/entries${entry ? `/${entry.id}` : ''}`}
        method={entry ? 'PUT' : 'POST'}
        onSaved={() => {
          notify(entry ? 'Correction saved with an audit trail.' : 'Health record saved.')
          onSaved()
        }}
        onClose={onClose}
        label={entry ? 'Save correction' : 'Add health record'}
      >
        <div className="form-grid">
          <Field label="Record type">
            <select
              name="kind"
              value={selectedKind}
              onChange={(e) => setSelectedKind(e.target.value)}
            >
              <option value="consultation">Medical history</option>
              <option value="vaccination">Vaccination</option>
              <option value="medication">Medication</option>
              <option value="surgery">Surgery</option>
            </select>
          </Field>
          <Field label="Title / procedure / product">
            <input name="title" defaultValue={entry?.title} required maxLength={180} />
          </Field>
          <Field label="Date recorded">
            <input
              name="recorded_on"
              type="date"
              defaultValue={
                entry?.recorded_on || now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
              }
              required
            />
          </Field>
          <Field label="Next due date (optional)">
            <input name="due_on" type="date" defaultValue={entry?.due_on || ''} />
          </Field>
          <Field label="Related visit (optional)">
            <select name="encounter_id" defaultValue={entry?.encounter_id || ''}>
              <option value="">Standalone record</option>
              {animal.encounters?.map((v) => (
                <option key={v.id} value={v.id}>
                  {date(v.seen_on)} · {v.summary}
                </option>
              ))}
            </select>
          </Field>
          {selectedKind === 'vaccination' && (
            <Field label="Batch number">
              <input name="batch_number" maxLength={80} defaultValue={entry?.batch_number || ''} />
            </Field>
          )}
          {selectedKind === 'medication' && (
            <>
              <Field label="Dosage">
                <input name="dosage" maxLength={120} defaultValue={entry?.dosage || ''} />
              </Field>
              <Field label="Frequency">
                <input name="frequency" maxLength={120} defaultValue={entry?.frequency || ''} />
              </Field>
            </>
          )}
        </div>
        <Field label="Findings / diagnosis">
          <textarea
            name="findings"
            rows={3}
            maxLength={5000}
            defaultValue={entry?.findings || ''}
          />
        </Field>
        <Field label="Treatment / instructions">
          <textarea
            name="treatment"
            rows={3}
            maxLength={5000}
            defaultValue={entry?.treatment || ''}
          />
        </Field>
        <Field label="Additional notes">
          <textarea name="notes" rows={2} maxLength={5000} defaultValue={entry?.notes || ''} />
        </Field>
        {entry && (
          <Field label="Reason for correction">
            <input
              name="correction_reason"
              required
              minLength={5}
              maxLength={500}
              placeholder="What changed and why?"
            />
          </Field>
        )}
      </SaveForm>
    </Modal>
  )
}

export function EncounterForm({ animal, onClose, onSaved }) {
  const { notify, now } = useSession()
  const stock = useResource('/inventory?per_page=100&sort=name&direction=asc')
  return (
    <Modal
      title="Record a clinic visit"
      subtitle="Keep the diagnosis, care plan, and supplies together."
      onClose={onClose}
      wide
    >
      <SaveForm
        path={`/animals/${animal.id}/encounters`}
        onClose={onClose}
        onSaved={() => {
          notify('Visit and any supply usage saved together.')
          onSaved()
        }}
        label="Save visit"
        transform={(v) => {
          const { product_id, supply_quantity, ...fields } = v
          return {
            ...fields,
            supplies: product_id ? [{ product_id, quantity: Number(supply_quantity) }] : [],
          }
        }}
      >
        <div className="form-grid">
          <Field label="Visit summary">
            <input
              name="summary"
              required
              maxLength={200}
              placeholder="e.g. Annual wellness check"
            />
          </Field>
          <Field label="Visit date">
            <input
              name="seen_on"
              type="date"
              required
              defaultValue={now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })}
            />
          </Field>
          <Field label="Weight (kg)">
            <input
              name="weight_kg"
              type="number"
              min="0.01"
              step="0.01"
              max="99999"
              defaultValue={animal.weight_kg || ''}
            />
          </Field>
          <Field label="Related appointment (optional)">
            <select name="booking_id">
              <option value="">Unscheduled visit</option>
              {animal.bookings?.map((b) => (
                <option key={b.id} value={b.id}>
                  {date(b.starts_at)} · {b.service}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Diagnosis">
          <textarea name="diagnosis" rows={3} maxLength={5000} />
        </Field>
        <Field label="Care plan">
          <textarea name="plan" rows={3} maxLength={5000} />
        </Field>
        <div className="form-section">
          <h3>Supplies used (optional)</h3>
          <p className="muted">Stock is deducted when the visit is saved.</p>
          <ErrorBox error={stock.error} />
          <div className="form-grid">
            <Field label="Product">
              <select name="product_id">
                <option value="">No stock used</option>
                {stock.data?.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.quantity} {p.unit} available
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Quantity">
              <input name="supply_quantity" type="number" min={1} max={1000000} defaultValue={1} />
            </Field>
          </div>
        </div>
      </SaveForm>
    </Modal>
  )
}
