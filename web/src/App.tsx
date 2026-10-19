import { useState } from 'react'

function App() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark'),
  )

  const toggleTheme = () => {
    const next = !isDark
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
    setIsDark(next)
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-background px-6 text-foreground">
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <span className="rounded-full border bg-muted px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Spero
        </span>
        <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance">
          React, Vite, and Tailwind CSS
        </h1>
        <p className="text-muted-foreground">
          Edit <code className="font-mono text-sm">src/App.tsx</code> and save to
          test hot module replacement.
        </p>
      </div>

      <button
        type="button"
        onClick={toggleTheme}
        className="rounded-lg border bg-card px-4 py-2 text-sm font-medium shadow-sheen transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        Switch to {isDark ? 'light' : 'dark'} mode
      </button>
    </main>
  )
}

export default App
