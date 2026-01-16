const App = () => {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">BMAD</p>
        <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">Minimal Vite + React + Express Starter</h1>
        <p className="mt-4 text-base text-slate-300">
          React 18.2, TypeScript, Vite 5, and TailwindCSS are ready. The backend runs on Express.
        </p>
        <div className="mt-8 rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300">
          API: <span className="text-emerald-400">$VITE_API_URL</span>
        </div>
      </div>
    </main>
  )
}

export default App
