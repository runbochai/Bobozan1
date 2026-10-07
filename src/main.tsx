import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import WorldThemeProvider from './components/WorldThemeProvider'
import './components/WorldThemes.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WorldThemeProvider><App /></WorldThemeProvider>
  </StrictMode>,
)
