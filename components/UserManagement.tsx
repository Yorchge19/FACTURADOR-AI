
import React, { useState, useEffect } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { OrganizationService } from '../services/organizationService';
import { OrgMember, Permission, PERMISSION_LABELS, ALL_PERMISSIONS, InviteCode } from '../types';
import { logger } from '../services/logger';
import {
  Users, UserPlus, Shield, Trash2, Copy, RefreshCw,
  Check, X, Loader2, Mail, Key, Crown, UserCheck, AlertCircle,
  ChevronDown, ChevronUp, Building2, ToggleLeft, ToggleRight
} from 'lucide-react';

const UserManagement: React.FC = () => {
  const { organization, members, orgId, refreshMembers } = useOrganization();
  const [emailToAdd, setEmailToAdd] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addMsg, setAddMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [inviteCode, setInviteCode] = useState<InviteCode | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<string>('');
  const [codeExpired, setCodeExpired] = useState(false);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [savingPerms, setSavingPerms] = useState<string | null>(null);
  const [permState, setPermState] = useState<Record<string, Permission[]>>({});
  const [removeLoading, setRemoveLoading] = useState<string | null>(null);

  // ── Real-time countdown ───────────────────────────────────────────────────
  useEffect(() => {
    if (!inviteCode) return;
    const tick = () => {
      const diff = new Date(inviteCode.expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown('EXPIRADO');
        setCodeExpired(true);
        setInviteCode(null);   // clear from UI
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setCountdown(
        h > 0
          ? `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
          : `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
      );
      setCodeExpired(false);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [inviteCode]);

  // Init local perm state from members
  useEffect(() => {
    const initial: Record<string, Permission[]> = {};
    members.forEach(m => { initial[m.uid] = [...m.permissions]; });
    setPermState(initial);
  }, [members]);

  const userMembers = members.filter(m => m.role === 'user');

  // ── Add member by email ───────────────────────────────────────────────────
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !emailToAdd.trim()) return;
    setAddLoading(true);
    setAddMsg(null);
    try {
      const result = await OrganizationService.addMemberByEmail(orgId, emailToAdd.trim());
      setAddMsg({ type: result.success ? 'ok' : 'err', text: result.message });
      if (result.success) { setEmailToAdd(''); await refreshMembers(); }
    } catch (err) {
      logger.error('UserManagement.addMember', err);
      setAddMsg({ type: 'err', text: 'Error al agregar usuario.' });
    } finally {
      setAddLoading(false);
    }
  };

  // ── Generate invite code ──────────────────────────────────────────────────
  const handleGenerateCode = async () => {
    if (!orgId || !organization) return;
    setInviteLoading(true);
    setCodeExpired(false);
    try {
      const code = await OrganizationService.createInviteCode(orgId, organization.name, organization.ownerId);
      setInviteCode(code);
    } catch (err) {
      logger.error('UserManagement.generateCode', err);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopy = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Remove member ─────────────────────────────────────────────────────────
  const handleRemoveMember = async (uid: string) => {
    if (!orgId || !confirm('¿Eliminar a este usuario de la organización?')) return;
    setRemoveLoading(uid);
    try {
      await OrganizationService.removeMember(orgId, uid);
      await refreshMembers();
      if (expandedMember === uid) setExpandedMember(null);
    } catch (err) {
      logger.error('UserManagement.remove', err);
    } finally {
      setRemoveLoading(null);
    }
  };

  // ── Toggle permission ─────────────────────────────────────────────────────
  const togglePerm = (uid: string, perm: Permission) => {
    setPermState(prev => {
      const current = prev[uid] ?? [];
      const updated = current.includes(perm)
        ? current.filter(p => p !== perm)
        : [...current, perm];
      return { ...prev, [uid]: updated };
    });
  };

  // ── Save permissions ──────────────────────────────────────────────────────
  const handleSavePerms = async (uid: string) => {
    if (!orgId) return;
    setSavingPerms(uid);
    try {
      await OrganizationService.setMemberPermissions(orgId, uid, permState[uid] ?? []);
      await refreshMembers();
    } catch (err) {
      logger.error('UserManagement.savePerms', err);
    } finally {
      setSavingPerms(null);
    }
  };

  const permsDirty = (uid: string, member: OrgMember): boolean => {
    const current = permState[uid] ?? [];
    return JSON.stringify([...current].sort()) !== JSON.stringify([...member.permissions].sort());
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 animate-fade-in pb-20 md:pb-10 px-1 sm:px-0">
      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
          <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl bg-black flex items-center justify-center shadow-lg flex-shrink-0">
            <Users size={20} className="text-white" />
          </div>
          <span className="truncate">Gestión de Usuarios</span>
        </h2>
        <p className="text-gray-500 mt-1 text-sm md:text-base break-words">
          Organización: <span className="font-semibold text-gray-700 break-all">{organization?.name}</span>
        </p>
      </div>

      {/* ── Add by email ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-5 text-sm md:text-base">
          <Mail size={18} className="text-gray-500 flex-shrink-0" /> Agregar usuario por correo
        </h3>
        <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            required
            value={emailToAdd}
            onChange={e => setEmailToAdd(e.target.value)}
            placeholder="usuario@empresa.com"
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all text-sm"
          />
          <button type="submit" disabled={addLoading}
            className="w-full sm:w-auto px-5 py-2.5 bg-black text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all disabled:opacity-60 text-sm">
            {addLoading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            Agregar
          </button>
        </form>
        {addMsg && (
          <div className={`mt-3 flex items-center gap-2 text-sm rounded-xl px-4 py-2.5 border ${
            addMsg.type === 'ok'
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            {addMsg.type === 'ok' ? <Check size={15} /> : <AlertCircle size={15} />}
            {addMsg.text}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-3">
          El usuario debe estar registrado en la plataforma con ese correo.
        </p>
      </div>

      {/* ── Invite code ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-1 text-sm md:text-base">
          <Key size={18} className="text-gray-500 flex-shrink-0" /> Código de invitación temporal
        </h3>
        <p className="text-xs text-gray-400 mb-5">Válido por 24 horas · Un solo uso · Se elimina automáticamente al ser canjeado</p>

        {inviteCode ? (
          <div className="space-y-4">
            {/* Code display */}
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-4 md:p-5">
              <div className="flex items-center gap-2 md:gap-3 mb-3">
                <span className="flex-1 font-mono text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 tracking-[0.3em] sm:tracking-[0.5em] text-center break-all">
                  {inviteCode.code}
                </span>
                <button onClick={handleCopy}
                  className={`p-2.5 rounded-xl border transition-all flex-shrink-0 ${
                    copied ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>

              {/* Countdown bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full animate-pulse ${
                    countdown.includes('m') && parseInt(countdown) < 1 ? 'bg-red-500' : 'bg-green-500'
                  }`} />
                  <span className={`text-sm font-mono font-bold ${
                    codeExpired ? 'text-red-500'
                    : countdown.startsWith('0') || (!countdown.includes('h') && parseInt(countdown) < 10)
                      ? 'text-orange-500'
                      : 'text-gray-700'
                  }`}>
                    {codeExpired ? 'EXPIRADO' : `⏱ ${countdown}`}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  Expira: {new Date(inviteCode.expiresAt).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <AlertCircle size={11} /> Se elimina de Firestore al ser canjeado
              </p>
              <button onClick={handleGenerateCode} disabled={inviteLoading}
                className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1.5 transition-colors disabled:opacity-50">
                {inviteLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Generar nuevo
              </button>
            </div>
          </div>
        ) : (
          <button onClick={handleGenerateCode} disabled={inviteLoading}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl py-8 flex flex-col items-center gap-2 text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-all">
            {inviteLoading ? <Loader2 size={22} className="animate-spin" /> : <Key size={22} />}
            <span className="text-sm font-semibold">
              {inviteLoading ? 'Generando…' : 'Generar código temporal (24h)'}
            </span>
            <span className="text-xs text-gray-300">El código expirará automáticamente</span>
          </button>
        )}
      </div>

      {/* ── Members list ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-2">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Shield size={18} className="text-gray-500" /> Permisos por usuario
          </h3>
          <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-semibold">
            {userMembers.length} usuario{userMembers.length !== 1 ? 's' : ''}
          </span>
        </div>

        {userMembers.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-gray-300 gap-3">
            <Users size={40} strokeWidth={1} />
            <p className="text-sm font-medium text-gray-400">No hay usuarios en la organización</p>
            <p className="text-xs text-gray-300">Agrega usuarios por correo o comparte el código de invitación</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {userMembers.map(member => {
              const isExpanded = expandedMember === member.uid;
              const localPerms = permState[member.uid] ?? [];
              const dirty = permsDirty(member.uid, member);

              return (
                <div key={member.uid}>
                  {/* Member header row */}
                  <div className="px-4 md:px-6 py-3 md:py-4 flex items-start sm:items-center gap-3 hover:bg-gray-50 transition-colors">
                    <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-gray-900 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
                      {member.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate text-sm md:text-base">{member.displayName}</p>
                      <p className="text-xs text-gray-400 truncate break-all">{member.email}</p>
                      <div className="sm:hidden mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          member.permissions.length > 0
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {member.permissions.length}/{ALL_PERMISSIONS.length} permisos
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      <span className={`hidden sm:inline-flex text-xs px-2.5 py-1 rounded-full font-semibold ${
                        member.permissions.length > 0
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {member.permissions.length}/{ALL_PERMISSIONS.length} permisos
                      </span>
                      <button
                        onClick={() => setExpandedMember(isExpanded ? null : member.uid)}
                        className="p-1.5 md:p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      <button
                        onClick={() => handleRemoveMember(member.uid)}
                        disabled={removeLoading === member.uid}
                        className="p-1.5 md:p-2 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-all"
                        title="Eliminar usuario"
                      >
                        {removeLoading === member.uid ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded permissions panel */}
                  {isExpanded && (
                    <div className="px-4 md:px-6 pb-6 bg-gray-50 border-t border-gray-100">
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-4 mb-4">
                        Permisos de acceso
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {ALL_PERMISSIONS.map(perm => {
                          const meta = PERMISSION_LABELS[perm];
                          const active = localPerms.includes(perm);
                          return (
                            <button
                              key={perm}
                              onClick={() => togglePerm(member.uid, perm)}
                              className={`group relative text-left px-4 py-3 rounded-xl border transition-all ${
                                active
                                  ? 'bg-gray-900 border-gray-800 text-white'
                                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all ${
                                  active ? 'bg-white' : 'border-2 border-gray-300'
                                }`}>
                                  {active && <Check size={12} className="text-black font-black" strokeWidth={3} />}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold leading-none">{meta.label}</p>
                                  <p className={`text-xs mt-0.5 ${active ? 'text-gray-300' : 'text-gray-400'}`}>
                                    {meta.description}
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Quick actions */}
                      <div className="flex items-center gap-2 mt-4">
                        <button
                          onClick={() => setPermState(prev => ({ ...prev, [member.uid]: [...ALL_PERMISSIONS] }))}
                          className="text-xs text-gray-500 hover:text-gray-800 underline transition-colors"
                        >
                          Seleccionar todos
                        </button>
                        <span className="text-gray-300">·</span>
                        <button
                          onClick={() => setPermState(prev => ({ ...prev, [member.uid]: [] }))}
                          className="text-xs text-gray-500 hover:text-gray-800 underline transition-colors"
                        >
                          Quitar todos
                        </button>
                        <div className="flex-1" />
                        {dirty && (
                          <button
                            onClick={() => handleSavePerms(member.uid)}
                            disabled={savingPerms === member.uid}
                            className="px-5 py-2 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all flex items-center gap-2 disabled:opacity-60"
                          >
                            {savingPerms === member.uid
                              ? <><Loader2 size={14} className="animate-spin" /> Guardando…</>
                              : <><Check size={14} /> Guardar permisos</>
                            }
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
