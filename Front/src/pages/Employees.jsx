import { useState } from 'react'
import { Copy, Edit3, KeyRound, Plus, UserCheck, UserX } from 'lucide-react'
import { api, date } from '../lib/api'
import { useDebounce, useResource } from '../lib/hooks'
import { useSession } from '../lib/session'
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

export default function Employees() {
  const { notify } = useSession()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('created_at')
  const [page, setPage] = useState(1)
  const [edit, setEdit] = useState(null)
  const [confirmation, setConfirmation] = useState(null)
  const [credentials, setCredentials] = useState(null)
  const query = useDebounce(search)
  const { data, error, loading, reload } = useResource(
    `/employees?search=${encodeURIComponent(query)}&status=${status}&sort=${sort}&direction=${sort === 'name' ? 'asc' : 'desc'}&page=${page}`,
  )

  return (
    <>
      <PageHead
        eyebrow="YOUR CLINIC TEAM"
        title="Employees"
        description="Create employee accounts and manage their sign-in access."
      >
        <button className="button" onClick={() => setEdit({})}>
          <Plus size={17} /> Add employee
        </button>
      </PageHead>
      <section className="panel">
        <div className="list-toolbar">
          <div className="segmented" role="group" aria-label="Employee status">
            {['all', 'active', 'disabled'].map((value) => (
              <button
                key={value}
                className={status === value ? 'selected' : ''}
                aria-pressed={status === value}
                onClick={() => {
                  setStatus(value)
                  setPage(1)
                }}
              >
                {{ all: 'All employees', active: 'Active', disabled: 'Disabled' }[value]}
              </button>
            ))}
          </div>
          <div className="toolbar-right">
            <SearchBox
              value={search}
              onChange={(value) => {
                setSearch(value)
                setPage(1)
              }}
              placeholder="Search employees…"
            />
            <select
              aria-label="Sort employees"
              value={sort}
              onChange={(event) => {
                setSort(event.target.value)
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
            <div className="table-wrap" role="region" aria-label="Employees table" tabIndex={0}>
              <table className="employees-table" aria-label="Employees">
                <thead>
                  <tr>
                    <th scope="col">Employee</th>
                    <th scope="col">Status</th>
                    <th scope="col">Account setup</th>
                    <th scope="col">Created</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((employee) => (
                    <tr key={employee.id}>
                      <td>
                        <strong>{employee.name}</strong>
                        <small>{employee.email}</small>
                      </td>
                      <td>
                        <Badge tone={employee.disabled_at ? 'cancelled' : 'active'}>
                          {employee.disabled_at ? 'Disabled' : 'Active'}
                        </Badge>
                      </td>
                      <td>
                        <Badge tone={employee.must_change_password ? 'pending' : 'completed'}>
                          {employee.must_change_password ? 'Password change required' : 'Ready'}
                        </Badge>
                      </td>
                      <td>{date(employee.created_at)}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-button"
                            aria-label={`Edit ${employee.name}`}
                            title="Edit employee"
                            onClick={() => setEdit(employee)}
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Reset password for ${employee.name}`}
                            title="Reset password"
                            onClick={() => setConfirmation({ employee, action: 'reset' })}
                          >
                            <KeyRound size={16} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`${employee.disabled_at ? 'Reactivate' : 'Deactivate'} ${employee.name}`}
                            title={
                              employee.disabled_at ? 'Reactivate account' : 'Deactivate account'
                            }
                            onClick={() => setConfirmation({ employee, action: 'status' })}
                          >
                            {employee.disabled_at ? <UserCheck size={16} /> : <UserX size={16} />}
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
              title={search ? 'No employees found' : 'Build your clinic team'}
              text={
                search
                  ? 'Try another name or email address.'
                  : 'Add an employee and share their temporary sign-in details.'
              }
              action={
                !search && (
                  <button className="button secondary" onClick={() => setEdit({})}>
                    <Plus size={16} /> Add employee
                  </button>
                )
              }
            />
          )
        )}
      </section>
      {edit && (
        <Modal
          title={edit.id ? 'Edit employee' : 'Add employee'}
          subtitle="Employee accounts start with access to their own account settings."
          onClose={() => setEdit(null)}
        >
          <SaveForm
            path={edit.id ? `/employees/${edit.id}` : '/employees'}
            method={edit.id ? 'PUT' : 'POST'}
            onClose={() => setEdit(null)}
            label={edit.id ? 'Save employee' : 'Create employee account'}
            transform={(values) => ({ ...values, email: values.email.trim().toLowerCase() })}
            onSaved={(result) => {
              setEdit(null)
              reload()
              if (result.temporary_password) setCredentials(result)
              else notify('Employee details updated.')
            }}
          >
            <Field label="Full name">
              <input
                name="name"
                required
                maxLength={120}
                defaultValue={edit.name || ''}
                autoComplete="off"
              />
            </Field>
            <Field label="Email address">
              <input
                name="email"
                type="email"
                required
                maxLength={254}
                defaultValue={edit.email || ''}
                autoComplete="off"
              />
            </Field>
            {!edit.id && (
              <p className="form-hint">
                A temporary password will be generated. The employee must choose a new password
                after signing in.
              </p>
            )}
          </SaveForm>
        </Modal>
      )}
      {confirmation && (
        <Confirm
          title={
            confirmation.action === 'reset'
              ? `Reset password for ${confirmation.employee.name}?`
              : `${confirmation.employee.disabled_at ? 'Reactivate' : 'Deactivate'} ${confirmation.employee.name}?`
          }
          message={
            confirmation.action === 'reset'
              ? 'This ends existing sessions and generates a new temporary password. The employee will need to set a new password after signing in.'
              : confirmation.employee.disabled_at
                ? 'This employee will be able to sign in again. Their clinic access stays unchanged.'
                : 'This ends existing sessions and prevents sign-in until the account is reactivated.'
          }
          label={
            confirmation.action === 'reset'
              ? 'Reset password'
              : confirmation.employee.disabled_at
                ? 'Reactivate employee'
                : 'Deactivate employee'
          }
          cancelLabel="Cancel"
          busyLabel="Updating account…"
          onClose={() => setConfirmation(null)}
          onConfirm={async () => {
            if (confirmation.action === 'reset') {
              const result = await api(`/employees/${confirmation.employee.id}/reset-password`, {
                method: 'POST',
              })
              setCredentials(result)
            } else {
              await api(`/employees/${confirmation.employee.id}/status`, {
                method: 'PATCH',
                body: { active: Boolean(confirmation.employee.disabled_at) },
              })
              notify(
                confirmation.employee.disabled_at
                  ? 'Employee account reactivated.'
                  : 'Employee account deactivated.',
              )
            }
            reload()
          }}
        />
      )}
      {credentials && (
        <EmployeeCredentials credentials={credentials} onClose={() => setCredentials(null)} />
      )}
    </>
  )
}

function EmployeeCredentials({ credentials, onClose }) {
  const { notify } = useSession()
  async function copy(value) {
    try {
      await navigator.clipboard.writeText(value)
      notify('Copied to clipboard.')
    } catch {
      notify('Select the field and copy it manually.', 'error')
    }
  }
  return (
    <Modal
      title="Employee sign-in details"
      subtitle={`Share these details with ${credentials.employee.name}.`}
      onClose={onClose}
    >
      <p className="form-hint">
        This temporary password is shown only now. The employee must replace it after signing in.
      </p>
      <div className="employee-credentials">
        <Field label="Email address">
          <input readOnly value={credentials.employee.email} autoComplete="off" />
        </Field>
        <button
          type="button"
          className="text-button"
          onClick={() => copy(credentials.employee.email)}
        >
          <Copy size={15} /> Copy email
        </button>
        <Field label="Temporary password">
          <input
            readOnly
            value={credentials.temporary_password}
            autoComplete="off"
            spellCheck={false}
          />
        </Field>
        <button
          type="button"
          className="text-button"
          onClick={() => copy(credentials.temporary_password)}
        >
          <Copy size={15} /> Copy temporary password
        </button>
      </div>
      {credentials.employee.disabled_at && (
        <p className="form-hint">
          This account is disabled. Reactivate it before the employee signs in.
        </p>
      )}
      <div className="form-actions">
        <button className="button" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  )
}
