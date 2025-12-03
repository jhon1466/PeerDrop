import { useState, useRef, useEffect } from 'react'
import io from 'socket.io-client'
import { getSocketIoUrl } from '../utils/getSignalingServer'

const SIGNALING_SERVER = getSocketIoUrl()

export function useWebRTC(roomId, isHost, onFileReceived, onConnectionChange) {
  const [isConnected, setIsConnected] = useState(false)
  const [transferProgress, setTransferProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [error, setError] = useState(null)

  const socketRef = useRef(null)
  const peerConnectionRef = useRef(null)
  const dataChannelRef = useRef(null)
  const fileChunksRef = useRef([])
  const receivedFileInfoRef = useRef(null)
  const iceCandidatesBufferRef = useRef([])
  const isSettingRemoteDescRef = useRef(false)

  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  }

  useEffect(() => {
    if (!roomId) return

    setStatus('Conectando al servidor...')
    setError(null)

    // Obtener la URL del servidor (puede cambiar dinámicamente)
    const serverUrl = getSocketIoUrl()
    console.log(' Intentando conectar al servidor:', serverUrl)

    // Conectar al servidor de señalización
    socketRef.current = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    })

    socketRef.current.on('connect', () => {
      console.log(' Conectado al servidor de señalización')
      setStatus('Conectado al servidor. Configurando sala...')
      
      if (isHost) {
        socketRef.current.emit('create-room', roomId)
      } else {
        socketRef.current.emit('join-room', roomId)
      }
    })

    socketRef.current.on('disconnect', () => {
      console.log(' Desconectado del servidor de señalización')
      setStatus('Desconectado del servidor')
      setIsConnected(false)
    })

    socketRef.current.on('connect_error', (err) => {
      console.error('Error de conexión:', err)
      setError('No se pudo conectar al servidor. Verifica que esté corriendo.')
    })

    socketRef.current.on('room-created', (room) => {
      console.log(' Sala creada:', room)
      setStatus('Sala creada. Esperando a que alguien se una...')
      initializePeerConnection(true)
    })

    socketRef.current.on('room-joined', (room) => {
      console.log(' Unido a la sala:', room)
      setStatus('Unido a la sala. Esperando conexión...')
      initializePeerConnection(false)
    })

    socketRef.current.on('peer-joined', () => {
      console.log('Alguien se unió a la sala')
      setStatus('Alguien se unió. Iniciando conexión...')
      if (peerConnectionRef.current) {
        createDataChannel()
        createOffer()
      }
    })

    socketRef.current.on('room-full', () => {
      console.error(' Sala llena')
      setError('La sala está llena')
    })

    socketRef.current.on('room-not-found', () => {
      console.error(' Sala no encontrada')
      setError('Sala no encontrada. Verifica el ID de la sala.')
    })

    socketRef.current.on('room-closed', () => {
      console.log(' Sala cerrada')
      setError('La otra persona cerró la conexión')
      setIsConnected(false)
    })

    socketRef.current.on('offer', async (data) => {
      console.log(' Oferta recibida')
      if (!isHost && peerConnectionRef.current) {
        await handleOffer(data.offer)
      }
    })

    socketRef.current.on('answer', async (data) => {
      console.log(' Respuesta recibida')
      if (isHost && peerConnectionRef.current) {
        await handleAnswer(data.answer)
      }
    })

    socketRef.current.on('ice-candidate', async (data) => {
      console.log(' ICE candidate recibido')
      await handleIceCandidate(data.candidate)
    })

    return () => {
      console.log(' Limpiando conexión...')
      if (dataChannelRef.current) {
        dataChannelRef.current.close()
        dataChannelRef.current = null
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
        peerConnectionRef.current = null
      }
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      iceCandidatesBufferRef.current = []
      fileChunksRef.current = []
      receivedFileInfoRef.current = null
    }
  }, [roomId, isHost])

  const initializePeerConnection = (isHostPeer) => {
    console.log('Inicializando conexión peer...', { isHostPeer })
    
    // Cerrar conexión anterior si existe
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }

    peerConnectionRef.current = new RTCPeerConnection(iceServers)
    iceCandidatesBufferRef.current = []
    isSettingRemoteDescRef.current = false

    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        console.log(' Enviando ICE candidate')
        socketRef.current.emit('ice-candidate', {
          roomId,
          candidate: event.candidate
        })
      }
    }

    peerConnectionRef.current.oniceconnectionstatechange = () => {
      const state = peerConnectionRef.current.iceConnectionState
      console.log(' Estado ICE:', state)
      setStatus(`Estado conexión: ${state}`)
      
      if (state === 'connected' || state === 'completed') {
        setIsConnected(true)
        setError(null)
        if (onConnectionChange) {
          onConnectionChange(true)
        }
      } else if (state === 'disconnected' || state === 'failed') {
        setIsConnected(false)
        if (onConnectionChange) {
          onConnectionChange(false)
        }
      }
    }

    peerConnectionRef.current.onconnectionstatechange = () => {
      const state = peerConnectionRef.current.connectionState
      console.log(' Estado conexión:', state)
      
      if (state === 'connected') {
        setIsConnected(true)
      } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        setIsConnected(false)
      }
    }

    // Si no es el host, esperar el canal de datos
    if (!isHostPeer) {
      peerConnectionRef.current.ondatachannel = (event) => {
        console.log(' Canal de datos recibido')
        const channel = event.channel
        setupDataChannel(channel)
      }
    }
  }

  const createDataChannel = () => {
    if (!peerConnectionRef.current) {
      console.error(' No hay conexión peer para crear canal')
      return
    }

    console.log(' Creando canal de datos...')
    const channel = peerConnectionRef.current.createDataChannel('fileTransfer', {
      ordered: true
    })
    setupDataChannel(channel)
  }

  const setupDataChannel = (channel) => {
    dataChannelRef.current = channel

    channel.onopen = () => {
      console.log(' Canal de datos abierto')
      setStatus('Conexión establecida. Listo para transferir archivos.')
      setIsConnected(true)
      if (onConnectionChange) {
        onConnectionChange(true)
      }
    }

    channel.onclose = () => {
      console.log(' Canal de datos cerrado')
      setIsConnected(false)
      setStatus('Conexión cerrada')
      if (onConnectionChange) {
        onConnectionChange(false)
      }
    }

    channel.onerror = (error) => {
      console.error(' Error en canal de datos:', error)
      setError('Error en la conexión del canal')
    }

    channel.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data)

        if (message.type === 'file-info') {
          receivedFileInfoRef.current = message.data
          fileChunksRef.current = []
          setStatus(`Recibiendo: ${message.data.name} (${formatFileSize(message.data.size)})`)
          setTransferProgress(0)
          
          channel.send(JSON.stringify({ type: 'file-info-received' }))
        } else if (message.type === 'file-chunk') {
          // Convertir el array de vuelta a Uint8Array
          const chunkData = new Uint8Array(message.data)
          fileChunksRef.current.push(chunkData)
          
          if (receivedFileInfoRef.current) {
            const progress = (fileChunksRef.current.length / receivedFileInfoRef.current.totalChunks) * 100
            setTransferProgress(progress)
          }

          if (fileChunksRef.current.length === receivedFileInfoRef.current?.totalChunks) {
            await reconstructFile()
          }
        } else if (message.type === 'file-complete') {
          setStatus('Archivo enviado exitosamente')
          setTransferProgress(100)
          setTimeout(() => {
            setTransferProgress(0)
            setStatus('Listo para transferir más archivos')
          }, 2000)
        }
      } catch (error) {
        console.error(' Error procesando mensaje:', error)
      }
    }
  }

  const createOffer = async () => {
    if (!peerConnectionRef.current) {
      setError('La conexión no está inicializada')
      return
    }

    try {
      console.log(' Creando oferta...')
      const offer = await peerConnectionRef.current.createOffer()
      await peerConnectionRef.current.setLocalDescription(offer)
      
      console.log(' Enviando oferta...')
      socketRef.current.emit('offer', {
        roomId,
        offer
      })
    } catch (error) {
      console.error(' Error creando oferta:', error)
      setError('Error al iniciar conexión: ' + error.message)
    }
  }

  const handleOffer = async (offer) => {
    if (!peerConnectionRef.current) {
      setError('La conexión no está inicializada')
      return
    }

    try {
      console.log(' Procesando oferta...')
      isSettingRemoteDescRef.current = true
      
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer))
      
      // Procesar ICE candidates en buffer
      while (iceCandidatesBufferRef.current.length > 0) {
        const candidate = iceCandidatesBufferRef.current.shift()
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (err) {
          console.warn('Error agregando ICE candidate del buffer:', err)
        }
      }
      
      const answer = await peerConnectionRef.current.createAnswer()
      await peerConnectionRef.current.setLocalDescription(answer)
      
      console.log(' Enviando respuesta...')
      socketRef.current.emit('answer', {
        roomId,
        answer
      })
      
      isSettingRemoteDescRef.current = false
    } catch (error) {
      console.error(' Error manejando oferta:', error)
      setError('Error al procesar conexión: ' + error.message)
      isSettingRemoteDescRef.current = false
    }
  }

  const handleAnswer = async (answer) => {
    if (!peerConnectionRef.current) {
      setError('La conexión no está inicializada')
      return
    }

    try {
      console.log(' Procesando respuesta...')
      isSettingRemoteDescRef.current = true
      
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer))
      
      // Procesar ICE candidates en buffer
      while (iceCandidatesBufferRef.current.length > 0) {
        const candidate = iceCandidatesBufferRef.current.shift()
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (err) {
          console.warn('Error agregando ICE candidate del buffer:', err)
        }
      }
      
      isSettingRemoteDescRef.current = false
    } catch (error) {
      console.error(' Error manejando respuesta:', error)
      setError('Error al completar conexión: ' + error.message)
      isSettingRemoteDescRef.current = false
    }
  }

  const handleIceCandidate = async (candidate) => {
    if (!peerConnectionRef.current) {
      return
    }

    try {
      // Si estamos configurando la descripción remota, guardar en buffer
      if (isSettingRemoteDescRef.current) {
        iceCandidatesBufferRef.current.push(candidate)
        return
      }

      // Si ya tenemos descripción remota, agregar directamente
      if (peerConnectionRef.current.remoteDescription) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
      } else {
        // Si aún no, guardar en buffer
        iceCandidatesBufferRef.current.push(candidate)
      }
    } catch (error) {
      console.warn(' Error agregando ICE candidate:', error)
      // Si falla, guardar en buffer para intentar después
      if (!iceCandidatesBufferRef.current.includes(candidate)) {
        iceCandidatesBufferRef.current.push(candidate)
      }
    }
  }

  // Función auxiliar para esperar a que el buffer se vacíe
  const waitForBuffer = (channel, maxBufferSize = 256 * 1024) => {
    return new Promise((resolve) => {
      // Si el canal no está abierto, no esperar
      if (channel.readyState !== 'open') {
        resolve()
        return
      }

      if (channel.bufferedAmount <= maxBufferSize) {
        resolve()
        return
      }

      const checkBuffer = () => {
        if (channel.readyState !== 'open' || channel.bufferedAmount <= maxBufferSize) {
          channel.removeEventListener('bufferedamountlow', checkBuffer)
          resolve()
        }
      }

      // Usar el evento bufferedamountlow si está disponible
      if (channel.bufferedAmountLowThreshold !== undefined) {
        channel.bufferedAmountLowThreshold = maxBufferSize
        channel.addEventListener('bufferedamountlow', checkBuffer)
      } else {
        // Fallback: polling cada 50ms
        const interval = setInterval(() => {
          if (channel.readyState !== 'open' || channel.bufferedAmount <= maxBufferSize) {
            clearInterval(interval)
            resolve()
          }
        }, 50)

        // Timeout de seguridad: resolver después de 5 segundos máximo
        setTimeout(() => {
          clearInterval(interval)
          resolve()
        }, 5000)
      }
    })
  }

  const sendFile = async (file) => {
    if (!dataChannelRef.current) {
      setError('El canal de datos no está disponible')
      return
    }

    if (dataChannelRef.current.readyState !== 'open') {
      setError('El canal de datos no está abierto. Estado: ' + dataChannelRef.current.readyState)
      return
    }

    try {
      setStatus('Preparando archivo para envío...')
      const chunkSize = 16 * 1024 // 16KB chunks
      const totalChunks = Math.ceil(file.size / chunkSize)
      const maxBufferSize = 256 * 1024 // 256KB - esperar si el buffer supera esto

      // Enviar información del archivo
      dataChannelRef.current.send(JSON.stringify({
        type: 'file-info',
        data: {
          name: file.name,
          size: file.size,
          type: file.type,
          totalChunks
        }
      }))

      // Esperar confirmación
      let confirmed = false
      const confirmationPromise = new Promise((resolve) => {
        const timeout = setTimeout(() => {
          if (!confirmed) {
            console.warn(' Timeout esperando confirmación')
            resolve()
          }
        }, 2000)
        
        const handler = (event) => {
          try {
            const message = JSON.parse(event.data)
            if (message.type === 'file-info-received') {
              confirmed = true
              clearTimeout(timeout)
              dataChannelRef.current.removeEventListener('message', handler)
              resolve()
            }
          } catch (e) {
            // Ignorar
          }
        }
        dataChannelRef.current.addEventListener('message', handler)
      })

      await confirmationPromise

      setStatus(`Enviando: ${file.name}...`)
      setTransferProgress(0)

      // Enviar chunks con control de flujo
      for (let i = 0; i < totalChunks; i++) {
        // Esperar a que el buffer se vacíe si está lleno
        await waitForBuffer(dataChannelRef.current, maxBufferSize)

        const start = i * chunkSize
        const end = Math.min(start + chunkSize, file.size)
        const chunk = await file.slice(start, end).arrayBuffer()
        const uint8Array = new Uint8Array(chunk)

        try {
          dataChannelRef.current.send(JSON.stringify({
            type: 'file-chunk',
            data: Array.from(uint8Array)
          }))
        } catch (error) {
          // Si aún falla, esperar un poco más y reintentar
          if (error.message.includes('send queue is full')) {
            await waitForBuffer(dataChannelRef.current, maxBufferSize / 2)
            dataChannelRef.current.send(JSON.stringify({
              type: 'file-chunk',
              data: Array.from(uint8Array)
            }))
          } else {
            throw error
          }
        }

        const progress = ((i + 1) / totalChunks) * 100
        setTransferProgress(progress)
      }

      // Esperar a que el buffer se vacíe antes de enviar el mensaje final
      await waitForBuffer(dataChannelRef.current, maxBufferSize)

      // Confirmar envío completo
      dataChannelRef.current.send(JSON.stringify({
        type: 'file-complete'
      }))

      setStatus('Archivo enviado exitosamente')
      setTimeout(() => {
        setTransferProgress(0)
        setStatus('Listo para transferir más archivos')
      }, 2000)

    } catch (error) {
      console.error(' Error enviando archivo:', error)
      setError('Error al enviar archivo: ' + error.message)
    }
  }

  const reconstructFile = async () => {
    try {
      const fileInfo = receivedFileInfoRef.current
      const allChunks = new Uint8Array(fileInfo.size)
      let offset = 0

      for (const chunk of fileChunksRef.current) {
        allChunks.set(chunk, offset)
        offset += chunk.length
      }

      const blob = new Blob([allChunks], { type: fileInfo.type })
      const file = new File([blob], fileInfo.name, { type: fileInfo.type })

      setStatus('Archivo recibido exitosamente')
      setTransferProgress(100)
      setTimeout(() => setTransferProgress(0), 2000)

      if (onFileReceived) {
        onFileReceived(file)
      }

      // Limpiar
      fileChunksRef.current = []
      receivedFileInfoRef.current = null

    } catch (error) {
      console.error(' Error reconstruyendo archivo:', error)
      setError('Error al reconstruir archivo: ' + error.message)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return {
    isConnected,
    transferProgress,
    status,
    error,
    sendFile,
    formatFileSize
  }
}
