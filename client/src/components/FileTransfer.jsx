import { useState, useEffect } from 'react'
import { Upload, Download, Copy, Check, ArrowLeft, Link as LinkIcon, Users, UserPlus, RefreshCw } from 'lucide-react'
import { useWebRTC } from '../hooks/useWebRTC'
import './FileTransfer.css'

function FileTransfer({ onBack, roomId: initialRoomId, setRoomId: setParentRoomId }) {
  // Leer roomId de la URL al inicio
  const getUrlRoomId = () => {
    const params = new URLSearchParams(window.location.search)
    return params.get('room')
  }

  const urlRoomId = getUrlRoomId()
  const [roomIdInput, setRoomIdInput] = useState(urlRoomId?.toUpperCase().trim() || initialRoomId || '')
  const [isHost, setIsHost] = useState(!urlRoomId && !initialRoomId)
  const [connectedFile, setConnectedFile] = useState(null)
  const [copied, setCopied] = useState(false)
  const [receivedFile, setReceivedFile] = useState(null)
  
  // roomId activo para WebRTC (solo cuando hay un valor válido)
  const activeRoomId = roomIdInput.trim() ? roomIdInput.trim() : null

  const {
    isConnected,
    transferProgress,
    status,
    error,
    sendFile,
    formatFileSize
  } = useWebRTC(
    activeRoomId,
    isHost,
    handleFileReceived,
    handleConnectionChange
  )

  function handleFileReceived(file) {
    setReceivedFile(file)
    // Crear URL de descarga
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleConnectionChange(connected) {
    // Callback cuando cambia el estado de conexión
  }


  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (file && isConnected) {
      setConnectedFile(file)
      await sendFile(file)
    } else if (file && !isConnected) {
      alert('Espera a que se establezca la conexión')
    }
  }

  const copyRoomId = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${roomIdInput.trim()}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const generateNewRoomId = () => {
    const newRoomId = Math.random().toString(36).substring(2, 9).toUpperCase()
    setRoomIdInput(newRoomId)
    if (setParentRoomId) {
      setParentRoomId(newRoomId)
    }
    // Limpiar URL si existe
    window.history.replaceState({}, document.title, window.location.pathname)
  }

  const toggleMode = () => {
    setIsHost(!isHost)
    if (!isHost) {
      // Cambiando a host, generar nuevo ID
      generateNewRoomId()
    } else {
      // Cambiando a peer, limpiar input para que ingrese el código
      setRoomIdInput('')
    }
  }

  // Generar ID automáticamente si es host y no tiene ID
  useEffect(() => {
    if (isHost && (!roomIdInput || roomIdInput.trim() === '')) {
      const newRoomId = Math.random().toString(36).substring(2, 9).toUpperCase()
      setRoomIdInput(newRoomId)
      if (setParentRoomId) {
        setParentRoomId(newRoomId)
      }
      window.history.replaceState({}, document.title, window.location.pathname)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost])

  return (
    <div className="file-transfer-container">
      <div className="file-transfer-card">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={20} />
          Volver
        </button>

        <div className="transfer-header">
          <h1 className="transfer-title">PeerDrop</h1>
          <p className="transfer-subtitle">
            {isHost ? 'Crea una sala y comparte el código' : 'Ingresa el código para unirte'}
          </p>
        </div>

        {!isConnected ? (
          <div className="connection-section">
            {/* Selector de modo */}
            <div className="mode-selector">
              <button
                className={`mode-button ${isHost ? 'active' : ''}`}
                onClick={() => !isHost && toggleMode()}
              >
                <Users size={20} />
                Crear Sala
              </button>
              <button
                className={`mode-button ${!isHost ? 'active' : ''}`}
                onClick={() => isHost && toggleMode()}
              >
                <UserPlus size={20} />
                Unirse a Sala
              </button>
            </div>

            {/* Campo de código - siempre visible */}
            <div className="room-input-section">
              {isHost ? (
                <>
                  <div className="room-id-display-input">
                    <LinkIcon size={20} />
                    <input
                      type="text"
                      value={roomIdInput}
                      onChange={(e) => {
                        const newId = e.target.value.toUpperCase().trim().slice(0, 20)
                        setRoomIdInput(newId)
                      }}
                      placeholder="Código de la sala"
                      className="room-id-display-input-field"
                      readOnly={false}
                    />
                    <button
                      className="refresh-button"
                      onClick={generateNewRoomId}
                      title="Generar nuevo código"
                    >
                      <RefreshCw size={18} />
                    </button>
                  </div>
                  <button
                    className={`copy-button ${copied ? 'copied' : ''}`}
                    onClick={copyRoomId}
                    disabled={!roomIdInput.trim()}
                  >
                    {copied ? (
                      <>
                        <Check size={18} />
                        Enlace Copiado
                      </>
                    ) : (
                      <>
                        <Copy size={18} />
                        Copiar Enlace
                      </>
                    )}
                  </button>
                  <p className="room-instructions">
                    Comparte este código con la persona con la que quieres compartir archivos.
                    {activeRoomId && ' Esperando a que alguien se una...'}
                  </p>
                </>
              ) : (
                <>
                  <div className="room-id-input-container">
                    <input
                      type="text"
                      value={roomIdInput}
                      onChange={(e) => {
                        const newId = e.target.value.toUpperCase().trim().slice(0, 20)
                        setRoomIdInput(newId)
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && roomIdInput.trim()) {
                          // Ya está en modo peer, solo necesita el código
                        }
                      }}
                      placeholder="Ingresa el código de la sala (ej: ABC123)"
                      className="room-id-input"
                      autoFocus
                    />
                  </div>
                  <p className="room-instructions">
                    {roomIdInput.trim() 
                      ? `Intentando unirse a la sala: ${roomIdInput.trim()}`
                      : 'Ingresa el código de la sala para conectarte'}
                  </p>
                </>
              )}
            </div>

            {status && (
              <div className="status-message">
                {status}
              </div>
            )}

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="transfer-section">
            <div className="status-indicator">
              <div className={`status-dot ${isConnected ? 'connected' : ''}`}></div>
              <span>{status || 'Conectado'}</span>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="file-actions">
              <label className="file-upload-button">
                <Upload size={24} />
                <span>Seleccionar archivo para enviar</span>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {connectedFile && (
              <div className="file-info">
                <div className="file-name">{connectedFile.name}</div>
                <div className="file-size">{formatFileSize(connectedFile.size)}</div>
              </div>
            )}

            {transferProgress > 0 && (
              <div className="progress-container">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${transferProgress}%` }}
                  ></div>
                </div>
                <div className="progress-text">{Math.round(transferProgress)}%</div>
              </div>
            )}

            {receivedFile && (
              <div className="file-received">
                <Download size={24} />
                <div>
                  <div className="file-name">Archivo recibido: {receivedFile.name}</div>
                  <div className="file-size">{formatFileSize(receivedFile.size)}</div>
                </div>
              </div>
            )}

            <div className="room-info-footer">
              <div className="room-id-small">
                Sala: <strong>{roomIdInput.trim() || 'N/A'}</strong>
              </div>
              {!isHost && (
                <button className="copy-small-button" onClick={copyRoomId}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FileTransfer

