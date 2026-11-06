import { useEffect, useState } from 'react'
import { BarChart3, ClipboardList, Download, Eye, EyeOff, KeyRound, Link2, Pencil, Plus, Trash2, Users, X } from 'lucide-react'
import './App.css'

type User = { id: string; email: string; role: 'superadmin' | 'user'; mustChangePassword: boolean }
type Option = { id: string; label: string }
type Question = { id: string; prompt: string; minSelections: number; maxSelections: number; options: Option[] }
type Survey = { id: string; title: string; description: string; version: number; isActive: boolean; questions: Question[] }
type SurveyDraft = { id?: string; version?: number; title: string; description: string; questions: Question[] }
type ManagedUser = User & { isActive: boolean; createdAt: string }
type UserDialog = { kind: 'create' } | { kind: 'email' | 'reset' | 'delete'; target: ManagedUser }
type SurveyResults = { surveyId: string; totalResponses: number; versions: Array<{ version: number; title: string; responseCount: number; questions: Array<{ questionId: string; prompt: string; responseCount: number; totalSelections: number; options: Array<{ optionId: string; label: string; selectionCount: number; percentageOfResponses: number }> }> }> }
type AdminView = 'users' | 'surveys' | 'responses'
const ADMIN_VIEW_STORAGE_KEY = 'transportes-cuestionario-admin-view'

function newSurveyQuestion(): Question {
  return {
    id: crypto.randomUUID(), prompt: '', minSelections: 1, maxSelections: 2,
    options: [{ id: crypto.randomUUID(), label: '' }, { id: crypto.randomUUID(), label: '' }],
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', ...init?.headers } })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message ?? 'Ocurrió un error. Intenta de nuevo.')
  return body.data as T
}

function PublicSurvey({ surveyId }: { surveyId: string }) {
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    request<Survey>(`/api/responses/surveys/${surveyId}`).then(setSurvey).catch((e: Error) => setError(e.message)).finally(() => setLoading(false))
  }, [surveyId])

  function toggle(question: Question, optionId: string) {
    setAnswers(current => {
      const selectedIds = current[question.id] ?? []
      if (!selectedIds.includes(optionId) && selectedIds.length >= question.maxSelections) return current
      const next = selectedIds.includes(optionId) ? selectedIds.filter(id => id !== optionId) : question.maxSelections === 1 ? [optionId] : [...selectedIds, optionId]
      return { ...current, [question.id]: next }
    })
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!survey) return
    setError('')
    const unanswered = survey.questions.find(question => (answers[question.id] ?? []).length < question.minSelections)
    if (unanswered) { setError(`Selecciona al menos ${unanswered.minSelections} opción(es) para: ${unanswered.prompt}`); return }
    try {
      await request(`/api/responses/surveys/${survey.id}`, { method: 'POST', body: JSON.stringify({ version: survey.version, answers: survey.questions.map(question => ({ questionId: question.id, optionIds: answers[question.id] ?? [] })) }) })
      setSubmitted(true)
    } catch (e) { setError((e as Error).message) }
  }

  return <main className="shell public-shell"><header className="topbar"><a className="brand" href="/">TC<span>.</span></a><span className="public-label">Encuesta anónima</span></header><section className="content">
    {loading ? <div className="centered"><p>Cargando encuesta…</p></div> : submitted ? <div className="public-success"><span className="eyebrow">RESPUESTA REGISTRADA</span><h1>¡Gracias por participar!</h1><p>Tu respuesta se guardó de forma anónima.</p><button className="primary" onClick={() => { setAnswers({}); setError(''); setSubmitted(false) }}>Responder otra vez</button></div> : survey ? <>
      <div className="page-heading"><span className="eyebrow">ENCUESTA ANÓNIMA · VERSIÓN {survey.version}</span><h1>{survey.title}</h1><p>{survey.description}</p><small className="privacy-note">No necesitas iniciar sesión. No solicitamos datos personales.</small></div>
      <form className="question-list" onSubmit={submit}>{survey.questions.map((question, index) => <fieldset className="question" key={question.id}><legend><span className="question-number">{String(index + 1).padStart(2, '0')}</span>{question.prompt}</legend><p className="hint">{question.minSelections === 0 ? 'Opcional' : `Selecciona al menos ${question.minSelections}`} · Máximo {question.maxSelections}</p><div className="options">{question.options.map(option => <label className="option" key={option.id}><input type={question.maxSelections === 1 ? 'radio' : 'checkbox'} name={question.id} checked={(answers[question.id] ?? []).includes(option.id)} onChange={() => toggle(question, option.id)} /><span>{option.label}</span></label>)}</div></fieldset>)}{error && <p className="error" role="alert">{error}</p>}<button className="primary submit" type="submit">Enviar respuestas</button></form>
    </> : <div className="public-success"><span className="eyebrow">ENCUESTA NO DISPONIBLE</span><h1>No encontramos esta encuesta</h1><p>{error || 'Puede estar desactivada o el enlace ya no ser válido.'}</p></div>}
  </section><footer>Transportes · Cuestionarios</footer></main>
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [surveyDraft, setSurveyDraft] = useState<SurveyDraft | null>(null)
  const [savingSurvey, setSavingSurvey] = useState(false)
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [adminView, setAdminView] = useState<AdminView>(() => {
    const savedView = window.localStorage.getItem(ADMIN_VIEW_STORAGE_KEY)
    return savedView === 'users' || savedView === 'surveys' || savedView === 'responses' ? savedView : 'users'
  })
  const [selectedResultsSurvey, setSelectedResultsSurvey] = useState('')
  const [surveyResults, setSurveyResults] = useState<SurveyResults | null>(null)
  const [resultsLoading, setResultsLoading] = useState(false)
  const [exportFrom, setExportFrom] = useState('')
  const [exportTo, setExportTo] = useState('')
  const [exporting, setExporting] = useState(false)
  const [userDialog, setUserDialog] = useState<UserDialog | null>(null)
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [showModalPassword, setShowModalPassword] = useState(false)
  const [showModalConfirmation, setShowModalConfirmation] = useState(false)
  const [selected, setSelected] = useState<Survey | null>(null)
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const publicSurveyId = window.location.pathname.match(/^\/encuesta\/([a-f\d]{24})\/?$/i)?.[1]

  async function shareSurvey(survey: Survey) {
    const url = `${window.location.origin}/encuesta/${survey.id}`
    try { await navigator.clipboard.writeText(url); setNotice('Enlace copiado. Compártelo para recibir respuestas anónimas.') }
    catch { setNotice(url) }
  }

  async function loadSurveys() {
    const items = await request<Survey[]>('/api/surveys')
    setSurveys(items)
    setSelectedResultsSurvey(current => items.some(item => item.id === current) ? current : items[0]?.id ?? '')
  }

  async function loadUsers() {
    setUsers(await request<ManagedUser[]>('/api/users'))
  }

  function createSurvey() {
    setError(''); setNotice('')
    setSurveyDraft({ title: '', description: '', questions: [newSurveyQuestion()] })
  }

  function editSurvey(survey: Survey) {
    setError(''); setNotice('')
    setSurveyDraft({ id: survey.id, version: survey.version, title: survey.title, description: survey.description, questions: survey.questions.map(question => ({ ...question, options: question.options.map(option => ({ ...option })) })) })
  }

  async function saveSurvey(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!surveyDraft) return
    setError('')
    const invalidQuestion = surveyDraft.questions.find(question => {
      const optionLabels = question.options.map(option => option.label.trim().toLocaleLowerCase())
      return !question.prompt.trim() || question.options.length < 2 || question.options.some(option => !option.label.trim()) || new Set(optionLabels).size !== optionLabels.length || question.maxSelections < 2 || question.maxSelections > question.options.length || question.minSelections < 1 || question.minSelections > question.maxSelections
    })
    if (!surveyDraft.title.trim() || surveyDraft.questions.length === 0 || invalidQuestion) {
      setError(invalidQuestion ? 'Revisa las preguntas y sus opciones: cada pregunta necesita texto, al menos dos opciones distintas y límites de selección válidos.' : 'Escribe un título y agrega al menos una pregunta.')
      return
    }
    setSavingSurvey(true)
    try {
      const definition = { title: surveyDraft.title.trim(), description: surveyDraft.description.trim(), questions: surveyDraft.questions.map(question => ({ ...question, prompt: question.prompt.trim(), minSelections: Number(question.minSelections), maxSelections: Number(question.maxSelections), options: question.options.map(option => ({ ...option, label: option.label.trim() })) })) }
      if (surveyDraft.id) {
        await request(`/api/surveys/${surveyDraft.id}`, { method: 'PUT', body: JSON.stringify({ ...definition, expectedVersion: surveyDraft.version }) })
        setNotice('Cambios guardados en una nueva versión de la encuesta.')
      } else {
        await request('/api/surveys', { method: 'POST', body: JSON.stringify(definition) })
        setNotice('Encuesta creada como borrador. Actívala cuando esté lista.')
      }
      setSurveyDraft(null)
      await loadSurveys()
    } catch (e) { setError((e as Error).message) } finally { setSavingSurvey(false) }
  }

  async function setSurveyActive(survey: Survey) {
    setError('')
    try {
      await request(`/api/surveys/${survey.id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive: !survey.isActive }) })
      setNotice(survey.isActive ? 'Encuesta desactivada.' : 'Encuesta activada y disponible para responder.')
      await loadSurveys()
    } catch (e) { setError((e as Error).message) }
  }

  useEffect(() => {
    if (window.location.pathname.match(/^\/encuesta\/[a-f\d]{24}\/?$/i)) return
    request<User>('/api/auth/me').then(setUser).catch(() => setUser(null)).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    window.localStorage.setItem(ADMIN_VIEW_STORAGE_KEY, adminView)
  }, [adminView])

  useEffect(() => {
    if (!user) return
    if (user.role === 'superadmin' && adminView === 'users') loadUsers().catch((e: Error) => setError(e.message))
    else loadSurveys().catch((e: Error) => setError(e.message))
  }, [user, adminView])

  useEffect(() => {
    if (adminView !== 'responses' || !selectedResultsSurvey) return
    let cancelled = false
    setResultsLoading(true)
    setError('')
    request<SurveyResults>(`/api/responses/surveys/${selectedResultsSurvey}/results`)
      .then(result => { if (!cancelled) setSurveyResults(result) })
      .catch((e: Error) => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setResultsLoading(false) })
    return () => { cancelled = true }
  }, [adminView, selectedResultsSurvey])

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(''), 3000)
    return () => window.clearTimeout(timeout)
  }, [notice])

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setLoading(true)
    try {
      const result = await request<{ user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      setUser(result.user); setPassword(''); setAdminView('users')
    } catch (e) { setError((e as Error).message) } finally { setLoading(false) }
  }

  async function logout() {
    await request('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    setUser(null); setSurveys([]); setUsers([]); setSelected(null); setAdminView('users'); setNotice('')
  }

  function openUserDialog(dialog: UserDialog) {
    setError('')
    setFormEmail(dialog.kind === 'email' ? dialog.target.email : '')
    setFormPassword('')
    setPasswordConfirmation('')
    setShowModalPassword(false)
    setShowModalConfirmation(false)
    setUserDialog(dialog)
  }

  async function saveUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!userDialog) return
    setError('')
    if ((userDialog.kind === 'reset' || userDialog.kind === 'create') && formPassword !== passwordConfirmation) {
      setError('Las contraseñas no coinciden.')
      return
    }
    try {
      if (userDialog.kind === 'create') {
        await request('/api/users', { method: 'POST', body: JSON.stringify({ email: formEmail, password: formPassword, role: 'user' }) })
        setNotice('Usuario creado correctamente.')
      } else if (userDialog.kind === 'email') {
        await request(`/api/users/${userDialog.target.id}`, { method: 'PATCH', body: JSON.stringify({ email: formEmail }) })
        setNotice('Correo actualizado correctamente.')
      } else if (userDialog.kind === 'reset') {
        await request(`/api/auth/users/${userDialog.target.id}/password`, { method: 'PUT', body: JSON.stringify({ newPassword: formPassword }) })
        setNotice('Contraseña restablecida. El usuario deberá cambiarla al iniciar sesión.')
      } else {
        await request(`/api/users/${userDialog.target.id}`, { method: 'DELETE' })
        setNotice('Usuario eliminado.')
      }
      setUserDialog(null)
      await loadUsers()
    } catch (e) { setError((e as Error).message) }
  }

  async function exportResponses() {
    if (!selectedResultsSurvey) return
    if (exportFrom && exportTo && exportFrom > exportTo) {
      setError('La fecha inicial debe ser anterior o igual a la fecha final.')
      return
    }
    setError(''); setExporting(true)
    try {
      const params = new URLSearchParams()
      if (exportFrom) params.set('from', exportFrom)
      if (exportTo) params.set('to', exportTo)
      const query = params.size ? `?${params.toString()}` : ''
      const response = await fetch(`/api/exports/surveys/${selectedResultsSurvey}.csv${query}`, { credentials: 'include' })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.message ?? 'No se pudo exportar el archivo CSV.')
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const disposition = response.headers.get('Content-Disposition')
      link.href = url
      link.download = disposition?.match(/filename="?([^";]+)"?/i)?.[1] ?? `respuestas-${selectedResultsSurvey}.csv`
      document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url)
    } catch (e) { setError((e as Error).message) } finally { setExporting(false) }
  }

  async function openSurvey(id: string) {
    setError(''); setNotice('')
    try { setSelected(await request<Survey>(`/api/responses/surveys/${id}`)); setAnswers({}) }
    catch (e) { setError((e as Error).message) }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return
    setError('')
    const unanswered = selected.questions.find(question => (answers[question.id] ?? []).length < question.minSelections)
    if (unanswered) { setError(`Selecciona al menos ${unanswered.minSelections} opción(es) para: ${unanswered.prompt}`); return }
    try {
      await request(`/api/responses/surveys/${selected.id}`, { method: 'POST', body: JSON.stringify({ version: selected.version, answers: selected.questions.map(q => ({ questionId: q.id, optionIds: answers[q.id] ?? [] })) }) })
      setSelected(null); setNotice('¡Gracias! Tu respuesta se registró correctamente.')
    } catch (e) { setError((e as Error).message) }
  }

  function toggle(question: Question, optionId: string) {
    setAnswers(current => {
      const selectedIds = current[question.id] ?? []
      if (!selectedIds.includes(optionId) && selectedIds.length >= question.maxSelections) return current
      const next = selectedIds.includes(optionId) ? selectedIds.filter(id => id !== optionId) : question.maxSelections === 1 ? [optionId] : [...selectedIds, optionId]
      return { ...current, [question.id]: next }
    })
  }

  if (publicSurveyId) return <PublicSurvey surveyId={publicSurveyId} />
  if (loading) return <main className="centered"><p>Cargando…</p></main>
  if (!user) return <main className="login-page"><form className="login-card" onSubmit={login}>
    <span className="eyebrow">TRANSPORTES</span><h1>Cuestionarios</h1><p>Inicia sesión para continuar.</p>
    <label>Correo electrónico<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label>
    <label>Contraseña<div className="password-field"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /><button className="password-toggle" type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}</button></div></label>
    {error && <p className="error" role="alert">{error}</p>}
    <button className="primary" type="submit">Iniciar sesión</button>
  </form></main>

  return <main className="shell">
    <header className="topbar"><a className="brand" href="#" onClick={e => { e.preventDefault(); setSelected(null); setNotice('') }}>TC<span>.</span></a><div className="account"><span>{user.email}<small>{user.role === 'superadmin' ? 'Administrador' : 'Usuario'}</small></span><button className="quiet" onClick={logout}>Cerrar sesión</button></div></header>
    <section className="content">
      {user.role === 'superadmin' && <nav className="admin-nav" aria-label="Secciones de administración"><button className={adminView === 'users' ? 'selected' : ''} onClick={() => { setAdminView('users'); setSelected(null); setError(''); setNotice('') }}><Users size={16} />Usuarios</button><button className={adminView === 'surveys' ? 'selected' : ''} onClick={() => { setAdminView('surveys'); setSelected(null); setError(''); setNotice('') }}><ClipboardList size={16} />Encuestas</button><button className={adminView === 'responses' ? 'selected' : ''} onClick={() => { setAdminView('responses'); setSelected(null); setError(''); setNotice('') }}><BarChart3 size={16} />Respuestas</button></nav>}
      {user.role === 'superadmin' && adminView === 'users' ? <>
        <div className="page-heading users-heading"><span className="eyebrow">ADMINISTRACIÓN</span><div className="heading-row"><div><h1>Usuarios</h1><p>Crea cuentas y administra su acceso.</p></div><button className="primary create-user" onClick={() => openUserDialog({ kind: 'create' })}><Plus size={17} />Crear usuario</button></div></div>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="table-wrap"><table className="users-table"><thead><tr><th>Correo electrónico</th><th>Rol</th><th>Estado</th><th>Creado</th><th className="actions-heading">Acciones</th></tr></thead><tbody>{users.map(item => <tr key={item.id}><td className="user-email">{item.email}</td><td><span className={`role-pill ${item.role}`}>{item.role === 'superadmin' ? 'Administrador' : 'Usuario'}</span></td><td><span className={`status ${item.isActive ? 'active' : ''}`}>{item.isActive ? 'Activo' : 'Inactivo'}</span>{item.mustChangePassword && <small className="change-password-note">Debe cambiar contraseña</small>}</td><td className="date-cell">{new Date(item.createdAt).toLocaleDateString('es-MX')}</td><td><div className="row-actions"><button aria-label={`Editar correo de ${item.email}`} title="Editar correo" onClick={() => openUserDialog({ kind: 'email', target: item })}><Pencil size={16} /></button><button aria-label={`Restablecer contraseña de ${item.email}`} title="Restablecer contraseña" onClick={() => openUserDialog({ kind: 'reset', target: item })}><KeyRound size={16} /></button>{item.id !== user.id && <button className="delete-action" aria-label={`Eliminar a ${item.email}`} title="Eliminar usuario" onClick={() => openUserDialog({ kind: 'delete', target: item })}><Trash2 size={16} /></button>}</div></td></tr>)}</tbody></table>{users.length === 0 && <div className="table-empty">No hay usuarios para mostrar.</div>}</div>
      </> : user.role === 'superadmin' && adminView === 'surveys' ? <>
        {surveyDraft ? <>
          <button className="back" type="button" onClick={() => { setSurveyDraft(null); setError('') }}>← Todas las encuestas</button>
          <div className="page-heading users-heading"><span className="eyebrow">{surveyDraft.id ? `EDICIÓN · VERSIÓN ${surveyDraft.version}` : 'NUEVA ENCUESTA · BORRADOR'}</span><h1>{surveyDraft.id ? 'Editar encuesta' : 'Crear encuesta'}</h1><p>Agrega preguntas de selección múltiple y personaliza las opciones.</p></div>
          {error && <p className="error" role="alert">{error}</p>}
          <form className="survey-builder" onSubmit={saveSurvey}>
            <div className="builder-main">
              <section className="builder-section"><span className="builder-label">DETALLES</span><label>Título de la encuesta<input className="builder-input" required maxLength={200} value={surveyDraft.title} onChange={event => setSurveyDraft(current => current && ({ ...current, title: event.target.value }))} placeholder="Ej. Experiencia de viaje" /></label><label>Descripción<textarea className="builder-input builder-textarea" maxLength={2000} value={surveyDraft.description} onChange={event => setSurveyDraft(current => current && ({ ...current, description: event.target.value }))} placeholder="Cuéntales a los participantes de qué trata esta encuesta." /></label></section>
              <div className="builder-questions-heading"><div><span className="builder-label">PREGUNTAS</span><p>Las preguntas aceptan una o varias respuestas.</p></div><button type="button" className="secondary-button" onClick={() => setSurveyDraft(current => current && ({ ...current, questions: [...current.questions, newSurveyQuestion()] }))}><Plus size={15} />Agregar pregunta</button></div>
              {surveyDraft.questions.map((question, questionIndex) => <article className="builder-question" key={question.id}><div className="builder-question-top"><span className="question-number">{String(questionIndex + 1).padStart(2, '0')}</span><span className="builder-question-type">Selección múltiple</span><button type="button" className="remove-question" disabled={surveyDraft.questions.length <= 1} aria-label={`Eliminar pregunta ${questionIndex + 1}`} onClick={() => setSurveyDraft(current => current && ({ ...current, questions: current.questions.filter(item => item.id !== question.id) }))}><Trash2 size={15} /></button></div><label>Pregunta<input className="builder-input" required maxLength={500} value={question.prompt} onChange={event => setSurveyDraft(current => current && ({ ...current, questions: current.questions.map(item => item.id === question.id ? { ...item, prompt: event.target.value } : item) }))} placeholder="Escribe tu pregunta" /></label><div className="builder-options-heading"><span>Opciones de respuesta</span><small>Mínimo 2 opciones</small></div><div className="builder-options">{question.options.map((option, optionIndex) => <div className="builder-option-row" key={option.id}><span className="option-index">{String(optionIndex + 1).padStart(2, '0')}</span><input className="builder-input" required maxLength={200} aria-label={`Opción ${optionIndex + 1}`} value={option.label} onChange={event => setSurveyDraft(current => current && ({ ...current, questions: current.questions.map(item => item.id === question.id ? { ...item, options: item.options.map(choice => choice.id === option.id ? { ...choice, label: event.target.value } : choice) } : item) }))} placeholder={`Opción ${optionIndex + 1}`} /><button type="button" className="remove-option" disabled={question.options.length <= 2} aria-label={`Eliminar opción ${optionIndex + 1}`} onClick={() => setSurveyDraft(current => current && ({ ...current, questions: current.questions.map(item => { if (item.id !== question.id) return item; const options = item.options.filter(choice => choice.id !== option.id); const maxSelections = Math.min(item.maxSelections, options.length); return { ...item, options, maxSelections, minSelections: Math.min(item.minSelections, maxSelections) } }) }))}><X size={15} /></button></div>)}</div><button type="button" className="add-option" disabled={question.options.length >= 100} onClick={() => setSurveyDraft(current => current && ({ ...current, questions: current.questions.map(item => item.id === question.id ? { ...item, options: [...item.options, { id: crypto.randomUUID(), label: '' }] } : item) }))}><Plus size={14} />Agregar opción</button><div className="selection-limits"><label>Selecciones mínimas<input className="builder-input" type="number" min={1} max={question.maxSelections} value={question.minSelections} onChange={event => setSurveyDraft(current => current && ({ ...current, questions: current.questions.map(item => item.id === question.id ? { ...item, minSelections: Number(event.target.value) } : item) }))} /></label><label>Selecciones máximas<input className="builder-input" type="number" min={2} max={question.options.length} value={question.maxSelections} onChange={event => setSurveyDraft(current => current && ({ ...current, questions: current.questions.map(item => item.id === question.id ? { ...item, maxSelections: Number(event.target.value), minSelections: Math.min(item.minSelections, Number(event.target.value)) } : item) }))} /></label></div></article>)}
              <div className="builder-actions"><button type="button" className="cancel-button" onClick={() => { setSurveyDraft(null); setError('') }}>Cancelar</button><button className="primary modal-submit" type="submit" disabled={savingSurvey}>{savingSurvey ? 'Guardando…' : surveyDraft.id ? 'Guardar nueva versión' : 'Guardar borrador'}</button></div>
            </div>
            <aside className="survey-preview"><span className="builder-label">VISTA PREVIA</span><div className="preview-card"><span className="eyebrow">ENCUESTA</span><h2>{surveyDraft.title || 'Título de la encuesta'}</h2><p>{surveyDraft.description || 'La descripción aparecerá aquí.'}</p>{surveyDraft.questions.map((question, index) => <fieldset className="preview-question" key={question.id}><legend><span>{index + 1}.</span> {question.prompt || 'Tu pregunta aparecerá aquí'}</legend><small>Elige entre {question.minSelections} y {question.maxSelections} opciones</small>{question.options.map((option, optionIndex) => <label key={option.id}><input type="checkbox" disabled /><span>{option.label || `Opción ${optionIndex + 1}`}</span></label>)}</fieldset>)}</div><p className="preview-note">La encuesta se guarda inactiva. Podrás activarla desde el listado cuando esté lista.</p></aside>
          </form>
        </> : <>
          <div className="page-heading users-heading"><span className="eyebrow">ADMINISTRACIÓN</span><div className="heading-row"><div><h1>Encuestas</h1><p>Crea encuestas y administra las que ya existen.</p></div><button className="primary create-user" onClick={createSurvey}><Plus size={17} />Nueva encuesta</button></div></div>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="survey-grid">{surveys.map(survey => <article className="survey-card" key={survey.id}><div className="card-meta"><span className={`status ${survey.isActive ? 'active' : ''}`}>{survey.isActive ? 'Activa' : 'Borrador'}</span><span>v{survey.version}</span></div><h2>{survey.title}</h2><p>{survey.description || 'Sin descripción.'}</p><div className="admin-survey-meta">{survey.questions.length} {survey.questions.length === 1 ? 'pregunta' : 'preguntas'} · {survey.questions.reduce((sum, question) => sum + question.options.length, 0)} opciones</div><div className="survey-admin-actions"><button className="secondary-button" onClick={() => editSurvey(survey)}><Pencil size={14} />Editar</button>{survey.isActive && <button className="secondary-button" onClick={() => shareSurvey(survey)}><Link2 size={14} />Copiar enlace</button>}<button className={survey.isActive ? 'deactivate-button' : 'activate-button'} onClick={() => setSurveyActive(survey)}>{survey.isActive ? 'Desactivar' : 'Activar'}</button></div></article>)}</div>
          {surveys.length === 0 && <div className="empty"><div className="empty-mark"><ClipboardList size={30} /></div><h2>Aún no hay encuestas</h2><p>Crea tu primera encuesta para empezar a recopilar respuestas.</p></div>}
        </>}
      </> : user.role === 'superadmin' && adminView === 'responses' ? <>
        <div className="page-heading results-heading"><span className="eyebrow">ANÁLISIS</span><h1>Respuestas de encuestas</h1><p>Consulta los resultados y descarga un resumen de respuestas por opción en CSV.</p></div>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="results-toolbar"><label>Encuesta<select value={selectedResultsSurvey} onChange={event => setSelectedResultsSurvey(event.target.value)}><option value="">Selecciona una encuesta</option>{surveys.map(survey => <option key={survey.id} value={survey.id}>{survey.title}</option>)}</select></label><div className="date-filters"><label>Desde<input type="date" value={exportFrom} onChange={event => setExportFrom(event.target.value)} /></label><label>Hasta<input type="date" value={exportTo} onChange={event => setExportTo(event.target.value)} /></label><button className="primary export-button" onClick={exportResponses} disabled={!selectedResultsSurvey || exporting}><Download size={16} />{exporting ? 'Preparando CSV…' : 'Exportar CSV'}</button></div></div>
        {!surveys.length && <div className="empty"><div className="empty-mark"><BarChart3 size={30} /></div><h2>Aún no hay encuestas</h2><p>Crea una encuesta antes de consultar sus respuestas.</p></div>}
        {selectedResultsSurvey && resultsLoading && <div className="results-loading">Cargando resultados…</div>}
        {selectedResultsSurvey && !resultsLoading && surveyResults && <><div className="response-summary"><span className="summary-icon"><BarChart3 size={19} /></span><div><strong>{surveyResults.totalResponses}</strong><span>{surveyResults.totalResponses === 1 ? 'respuesta recibida' : 'respuestas recibidas'}</span></div></div>
          {surveyResults.versions.map(version => <section className="version-results" key={version.version}><div className="version-title"><div><span className="eyebrow">VERSIÓN {version.version}</span><h2>{version.title}</h2></div><span className="version-count">{version.responseCount} {version.responseCount === 1 ? 'respuesta' : 'respuestas'}</span></div>
            {version.questions.map((question, index) => <article className="result-question" key={question.questionId}><div className="result-question-heading"><span className="question-number">{String(index + 1).padStart(2, '0')}</span><h3>{question.prompt}</h3><small>{question.responseCount} {question.responseCount === 1 ? 'respuesta' : 'respuestas'}</small></div><div className="result-options">{question.options.map(option => <div className="result-option" key={option.optionId}><div className="result-option-label"><span>{option.label}</span><strong>{option.selectionCount} <small>({option.percentageOfResponses}%)</small></strong></div><div className="result-track"><div className="result-bar" style={{ width: `${Math.min(option.percentageOfResponses, 100)}%` }} /></div></div>)}</div></article>)}
          </section>)}
          {surveyResults.totalResponses === 0 && <div className="empty results-empty"><h2>Aún no hay respuestas</h2><p>Los resultados aparecerán aquí cuando alguien complete la encuesta.</p></div>}
        </>}
      </> : user.role !== 'superadmin' || adminView === 'surveys' ? <>
      {selected ? <>
        <button className="back" onClick={() => setSelected(null)}>← Todas las encuestas</button>
        <div className="page-heading"><span className="eyebrow">ENCUESTA · VERSIÓN {selected.version}</span><h1>{selected.title}</h1><p>{selected.description}</p></div>
        <form className="question-list" onSubmit={submit}>
          {selected.questions.map((question, index) => <fieldset className="question" key={question.id}><legend><span className="question-number">{String(index + 1).padStart(2, '0')}</span>{question.prompt}</legend><p className="hint">{question.minSelections === 0 ? 'Opcional' : `Selecciona al menos ${question.minSelections}`} · Máximo {question.maxSelections}</p><div className="options">{question.options.map(option => <label className="option" key={option.id}><input type={question.maxSelections === 1 ? 'radio' : 'checkbox'} name={question.id} checked={(answers[question.id] ?? []).includes(option.id)} onChange={() => toggle(question, option.id)} /><span>{option.label}</span></label>)}</div></fieldset>)}
          {error && <p className="error" role="alert">{error}</p>}<button className="primary submit" type="submit">Enviar respuestas</button>
        </form>
      </> : <>
        <div className="page-heading"><span className="eyebrow">ESPACIO DE TRABAJO</span><h1>{user.role === 'superadmin' ? 'Panel de encuestas' : 'Encuestas disponibles'}</h1><p>{user.role === 'superadmin' ? 'Consulta las encuestas y revisa su estado.' : 'Elige una encuesta para compartir tu opinión.'}</p></div>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="survey-grid">{surveys.map(survey => <article className="survey-card" key={survey.id}><div className="card-meta"><span className={`status ${survey.isActive ? 'active' : ''}`}>{survey.isActive ? 'Activa' : 'Inactiva'}</span><span>v{survey.version}</span></div><h2>{survey.title}</h2><p>{survey.description || 'Sin descripción.'}</p><div className="card-bottom"><span>{survey.questions.length} {survey.questions.length === 1 ? 'pregunta' : 'preguntas'}</span><button className="text-button" disabled={!survey.isActive} onClick={() => openSurvey(survey.id)}>Responder <span>→</span></button></div></article>)}</div>
        {surveys.length === 0 && <div className="empty"><div className="empty-mark">○</div><h2>Aún no hay encuestas</h2><p>Las encuestas disponibles aparecerán aquí.</p></div>}
      </>}
      </> : null}
    </section>
    <footer>Transportes · Cuestionarios</footer>
    {notice && <div className="toast" role="status" aria-live="polite">{notice}</div>}
    {userDialog && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setUserDialog(null) }}><section className="user-modal" role="dialog" aria-modal="true" aria-labelledby="user-modal-title"><div className="modal-header"><div><span className="eyebrow">ADMINISTRACIÓN</span><h2 id="user-modal-title">{userDialog.kind === 'create' ? 'Crear usuario' : userDialog.kind === 'email' ? 'Editar correo' : userDialog.kind === 'reset' ? 'Restablecer contraseña' : 'Eliminar usuario'}</h2></div><button className="modal-close" aria-label="Cerrar" onClick={() => setUserDialog(null)}><X size={18} /></button></div><form onSubmit={saveUser}>
      {userDialog.kind === 'create' && <><label>Correo electrónico<input type="email" required autoComplete="off" value={formEmail} onChange={event => setFormEmail(event.target.value)} /></label><label>Contraseña temporal<div className="password-field"><input type={showModalPassword ? 'text' : 'password'} required minLength={12} autoComplete="new-password" value={formPassword} onChange={event => setFormPassword(event.target.value)} /><button className="password-toggle" type="button" onClick={() => setShowModalPassword(value => !value)} aria-label={showModalPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showModalPassword}>{showModalPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}</button></div><small>Debe tener al menos 12 caracteres. Se solicitará cambiarla al iniciar sesión.</small></label><label>Confirmar contraseña<div className="password-field"><input type={showModalConfirmation ? 'text' : 'password'} required minLength={12} autoComplete="new-password" value={passwordConfirmation} onChange={event => setPasswordConfirmation(event.target.value)} /><button className="password-toggle" type="button" onClick={() => setShowModalConfirmation(value => !value)} aria-label={showModalConfirmation ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'} aria-pressed={showModalConfirmation}>{showModalConfirmation ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}</button></div></label></>}
      {userDialog.kind === 'email' && <><p className="modal-copy">Actualiza el correo de <strong>{userDialog.target.email}</strong>.</p><label>Correo electrónico<input type="email" required value={formEmail} onChange={event => setFormEmail(event.target.value)} /></label></>}
      {userDialog.kind === 'reset' && <><p className="modal-copy">Define una contraseña temporal para <strong>{userDialog.target.email}</strong>. Se cerrarán sus sesiones y deberá cambiarla al iniciar sesión.</p><label>Nueva contraseña temporal<div className="password-field"><input type={showModalPassword ? 'text' : 'password'} required minLength={12} autoComplete="new-password" value={formPassword} onChange={event => setFormPassword(event.target.value)} /><button className="password-toggle" type="button" onClick={() => setShowModalPassword(value => !value)} aria-label={showModalPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showModalPassword}>{showModalPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}</button></div><small>Debe tener al menos 12 caracteres.</small></label><label>Confirmar contraseña<div className="password-field"><input type={showModalConfirmation ? 'text' : 'password'} required minLength={12} autoComplete="new-password" value={passwordConfirmation} onChange={event => setPasswordConfirmation(event.target.value)} /><button className="password-toggle" type="button" onClick={() => setShowModalConfirmation(value => !value)} aria-label={showModalConfirmation ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'} aria-pressed={showModalConfirmation}>{showModalConfirmation ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}</button></div></label></>}
      {userDialog.kind === 'delete' && <p className="modal-copy">¿Eliminar la cuenta de <strong>{userDialog.target.email}</strong>? Esta acción no se puede deshacer y cerrará sus sesiones activas.</p>}
      {error && <p className="error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="cancel-button" onClick={() => setUserDialog(null)}>Cancelar</button><button className={`primary modal-submit ${userDialog.kind === 'delete' ? 'danger-button' : ''}`} type="submit">{userDialog.kind === 'create' ? 'Crear usuario' : userDialog.kind === 'email' ? 'Guardar correo' : userDialog.kind === 'reset' ? 'Restablecer' : 'Eliminar usuario'}</button></div>
    </form></section></div>}
  </main>
}

export default App
