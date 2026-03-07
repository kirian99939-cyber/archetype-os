'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Brand, BrandMeta } from '@/lib/brand-types';
import DashboardShell from '@/components/DashboardShell';
import NewProjectModal from '@/components/NewProjectModal';

const ACCENT = '#C8FF00';

type Tab = 'overview' | 'projects' | 'materials' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Обзор' },
  { id: 'projects', label: 'Проекты' },
  { id: 'materials', label: 'Материалы' },
  { id: 'settings', label: 'Настройки' },
];

type MaterialFilter = 'all' | 'banners' | 'video' | 'texts';

interface MaterialItem {
  id: string;
  imageUrl: string;
  projectTitle: string;
  projectId: string;
  formatLabel: string;
  date: string;
}

const AUDIENCE_PLATFORMS = [
  'Instagram', 'TikTok', 'VK', 'Telegram', 'YouTube',
  'Facebook', 'Twitter/X', 'LinkedIn', 'Одноклассники', 'Pinterest',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionCard({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <h3 className="text-white font-semibold text-sm">{title}</h3>
        <span className="text-white/30 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-white/50 text-xs font-medium mb-1.5">
      {children}
      {required && <span style={{ color: ACCENT }}> *</span>}
    </label>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-white/30"
      style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-lg border px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-white/30"
      style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
    />
  );
}

function SaveButton({ onClick, saving, saved }: { onClick: () => void; saving: boolean; saved: boolean }) {
  return (
    <div className="flex items-center gap-3 mt-3">
      <button
        onClick={onClick}
        disabled={saving}
        className="px-5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 disabled:opacity-40"
        style={{ background: ACCENT, color: '#0A0A0A' }}
      >
        {saving ? 'Сохранение...' : 'Сохранить'}
      </button>
      {saved && <span className="text-xs" style={{ color: ACCENT }}>Сохранено</span>}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

interface OverviewTabProps {
  brand: Brand;
  projects: any[];
  projectsLoading: boolean;
  onTabChange: (tab: Tab) => void;
  onNewProject: () => void;
}

function OverviewTab({ brand, projects, projectsLoading, onTabChange, onNewProject }: OverviewTabProps) {
  const router = useRouter();

  // Metrics
  const totalProjects = projects.length;
  let totalMaterials = 0;
  for (const p of projects) {
    if (!Array.isArray(p.banners)) continue;
    for (const g of p.banners) {
      if (Array.isArray(g.banners)) {
        totalMaterials += g.banners.filter((b: any) => b.imageUrl).length;
      }
    }
  }
  const lastProject = projects.length > 0 ? projects[0] : null;
  const lastActivity = lastProject
    ? new Date(lastProject.updated_at || lastProject.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  // Profile completeness
  const meta = brand.meta ?? {};
  const checks = [
    { label: 'Миссия', done: !!meta.mission },
    { label: 'Аудитория', done: !!brand.audience },
    { label: 'Конкуренты', done: !!(meta.competitors && meta.competitors.length > 0) },
    { label: 'Цвета бренда', done: !!(brand.colors && brand.colors.length > 0) },
    { label: 'Tone of voice', done: !!brand.tone_of_voice },
  ];
  const filled = checks.filter((c) => c.done).length;
  const percent = Math.round((filled / checks.length) * 100);
  const nextTip = checks.find((c) => !c.done);

  const recentProjects = projects.slice(0, 3);

  return (
    <div className="flex flex-col gap-5">

      {/* ── Block 1: Brand header ── */}
      <div
        className="rounded-xl border p-5 flex items-center gap-4"
        style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
      >
        {brand.logo_url ? (
          <img
            src={brand.logo_url}
            alt={brand.name}
            className="w-14 h-14 rounded-xl object-contain shrink-0"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          />
        ) : (
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold shrink-0"
            style={{ background: 'rgba(200,255,0,0.1)', color: ACCENT }}
          >
            {brand.name[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold text-lg">{brand.name}</h3>
          {brand.website && (
            <p className="text-white/30 text-xs truncate">{brand.website}</p>
          )}
        </div>
        <button
          onClick={() => onTabChange('settings')}
          className="px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150 shrink-0"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          Редактировать
        </button>
      </div>

      {/* ── Block 2: Metrics ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Проектов', value: projectsLoading ? '...' : String(totalProjects) },
          { label: 'Материалов', value: projectsLoading ? '...' : String(totalMaterials) },
          { label: 'Последняя активность', value: projectsLoading ? '...' : lastActivity },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-xl border p-4"
            style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
          >
            <p className="text-white/40 text-[10px] uppercase tracking-wider font-medium">{m.label}</p>
            <p className="text-white font-bold text-xl mt-1">{m.value}</p>
          </div>
        ))}
      </div>

      {/* ── Block 3: Quick actions ── */}
      <div className="flex gap-3">
        <button
          onClick={onNewProject}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 hover:scale-[1.02]"
          style={{ background: ACCENT, color: '#0A0A0A' }}
        >
          <span>+</span>
          <span>Новый проект</span>
        </button>
        <button
          onClick={() => onTabChange('materials')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          Все материалы
        </button>
      </div>

      {/* ── Block 4: Recent projects ── */}
      <div
        className="rounded-xl border p-5"
        style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-white font-semibold text-sm">Последние проекты</h4>
          {projects.length > 3 && (
            <button
              onClick={() => onTabChange('projects')}
              className="text-xs font-medium transition-colors"
              style={{ color: ACCENT }}
            >
              Все проекты →
            </button>
          )}
        </div>
        {projectsLoading ? (
          <p className="text-white/40 text-xs py-4 text-center">Загрузка...</p>
        ) : recentProjects.length === 0 ? (
          <p className="text-white/20 text-xs py-4 text-center">Проектов пока нет</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentProjects.map((project: any) => (
              <div
                key={project.id}
                onClick={() => router.push(`/project/${project.id}`)}
                className="flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-150 hover:bg-white/5"
              >
                <div>
                  <p className="text-white text-sm font-medium">{project.title || 'Без названия'}</p>
                  <p className="text-white/30 text-[10px] mt-0.5">
                    {new Date(project.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span
                  className="text-[10px] font-medium px-2 py-1 rounded-full"
                  style={{
                    background: project.status === 'completed' ? 'rgba(100,220,150,0.1)' : 'rgba(200,255,0,0.1)',
                    color: project.status === 'completed' ? 'rgba(100,220,150,0.9)' : ACCENT,
                  }}
                >
                  {project.status === 'completed' ? 'Готов' : project.status === 'draft' ? 'Черновик' : 'В работе'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Block 5: Profile completeness ── */}
      <div
        className="rounded-xl border p-5"
        style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-white font-semibold text-sm">Заполненность профиля</h4>
          <span className="text-xs font-bold" style={{ color: percent === 100 ? 'rgba(100,220,150,0.9)' : ACCENT }}>
            {percent}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${percent}%`,
              background: percent === 100 ? 'rgba(100,220,150,0.8)' : ACCENT,
            }}
          />
        </div>

        {/* Checklist */}
        <div className="flex flex-wrap gap-2 mb-3">
          {checks.map((c) => (
            <span
              key={c.label}
              className="text-[10px] font-medium px-2 py-1 rounded-full"
              style={{
                background: c.done ? 'rgba(100,220,150,0.1)' : 'rgba(255,255,255,0.04)',
                color: c.done ? 'rgba(100,220,150,0.8)' : 'rgba(255,255,255,0.3)',
              }}
            >
              {c.done ? '✓' : '○'} {c.label}
            </span>
          ))}
        </div>

        {nextTip && (
          <button
            onClick={() => onTabChange('settings')}
            className="text-xs transition-colors"
            style={{ color: ACCENT }}
          >
            Заполнить: {nextTip.label} →
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Materials Tab ────────────────────────────────────────────────────────────

const MATERIAL_FILTERS: { id: MaterialFilter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'banners', label: 'Баннеры' },
  { id: 'video', label: 'Видео' },
  { id: 'texts', label: 'Тексты' },
];

function MaterialsTab({ projects, loading, brandId }: { projects: any[]; loading: boolean; brandId: string }) {
  const [filter, setFilter] = useState<MaterialFilter>('all');
  const router = useRouter();

  // Extract all banner materials from projects
  const materials: MaterialItem[] = [];
  for (const project of projects) {
    if (!Array.isArray(project.banners)) continue;
    for (const group of project.banners) {
      if (!Array.isArray(group.banners)) continue;
      for (const banner of group.banners) {
        if (!banner.imageUrl) continue;
        materials.push({
          id: `${project.id}-${banner.key}-${group.hypothesisIndex}`,
          imageUrl: banner.imageUrl,
          projectTitle: project.title || 'Без названия',
          projectId: project.id,
          formatLabel: banner.label || banner.key,
          date: project.created_at,
        });
      }
    }
  }

  // For now only banners exist, so filter just shows banners or all
  const filtered = filter === 'all' || filter === 'banners' ? materials : [];

  const handleDownload = async (imageUrl: string, filename: string) => {
    try {
      const res = await fetch(`/api/download-image?url=${encodeURIComponent(imageUrl)}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename + '.png';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(imageUrl, '_blank');
    }
  };

  if (loading) {
    return <p className="text-white/40 text-sm py-8 text-center">Загрузка...</p>;
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-1.5 mb-5">
        {MATERIAL_FILTERS.map((f) => {
          const isActive = filter === f.id;
          const disabled = f.id === 'video' || f.id === 'texts';
          return (
            <button
              key={f.id}
              onClick={() => !disabled && setFilter(f.id)}
              disabled={disabled}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
              style={{
                background: isActive ? 'rgba(200,255,0,0.15)' : 'rgba(255,255,255,0.05)',
                color: isActive ? ACCENT : disabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)',
                border: `1px solid ${isActive ? 'rgba(200,255,0,0.3)' : 'rgba(255,255,255,0.08)'}`,
                cursor: disabled ? 'default' : 'pointer',
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div
          className="rounded-xl border border-dashed p-12 text-center"
          style={{ borderColor: 'rgba(200,255,0,0.2)' }}
        >
          <p className="text-white/30 text-lg mb-2">Нет материалов</p>
          <p className="text-white/20 text-sm">Создайте первый проект чтобы увидеть материалы</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((m) => (
            <div
              key={m.id}
              className="group rounded-xl border overflow-hidden transition-all duration-150 hover:border-white/20"
              style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
            >
              {/* Preview */}
              <div
                className="relative aspect-square cursor-pointer"
                onClick={() => router.push(`/project/${m.projectId}`)}
              >
                <img
                  src={m.imageUrl}
                  alt={m.formatLabel}
                  className="w-full h-full object-cover"
                />
                {/* Download overlay */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDownload(m.imageUrl, `${m.projectTitle}-${m.formatLabel}`); }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-sm"
                  style={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}
                  title="Скачать"
                >
                  ↓
                </button>
              </div>

              {/* Info */}
              <div className="px-3 py-2.5">
                <p className="text-white text-xs font-medium truncate">{m.projectTitle}</p>
                <p className="text-white/30 text-[10px] mt-0.5">
                  {m.formatLabel} · {new Date(m.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function BrandDetailPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.id as string;

  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [projects, setProjects] = useState<any[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);

  // ── Section form states ──
  // 1. Basics
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [mission, setMission] = useState('');
  const [parsingSite, setParsingSite] = useState(false);
  const [parsedLogoUrl, setParsedLogoUrl] = useState<string | null>(null);

  // 2. Audience
  const [audience, setAudience] = useState('');
  const [pains, setPains] = useState('');
  const [audiencePlatforms, setAudiencePlatforms] = useState<string[]>([]);

  // 3. Competitors
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [newCompetitor, setNewCompetitor] = useState('');
  const [differentiator, setDifferentiator] = useState('');

  // 4. Visual
  const [colors, setColors] = useState<string[]>([]);
  const [visualStyle, setVisualStyle] = useState('');
  const colorInputRef = useRef<HTMLInputElement>(null);

  // 5. Communication
  const [toneOfVoice, setToneOfVoice] = useState('');
  const [keyMessages, setKeyMessages] = useState('');
  const [forbidden, setForbidden] = useState('');

  // Save state per section
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [savedSection, setSavedSection] = useState<string | null>(null);

  // Logo upload
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // ── Load brand ──
  useEffect(() => {
    fetch('/api/brands')
      .then((r) => r.json())
      .then((data) => {
        const found = (data.brands ?? []).find((b: Brand) => b.id === brandId);
        if (found) {
          setBrand(found);
          populateForm(found);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [brandId]);

  function populateForm(b: Brand) {
    setName(b.name || '');
    setWebsite(b.website || '');
    setLogoUrl(b.logo_url || '');
    setAudience(b.audience || '');
    setToneOfVoice(b.tone_of_voice || '');
    setColors(b.colors ?? []);

    const m = b.meta ?? {};
    setMission(m.mission || '');
    setPains(m.pains || '');
    setAudiencePlatforms(m.platforms || []);
    setCompetitors(m.competitors || []);
    setDifferentiator(m.differentiator || '');
    setVisualStyle(m.visual_style || '');
    setKeyMessages(m.key_messages || '');
    setForbidden(m.forbidden || '');
  }

  // ── Load projects ──
  useEffect(() => {
    setProjectsLoading(true);
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => {
        const all = Array.isArray(data) ? data : data.projects ?? [];
        setProjects(all.filter((p: any) => p.brand_id === brandId));
      })
      .catch(() => {})
      .finally(() => setProjectsLoading(false));
  }, [brandId]);

  // ── Save section ──
  async function saveSection(sectionId: string, payload: Record<string, unknown>) {
    setSavingSection(sectionId);
    setSavedSection(null);
    try {
      const res = await fetch(`/api/brands/${brandId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.brand) {
        setBrand(data.brand);
        setSavedSection(sectionId);
        setTimeout(() => setSavedSection(null), 2000);
      }
    } catch {
      // ignore
    } finally {
      setSavingSection(null);
    }
  }

  function buildMeta(): BrandMeta {
    return {
      mission: mission.trim() || undefined,
      pains: pains.trim() || undefined,
      platforms: audiencePlatforms.length > 0 ? audiencePlatforms : undefined,
      competitors: competitors.length > 0 ? competitors : undefined,
      differentiator: differentiator.trim() || undefined,
      visual_style: visualStyle.trim() || undefined,
      key_messages: keyMessages.trim() || undefined,
      forbidden: forbidden.trim() || undefined,
    };
  }

  function handleSaveBasics() {
    if (!name.trim()) return;
    saveSection('basics', {
      name: name.trim(),
      website: website.trim() || null,
      logo_url: logoUrl.trim() || null,
      meta: { ...brand?.meta, mission: mission.trim() || undefined },
    });
  }

  function handleSaveAudience() {
    saveSection('audience', {
      audience: audience.trim() || null,
      meta: { ...brand?.meta, pains: pains.trim() || undefined, platforms: audiencePlatforms.length > 0 ? audiencePlatforms : undefined },
    });
  }

  function handleSaveCompetitors() {
    saveSection('competitors', {
      meta: { ...brand?.meta, competitors: competitors.length > 0 ? competitors : undefined, differentiator: differentiator.trim() || undefined },
    });
  }

  function handleSaveVisual() {
    saveSection('visual', {
      colors,
      meta: { ...brand?.meta, visual_style: visualStyle.trim() || undefined },
    });
  }

  function handleSaveCommunication() {
    saveSection('communication', {
      tone_of_voice: toneOfVoice.trim() || null,
      meta: { ...brand?.meta, key_messages: keyMessages.trim() || undefined, forbidden: forbidden.trim() || undefined },
    });
  }

  // ── Parse site ──
  async function handleParseSite() {
    if (!website.trim()) return;
    setParsingSite(true);
    try {
      const res = await fetch(`/api/brands/parse-site?url=${encodeURIComponent(website.trim())}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.title && !name.trim()) setName(data.title);
      if (data.description && !mission.trim()) setMission(data.description);
      if (data.colors?.length && colors.length === 0) setColors(data.colors);
      if (data.logoUrl && !logoUrl) setParsedLogoUrl(data.logoUrl);
    } catch {
      // silent
    } finally {
      setParsingSite(false);
    }
  }

  // ── Fetch colors from site ──
  async function handleFetchColors() {
    if (!website.trim()) return;
    setParsingSite(true);
    try {
      const res = await fetch(`/api/brands/parse-site?url=${encodeURIComponent(website.trim())}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.colors?.length) setColors(data.colors);
    } catch {
      // silent
    } finally {
      setParsingSite(false);
    }
  }

  // ── Logo upload ──
  async function handleLogoUpload(file: File) {
    if (!file.type.startsWith('image/')) return;
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload-photo', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        setLogoUrl(data.url);
      }
    } catch {
      // silent
    } finally {
      setUploadingLogo(false);
    }
  }

  // ── Colors helpers ──
  function addColor(c: string) {
    if (colors.length >= 5) return;
    const upper = c.toUpperCase();
    if (!colors.includes(upper)) setColors([...colors, upper]);
  }

  function removeColor(idx: number) {
    setColors(colors.filter((_, i) => i !== idx));
  }

  // ── Competitors helpers ──
  function addCompetitor() {
    const val = newCompetitor.trim();
    if (!val || competitors.includes(val)) return;
    setCompetitors([...competitors, val]);
    setNewCompetitor('');
  }

  function removeCompetitor(idx: number) {
    setCompetitors(competitors.filter((_, i) => i !== idx));
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <DashboardShell activePage="brands" title="Бренд">
        <div className="flex items-center justify-center py-20">
          <p className="text-white/40 text-sm">Загрузка...</p>
        </div>
      </DashboardShell>
    );
  }

  if (!brand) {
    return (
      <DashboardShell activePage="brands" title="Бренд">
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-white/40 text-sm mb-4">Бренд не найден</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm font-medium px-4 py-2 rounded-lg"
            style={{ background: 'rgba(200,255,0,0.1)', color: ACCENT }}
          >
            Вернуться
          </button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell activePage="brands" title={brand.name}>
      <div className="max-w-4xl mx-auto">
        {/* Back + title */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push('/dashboard?page=brands')}
            className="text-white/30 hover:text-white/70 transition-colors text-sm"
          >
            ← Бренды
          </button>
          <span className="text-white/10">/</span>
          <h2 className="text-xl font-bold text-white">{brand.name}</h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-white/10 pb-px">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-4 py-2.5 text-sm font-medium transition-all duration-150 rounded-t-lg"
                style={{
                  color: isActive ? ACCENT : 'rgba(255,255,255,0.4)',
                  borderBottom: isActive ? `2px solid ${ACCENT}` : '2px solid transparent',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ══════ Overview ══════ */}
        {activeTab === 'overview' && (
          <OverviewTab
            brand={brand}
            projects={projects}
            projectsLoading={projectsLoading}
            onTabChange={setActiveTab}
            onNewProject={() => setShowNewProjectModal(true)}
          />
        )}

        {/* ══════ Projects ══════ */}
        {activeTab === 'projects' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-white/40 text-sm">Проекты бренда</p>
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 hover:scale-[1.02]"
                style={{ background: ACCENT, color: '#0A0A0A' }}
              >
                <span>+</span>
                <span>Новый проект</span>
              </button>
            </div>

            {projectsLoading ? (
              <p className="text-white/40 text-sm py-8 text-center">Загрузка...</p>
            ) : projects.length === 0 ? (
              <div
                className="rounded-xl border border-dashed p-12 text-center"
                style={{ borderColor: 'rgba(200,255,0,0.2)' }}
              >
                <p className="text-white/30 text-lg mb-2">Нет проектов</p>
                <p className="text-white/20 text-sm">Создайте первый проект для этого бренда</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {projects.map((project: any) => (
                  <div
                    key={project.id}
                    onClick={() => router.push(`/project/${project.id}`)}
                    className="rounded-xl border p-4 flex items-center justify-between cursor-pointer transition-all duration-150 hover:border-white/20"
                    style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
                  >
                    <div>
                      <h4 className="text-white font-medium text-sm">{project.title || 'Без названия'}</h4>
                      <p className="text-white/30 text-xs mt-0.5">
                        {new Date(project.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' · '}
                        {Array.isArray(project.banners) ? project.banners.length : 0} баннер{(() => {
                          const count = Array.isArray(project.banners) ? project.banners.length : 0;
                          const mod10 = count % 10;
                          const mod100 = count % 100;
                          if (mod100 >= 11 && mod100 <= 19) return 'ов';
                          if (mod10 === 1) return '';
                          if (mod10 >= 2 && mod10 <= 4) return 'а';
                          return 'ов';
                        })()}
                      </p>
                    </div>
                    <span
                      className="text-[10px] font-medium px-2 py-1 rounded-full"
                      style={{
                        background: project.status === 'completed' ? 'rgba(100,220,150,0.1)' : 'rgba(200,255,0,0.1)',
                        color: project.status === 'completed' ? 'rgba(100,220,150,0.9)' : ACCENT,
                      }}
                    >
                      {project.status === 'completed' ? 'Готов' : project.status === 'draft' ? 'Черновик' : 'В работе'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════ Materials ══════ */}
        {activeTab === 'materials' && (
          <MaterialsTab projects={projects} loading={projectsLoading} brandId={brandId} />
        )}

        {/* ══════ Settings ══════ */}
        {activeTab === 'settings' && (
          <div className="flex flex-col gap-4">

            {/* ─── Section 1: Basics ─── */}
            <SectionCard title="Основы" defaultOpen={true}>
              <div className="flex flex-col gap-4 pt-4 max-w-lg">
                <div>
                  <FieldLabel required>Название бренда</FieldLabel>
                  <TextInput value={name} onChange={setName} placeholder="Nike, Яндекс..." />
                </div>

                <div>
                  <FieldLabel>Сайт</FieldLabel>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <TextInput value={website} onChange={setWebsite} placeholder="https://..." />
                    </div>
                    <button
                      onClick={handleParseSite}
                      disabled={!website.trim() || parsingSite}
                      className="px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 disabled:opacity-30 whitespace-nowrap"
                      style={{ background: 'rgba(200,255,0,0.1)', color: ACCENT }}
                    >
                      {parsingSite ? '...' : 'Загрузить с сайта'}
                    </button>
                  </div>
                </div>

                <div>
                  <FieldLabel>Логотип</FieldLabel>
                  <div className="flex items-center gap-3">
                    {logoUrl ? (
                      <div className="relative">
                        <img
                          src={logoUrl}
                          alt="Logo"
                          className="w-16 h-16 rounded-lg object-contain border"
                          style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)' }}
                        />
                        <button
                          onClick={() => setLogoUrl('')}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white/60 hover:text-white"
                          style={{ background: 'rgba(255,0,0,0.5)' }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center text-white/20 hover:text-white/40 hover:border-white/20 transition-colors text-xl"
                        style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                      >
                        {uploadingLogo ? '...' : '+'}
                      </button>
                    )}
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { if (e.target.files?.[0]) handleLogoUpload(e.target.files[0]); }}
                    />
                    <p className="text-white/20 text-xs">PNG, JPG, WEBP</p>
                  </div>
                  {parsedLogoUrl && !logoUrl && (
                    <div
                      className="flex items-center gap-3 mt-2 p-2.5 rounded-lg border"
                      style={{ borderColor: 'rgba(200,255,0,0.2)', background: 'rgba(200,255,0,0.05)' }}
                    >
                      <img
                        src={parsedLogoUrl}
                        alt="Parsed logo"
                        className="w-10 h-10 rounded object-contain"
                        style={{ background: 'rgba(255,255,255,0.1)' }}
                        onError={() => setParsedLogoUrl(null)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white/50 text-xs truncate">Найден на сайте</p>
                      </div>
                      <button
                        onClick={() => { setLogoUrl(parsedLogoUrl); setParsedLogoUrl(null); }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium shrink-0"
                        style={{ background: ACCENT, color: '#0A0A0A' }}
                      >
                        Использовать
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <FieldLabel>Миссия / позиционирование</FieldLabel>
                  <TextArea value={mission} onChange={setMission} placeholder="Чем бренд полезен миру..." />
                </div>

                <SaveButton onClick={handleSaveBasics} saving={savingSection === 'basics'} saved={savedSection === 'basics'} />
              </div>
            </SectionCard>

            {/* ─── Section 2: Audience ─── */}
            <SectionCard title="Аудитория">
              <div className="flex flex-col gap-4 pt-4 max-w-lg">
                <div>
                  <FieldLabel>Целевая аудитория</FieldLabel>
                  <TextArea value={audience} onChange={setAudience} placeholder="Мужчины 25-35, предприниматели..." />
                </div>

                <div>
                  <FieldLabel>Боли и желания</FieldLabel>
                  <TextArea value={pains} onChange={setPains} placeholder="Какие проблемы решаем, чего хочет аудитория..." />
                </div>

                <div>
                  <FieldLabel>Где обитают</FieldLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {AUDIENCE_PLATFORMS.map((p) => {
                      const selected = audiencePlatforms.includes(p);
                      return (
                        <button
                          key={p}
                          onClick={() => setAudiencePlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
                          style={{
                            background: selected ? 'rgba(200,255,0,0.15)' : 'rgba(255,255,255,0.05)',
                            color: selected ? ACCENT : 'rgba(255,255,255,0.5)',
                            border: `1px solid ${selected ? 'rgba(200,255,0,0.3)' : 'rgba(255,255,255,0.08)'}`,
                          }}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <SaveButton onClick={handleSaveAudience} saving={savingSection === 'audience'} saved={savedSection === 'audience'} />
              </div>
            </SectionCard>

            {/* ─── Section 3: Competitors ─── */}
            <SectionCard title="Конкуренты">
              <div className="flex flex-col gap-4 pt-4 max-w-lg">
                <div>
                  <FieldLabel>Список конкурентов</FieldLabel>
                  <div className="flex gap-2 mb-2">
                    <div className="flex-1">
                      <TextInput
                        value={newCompetitor}
                        onChange={setNewCompetitor}
                        placeholder="Название конкурента..."
                      />
                    </div>
                    <button
                      onClick={addCompetitor}
                      disabled={!newCompetitor.trim()}
                      className="px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 disabled:opacity-30"
                      style={{ background: ACCENT, color: '#0A0A0A' }}
                    >
                      +
                    </button>
                  </div>
                  {competitors.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {competitors.map((c, i) => (
                        <span
                          key={i}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                          {c}
                          <button
                            onClick={() => removeCompetitor(i)}
                            className="text-white/30 hover:text-red-400 transition-colors"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <FieldLabel>Чем отличаемся от конкурентов</FieldLabel>
                  <TextArea value={differentiator} onChange={setDifferentiator} placeholder="Наше ключевое отличие..." />
                </div>

                <SaveButton onClick={handleSaveCompetitors} saving={savingSection === 'competitors'} saved={savedSection === 'competitors'} />
              </div>
            </SectionCard>

            {/* ─── Section 4: Visual Style ─── */}
            <SectionCard title="Визуальный стиль">
              <div className="flex flex-col gap-4 pt-4 max-w-lg">
                <div>
                  <FieldLabel>Цвета бренда (до 5)</FieldLabel>
                  <div className="flex items-center gap-2 flex-wrap">
                    {colors.map((c, i) => (
                      <div key={i} className="relative group">
                        <div
                          className="w-10 h-10 rounded-lg border cursor-pointer"
                          style={{ background: c, borderColor: 'rgba(255,255,255,0.15)' }}
                          title={c}
                        />
                        <button
                          onClick={() => removeColor(i)}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: 'rgba(255,0,0,0.6)' }}
                        >
                          ✕
                        </button>
                        <p className="text-[9px] text-white/30 text-center mt-0.5">{c}</p>
                      </div>
                    ))}
                    {colors.length < 5 && (
                      <button
                        onClick={() => colorInputRef.current?.click()}
                        className="w-10 h-10 rounded-lg border-2 border-dashed flex items-center justify-center text-white/20 hover:text-white/40 hover:border-white/20 transition-colors text-lg"
                        style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                      >
                        +
                      </button>
                    )}
                    <input
                      ref={colorInputRef}
                      type="color"
                      className="hidden"
                      onChange={(e) => addColor(e.target.value)}
                    />
                  </div>
                  {website.trim() && (
                    <button
                      onClick={handleFetchColors}
                      disabled={parsingSite}
                      className="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 disabled:opacity-30"
                      style={{ background: 'rgba(200,255,0,0.1)', color: ACCENT }}
                    >
                      {parsingSite ? 'Загрузка...' : 'Взять цвета с сайта'}
                    </button>
                  )}
                </div>

                <div>
                  <FieldLabel>Описание визуального стиля</FieldLabel>
                  <TextArea value={visualStyle} onChange={setVisualStyle} placeholder="Минимализм, яркие акценты, нейтральный фон..." />
                </div>

                <SaveButton onClick={handleSaveVisual} saving={savingSection === 'visual'} saved={savedSection === 'visual'} />
              </div>
            </SectionCard>

            {/* ─── Section 5: Communication ─── */}
            <SectionCard title="Коммуникация">
              <div className="flex flex-col gap-4 pt-4 max-w-lg">
                <div>
                  <FieldLabel>Tone of voice</FieldLabel>
                  <TextArea value={toneOfVoice} onChange={setToneOfVoice} placeholder="Дружелюбный, экспертный, провокационный..." rows={2} />
                </div>

                <div>
                  <FieldLabel>Ключевые сообщения</FieldLabel>
                  <TextArea value={keyMessages} onChange={setKeyMessages} placeholder="Что бренд всегда транслирует..." />
                </div>

                <div>
                  <FieldLabel>Запрещённые слова/образы</FieldLabel>
                  <TextArea value={forbidden} onChange={setForbidden} placeholder="Что нельзя использовать в коммуникации..." rows={2} />
                </div>

                <SaveButton onClick={handleSaveCommunication} saving={savingSection === 'communication'} saved={savedSection === 'communication'} />
              </div>
            </SectionCard>
          </div>
        )}
      </div>

      {showNewProjectModal && brand && (
        <NewProjectModal
          brandId={brandId}
          brandName={brand.name}
          brandData={{
            audience: brand.audience,
            utp: brand.utp,
            tone_of_voice: brand.tone_of_voice,
            context: brand.context,
          }}
          onClose={() => setShowNewProjectModal(false)}
        />
      )}
    </DashboardShell>
  );
}
