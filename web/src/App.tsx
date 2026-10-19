import { useState } from 'react'
import { MapPage } from './features/map/MapPage'

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

  return <MapPage isDark={isDark} onToggleTheme={toggleTheme} />
}

export default App
