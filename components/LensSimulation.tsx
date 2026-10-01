import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LensGama, Product, AppSettings } from '../types';
import { Check, Glasses, Eye, Edit3, Save, X, Clock, Sparkles, Package, Award, Mountain, Laptop, Smartphone } from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';

interface LensSimulationProps {
  products: Product[];
  settings: AppSettings;
  onSaveSettings: (s: AppSettings) => void;
}

const CANVAS_SIZE = 800;

interface GamaVisualParams {
  startY: number;
  midWidth: number;
  nearWidth: number;
  blurAmount: number;
}

// Indexado por LensGama.order (1, 2, 3) — funciona aunque se renombren las gamas
const GAMA_VISUAL_PARAMS: Record<number, GamaVisualParams> = {
  1: { startY: 400, midWidth: 0.21, nearWidth: 0.34, blurAmount: 12 }, // Básica
  2: { startY: 400, midWidth: 0.29, nearWidth: 0.46, blurAmount: 8 },  // Media
  3: { startY: 400, midWidth: 0.37, nearWidth: 0.54, blurAmount: 4 },  // Premium
};

interface CorridorAnchor {
  x: number;
  y: number;
  cp1x?: number;
  cp1y?: number;
  cp2x?: number;
  cp2y?: number;
}

interface CorridorPaths {
  left: CorridorAnchor[];
  right: CorridorAnchor[];
}

// Geometría del pasillo sobre lienzo interno 800×800 (portada tal cual de la referencia)
function getCorridorPaths(startY: number, midW: number, nearW: number): CorridorPaths {
  const centerX = 400;
  const midY = 460;
  const bottomY = 800;

  const hwMid = (800 * midW) / 2;
  const hwNear = (800 * nearW) / 2;

  const L_start = { x: 0, y: startY };
  const L_mid = { x: centerX - hwMid, y: midY };
  const L_bot = { x: centerX - hwNear, y: bottomY };

  const R_start = { x: 800, y: startY };
  const R_mid = { x: centerX + hwMid, y: midY };
  const R_bot = { x: centerX + hwNear, y: bottomY };

  return {
    left: [
      L_start,
      { cp1x: L_start.x + (L_mid.x * 0.45), cp1y: startY + 20, cp2x: L_mid.x - 20, cp2y: midY - 40, x: L_mid.x, y: L_mid.y },
      { cp1x: L_mid.x + 5, cp1y: midY + 60, cp2x: L_bot.x - 5, cp2y: 720, x: L_bot.x, y: L_bot.y },
    ],
    right: [
      R_start,
      { cp1x: R_start.x - ((800 - R_mid.x) * 0.45), cp1y: startY + 20, cp2x: R_mid.x + 20, cp2y: midY - 40, x: R_mid.x, y: R_mid.y },
      { cp1x: R_mid.x - 5, cp1y: midY + 60, cp2x: R_bot.x + 5, cp2y: 720, x: R_bot.x, y: R_bot.y },
    ],
  };
}

// Helper rect redondeado (evita depender de ctx.roundRect según versión de lib)
function rr(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

// Escena nítida RECOLOREADA a escala de grises / blanco-negro (misma geometría que la referencia)
function renderSceneGraphics(context: CanvasRenderingContext2D) {
  const w = 800;
  const h = 800;

  // 1. Fondo ventana y horizonte (zona lejana)
  const skyGradient = context.createLinearGradient(0, 0, 0, 350);
  skyGradient.addColorStop(0, '#1a1a1a');
  skyGradient.addColorStop(0.5, '#2a2a2a');
  skyGradient.addColorStop(1, '#3a3a3a');
  context.fillStyle = skyGradient;
  context.fillRect(0, 0, w, 350);

  // Rascacielos en gris oscuro con ventanas blancas tenues
  context.fillStyle = '#0a0a0a';
  const buildings = [
    { x: 60, w: 80, h: 220 }, { x: 160, w: 60, h: 260 }, { x: 230, w: 90, h: 180 },
    { x: 340, w: 110, h: 290 }, { x: 470, w: 70, h: 210 }, { x: 560, w: 100, h: 270 },
    { x: 680, w: 75, h: 200 },
  ];
  buildings.forEach(b => {
    context.fillStyle = '#0a0a0a';
    context.fillRect(b.x, 350 - b.h, b.w, b.h);
    context.fillStyle = 'rgba(255,255,255,0.55)';
    for (let wx = b.x + 10; wx < b.x + b.w - 10; wx += 15) {
      for (let wy = 350 - b.h + 15; wy < 340; wy += 20) {
        if (Math.random() > 0.3) context.fillRect(wx, wy, 6, 8);
      }
    }
  });

  // 2. Escritorio y laptop (zona intermedia)
  const deskGradient = context.createLinearGradient(0, 350, 0, 800);
  deskGradient.addColorStop(0, '#1a1a1a');
  deskGradient.addColorStop(1, '#0a0a0a');
  context.fillStyle = deskGradient;
  context.fillRect(0, 350, w, 450);

  // Marco de la laptop
  context.fillStyle = '#2a2a2a';
  rr(context, 140, 260, 520, 340, 16);
  context.fill();
  context.strokeStyle = '#3a3a3a';
  context.lineWidth = 4;
  context.stroke();

  // Pantalla
  const screenGrad = context.createLinearGradient(160, 280, 640, 560);
  screenGrad.addColorStop(0, '#2a2a2a');
  screenGrad.addColorStop(1, '#0a0a0a');
  context.fillStyle = screenGrad;
  context.fillRect(160, 280, 480, 280);

  // Contenido de pantalla en blanco/gris
  context.fillStyle = '#f5f5f5';
  context.font = 'bold 22px Inter, sans-serif';
  context.fillText('ANÁLISIS ÓPTICO PROGRESIVO', 190, 320);

  context.fillStyle = '#d4d4d4';
  context.font = '16px monospace';
  context.fillText('campoVision = gama.getAncho();', 190, 360);
  context.fillText("si (tecnologia === 'Progresivo') {", 190, 390);
  context.fillStyle = '#ffffff';
  context.fillText('    reducirAberracionLateral();', 190, 420);
  context.fillText('    enfoqueOptimo = true;', 190, 450);
  context.fillStyle = '#d4d4d4';
  context.fillText('}', 190, 480);

  // Gráfico en pantalla
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(450, 400, 160, 100);
  context.strokeStyle = '#ffffff';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(450, 490);
  context.lineTo(480, 460);
  context.lineTo(510, 475);
  context.lineTo(550, 420);
  context.lineTo(600, 440);
  context.stroke();

  // Base de la laptop
  context.fillStyle = '#1a1a1a';
  context.beginPath();
  context.moveTo(100, 600);
  context.lineTo(700, 600);
  context.lineTo(740, 670);
  context.lineTo(60, 670);
  context.closePath();
  context.fill();

  // 3. Teléfono y taza (zona cercana)
  context.fillStyle = '#0a0a0a';
  rr(context, 460, 650, 140, 130, 12);
  context.fill();
  context.strokeStyle = '#ffffff';
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = '#f5f5f5';
  context.font = 'bold 14px Inter, sans-serif';
  context.fillText('Mensaje Nítido', 475, 680);
  context.font = '12px Inter, sans-serif';
  context.fillStyle = '#a3a3a3';
  context.fillText('Lectura de cerca', 475, 705);
  context.fillText('sin esfuerzo visual.', 475, 725);

  // Taza
  context.fillStyle = '#3a3a3a';
  context.beginPath();
  context.arc(220, 710, 40, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#1a1a1a';
  context.beginPath();
  context.arc(220, 710, 32, 0, Math.PI * 2);
  context.fill();
}

function drawSingleLens(
  targetCtx: CanvasRenderingContext2D,
  state: GamaVisualParams,
  sharpCanvas: HTMLCanvasElement,
  blurCanvas: HTMLCanvasElement,
) {
  const blurCtx = blurCanvas.getContext('2d');
  if (!blurCtx) return;
  blurCtx.clearRect(0, 0, 800, 800);
  blurCtx.filter = `blur(${state.blurAmount}px)`;
  blurCtx.drawImage(sharpCanvas, 0, 0);
  blurCtx.filter = 'none';

  targetCtx.clearRect(0, 0, 800, 800);

  // 1. Fondo difuminado
  targetCtx.drawImage(blurCanvas, 0, 0);

  // 2. Recorta el área de visión nítida (pasillo)
  const paths = getCorridorPaths(state.startY, state.midWidth, state.nearWidth);

  targetCtx.save();
  targetCtx.beginPath();

  targetCtx.moveTo(0, 0);
  targetCtx.lineTo(800, 0);
  targetCtx.lineTo(paths.right[0].x, paths.right[0].y);

  targetCtx.bezierCurveTo(
    paths.right[1].cp1x!, paths.right[1].cp1y!,
    paths.right[1].cp2x!, paths.right[1].cp2y!,
    paths.right[1].x, paths.right[1].y,
  );
  targetCtx.bezierCurveTo(
    paths.right[2].cp1x!, paths.right[2].cp1y!,
    paths.right[2].cp2x!, paths.right[2].cp2y!,
    paths.right[2].x, paths.right[2].y,
  );

  targetCtx.lineTo(paths.left[2].x, paths.left[2].y);

  targetCtx.bezierCurveTo(
    paths.left[2].cp2x!, paths.left[2].cp2y!,
    paths.left[2].cp1x!, paths.left[2].cp1y!,
    paths.left[1].x, paths.left[1].y,
  );
  targetCtx.bezierCurveTo(
    paths.left[1].cp2x!, paths.left[1].cp2y!,
    paths.left[1].cp1x!, paths.left[1].cp1y!,
    paths.left[0].x, paths.left[0].y,
  );

  targetCtx.lineTo(0, 0);
  targetCtx.closePath();
  targetCtx.clip();

  // Imagen nítida dentro del pasillo
  targetCtx.drawImage(sharpCanvas, 0, 0);
  targetCtx.restore();

  // 3. Líneas blancas del pasillo
  targetCtx.save();
  targetCtx.strokeStyle = '#ffffff';
  targetCtx.lineWidth = 6;
  targetCtx.lineCap = 'round';
  targetCtx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  targetCtx.shadowBlur = 8;

  targetCtx.beginPath();
  targetCtx.moveTo(paths.left[0].x, paths.left[0].y);
  targetCtx.bezierCurveTo(
    paths.left[1].cp1x!, paths.left[1].cp1y!,
    paths.left[1].cp2x!, paths.left[1].cp2y!,
    paths.left[1].x, paths.left[1].y,
  );
  targetCtx.bezierCurveTo(
    paths.left[2].cp1x!, paths.left[2].cp1y!,
    paths.left[2].cp2x!, paths.left[2].cp2y!,
    paths.left[2].x, paths.left[2].y,
  );
  targetCtx.stroke();

  targetCtx.beginPath();
  targetCtx.moveTo(paths.right[0].x, paths.right[0].y);
  targetCtx.bezierCurveTo(
    paths.right[1].cp1x!, paths.right[1].cp1y!,
    paths.right[1].cp2x!, paths.right[1].cp2y!,
    paths.right[1].x, paths.right[1].y,
  );
  targetCtx.bezierCurveTo(
    paths.right[2].cp1x!, paths.right[2].cp1y!,
    paths.right[2].cp2x!, paths.right[2].cp2y!,
    paths.right[2].x, paths.right[2].y,
  );
  targetCtx.stroke();

  targetCtx.restore();
}

const DEFAULT_GAMAS: LensGama[] = [
  {
    id: 'basica',
    label: 'Básica',
    order: 1,
    description: 'Pasillo de visión más angosto, con campos de visión lejana y cercana más reducidos. Requiere un periodo de adaptación un poco más lento y es la opción más económica para iniciarse en progresivos.',
    benefits: ['Precio más accesible', 'Función progresiva completa', 'Ideal para uso ocasional'],
    adaptationTime: '~1 semana',
  },
  {
    id: 'media',
    label: 'Media',
    order: 2,
    description: 'Pasillo intermedio que equilibra amplitud de campo visual y precio. Ofrece una transición más suave entre distancias y una adaptación moderada.',
    benefits: ['Equilibrio precio / campo visual', 'Zonas de transición más amplias que Básica', 'Adaptación media'],
    adaptationTime: '~3-5 días',
  },
  {
    id: 'premium',
    label: 'Premium',
    order: 3,
    description: 'Pasillo amplio con visión periférica más natural y zonas de transición suaves. Máximo campo visual en todas las distancias y adaptación rápida.',
    benefits: ['Campo visual más amplio', 'Visión periférica natural', 'Transiciones suaves', 'Adaptación rápida'],
    adaptationTime: '~1-2 días',
  },
];

const LensSimulation: React.FC<LensSimulationProps> = ({ products, settings, onSaveSettings }) => {
  const { hasPermission } = useOrganization();
  const canEdit = hasPermission('manage_settings');

  const gamas: LensGama[] = useMemo(() => {
    const src = settings.lensGamas && settings.lensGamas.length > 0 ? settings.lensGamas : DEFAULT_GAMAS;
    return [...src].sort((a, b) => a.order - b.order);
  }, [settings.lensGamas]);

  const [selectedId, setSelectedId] = useState<string>(() => gamas[0]?.id || 'basica');
  useEffect(() => {
    if (!gamas.find(g => g.id === selectedId) && gamas[0]) setSelectedId(gamas[0].id);
  }, [gamas, selectedId]);

  const selectedGama = gamas.find(g => g.id === selectedId) || gamas[0];

  // Motor canvas con refs (sin variables globales)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sharpCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const blurCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animStateRef = useRef<GamaVisualParams>({ ...GAMA_VISUAL_PARAMS[selectedGama?.order ?? 1] });
  const rafIdRef = useRef<number | null>(null);
  const selectedOrderRef = useRef<number>(selectedGama?.order ?? 1);

  useEffect(() => {
    selectedOrderRef.current = selectedGama?.order ?? 1;
  }, [selectedGama?.order]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const targetCtx = canvas.getContext('2d');
    if (!targetCtx) return;

    const sharp = document.createElement('canvas');
    sharp.width = CANVAS_SIZE;
    sharp.height = CANVAS_SIZE;
    const sharpCtx = sharp.getContext('2d');
    if (!sharpCtx) return;
    renderSceneGraphics(sharpCtx);
    sharpCanvasRef.current = sharp;

    const blur = document.createElement('canvas');
    blur.width = CANVAS_SIZE;
    blur.height = CANVAS_SIZE;
    blurCanvasRef.current = blur;

    const ease = 0.1;
    const loop = () => {
      const target = GAMA_VISUAL_PARAMS[selectedOrderRef.current] || GAMA_VISUAL_PARAMS[1];
      const s = animStateRef.current;
      s.startY += (target.startY - s.startY) * ease;
      s.midWidth += (target.midWidth - s.midWidth) * ease;
      s.nearWidth += (target.nearWidth - s.nearWidth) * ease;
      s.blurAmount += (target.blurAmount - s.blurAmount) * ease;
      const sharpC = sharpCanvasRef.current;
      const blurC = blurCanvasRef.current;
      if (sharpC && blurC) drawSingleLens(targetCtx, s, sharpC, blurC);
      rafIdRef.current = requestAnimationFrame(loop);
    };
    rafIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    };
  }, []);

  const linkedProduct = selectedGama?.linkedProductId ? products.find(p => p.id === selectedGama.linkedProductId) : undefined;

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editGamas, setEditGamas] = useState<LensGama[]>(gamas);

  useEffect(() => {
    if (!isEditing) setEditGamas(gamas);
  }, [gamas, isEditing]);

  const handleSave = () => {
    const toSave = [...editGamas].sort((a, b) => a.order - b.order);
    onSaveSettings({ ...settings, lensGamas: toSave });
    setIsEditing(false);
  };

  const updateEditGama = (id: string, patch: Partial<LensGama>) => {
    setEditGamas(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g));
  };

  const updateBenefits = (id: string, benefitsStr: string) => {
    const benefits = benefitsStr.split('\n').map(s => s.trim()).filter(Boolean);
    updateEditGama(id, { benefits });
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-20 md:pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="h-9 w-9 rounded-xl bg-black dark:bg-white flex items-center justify-center shadow-sm">
              <Glasses size={18} className="text-white dark:text-black" />
            </span>
            Simulación de Lentes
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm md:text-base">Compara el pasillo de visión según la gama — a mayor gama, más ancho el corrededor.</p>
        </div>
        {canEdit && !isEditing && (
          <button onClick={() => setIsEditing(true)} className="w-full md:w-auto bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 px-5 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 flex justify-center items-center gap-2 shadow-sm transition-all text-sm font-semibold">
            <Edit3 size={16} /> Editar gamas
          </button>
        )}
        {canEdit && isEditing && (
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={() => setIsEditing(false)} className="flex-1 md:flex-none px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center gap-2">
              <X size={16} /> Cancelar
            </button>
            <button onClick={handleSave} className="flex-1 md:flex-none px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 flex items-center justify-center gap-2 shadow-lg text-sm font-semibold border border-black dark:border-white">
              <Save size={16} /> Guardar
            </button>
          </div>
        )}
      </div>

      {/* Main visual + selector */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Visual canvas — tarjeta siempre oscura para efecto pasillo de luz */}
        <div className="lg:col-span-3 bg-[#0a0a0a] rounded-3xl shadow-sm border border-white/10 p-6 md:p-8 flex flex-col items-center">
          <div className="relative rounded-full overflow-hidden border-4 border-white/10 bg-black aspect-square w-full max-w-[420px] shadow-2xl shadow-black/40">
            <canvas ref={canvasRef} width={800} height={800} className="w-full h-full object-cover rounded-full" />
          </div>
          {/* Leyenda de zonas FUERA del círculo — dentro se recortaba por el overflow-hidden del borde */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[10px] font-bold text-white/70 tracking-widest uppercase">
            <span className="bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1 whitespace-nowrap"><Mountain size={11} /> Lejos</span>
            <span className="bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1 whitespace-nowrap"><Laptop size={11} /> Intermedio</span>
            <span className="bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1 whitespace-nowrap"><Smartphone size={11} /> Cerca</span>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="bg-white text-black text-[11px] font-bold px-3 py-1 rounded-full shadow">
              {selectedGama?.label} · Orden {selectedGama?.order}
            </span>
          </div>
          <p className="text-xs text-white/60 mt-3 text-center max-w-[360px]">El pasillo nítido se ensancha con la gama. Más ancho = más campo visual y transición más suave.</p>
        </div>

        {/* Selector + info */}
        <div className="lg:col-span-2 space-y-4">
          {/* 3 selectable cards */}
          <div className="grid grid-cols-1 gap-3">
            {(isEditing ? editGamas : gamas).map(g => {
              const isSelected = g.id === selectedId && !isEditing;
              const isActiveEditing = editGamas.find(eg => eg.id === g.id);
              return (
                <button
                  key={g.id}
                  onClick={() => !isEditing && setSelectedId(g.id)}
                  disabled={isEditing}
                  className={`text-left p-4 rounded-2xl border shadow-sm transition-all flex items-center gap-3 ${isSelected ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-lg scale-[1.01]' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md text-gray-900 dark:text-white'} ${isEditing ? 'opacity-90 cursor-default' : ''}`}
                >
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-white dark:bg-black text-black dark:text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`}>
                    {g.order === 1 ? <Award size={18} /> : g.order === 2 ? <Sparkles size={18} /> : <Glasses size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm flex items-center gap-2 ${isSelected ? '' : 'text-gray-900 dark:text-white'}`}>
                      {isEditing ? (
                        <input value={isActiveEditing?.label || ''} onChange={e => updateEditGama(g.id, { label: e.target.value })} className="w-full px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" placeholder="Label" />
                      ) : g.label}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${isSelected ? 'bg-white/20 border-white/20 text-white dark:bg-black/10 dark:border-black/10 dark:text-black' : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>Orden {g.order}</span>
                    </p>
                    {!isEditing && <p className={`text-xs mt-0.5 line-clamp-2 ${isSelected ? 'text-gray-300 dark:text-gray-600' : 'text-gray-500 dark:text-gray-400'}`}>{g.description}</p>}
                  </div>
                  {!isEditing && isSelected && <Check size={18} className="text-white dark:text-black flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Info panel */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-5">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {selectedGama?.label} <span className="text-xs font-normal bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300">{selectedGama?.adaptationTime || '—'}</span>
              </h3>
              {isEditing ? (
                <div className="space-y-3 mt-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Descripción</label>
                    <textarea value={editGamas.find(g => g.id === selectedId)?.description || ''} onChange={e => updateEditGama(selectedId, { description: e.target.value })} rows={3} className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-black dark:focus:ring-white" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Adaptación</label>
                    <input value={editGamas.find(g => g.id === selectedId)?.adaptationTime || ''} onChange={e => updateEditGama(selectedId, { adaptationTime: e.target.value })} placeholder="~1-2 días" className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-black" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Beneficios (uno por línea)</label>
                    <textarea value={(editGamas.find(g => g.id === selectedId)?.benefits || []).join('\n')} onChange={e => updateBenefits(selectedId, e.target.value)} rows={4} className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-black font-mono text-xs" placeholder={'Campo visual más amplio\nVisión periférica natural'} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Producto vinculado (opcional)</label>
                    <select value={editGamas.find(g => g.id === selectedId)?.linkedProductId || ''} onChange={e => updateEditGama(selectedId, { linkedProductId: e.target.value || undefined })} className="w-full mt-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm">
                      <option value="">— Sin vincular —</option>
                      {products.map(p => (<option key={p.id} value={p.id}>{p.sku} - {p.name} (Stock {p.stock}) - {p.currency} {p.price.toLocaleString()}</option>))}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {editGamas.map(g => (
                      <div key={g.id} className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Orden {g.label}</label>
                        <select value={g.order} onChange={e => updateEditGama(g.id, { order: Number(e.target.value) })} className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm">
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div key={selectedId} style={{ transition: 'opacity 0.3s ease' }}>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">{selectedGama?.description}</p>
                  <div className="flex items-center gap-2 mt-3 text-xs">
                    <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-full font-semibold text-gray-700 dark:text-gray-300">
                      <Clock size={12} /> Adaptación: {selectedGama?.adaptationTime || '—'}
                    </span>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {selectedGama?.benefits.map((b, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className="h-5 w-5 rounded-full bg-black dark:bg-white flex items-center justify-center flex-shrink-0 mt-0.5"><Check size={12} className="text-white dark:text-black" /></span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                  {linkedProduct ? (
                    <div className="mt-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1"><Package size={12} /> Producto vinculado</p>
                      <p className="font-bold text-gray-900 dark:text-white mt-1">{linkedProduct.name} <span className="font-mono text-xs text-gray-500">({linkedProduct.sku})</span></p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-bold text-black dark:text-white">{linkedProduct.currency} {linkedProduct.price.toLocaleString()}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${linkedProduct.stock > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{linkedProduct.stock > 0 ? `Stock: ${linkedProduct.stock}` : 'Sin stock'}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 italic">Sin producto vinculado — solo informativo.</p>
                  )}
                </div>
              )}
            </div>
            <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><Eye size={12} /> Vista previa en lente</span>
              <span className="text-xs font-mono bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-lg text-gray-700 dark:text-gray-300">Ancho orden {selectedGama?.order}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex gap-3">
        <Sparkles size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-900 dark:text-amber-200 text-sm">Consejo para la consulta</p>
          <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">Muestra esta simulación en tablet al cliente. Cambia entre gamas y deja que vea cómo se ensancha el pasillo. La animación es fluida y se puede cambiar rápido sin saltos.</p>
        </div>
      </div>
    </div>
  );
};

export default LensSimulation;
