import { useEffect } from 'react'
import './App.css'
import './index.css'
import { NewTabPage } from './newtab/NewTabPage'
import { useArcalistStore } from './store/useArcalistStore'

function App() {
  const initialize = useArcalistStore((state) => state.initialize)
  useEffect(() => {
    initialize()

    // Listen for Quick Save signal from the service worker
        const handleMessage = (message: { type: string }) => {
          if (message.type === 'QUICK_SAVE_DONE') {
            // Re-read storage and update the store
            initialize()
          }
        }
    
        // Only add listener if we're in extension context
        if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
          chrome.runtime.onMessage.addListener(handleMessage)
        }
    
        return () => {
          if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
            chrome.runtime.onMessage.removeListener(handleMessage)
          }
        }
    
  }, [initialize])

  return (
    <>
      <NewTabPage />
    </>
  )
}

export default App
