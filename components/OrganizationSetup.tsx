
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { OrganizationService } from '../services/organizationService';
import { isFirebaseInitialized } from '../services/firebase';
import { logger } from '../services/logger';
import {
  Building2, Users, Plus, Key, Loader2, ChevronRight,
  Sparkles, ArrowLeft, CheckCircle2, AlertCircle, LogOut
} from 'lucide-react';

type Step = 'choose' | 'create' | 'join';

const OrganizationSetup: React.FC = () => {
  const { user, userProfile, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('choose');
  const [orgName, setOrgName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  /**
   * Refreshes the user profile and polls until organizationId is set
   * (Firestore propagation can lag slightly after createOrganization writes).
   */
  const waitForOrg = async (): Promise<void> => {
    for (let i = 0; i < 8; i++) {
      await refreshProfile();
      const profile = await OrganizationService.getUserProfile(user!.uid);
      if (profile?.organizationId) {
        navigate('/workspace', { replace: true });
        return;
      }
      await new Promise(r => setTimeout(r, 600));
    }
    // Fallback: force navigation even if profile didn't update
    navigate('/workspace', { replace: true });
  };

  const email = user?.email ?? '';
  const displayName = userProfile?.displayName ?? email.split('@')[0];

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;
    setLoading(true);
    setError('');
    try {
      // Modo demo (sin Firebase): crear org local en localStorage
      if (!isFirebaseInitialized) {
        const demoOrgId = 'demo-org-' + Date.now();
        localStorage.setItem('fai_demo_orgId', demoOrgId);
        localStorage.setItem('fai_demo_orgName', orgName.trim());
        // Forzar recarga del perfil demo (AuthContext lee fai_demo_orgId en refresh)
        // Actualizar el perfil en memoria via reload
        await new Promise(r => setTimeout(r, 300));
        window.location.hash = '#/workspace';
        window.location.reload();
        return;
      }
      await OrganizationService.createOrganization(
        user!.uid,
        email,
        displayName,
        orgName.trim(),
      );
      await waitForOrg();
    } catch (err) {
      logger.error('OrganizationSetup.create', err);
      setError('Error al crear la organización. Intente nuevamente.');
      setLoading(false);
    }
  };

  const handleJoinOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // Modo demo: simular unión aceptando cualquier código de 6 caracteres
      if (!isFirebaseInitialized) {
        const code = inviteCode.trim().toUpperCase();
        if (code.length !== 6) {
          setError('El código debe tener 6 caracteres.');
          setLoading(false);
          return;
        }
        const demoOrgId = 'demo-org-joined-' + code + '-' + Date.now();
        localStorage.setItem('fai_demo_orgId', demoOrgId);
        setSuccess('¡Te has unido! Cargando tu espacio de trabajo…');
        await new Promise(r => setTimeout(r, 500));
        window.location.hash = '#/workspace';
        window.location.reload();
        return;
      }
      const result = await OrganizationService.redeemInviteCode(
        inviteCode.trim(),
        user!.uid,
        email,
        displayName,
      );
      if (result.success) {
        setSuccess('¡Te has unido! Cargando tu espacio de trabajo…');
        await waitForOrg();
      } else {
        setError(result.message);
        setLoading(false);
      }
    } catch (err) {
      logger.error('OrganizationSetup.join', err);
      setError('Error al unirse. Intente nuevamente.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full opacity-5 animate-orb"
        style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)' }} />
      <div className="absolute bottom-[-5%] right-[-5%] w-80 h-80 rounded-full opacity-5 animate-orb-alt"
        style={{ background: 'radial-gradient(circle, #d1d5db 0%, transparent 65%)' }} />
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />

      <div className="relative z-10 w-full max-w-md animate-fade-in px-1 sm:px-0">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-8 sm:mb-10">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-white flex items-center justify-center shadow-2xl flex-shrink-0">
            <Sparkles size={22} className="text-black" />
          </div>
          <div className="text-left min-w-0">
            <h1 className="text-lg sm:text-xl font-black text-white truncate">Facturador AI</h1>
            <p className="text-gray-600 text-xs">Configuración inicial</p>
          </div>
        </div>

        {/* ── STEP: choose ─────────────────────────────────────── */}
        {step === 'choose' && (
          <div className="space-y-4">
            <div className="text-center mb-6 sm:mb-8 px-2">
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">Bienvenido</h2>
              <p className="text-gray-400 text-sm break-words">
                Hola, <span className="text-white font-semibold break-all">{email}</span>.<br />
                Para continuar, crea una organización o únete a una existente.
              </p>
            </div>

            <button
              onClick={() => setStep('create')}
              className="w-full group relative overflow-hidden bg-white text-black rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 font-bold hover:bg-gray-100 transition-all shadow-xl"
            >
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-black flex items-center justify-center flex-shrink-0 shadow-inner">
                <Building2 size={20} className="text-white sm:h-[22px] sm:w-[22px]" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="font-black text-base sm:text-lg truncate">Crear una organización</p>
                <p className="text-gray-500 font-normal text-xs sm:text-sm truncate">Soy dueño de un negocio</p>
              </div>
              <ChevronRight size={20} className="text-gray-400 group-hover:translate-x-1 transition-transform flex-shrink-0" />
            </button>

            <button
              onClick={() => setStep('join')}
              className="w-full group bg-white/5 hover:bg-white/10 border border-white/15 text-white rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 font-bold transition-all"
            >
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <Key size={20} className="text-gray-300 sm:h-[22px] sm:w-[22px]" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="font-black text-base sm:text-lg truncate">Unirme con un código</p>
                <p className="text-gray-500 font-normal text-xs sm:text-sm truncate">Tengo un código de invitación</p>
              </div>
              <ChevronRight size={20} className="text-gray-500 group-hover:translate-x-1 transition-transform flex-shrink-0" />
            </button>

            <button
              onClick={logout}
              className="w-full mt-4 flex items-center justify-center gap-2 text-gray-600 hover:text-gray-400 text-sm py-3 transition-colors"
            >
              <LogOut size={15} /> Cerrar sesión
            </button>
          </div>
        )}

        {/* ── STEP: create ─────────────────────────────────────── */}
        {step === 'create' && (
          <div>
            <button onClick={() => { setStep('choose'); setError(''); }}
              className="flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-8 transition-colors">
              <ArrowLeft size={15} /> Volver
            </button>
            <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-5 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-lg flex-shrink-0">
                  <Building2 size={20} className="text-black" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-black text-white">Nueva Organización</h2>
                  <p className="text-gray-500 text-xs">Serás el administrador (owner)</p>
                </div>
              </div>

              <form onSubmit={handleCreateOrg} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Nombre de la empresa
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={orgName}
                    onChange={e => setOrgName(e.target.value)}
                    placeholder="Ej. Inversiones del Valle S.A."
                    className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 border border-red-500/20 rounded-xl p-3">
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full bg-white text-black py-3.5 rounded-xl font-bold hover:bg-gray-100 transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg">
                  {loading
                    ? <><Loader2 size={18} className="animate-spin" /> Creando…</>
                    : <><Plus size={18} /> Crear Organización</>
                  }
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── STEP: join ───────────────────────────────────────── */}
        {step === 'join' && (
          <div>
            <button onClick={() => { setStep('choose'); setError(''); setSuccess(''); }}
              className="flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-8 transition-colors">
              <ArrowLeft size={15} /> Volver
            </button>
            <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-5 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-lg flex-shrink-0">
                  <Key size={20} className="text-black" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-black text-white">Unirse con Código</h2>
                  <p className="text-gray-500 text-xs">Solicita el código al administrador</p>
                </div>
              </div>

              <form onSubmit={handleJoinOrg} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Código de invitación
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={inviteCode}
                    onChange={e => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="ABC123"
                    maxLength={6}
                    className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all text-center text-xl sm:text-2xl font-mono tracking-[0.3em] sm:tracking-[0.5em]"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 border border-red-500/20 rounded-xl p-3">
                    <AlertCircle size={16} className="flex-shrink-0" /><span>{error}</span>
                  </div>
                )}
                {success && (
                  <div className="flex items-center gap-2 text-green-400 text-sm bg-green-900/20 border border-green-500/20 rounded-xl p-3">
                    <CheckCircle2 size={16} className="flex-shrink-0" /><span>{success}</span>
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full bg-white text-black py-3.5 rounded-xl font-bold hover:bg-gray-100 transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg">
                  {loading
                    ? <><Loader2 size={18} className="animate-spin" /> Verificando…</>
                    : <><Users size={18} /> Unirse a la Organización</>
                  }
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizationSetup;
