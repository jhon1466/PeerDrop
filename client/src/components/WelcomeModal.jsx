import { Send, EyeOff, CloudOff, Shield, AlertTriangle } from 'lucide-react'
import './WelcomeModal.css'

function WelcomeModal({ onStart }) {
  return (
    <div className="welcome-overlay">
      <div className="welcome-modal">
        <div className="welcome-header">
          <div className="welcome-icon">
            <Send size={48} />
          </div>
          <h1 className="welcome-title">Bienvenido a PeerDrop</h1>
          <p className="welcome-subtitle">
            Transferencia de archivos ilimitada, directa y segura.
          </p>
        </div>

        <div className="welcome-features">
          <div className="feature-card privacy">
            <EyeOff className="feature-icon" size={32} />
            <h3 className="feature-title">Nota de Privacidad</h3>
            <p className="feature-description">
              Al usar P2P, tu IP pública es visible para quien recibe el archivo. Usa una VPN si necesitas anonimato total.
            </p>
          </div>

          <div className="feature-card cloud">
            <CloudOff className="feature-icon" size={32} />
            <h3 className="feature-title">Sin Nube Intermedia</h3>
            <p className="feature-description">
              Los archivos viajan directo de tu dispositivo al de tu amigo.
            </p>
          </div>

          <div className="feature-card encryption">
            <Shield className="feature-icon" size={32} />
            <h3 className="feature-title">Cifrado Total</h3>
            <p className="feature-description">
              Nadie puede ver tus archivos o chats, ni siquiera nosotros.
            </p>
          </div>

          <div className="feature-card warning">
            <AlertTriangle className="feature-icon" size={32} />
            <h3 className="feature-title">¡No cierres la pestaña!</h3>
            <p className="feature-description">
              Si tú o tu amigo cierran la página, la descarga se cancela.
            </p>
          </div>
        </div>

        <button className="welcome-button" onClick={onStart}>
          Entendido, ¡Empezar!
        </button>
      </div>
    </div>
  )
}

export default WelcomeModal

