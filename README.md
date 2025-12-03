# PeerDrop - Transferencia de Archivos P2P

Transferencia de archivos peer-to-peer (P2P) directa entre navegadores, sin servidores intermedios para almacenar archivos. Los archivos viajan directamente de tu dispositivo al de tu amigo usando WebRTC.

## 🚀 Características

-  **Transferencia P2P directa**: Los archivos viajan directamente entre navegadores sin pasar por servidores
-  **Sin almacenamiento intermedio**: No se guardan archivos en servidores
-  **Cifrado end-to-end**: WebRTC proporciona cifrado automático
-  **Interfaz moderna**: UI elegante y fácil de usar
-  **Transferencia ilimitada**: Sin límites de tamaño (solo limitado por la RAM del navegador)

## 📋 Requisitos Previos

- Node.js 18+ y npm
- Un navegador moderno que soporte WebRTC (Chrome, Firefox, Edge, Safari)

## Instalación

1. **Clonar o descargar el proyecto**

2. **Instalar dependencias del servidor de señalización:**
   ```bash
   cd server
   npm install
   ```

3. **Instalar dependencias del cliente:**
   ```bash
   cd ../client
   npm install
   ```

4. **Volver a la raíz del proyecto:**
   ```bash
   cd ..
   npm install
   ```

## 🎯 Uso

### Desarrollo Local

1. **Iniciar el servidor de señalización:**
   ```bash
   cd server
   npm run dev
   ```
   El servidor se ejecutará en `http://localhost:3001`

2. **En otra terminal, iniciar el cliente:**
   ```bash
   cd client
   npm run dev
   ```
   La aplicación se abrirá en `http://localhost:5173`

3. **O usar el script combinado (desde la raíz):**
   ```bash
   npm run dev
   ```

### Cómo Transferir Archivos

1. **Creador de sala (Persona A):**
   - Abre la aplicación en tu navegador
   - Se generará automáticamente un ID de sala
   - Copia el enlace y compártelo con tu amigo

2. **Receptor (Persona B):**
   - Abre el enlace compartido o ingresa el ID de la sala
   - La conexión se establecerá automáticamente

3. **Transferir:**
   - Una vez conectados, cualquiera puede seleccionar un archivo para enviar
   - El archivo se transfiere directamente entre navegadores
   - El receptor recibirá automáticamente el archivo

### Importante

-  **No cierres la pestaña** durante la transferencia
-  Tu **IP pública es visible** para el receptor (usa VPN si necesitas anonimato)
-  La transferencia se cancela si alguna de las partes cierra la página

## 🌐 Despliegue

### Servidor de Señalización

Para producción, puedes desplegar el servidor de señalización en servicios como:
- Heroku
- Railway
- Render
- DigitalOcean

**Variable de entorno:**
```
PORT=3001
```

### Cliente (Frontend)

El frontend se puede desplegar en:
- Vercel (recomendado)
- Netlify
- GitHub Pages

**Variable de entorno:**
```
VITE_SIGNALING_SERVER=https://tu-servidor-signalizacion.com
```

### Vercel (Recomendado)

1. **Desplegar el servidor:**
   - Conecta tu repositorio a Vercel
   - Configura el directorio raíz como `server`
   - Agrega la variable de entorno `PORT`

2. **Desplegar el cliente:**
   - Crea otro proyecto en Vercel para el cliente
   - Configura el directorio raíz como `client`
   - Agrega la variable de entorno `VITE_SIGNALING_SERVER` con la URL de tu servidor

## 🏗️ Arquitectura

```
┌─────────────┐         ┌──────────────────────┐         ┌─────────────┐
│  Navegador  │────────▶│  Servidor de         │────────▶│  Navegador  │
│   (Host)    │ Señal   │  Señalización        │  Señal  │   (Peer)    │
│             │────────▶│  (Socket.io)         │────────▶│             │
└─────────────┘         └──────────────────────┘         └─────────────┘
       │                          │                              │
       │                          │                              │
       └──────────────────────────┴──────────────────────────────┘
                                  │
                        (Solo para establecer conexión)
                        (No almacena archivos)

       ┌──────────────────────────────────────────────┐
       │                                              │
       │        Conexión WebRTC Directa               │
       │    (Archivos viajan directamente P2P)        │
       │                                              │
       └──────────────────────────────────────────────┘
```

- **Servidor de señalización**: Solo ayuda a establecer la conexión WebRTC inicial. No almacena archivos.
- **Conexión WebRTC**: Una vez establecida, los archivos viajan directamente entre navegadores.

## 🛠️ Tecnologías Utilizadas

- **Frontend:**
  - React 18
  - Vite
  - Socket.io Client
  - Lucide React (iconos)

- **Backend:**
  - Node.js
  - Express
  - Socket.io
  - CORS

- **P2P:**
  - WebRTC (DataChannels)

## 📝 Notas

- El servidor de señalización es necesario solo para establecer la conexión inicial (intercambio de ofertas/respuestas WebRTC)
- Una vez establecida la conexión WebRTC, los archivos viajan directamente entre navegadores
- Si cierras la pestaña, la conexión se corta y la transferencia se cancela
- El tamaño máximo de archivo está limitado por la memoria disponible del navegador

## 🔒 Privacidad

- WebRTC proporciona cifrado automático para la transferencia
- Tu IP pública será visible para el receptor
- Si necesitas anonimato total, usa una VPN
- No se almacenan archivos en servidores intermedios

## 📄 Licencia

MIT

## 🤝 Contribuir

Las contribuciones son bienvenidas. Siéntete libre de abrir un issue o pull request.

---

**Hecho con ❤️ para transferencias de archivos libres y directas**

