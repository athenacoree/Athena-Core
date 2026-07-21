import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { MCPIcon } from '@librechat/client';
import { PermissionBits, hasPermissions } from 'librechat-data-provider';
import type { MCPServerStatusIconProps } from '~/components/MCP/MCPServerStatusIcon';
import type { MCPServerDefinition } from '~/hooks';
import MCPServerDialog from './MCPServerDialog';
import { getStatusDotColor } from './MCPStatusBadge';
import MCPCardActions from './MCPCardActions';
import { useMCPServerManager, useLocalize } from '~/hooks';
import { cn } from '~/utils';

const WhatsAppPanel = () => {
  const [status, setStatus] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchStatus = async () => {
    try {
      const res = await axios.get('/api/mcp/whatsapp/admin-status');
      const data = res.data;
      if (data.success) {
        setStatus(data);
        if (data.agentId) {
          setSelectedAgent(data.agentId);
        }
      }
    } catch (e) {
      console.error('Error fetching WhatsApp status:', e);
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await axios.get('/api/agents');
      const data = res.data;
      if (data.data) {
        setAgents(data.data);
      }
    } catch (e) {
      console.error('Error fetching agents:', e);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchAgents();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleInitialize = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/mcp/whatsapp/initialize', { agentId: selectedAgent });
      const data = res.data;
      if (data.success) {
        fetchStatus();
      } else {
        setError(data.error || 'Failed to initialize WhatsApp');
      }
    } catch (e) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('¿Seguro que deseas reiniciar la sesión de WhatsApp? Se desconectará la cuenta actual.')) {
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post('/api/mcp/whatsapp/admin-reset');
      const data = res.data;
      if (data.success) {
        fetchStatus();
      }
    } catch (e) {
      console.error('Error resetting WhatsApp:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 space-y-3 rounded-md bg-surface-secondary p-3 border border-border-light text-xs">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-text-primary">WhatsApp Integración</span>
        <span className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
          status?.state === 'connected' ? "bg-green-500/20 text-green-500" :
          status?.state === 'connecting' ? "bg-blue-500/20 text-blue-500 animate-pulse" :
          status?.state === 'qr' ? "bg-yellow-500/20 text-yellow-500" :
          "bg-red-500/20 text-red-500"
        )}>
          {status?.state || 'disconnected'}
        </span>
      </div>

      {status?.linkedNumber && (
        <div className="text-text-secondary">
          <strong>Número Vinculado:</strong> {status.linkedNumber}
        </div>
      )}

      <div className="space-y-1">
        <label className="block text-[10px] uppercase font-bold text-text-secondary">Agente de IA Principal</label>
        <select
          value={selectedAgent}
          onChange={(e) => setSelectedAgent(e.target.value)}
          className="w-full rounded-md border border-border-light bg-surface-primary p-1.5 text-text-primary outline-none"
          disabled={loading || status?.state === 'connected'}
        >
          <option value="">Selecciona un Agente...</option>
          {agents.map((agent: any) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
      </div>

      {status?.state === 'qr' && status?.qrCode && (
        <div className="flex flex-col items-center justify-center space-y-2 rounded border border-border-light bg-white p-3">
          <span className="text-[10px] font-bold text-gray-700">ESCANEA ESTE CÓDIGO QR</span>
          <img src={status.qrCode} alt="WhatsApp QR Code" className="size-36 object-contain" />
          <span className="text-[9px] text-gray-500 text-center">Abre WhatsApp &gt; Dispositivos vinculados &gt; Vincular dispositivo</span>
        </div>
      )}

      {error && <div className="text-red-500 text-[10px]">{error}</div>}

      <div className="flex gap-2">
        {status?.state !== 'connected' && status?.state !== 'qr' && status?.state !== 'connecting' && (
          <button
            onClick={handleInitialize}
            disabled={loading || !selectedAgent}
            className="flex-1 rounded bg-green-600 py-1.5 font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Iniciando...' : 'Generar QR / Conectar'}
          </button>
        )}

        {(status?.state === 'connected' || status?.state === 'qr' || status?.state === 'connecting') && (
          <button
            onClick={handleReset}
            disabled={loading}
            className="flex-1 rounded bg-red-600 py-1.5 font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            Reiniciar Sesión (Desconectar)
          </button>
        )}
      </div>

      {status?.interactions && status.interactions.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border-light space-y-1">
          <div className="text-[10px] uppercase font-bold text-text-secondary">Soporte - Usuarios Activos ({status.interactions.length})</div>
          <div className="max-h-24 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
            {status.interactions.map((i: any) => (
              <div key={i.jid} className="flex justify-between items-center bg-surface-primary p-1.5 rounded border border-border-light">
                <span className="font-medium text-text-primary truncate max-w-[120px]">{i.pushName || i.jid.split('@')[0]}</span>
                <span className="text-[9px] text-text-secondary">{new Date(i.lastInteraction).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface MCPServerCardProps {
  server: MCPServerDefinition;
  getServerStatusIconProps: (serverName: string) => MCPServerStatusIconProps;
  canCreateEditMCPs: boolean;
}

/**
 * Compact card component for displaying an MCP server with status and actions.
 *
 * Visual design:
 * - Status shown via colored dot on icon (no separate badge - avoids redundancy)
 * - Action buttons clearly indicate available operations
 * - Consistent with MCPServerMenuItem in chat dropdown
 */
export default function MCPServerCard({
  server,
  getServerStatusIconProps,
  canCreateEditMCPs,
}: MCPServerCardProps) {
  const localize = useLocalize();
  const triggerRef = useRef<HTMLDivElement>(null);
  const { initializeServer, revokeOAuthForServer } = useMCPServerManager();
  const [dialogOpen, setDialogOpen] = useState(false);

  const statusIconProps = getServerStatusIconProps(server.serverName);
  const {
    serverStatus,
    onConfigClick,
    isInitializing,
    canCancel,
    onCancel,
    hasCustomUserVars = false,
  } = statusIconProps;

  const canEditThisServer = hasPermissions(server.effectivePermissions, PermissionBits.EDIT);
  const displayName = server.config?.title || server.serverName;
  const description = server.config?.description;
  const statusDotColor = getStatusDotColor(serverStatus, isInitializing);
  const canEdit = canCreateEditMCPs && canEditThisServer;

  const handleInitialize = () => {
    /** If server has custom user vars and is not already connected, show config dialog first
     *  This ensures users can enter credentials before initialization attempts
     */
    if (hasCustomUserVars && serverStatus?.connectionState !== 'connected') {
      onConfigClick({ stopPropagation: () => {}, preventDefault: () => {} } as React.MouseEvent);
      return;
    }
    initializeServer(server.serverName);
  };

  const handleRevoke = () => {
    revokeOAuthForServer(server.serverName);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDialogOpen(true);
  };

  // Determine status text for accessibility
  const getStatusText = () => {
    if (isInitializing) return localize('com_nav_mcp_status_initializing');
    if (!serverStatus) return localize('com_nav_mcp_status_unknown');
    const { connectionState, requiresOAuth } = serverStatus;
    if (connectionState === 'connected') return localize('com_nav_mcp_status_connected');
    if (connectionState === 'connecting') return localize('com_nav_mcp_status_connecting');
    if (connectionState === 'error') return localize('com_nav_mcp_status_error');
    if (connectionState === 'disconnected') {
      return requiresOAuth
        ? localize('com_nav_mcp_status_needs_auth')
        : localize('com_nav_mcp_status_disconnected');
    }
    return localize('com_nav_mcp_status_unknown');
  };

  const isWhatsAppServer = server.serverName.toLowerCase() === 'whatsapp';

  return (
    <>
      <div className="flex flex-col w-full">
        <div
          className={cn(
            'group flex items-center gap-3 rounded-lg px-3 py-2.5',
            'border border-border-light bg-transparent',
          )}
          aria-label={`${displayName} - ${getStatusText()}`}
        >
          {/* Server Icon with Status Dot */}
          <div className="relative flex-shrink-0">
            {server.config?.iconPath ? (
              <img
                src={server.config.iconPath}
                className="size-8 rounded-lg object-cover"
                alt=""
                aria-hidden="true"
              />
            ) : (
              <div className="flex size-8 items-center justify-center rounded-lg bg-surface-tertiary">
                <MCPIcon className="size-5 text-text-secondary" aria-hidden="true" />
              </div>
            )}
            {/* Status dot - color indicates connection state */}
            <div
              className={cn(
                'absolute -bottom-0.5 -right-0.5 size-3 rounded-full',
                'border-2 border-surface-primary',
                statusDotColor,
                (isInitializing || serverStatus?.connectionState === 'connecting') && 'animate-pulse',
              )}
              aria-hidden="true"
            />
          </div>

          {/* Server Info */}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-text-primary">{displayName}</div>
            {description && <p className="truncate text-xs text-text-secondary">{description}</p>}
          </div>

          {/* Actions */}
          <div className="flex-shrink-0">
            <MCPCardActions
              serverName={server.serverName}
              serverStatus={serverStatus}
              isInitializing={isInitializing}
              canCancel={canCancel}
              hasCustomUserVars={hasCustomUserVars}
              canEdit={canEdit}
              editButtonRef={triggerRef}
              onEditClick={handleEditClick}
              onConfigClick={onConfigClick}
              onInitialize={handleInitialize}
              onCancel={onCancel}
              onRevoke={handleRevoke}
            />
          </div>
        </div>

        {/* WhatsApp-Specific Integrated Control Panel (only visible to Admins/Managers) */}
        {isWhatsAppServer && canCreateEditMCPs && <WhatsAppPanel />}
      </div>

      {/* Edit Dialog - separate from card */}
      {canEdit && (
        <MCPServerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          triggerRef={triggerRef}
          server={server}
        />
      )}
    </>
  );
}
