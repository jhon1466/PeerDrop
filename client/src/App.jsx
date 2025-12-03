import { useState, useEffect } from 'react'
import WelcomeModal from './components/WelcomeModal'
import FileTransfer from './components/FileTransfer'
import './App.css'

function App() {
  // Verificar si hay un roomId en la URL
  const getRoomIdFromURL = () => {
    const params = new URLSearchParams(window.location.search)
    return params.get('room')
  }

  const [showWelcome, setShowWelcome] = useState(!getRoomIdFromURL())
  const [roomId, setRoomId] = useState(getRoomIdFromURL() || null)

  const handleStart = () => {
    setShowWelcome(false)
  }

  const handleBack = () => {
    setShowWelcome(true)
    setRoomId(null)
    // Limpiar URL
    window.history.replaceState({}, document.title, window.location.pathname)
  }

  return (
    <div className="app">
      {showWelcome ? (
        <WelcomeModal onStart={handleStart} />
      ) : (
        <FileTransfer onBack={handleBack} roomId={roomId} setRoomId={setRoomId} />
      )}
    </div>
  )
}

export default App

