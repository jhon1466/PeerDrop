/**
 * Detecta automáticamente la URL del servidor de señalización
 * basándose en la URL actual del navegador
 */
export function getSignalingServer() {
  // 1. Primero verificar si hay una variable de entorno definida (tiene prioridad)
  const envServer = import.meta.env.VITE_SIGNALING_SERVER
  if (envServer && envServer.trim() !== '') {
    console.log('Usando servidor de señalización desde variable de entorno:', envServer)
    return envServer.trim()
  }

  // 2. Verificar si hay una configuración guardada en localStorage
  const savedServer = localStorage.getItem('signaling_server_url')
  if (savedServer && savedServer.trim() !== '') {
    console.log('Usando servidor de señalización guardado:', savedServer)
    return savedServer.trim()
  }

  // 3. Detectar automáticamente basándose en la URL actual
  const currentUrl = window.location.origin
  const hostname = window.location.hostname
  const protocol = window.location.protocol

  console.log(' Detectando servidor automáticamente:', { hostname, currentUrl })

  // Si estamos en localhost, usar localhost para el servidor
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '') {
    const localServer = 'http://localhost:3001'
    console.log(' Detectado localhost, usando:', localServer)
    return localServer
  }

  // Si estamos en ngrok u otro túnel, asumir que el servidor está en la misma URL base
  // pero necesitamos el túnel del servidor (generalmente diferente al del cliente)
  if (hostname.includes('ngrok') || hostname.includes('ngrok-free')) {
    // Para ngrok, normalmente necesitas un túnel separado para el servidor
    // Intentar usar la misma URL base (asumiendo que ngrok redirige el puerto)
    // O mejor aún, intentar detectar si hay un proxy configurado
    
    // Si el cliente está en ngrok, el servidor debería estar en otro túnel ngrok
    // Por ahora, asumimos que está en el mismo dominio (para desarrollo)
    // En producción, deberías configurar VITE_SIGNALING_SERVER
    
    // Intentar usar el mismo dominio (ngrok puede redirigir diferentes puertos)
    const ngrokServer = currentUrl.replace(/:\d+$/, ':3001').replace(/\/$/, '')
    console.log('🌐 Detectado ngrok, intentando usar:', ngrokServer)
    console.warn(' Si no funciona, configura VITE_SIGNALING_SERVER con la URL del túnel del servidor')
    return ngrokServer
  }

  // Para producción (otros dominios), intentar usar el mismo dominio
  // Pero en producción deberías tener VITE_SIGNALING_SERVER configurado
  const productionServer = `${protocol}//${hostname}:3001`
  console.log('🌍 Modo producción, usando:', productionServer)
  return productionServer
}

/**
 * Obtiene la URL del servidor de señalización para Socket.io
 * Maneja tanto HTTP como HTTPS
 */
export function getSocketIoUrl() {
  const serverUrl = getSignalingServer()
  
  // Asegurarse de que la URL no termine en /
  const cleanUrl = serverUrl.replace(/\/$/, '')
  
  console.log(' URL final del servidor de señalización:', cleanUrl)
  
  return cleanUrl
}

/**
 * Guarda la URL del servidor en localStorage para uso futuro
 */
export function setSignalingServer(url) {
  if (url && url.trim() !== '') {
    localStorage.setItem('signaling_server_url', url.trim())
    console.log('💾 URL del servidor guardada:', url.trim())
  }
}

/**
 * Obtiene la URL del servidor guardada
 */
export function getSavedSignalingServer() {
  return localStorage.getItem('signaling_server_url')
}

/**
 * Limpia la URL del servidor guardada
 */
export function clearSavedSignalingServer() {
  localStorage.removeItem('signaling_server_url')
}

