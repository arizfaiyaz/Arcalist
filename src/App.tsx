import { useEffect } from 'react'
import './App.css'
import './index.css'
import { NewTabPage } from './newtab/NewTabPage'
import { useArcalistStore } from './store/useArcalistStore'

function App() {
  const initialize = useArcalistStore((state) => state.initialize)
  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <>
      <NewTabPage />
    </>
  )
}

export default App
