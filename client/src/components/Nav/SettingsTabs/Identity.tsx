/* eslint-disable i18next/no-literal-string */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable no-nested-ternary */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Mail,
  Phone,
  MessageSquare,
  Send,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  QrCode,
  Wifi,
  Smartphone,
  Check,
  Instagram,
  Key,
} from 'lucide-react';
interface Message {
  id: string;
  platform: string;
  sender?: string;
  to?: string;
  content: string;
  timestamp: string;
}

interface IdentityStatus {
  configured: boolean;
  apiKey?: string;
  publicKey?: string;
  privateKey?: string;
  provisioned: boolean;
  email: string | null;
  phone: string | null;
}

export default function Identity() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<IdentityStatus | null>(null);
  const [receivedMessages, setReceivedMessages] = useState<Message[]>([]);
  const [sentMessages, setSentMessages] = useState<Message[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);

  // Config key states
  const [publicKeyInput, setPublicKeyInput] = useState<string>('');
  const [privateKeyInput, setPrivateKeyInput] = useState<string>('');
  const [savingApiKey, setSavingApiKey] = useState<boolean>(false);

  // Connection QR states
  const [selectedPlatform, setSelectedPlatform] = useState<string>('WhatsApp');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState<boolean>(false);
  const [qrLoading, setQrLoading] = useState<boolean>(false);

  // Send message states
  const [sendForm, setSendForm] = useState({
    platform: 'WhatsApp',
    to: '',
    content: '',
  });
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active sub-tab for message history ('received' or 'sent')
  const [activeMessageTab, setActiveMessageTab] = useState<'received' | 'sent'>('received');

  const fetchStatusAndData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const statusRes = await axios.get('/api/identity/status');
      setStatus(statusRes.data);
      setPublicKeyInput(statusRes.data.publicKey || '');
      setPrivateKeyInput(statusRes.data.privateKey || '');

      if (statusRes.data.provisioned) {
        const msgsRes = await axios.get('/api/identity/messages');
        setReceivedMessages(msgsRes.data.received || []);
        setSentMessages(msgsRes.data.sent || []);
      }

      const platformsRes = await axios.get('/api/identity/platforms');
      setPlatforms(platformsRes.data || ['WhatsApp', 'Telegram', 'Instagram']);
    } catch (err: any) {
      console.error('Error fetching identity info:', err);
      setErrorMsg('No se pudo cargar la información de identidad.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusAndData();
  }, []);

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingApiKey(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await axios.post('/api/identity/config', {
        publicKey: publicKeyInput,
        privateKey: privateKeyInput,
      });
      if (res.data.success) {
        setSuccessMsg('Configuración de KeyID guardada exitosamente en la base de datos.');
        // Refresh status
        const statusRes = await axios.get('/api/identity/status');
        setStatus(statusRes.data);
      }
    } catch (err: any) {
      console.error('Error saving config:', err);
      setErrorMsg('Error al guardar la configuración.');
    } finally {
      setSavingApiKey(false);
    }
  };

  const handleProvision = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await axios.post('/api/identity/provision');
      if (res.data.success) {
        setStatus({
          configured: true,
          provisioned: true,
          email: res.data.email,
          phone: res.data.phone,
          publicKey: res.data.publicKey,
          privateKey: res.data.privateKey,
        });
        setPublicKeyInput(res.data.publicKey || '');
        setPrivateKeyInput(res.data.privateKey || '');
        // Fetch fresh messages
        const msgsRes = await axios.get('/api/identity/messages');
        setReceivedMessages(msgsRes.data.received || []);
        setSentMessages(msgsRes.data.sent || []);
      }
    } catch (err: any) {
      console.error('Error provisioning identity:', err);
      setErrorMsg('Error al crear la identidad digital.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectPlatform = async (platform: string) => {
    setSelectedPlatform(platform);
    setShowQr(true);
    setQrLoading(true);
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=athena-core-qr-simulation-${platform.toLowerCase()}`;
      setQrCodeUrl(qrUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setQrLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendForm.to || !sendForm.content) {
      setErrorMsg('Por favor completa todos los campos.');
      return;
    }

    setSending(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await axios.post('/api/identity/send', {
        platform: sendForm.platform,
        to: sendForm.to,
        content: sendForm.content,
      });

      if (res.data.success) {
        setSuccessMsg(`Mensaje enviado exitosamente por ${sendForm.platform}!`);
        setSendForm({ ...sendForm, to: '', content: '' });
        // Refresh message history
        const msgsRes = await axios.get('/api/identity/messages');
        setReceivedMessages(msgsRes.data.received || []);
        setSentMessages(msgsRes.data.sent || []);
        setActiveMessageTab('sent');
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      setErrorMsg(err.response?.data?.error || 'Error al enviar el mensaje.');
    } finally {
      setSending(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'whatsapp':
        return <Smartphone className="h-4 w-4 text-green-500" />;
      case 'telegram':
        return <Send className="h-4 w-4 text-blue-400" />;
      case 'instagram':
        return <Instagram className="h-4 w-4 text-pink-500" />;
      case 'email':
        return <Mail className="h-4 w-4 text-amber-500" />;
      case 'sms':
        return <Phone className="h-4 w-4 text-purple-400" />;
      default:
        return <MessageSquare className="h-4 w-4 text-text-secondary" />;
    }
  };

  if (loading && !status) {
    return (
      <div className="flex h-48 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-text-secondary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 text-sm text-text-primary">
      {/* Header section with KeyID state */}
      <div className="flex flex-col gap-4 rounded-xl border border-border-light bg-surface-secondary p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Wifi
              className={`h-5 w-5 ${status?.configured ? 'text-green-500' : 'text-text-tertiary'}`}
            />
            <h3 className="text-base font-semibold">Identidad Digital (KeyID.ai)</h3>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              status?.provisioned
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
            }`}
          >
            {status?.provisioned ? <Check className="h-3 w-3" /> : null}
            {status?.provisioned ? 'Activa' : 'No Creada'}
          </span>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-100/10 p-3 text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-100/10 p-3 text-green-600 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* API Key and Ed25519 Keys management inside the settings box */}
        <form
          onSubmit={handleSaveApiKey}
          className="flex flex-col gap-4 rounded-lg border border-border-light bg-surface-tertiary p-4"
        >
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-brand-purple" />
            <span className="text-xs font-semibold text-text-primary">
              Configuración de Llaves Criptográficas (Ed25519)
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Clave Pública Ed25519 (Hex)</label>
              <input
                type="text"
                value={publicKeyInput}
                onChange={(e) => setPublicKeyInput(e.target.value)}
                placeholder="Se auto-generará si se deja en blanco"
                className="rounded-lg border border-border-light bg-surface-secondary p-2 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-brand-purple"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Clave Privada Ed25519 (Hex)</label>
              <input
                type="password"
                value={privateKeyInput}
                onChange={(e) => setPrivateKeyInput(e.target.value)}
                placeholder="Se auto-generará si se deja en blanco"
                className="rounded-lg border border-border-light bg-surface-secondary p-2 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-brand-purple"
              />
            </div>
          </div>

          <div className="flex justify-between items-center mt-2 flex-col md:flex-row gap-3">
            <p className="text-[11px] text-text-tertiary leading-normal max-w-xl">
              Las claves Ed25519 se utilizan para firmar solicitudes y autenticarte con el servicio externo de KeyID.ai. Si no las tienes, se generarán de forma segura al crear la identidad de la IA.
            </p>
            <button
              type="submit"
              disabled={savingApiKey}
              className="hover:bg-brand-purple/90 flex items-center justify-center gap-1.5 rounded-lg bg-brand-purple px-4 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {savingApiKey ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                'Guardar Configuración'
              )}
            </button>
          </div>
        </form>

        {/* Detailed state or action button */}
        {!status?.provisioned ? (
          <div className="flex flex-col gap-3 pt-2">
            <p className="text-xs leading-relaxed text-text-secondary">
              La identidad digital de Athena Core no ha sido creada todavía. Una vez creada, la IA
              tendrá su propio correo electrónico y número de teléfono dedicados de KeyID para
              comunicarse, registrarse en servicios externos y enviar mensajes en redes sociales de
              forma autónoma.
            </p>
            <button
              onClick={handleProvision}
              disabled={loading}
              className="hover:bg-brand-purple/90 flex items-center justify-center gap-2 rounded-lg bg-brand-purple px-4 py-2 font-medium text-white transition-colors disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <QrCode className="h-4 w-4" />
                  Crear identidad de la IA
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-2">
            <div className="flex flex-col gap-1.5 rounded-lg border border-border-light bg-surface-tertiary p-3">
              <span className="text-xs font-medium text-text-secondary">
                Correo Electrónico Dedicado
              </span>
              <span className="selection:bg-brand-purple/20 break-all font-mono text-xs">
                {status?.email}
              </span>
            </div>
            <div className="flex flex-col gap-1.5 rounded-lg border border-border-light bg-surface-tertiary p-3">
              <span className="text-xs font-medium text-text-secondary">Teléfono Dedicado</span>
              <span className="selection:bg-brand-purple/20 break-all font-mono text-xs">
                {status?.phone}
              </span>
            </div>
            {status?.publicKey && (
              <div className="flex flex-col gap-1.5 rounded-lg border border-border-light bg-surface-tertiary p-3 md:col-span-2">
                <span className="text-xs font-medium text-text-secondary">Clave Pública Activa (Ed25519)</span>
                <span className="selection:bg-brand-purple/20 break-all font-mono text-xs">
                  {status.publicKey}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {status?.provisioned && (
        <>
          {/* Section for Platform Connection QRs */}
          <div className="flex flex-col gap-4 rounded-xl border border-border-light bg-surface-secondary p-5">
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <QrCode className="h-4 w-4 text-brand-purple" />
              Conectar Redes Sociales (WhatsApp, Telegram, Instagram)
            </h4>
            <p className="text-xs leading-relaxed text-text-secondary">
              Autentica y vincula las cuentas de mensajería para que Athena Core pueda enviar y
              recibir mensajes directamente en las respectivas redes.
            </p>
            <div className="flex flex-wrap gap-2.5">
              {platforms.map((platform) => (
                <button
                  key={platform}
                  onClick={() => handleConnectPlatform(platform)}
                  className={`flex items-center gap-2 rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    selectedPlatform === platform && showQr
                      ? 'bg-brand-purple/10 border-brand-purple text-brand-purple'
                      : 'border-border-light bg-surface-tertiary text-text-primary hover:bg-surface-hover'
                  }`}
                >
                  {getPlatformIcon(platform)}
                  Conectar {platform}
                </button>
              ))}
            </div>

            {showQr && (
              <div className="mt-2 flex flex-col items-center gap-4 rounded-lg border border-border-light bg-surface-tertiary p-4 md:flex-row">
                <div className="flex min-h-[160px] min-w-[160px] items-center justify-center rounded-lg border border-border-light bg-white p-2.5 shadow-sm">
                  {qrLoading ? (
                    <RefreshCw className="h-6 w-6 animate-spin text-brand-purple" />
                  ) : (
                    qrCodeUrl && (
                      <img
                        src={qrCodeUrl}
                        alt={`QR Code para ${selectedPlatform}`}
                        className="h-36 w-36"
                      />
                    )
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                    <Wifi className="h-3.5 w-3.5 animate-pulse text-amber-500" />
                    Autenticación QR para {selectedPlatform}
                  </span>
                  <p className="text-xs leading-relaxed text-text-secondary">
                    Abre la aplicación de {selectedPlatform} en tu teléfono, ve a "Dispositivos
                    vinculados" o "Configuración de cuentas" y escanea el código QR para autorizar a
                    Athena Core.
                  </p>
                  <button
                    onClick={() => setShowQr(false)}
                    className="mt-1 self-start text-xs text-text-tertiary underline hover:text-text-primary"
                  >
                    Ocultar QR
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Form to send WhatsApp, Telegram, Instagram messages */}
          <div className="flex flex-col gap-4 rounded-xl border border-border-light bg-surface-secondary p-5">
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <Send className="h-4 w-4 text-brand-purple" />
              Enviar Mensaje (Identidad Principal)
            </h4>
            <form onSubmit={handleSendMessage} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-secondary">Plataforma</label>
                  <select
                    value={sendForm.platform}
                    onChange={(e) => setSendForm({ ...sendForm, platform: e.target.value })}
                    className="rounded-lg border border-border-light bg-surface-tertiary p-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-purple"
                  >
                    {platforms.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-secondary">
                    Destinatario (Número o Usuario)
                  </label>
                  <input
                    type="text"
                    value={sendForm.to}
                    onChange={(e) => setSendForm({ ...sendForm, to: e.target.value })}
                    placeholder="Ej: +5491122334455 o @nombre_usuario"
                    className="rounded-lg border border-border-light bg-surface-tertiary p-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-purple"
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-secondary">
                  Contenido del Mensaje
                </label>
                <textarea
                  value={sendForm.content}
                  onChange={(e) => setSendForm({ ...sendForm, content: e.target.value })}
                  placeholder="Escribe el mensaje que enviará la IA..."
                  rows={3}
                  className="resize-none rounded-lg border border-border-light bg-surface-tertiary p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-purple"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={sending}
                className="hover:bg-brand-purple/90 flex items-center gap-2 self-end rounded-lg bg-brand-purple px-4 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-50"
              >
                {sending ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Enviar Mensaje
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Section for Messages list (Inbox and Sent history) */}
          <div className="flex flex-col gap-4 rounded-xl border border-border-light bg-surface-secondary p-5">
            <div className="flex items-center justify-between border-b border-border-light pb-2">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveMessageTab('received')}
                  className={`relative pb-2 text-sm font-semibold transition-colors ${
                    activeMessageTab === 'received'
                      ? 'text-brand-purple'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Mensajes Recibidos ({receivedMessages.length})
                  {activeMessageTab === 'received' && (
                    <span className="absolute bottom-[-9px] left-0 right-0 h-0.5 rounded-full bg-brand-purple" />
                  )}
                </button>
                <button
                  onClick={() => setActiveMessageTab('sent')}
                  className={`relative pb-2 text-sm font-semibold transition-colors ${
                    activeMessageTab === 'sent'
                      ? 'text-brand-purple'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Historial de Envíos ({sentMessages.length})
                  {activeMessageTab === 'sent' && (
                    <span className="absolute bottom-[-9px] left-0 right-0 h-0.5 rounded-full bg-brand-purple" />
                  )}
                </button>
              </div>
              <button
                onClick={fetchStatusAndData}
                className="rounded-md p-1 text-text-tertiary transition-colors hover:text-text-primary"
                title="Sincronizar mensajes"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex max-h-[300px] flex-col gap-2.5 overflow-y-auto pr-1">
              {activeMessageTab === 'received' ? (
                receivedMessages.length === 0 ? (
                  <p className="py-4 text-center text-xs text-text-tertiary">
                    No hay mensajes recibidos.
                  </p>
                ) : (
                  receivedMessages.map((msg) => (
                    <div
                      key={msg.id || msg._id}
                      className="flex flex-col gap-1.5 rounded-lg border border-border-light bg-surface-tertiary p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-semibold">
                          {getPlatformIcon(msg.platform)}
                          {msg.sender}
                        </span>
                        <span className="text-[10px] text-text-tertiary">
                          {new Date(msg.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="break-words pl-5 text-xs leading-relaxed text-text-secondary">
                        {msg.content}
                      </p>
                    </div>
                  ))
                )
              ) : sentMessages.length === 0 ? (
                <p className="py-4 text-center text-xs text-text-tertiary">
                  No se han registrado envíos.
                </p>
              ) : (
                sentMessages.map((msg) => (
                  <div
                    key={msg.id || msg._id}
                    className="flex flex-col gap-1.5 rounded-lg border border-border-light bg-surface-tertiary p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold">
                        {getPlatformIcon(msg.platform)}
                        Para: {msg.to}
                      </span>
                      <span className="text-[10px] text-text-tertiary">
                        {new Date(msg.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="break-words pl-5 text-xs leading-relaxed text-text-secondary">
                      {msg.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
