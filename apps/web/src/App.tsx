import { useEffect, useState } from 'react'
import './App.css'

type User = { id: string; email: string; role: 'superadmin' | 'user'; mustChangePassword: boolean }
type Option = { id: string; label: string }
type Question = { id: string; prompt: string; minSelections: number; maxSelections: number; options: Option[] }
type Survey = { id: string; title: string; description: string; version: number; isActive: boolean; questions: Question[] }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', ...init?.headers } })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message ?? 'Ocurrió un error. Intenta de nuevo.')
  return body.data as T
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [selected, setSelected] = useState<Survey | null>(null)
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)

  async function loadSurveys() {
    const items = await request<Survey[]>('/api/surveys')
    setSurveys(items)
  }

  useEffect(() => {
    request<User>('/api/auth/me').then(setUser).catch(() => setUser(null)).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (user) loadSurveys().catch((e: Error) => setError(e.message))
  }, [user])

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setLoading(true)
    try {
      const result = await request<{ user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      setUser(result.user); setPassword('')
    } catch (e) { setError((e as Error).message) } finally { setLoading(false) }
  }

  async function logout() {
    await request('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    setUser(null); setSurveys([]); setSelected(null); setNotice('')
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

  if (loading) return <main className="centered"><p>Cargando…</p></main>
  if (!user) return <main className="login-page"><form className="login-card" onSubmit={login}>
    <span className="eyebrow">TRANSPORTES</span><h1>Cuestionarios</h1><p>Inicia sesión para continuar.</p>
    <label>Correo electrónico<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label>
    <label>Contraseña<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
    {error && <p className="error" role="alert">{error}</p>}
    <button className="primary" type="submit">Iniciar sesión</button>
  </form></main>

  return <main className="shell">
    <header className="topbar"><a className="brand" href="#" onClick={e => { e.preventDefault(); setSelected(null); setNotice('') }}>TC<span>.</span></a><div className="account"><span>{user.email}<small>{user.role === 'superadmin' ? 'Administrador' : 'Usuario'}</small></span><button className="quiet" onClick={logout}>Cerrar sesión</button></div></header>
    <section className="content">
      {selected ? <>
        <button className="back" onClick={() => setSelected(null)}>← Todas las encuestas</button>
        <div className="page-heading"><span className="eyebrow">ENCUESTA · VERSIÓN {selected.version}</span><h1>{selected.title}</h1><p>{selected.description}</p></div>
        <form className="question-list" onSubmit={submit}>
          {selected.questions.map((question, index) => <fieldset className="question" key={question.id}><legend><span className="question-number">{String(index + 1).padStart(2, '0')}</span>{question.prompt}</legend><p className="hint">{question.minSelections === 0 ? 'Opcional' : `Selecciona al menos ${question.minSelections}`} · Máximo {question.maxSelections}</p><div className="options">{question.options.map(option => <label className="option" key={option.id}><input type={question.maxSelections === 1 ? 'radio' : 'checkbox'} name={question.id} checked={(answers[question.id] ?? []).includes(option.id)} onChange={() => toggle(question, option.id)} /><span>{option.label}</span></label>)}</div></fieldset>)}
          {error && <p className="error" role="alert">{error}</p>}<button className="primary submit" type="submit">Enviar respuestas</button>
        </form>
      </> : <>
        <div className="page-heading"><span className="eyebrow">ESPACIO DE TRABAJO</span><h1>{user.role === 'superadmin' ? 'Panel de encuestas' : 'Encuestas disponibles'}</h1><p>{user.role === 'superadmin' ? 'Consulta las encuestas y revisa su estado.' : 'Elige una encuesta para compartir tu opinión.'}</p></div>
        {notice && <div className="success" role="status">{notice}</div>}{error && <p className="error" role="alert">{error}</p>}
        <div className="survey-grid">{surveys.map(survey => <article className="survey-card" key={survey.id}><div className="card-meta"><span className={`status ${survey.isActive ? 'active' : ''}`}>{survey.isActive ? 'Activa' : 'Inactiva'}</span><span>v{survey.version}</span></div><h2>{survey.title}</h2><p>{survey.description || 'Sin descripción.'}</p><div className="card-bottom"><span>{survey.questions.length} {survey.questions.length === 1 ? 'pregunta' : 'preguntas'}</span><button className="text-button" disabled={!survey.isActive} onClick={() => openSurvey(survey.id)}>Responder <span>→</span></button></div></article>)}</div>
        {surveys.length === 0 && <div className="empty"><div className="empty-mark">○</div><h2>Aún no hay encuestas</h2><p>Las encuestas disponibles aparecerán aquí.</p></div>}
      </>}
    </section>
    <footer>Transportes · Cuestionarios</footer>
  </main>
}

export default App
