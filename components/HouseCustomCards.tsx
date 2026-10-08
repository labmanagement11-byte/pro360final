"use client"
// Tarjetas personalizadas por casa (ej. "Notas", "Instrucciones"): tarjetas del dashboard + panel
// con pasos de instrucciones (numerados) y notas, con fotos, videos y enlaces.
// Solo Jonathan crea / renombra / borra tarjetas, para toda la casa o para un empleado de la casa,
// y decide si una tarjeta de casa es visible para los empleados (solo lectura).
// Jonathan y el manager manejan pasos y notas; los empleados que ven la tarjeta solo agregan notas.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './HouseCustomCards.css';
import {
  CUSTOM_CARD_MODAL_PREFIX,
  HOUSE_CARD_BODY_MAX,
  HOUSE_CARD_LINK_MAX,
  HOUSE_CARD_MAX_LINKS,
  HOUSE_CARD_MAX_PHOTOS,
  HOUSE_CARD_MAX_VIDEOS,
  HOUSE_CARD_STEP_TITLE_MAX,
  HOUSE_CARD_TITLE_MAX,
  HOUSE_CARD_VIDEO_MAX_MB,
  canAddNote,
  canEditEntry,
  canManageHouseCards,
  canManageSteps,
  canSeeHouseCards,
  getAuthUserId,
  isCardTarget,
  isReadOnlyViewer,
  countHouseCardEntries,
  createCardEntry,
  createHouseCard,
  deleteCardEntry,
  deleteHouseCard,
  listCardEntries,
  listHouseCards,
  moveCardStep,
  parseVideoLink,
  signPhotoUrls,
  signVideoUrls,
  sortNotes,
  sortSteps,
  subscribeToHouseCards,
  updateCardEntry,
  updateHouseCard,
  videoFileProblem,
  youtubeEmbedUrl,
  type HouseCardCounts,
  type HouseCardEntry,
  type HouseCardEntryKind,
  type HouseCustomCard,
} from '../utils/houseCustomCards';
import type { HouseActor } from '../utils/completeExtraTask';

export const CARD_ICON_CHOICES = ['📝', '📁', '📸', '🔧', '🧺', '🛏️', '🔑', '⭐'];
const DEFAULT_ICON = '📝';

// ------------------------------------------------------------------ claves del modal / navegación

/** selectedModalCard = "custom:<cardId>" o "custom:<cardId>#<entryId>#<n>" (foto en grande). */
export function customCardModalKey(cardId: string, photo?: { entryId: string; index: number } | null): string {
  return photo
    ? `${CUSTOM_CARD_MODAL_PREFIX}${cardId}#${photo.entryId}#${photo.index}`
    : `${CUSTOM_CARD_MODAL_PREFIX}${cardId}`;
}

export function parseCustomCardModalKey(key: string | null | undefined):
  | { cardId: string; photo: { entryId: string; index: number } | null }
  | null {
  const raw = String(key || '');
  if (!raw.startsWith(CUSTOM_CARD_MODAL_PREFIX)) return null;
  const [cardId, entryId, idx] = raw.slice(CUSTOM_CARD_MODAL_PREFIX.length).split('#');
  if (!cardId) return null;
  const index = Number.parseInt(String(idx ?? ''), 10);
  return {
    cardId,
    photo: entryId && Number.isFinite(index) && index >= 0 ? { entryId, index } : null,
  };
}

// ------------------------------------------------------------------------------- utilidades

function formatWhen(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return d.toLocaleString();
  }
}

function wasEdited(entry: HouseCardEntry): boolean {
  const a = new Date(entry.created_at).getTime();
  const b = new Date(entry.updated_at).getTime();
  return Number.isFinite(a) && Number.isFinite(b) && b - a > 5000;
}

export type HouseEmployeeOption = { id: string; username: string };

function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1).replace('.', ',')} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Nombre corto del sitio de un enlace. */
function linkSiteName(host: string): string {
  const h = host.toLowerCase();
  if (h.endsWith('vimeo.com')) return 'Vimeo';
  if (h === 'drive.google.com' || h === 'docs.google.com') return 'Google Drive';
  if (h.endsWith('dropbox.com')) return 'Dropbox';
  if (h.endsWith('tiktok.com')) return 'TikTok';
  if (h.endsWith('instagram.com')) return 'Instagram';
  if (h.endsWith('facebook.com') || h === 'fb.watch') return 'Facebook';
  return host;
}

/** Previsualización local de fotos elegidas (antes de subir). */
function useLocalPreviews(files: File[]) {
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  return urls;
}

// ---------------------------------------------------------------- hook: tarjetas de la casa

export function useHouseCustomCards(house: string, user: HouseActor | null | undefined) {
  const enabled = canSeeHouseCards(user, house);
  const [authUid, setAuthUid] = useState<string | null>(null);
  const [cards, setCards] = useState<HouseCustomCard[]>([]);
  const [counts, setCounts] = useState<Record<string, HouseCardCounts>>({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Sube con cada cambio de notas en tiempo real; el panel abierto recarga con esto. */
  const [entriesVersion, setEntriesVersion] = useState(0);
  const houseRef = useRef(house);
  useEffect(() => {
    houseRef.current = house;
  }, [house]);

  const reload = useCallback(async () => {
    const target = houseRef.current;
    if (!enabled || !target) return;
    const [res, cnt] = await Promise.all([listHouseCards(target), countHouseCardEntries(target)]);
    if (houseRef.current !== target) return;
    if (res.ok) {
      setCards(res.data);
      setError(null);
    } else {
      setError(res.error);
    }
    setCounts(cnt);
    setLoaded(true);
  }, [enabled]);

  useEffect(() => {
    let alive = true;
    getAuthUserId().then((id) => { if (alive) setAuthUid(id); });
    return () => { alive = false; };
  }, [user?.username, user?.email]);

  useEffect(() => {
    setCards([]);
    setCounts({});
    setLoaded(false);
    setError(null);
    if (!enabled || !house) return;
    reload();
    const unsubscribe = subscribeToHouseCards(house, (table) => {
      if (table === 'house_card_entries') setEntriesVersion((v) => v + 1);
      reload();
    });
    // Al volver a la app (teléfono bloqueado, otra pestaña) se recarga por si se perdió un evento.
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setEntriesVersion((v) => v + 1);
        reload();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [house, enabled, reload]);

  return { enabled, cards, counts, loaded, error, reload, entriesVersion, authUid };
}

// ---------------------------------------------------- tarjetas en la grilla del dashboard

export function HouseCustomCardTiles({
  house,
  user,
  cards,
  employees,
  authUid,
  onOpen,
  onCreated,
}: {
  house: string;
  user: HouseActor;
  cards: HouseCustomCard[];
  /** Ya no se muestra en la tarjeta; se mantiene para no cambiar quien la usa. */
  counts?: Record<string, HouseCardCounts>;
  /** Empleados reales de esta casa (para tarjetas de un empleado). */
  employees: HouseEmployeeOption[];
  authUid?: string | null;
  onOpen: (card: HouseCustomCard) => void;
  onCreated: () => void;
}) {
  const canManage = canManageHouseCards(user);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState(DEFAULT_ICON);
  const [scope, setScope] = useState<'house' | 'employee'>('house');
  const [targetId, setTargetId] = useState('');
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError(null);
    const nextPos = cards.reduce((m, c) => Math.max(m, Number(c.position) || 0), 0) + 1;
    if (scope === 'employee' && !targetId) {
      setSaving(false);
      setFormError('Elige el empleado');
      return;
    }
    const res = await createHouseCard(
      house,
      title,
      icon,
      nextPos,
      scope === 'employee' ? targetId : null,
      scope === 'house' && visible
    );
    setSaving(false);
    if (!res.ok) {
      setFormError(res.error);
      return;
    }
    setTitle('');
    setIcon(DEFAULT_ICON);
    setScope('house');
    setTargetId('');
    setVisible(false);
    setAdding(false);
    onCreated();
  };

  return (
    <>
      {cards.map((card) => {
        const forMe = isCardTarget(user, card, authUid);
        const readOnly = isReadOnlyViewer(user, card);
        return (
          <button
            key={card.id}
            type="button"
            className={`dashboard-card hcc-tile${card.target_user_id ? ' is-employee' : ''}${readOnly ? ' is-readonly' : ''}`}
            onClick={() => onOpen(card)}
            aria-label={card.target_name && card.target_user_id ? `${card.title} para ${card.target_name}` : card.title}
          >
            <span className="dashboard-card-title">
              <span className="hcc-tile-icon" aria-hidden="true">{card.icon || DEFAULT_ICON}</span> {card.title}
            </span>
            {card.target_user_id && (
              <span className="hcc-target-chip">👤 {forMe ? 'Para ti' : (card.target_name || 'Empleado')}</span>
            )}
            {!card.target_user_id && card.visible_to_employees && !readOnly && (
              <span className="hcc-visible-chip">👀 Visible para empleados</span>
            )}
          </button>
        );
      })}
      {canManage && (
        adding ? (
          <div className="dashboard-card hcc-add-tile is-open">
            <form className="hcc-add-form" onSubmit={submit}>
              <span className="dashboard-card-title">Nueva tarjeta</span>
              <span className="hcc-add-house">Casa: {house}</span>
              <label className="hcc-label" htmlFor="hcc-new-title">Nombre</label>
              <input
                id="hcc-new-title"
                className="hcc-input"
                type="text"
                value={title}
                maxLength={HOUSE_CARD_TITLE_MAX}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Notas"
                autoFocus
                required
              />
              <span className="hcc-label">Ícono</span>
              <div className="hcc-icon-row" role="radiogroup" aria-label="Ícono de la tarjeta">
                {CARD_ICON_CHOICES.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    role="radio"
                    aria-checked={icon === choice}
                    className={`hcc-icon-btn${icon === choice ? ' on' : ''}`}
                    onClick={() => setIcon(choice)}
                  >
                    {choice}
                  </button>
                ))}
              </div>
              <fieldset className="hcc-scope">
                <legend className="hcc-label">¿Para quién es?</legend>
                <label className={`hcc-scope-option${scope === 'house' ? ' on' : ''}`}>
                  <input type="radio" name="hcc-scope" checked={scope === 'house'} onChange={() => setScope('house')} />
                  <span>🏠 Toda la casa <small>(Jonathan y el manager{visible ? '; los empleados leen y agregan notas' : ''})</small></span>
                </label>
                <label className={`hcc-scope-option${scope === 'employee' ? ' on' : ''}`}>
                  <input
                    type="radio"
                    name="hcc-scope"
                    checked={scope === 'employee'}
                    onChange={() => setScope('employee')}
                  />
                  <span>👤 Un empleado <small>(él, el manager y Jonathan)</small></span>
                </label>
                {scope === 'house' && (
                  <label className={`hcc-visible-check${visible ? ' on' : ''}`}>
                    <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
                    <span>
                      👀 Visible para empleados de la casa
                      <small> Todos los empleados de {house} la pueden leer y agregar notas, pero no cambiar ni borrar nada.</small>
                    </span>
                  </label>
                )}
                {scope === 'employee' && employees.length === 0 && (
                  <p className="hcc-warning" role="status">
                    Esta casa no tiene empleados todavía. Agrega un empleado a {house} en “Usuarios” o elige “Toda la casa”.
                  </p>
                )}
                {scope === 'employee' && employees.length > 0 && (
                  <>
                    <label className="hcc-label" htmlFor="hcc-new-target">Empleado</label>
                    <select
                      id="hcc-new-target"
                      className="hcc-input"
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                      required
                    >
                      <option value="">Elige un empleado…</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>{emp.username}</option>
                      ))}
                    </select>
                  </>
                )}
              </fieldset>
              {formError && <p className="hcc-error" role="alert">{formError}</p>}
              <div className="hcc-actions">
                <button type="submit" className="hcc-btn primary" disabled={saving || !title.trim() || (scope === 'employee' && !targetId)}>
                  {saving ? 'Creando…' : 'Crear tarjeta'}
                </button>
                <button type="button" className="hcc-btn" onClick={() => { setAdding(false); setFormError(null); setVisible(false); }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        ) : (
          <button
            type="button"
            className="dashboard-card hcc-add-tile"
            onClick={() => setAdding(true)}
            aria-label="Agregar tarjeta a esta casa"
          >
            <span className="dashboard-card-title">+ Agregar tarjeta</span>
            <span className="dashboard-card-desc">Crea una tarjeta nueva solo para {house}.</span>
          </button>
        )
      )}
    </>
  );
}

// ---------------------------------------------------------------- selector de fotos y videos

function PhotoPicker({
  files,
  setFiles,
  existingCount,
  disabled,
}: {
  files: File[];
  setFiles: (files: File[]) => void;
  existingCount: number;
  disabled?: boolean;
}) {
  const previews = useLocalPreviews(files);
  const room = HOUSE_CARD_MAX_PHOTOS - existingCount - files.length;
  const add = (list: FileList | null) => {
    if (!list || !list.length) return;
    const picked = Array.from(list).filter((f) => /^image\//i.test(f.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name));
    if (picked.length > room) alert(`Máximo ${HOUSE_CARD_MAX_PHOTOS} fotos.`);
    setFiles([...files, ...picked.slice(0, Math.max(0, room))]);
  };
  return (
    <div className="hcc-photo-picker">
      <div className="hcc-actions">
        <label className={`hcc-btn hcc-camera-btn${disabled || room <= 0 ? ' is-disabled' : ''}`}>
          📷 Tomar foto
          <input
            type="file"
            accept="image/*"
            capture="environment"
            disabled={disabled || room <= 0}
            onChange={(e) => { add(e.target.files); e.target.value = ''; }}
          />
        </label>
        <label className={`hcc-btn${disabled || room <= 0 ? ' is-disabled' : ''}`}>
          🖼️ Elegir fotos
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={disabled || room <= 0}
            onChange={(e) => { add(e.target.files); e.target.value = ''; }}
          />
        </label>
      </div>
      {files.length > 0 && (
        <ul className="hcc-thumbs" aria-label="Fotos por subir">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="hcc-thumb-item">
              <img src={previews[i]} alt={`Foto nueva ${i + 1}`} className="hcc-thumb" />
              <button
                type="button"
                className="hcc-thumb-remove"
                disabled={disabled}
                onClick={() => setFiles(files.filter((_, j) => j !== i))}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="hcc-hint">Las fotos se reducen antes de subir (máx. 1600 px) para ahorrar espacio.</p>
    </div>
  );
}

function VideoPicker({
  files,
  setFiles,
  existingCount,
  disabled,
}: {
  files: File[];
  setFiles: (files: File[]) => void;
  existingCount: number;
  disabled?: boolean;
}) {
  const [problem, setProblem] = useState<string | null>(null);
  const room = HOUSE_CARD_MAX_VIDEOS - existingCount - files.length;
  const add = (list: FileList | null) => {
    if (!list || !list.length) return;
    const picked: File[] = [];
    let msg: string | null = null;
    Array.from(list).forEach((f) => {
      const p = videoFileProblem(f);
      if (p) msg = msg || p;
      else picked.push(f);
    });
    if (picked.length > room) msg = msg || `Máximo ${HOUSE_CARD_MAX_VIDEOS} videos.`;
    setProblem(msg);
    setFiles([...files, ...picked.slice(0, Math.max(0, room))]);
  };
  return (
    <div className="hcc-photo-picker">
      <div className="hcc-actions">
        <label className={`hcc-btn${disabled || room <= 0 ? ' is-disabled' : ''}`}>
          🎬 Subir video
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
            disabled={disabled || room <= 0}
            onChange={(e) => { add(e.target.files); e.target.value = ''; }}
          />
        </label>
      </div>
      {files.length > 0 && (
        <ul className="hcc-file-list" aria-label="Videos por subir">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="hcc-file-item">
              <span className="hcc-file-name">🎬 {f.name} <small>({formatSize(f.size)})</small></span>
              <button
                type="button"
                className="hcc-thumb-remove"
                disabled={disabled}
                onClick={() => setFiles(files.filter((_, j) => j !== i))}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
      {problem && <p className="hcc-error" role="alert">{problem}</p>}
      <p className="hcc-hint">
        MP4, MOV o WebM de máximo {HOUSE_CARD_VIDEO_MAX_MB} MB (más o menos 1 minuto). Para videos más largos usa un enlace de YouTube.
      </p>
    </div>
  );
}

function LinkEditor({
  links,
  setLinks,
  draft,
  setDraft,
  disabled,
}: {
  links: string[];
  setLinks: (links: string[]) => void;
  draft: string;
  setDraft: (value: string) => void;
  disabled?: boolean;
}) {
  const [problem, setProblem] = useState<string | null>(null);
  const full = links.length >= HOUSE_CARD_MAX_LINKS;
  const add = () => {
    const parsed = parseVideoLink(draft);
    if (!parsed.ok) {
      setProblem(parsed.error);
      return;
    }
    if (!links.includes(parsed.data.url)) setLinks([...links, parsed.data.url]);
    setDraft('');
    setProblem(null);
  };
  return (
    <div className="hcc-photo-picker">
      <div className="hcc-link-row">
        <input
          className="hcc-input"
          type="url"
          inputMode="url"
          value={draft}
          maxLength={HOUSE_CARD_LINK_MAX}
          placeholder="https://youtu.be/… o enlace de Vimeo / Drive"
          aria-label="Enlace de video"
          disabled={disabled || full}
          onChange={(e) => { setDraft(e.target.value); setProblem(null); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="hcc-btn" disabled={disabled || full || !draft.trim()} onClick={add}>
          🔗 Agregar
        </button>
      </div>
      {links.length > 0 && (
        <ul className="hcc-file-list" aria-label="Enlaces">
          {links.map((url) => {
            const parsed = parseVideoLink(url);
            const label = parsed.ok
              ? (parsed.data.youtubeId ? '▶ YouTube' : `🔗 ${linkSiteName(parsed.data.host)}`)
              : '🔗 Enlace';
            return (
              <li key={url} className="hcc-file-item">
                <span className="hcc-file-name">{label} <small>{url}</small></span>
                <button
                  type="button"
                  className="hcc-thumb-remove"
                  disabled={disabled}
                  onClick={() => setLinks(links.filter((x) => x !== url))}
                >
                  Quitar
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {problem && <p className="hcc-error" role="alert">{problem}</p>}
      <p className="hcc-hint">YouTube se ve aquí mismo; otros enlaces se abren aparte. Máximo {HOUSE_CARD_MAX_LINKS}.</p>
    </div>
  );
}

// ----------------------------------------------------------- formulario de paso o de nota

function EntryForm({
  card,
  kind,
  entry,
  photoUrls,
  onSaved,
  onCancel,
  notice,
}: {
  card: HouseCustomCard;
  kind: HouseCardEntryKind;
  /** Si viene, se edita esta entrada; si no, se crea una nueva. */
  entry?: HouseCardEntry | null;
  photoUrls: Record<string, string>;
  onSaved: (entry: HouseCardEntry) => void;
  onCancel: () => void;
  /** Aviso arriba de "Guardar" (ej. a empleados: la nota no se puede editar después). */
  notice?: string | null;
}) {
  const isStep = kind === 'instruccion';
  const idBase = entry ? `hcc-edit-${entry.id}` : `hcc-new-${kind}`;
  const [title, setTitle] = useState(entry?.title || '');
  const [body, setBody] = useState(entry?.body || '');
  const [keepPhotos, setKeepPhotos] = useState<string[]>(entry?.photo_paths || []);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [keepVideos, setKeepVideos] = useState<string[]>(entry?.video_paths || []);
  const [newVideos, setNewVideos] = useState<File[]>([]);
  const [links, setLinks] = useState<string[]>(entry?.video_links || []);
  const [linkDraft, setLinkDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    // Un enlace pegado sin tocar "Agregar" también se guarda.
    let allLinks = links;
    if (linkDraft.trim()) {
      const parsed = parseVideoLink(linkDraft);
      if (!parsed.ok) {
        setError(`Revisa el enlace: ${parsed.error}`);
        return;
      }
      allLinks = links.includes(parsed.data.url) ? links : [...links, parsed.data.url];
    }
    setSaving(true);
    setError(null);
    const input = {
      title: isStep ? title : undefined,
      body,
      keepPhotoPaths: keepPhotos,
      newPhotos,
      keepVideoPaths: keepVideos,
      newVideos,
      links: allLinks,
    };
    const res = entry
      ? await updateCardEntry(card, entry, input, setProgress)
      : await createCardEntry(card, kind, input, setProgress);
    setSaving(false);
    setProgress(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSaved(res.data);
  };

  const empty = !title.trim() && !body.trim() && keepPhotos.length + newPhotos.length + keepVideos.length
    + newVideos.length + links.length === 0 && !linkDraft.trim();
  const heading = entry
    ? (isStep ? 'Editar paso' : 'Editar nota')
    : (isStep ? 'Nuevo paso' : 'Nueva nota');

  return (
    <form className={`hcc-form${entry ? ' is-edit' : ''}`} onSubmit={submit}>
      <h3 className="hcc-form-title">{heading}</h3>
      {isStep && (
        <>
          <label className="hcc-label" htmlFor={`${idBase}-title`}>Título del paso</label>
          <input
            id={`${idBase}-title`}
            className="hcc-input"
            type="text"
            value={title}
            maxLength={HOUSE_CARD_STEP_TITLE_MAX}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Tender las camas"
            required
            disabled={saving}
          />
        </>
      )}
      <label className="hcc-label" htmlFor={`${idBase}-body`}>{isStep ? 'Explicación' : 'Nota'}</label>
      <textarea
        id={`${idBase}-body`}
        className="hcc-input hcc-textarea"
        value={body}
        maxLength={HOUSE_CARD_BODY_MAX}
        onChange={(e) => setBody(e.target.value)}
        placeholder={isStep ? 'Cómo se hace este paso…' : 'Escribe la nota o el ejemplo…'}
        rows={3}
        disabled={saving}
      />

      <span className="hcc-label">Fotos</span>
      {keepPhotos.length > 0 && (
        <ul className="hcc-thumbs" aria-label="Fotos guardadas">
          {keepPhotos.map((p, i) => (
            <li key={p} className="hcc-thumb-item">
              {photoUrls[p]
                ? <img src={photoUrls[p]} alt={`Foto ${i + 1}`} className="hcc-thumb" />
                : <span className="hcc-thumb hcc-thumb-empty">Foto</span>}
              <button type="button" className="hcc-thumb-remove" disabled={saving} onClick={() => setKeepPhotos(keepPhotos.filter((x) => x !== p))}>
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
      <PhotoPicker files={newPhotos} setFiles={setNewPhotos} existingCount={keepPhotos.length} disabled={saving} />

      <span className="hcc-label">Videos</span>
      {keepVideos.length > 0 && (
        <ul className="hcc-file-list" aria-label="Videos guardados">
          {keepVideos.map((p, i) => (
            <li key={p} className="hcc-file-item">
              <span className="hcc-file-name">🎬 Video {i + 1} (guardado)</span>
              <button type="button" className="hcc-thumb-remove" disabled={saving} onClick={() => setKeepVideos(keepVideos.filter((x) => x !== p))}>
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
      <VideoPicker files={newVideos} setFiles={setNewVideos} existingCount={keepVideos.length} disabled={saving} />

      <span className="hcc-label">Enlace de video (YouTube, Vimeo, Drive…)</span>
      <LinkEditor links={links} setLinks={setLinks} draft={linkDraft} setDraft={setLinkDraft} disabled={saving} />

      {notice && <p className="hcc-warning">{notice}</p>}
      {error && <p className="hcc-error" role="alert">{error}</p>}
      {progress && <p className="hcc-hint" aria-live="polite">{progress}</p>}
      <div className="hcc-actions">
        <button type="submit" className="hcc-btn primary" disabled={saving || empty || (isStep && !title.trim())}>
          {saving ? 'Guardando…' : entry ? 'Guardar cambios' : isStep ? 'Guardar paso' : 'Guardar nota'}
        </button>
        <button type="button" className="hcc-btn" disabled={saving} onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

// ------------------------------------------------------------ fotos, videos y enlaces de una entrada

/** Video del bucket: primero un recuadro; el reproductor se monta solo cuando lo tocan. */
function VideoPlayer({ url, label }: { url?: string; label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (open && ref.current) ref.current.play().catch(() => { /* el usuario puede tocar ▶ */ });
  }, [open]);
  if (open && url) {
    return (
      <video ref={ref} className="hcc-video" src={url} controls playsInline preload="metadata">
        Tu navegador no puede reproducir este video. <a href={url} target="_blank" rel="noopener noreferrer">Abrir video</a>
      </video>
    );
  }
  return (
    <button type="button" className="hcc-video-placeholder" disabled={!url} onClick={() => setOpen(true)} aria-label={`Reproducir ${label}`}>
      <span className="hcc-play" aria-hidden="true">▶</span>
      <span>{url ? `Reproducir ${label}` : 'Cargando video…'}</span>
    </button>
  );
}

/** YouTube sin cookies (youtube-nocookie.com). Se carga al tocar, para no gastar datos. */
function YouTubeEmbed({ id, url }: { id: string; url: string }) {
  const [open, setOpen] = useState(false);
  if (open) {
    return (
      <div className="hcc-yt">
        <iframe
          src={`${youtubeEmbedUrl(id)}&autoplay=1`}
          title="Video de YouTube"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <div className="hcc-yt">
      <button type="button" className="hcc-yt-poster" onClick={() => setOpen(true)} aria-label="Ver video de YouTube">
        <img src={`https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`} alt="" loading="lazy" decoding="async" />
        <span className="hcc-yt-play" aria-hidden="true">▶</span>
        <span className="hcc-yt-label">YouTube</span>
      </button>
      <a className="hcc-yt-open" href={url} target="_blank" rel="noopener noreferrer">Abrir en YouTube</a>
    </div>
  );
}

function EntryMedia({
  entry,
  photoUrls,
  videoUrls,
  onOpenPhoto,
}: {
  entry: HouseCardEntry;
  photoUrls: Record<string, string>;
  videoUrls: Record<string, string>;
  onOpenPhoto: (entryId: string, index: number) => void;
}) {
  return (
    <>
      {entry.photo_paths.length > 0 && (
        <ul className="hcc-thumbs" aria-label="Fotos">
          {entry.photo_paths.map((p, i) => (
            <li key={p} className="hcc-thumb-item">
              <button type="button" className="hcc-thumb-open" onClick={() => onOpenPhoto(entry.id, i)} aria-label={`Ver foto ${i + 1} en grande`}>
                {photoUrls[p]
                  ? <img src={photoUrls[p]} alt={`Foto ${i + 1}`} className="hcc-thumb" loading="lazy" decoding="async" />
                  : <span className="hcc-thumb hcc-thumb-empty">Foto</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {entry.video_paths.length > 0 && (
        <div className="hcc-media-list">
          {entry.video_paths.map((p, i) => (
            <VideoPlayer key={p} url={videoUrls[p]} label={entry.video_paths.length > 1 ? `video ${i + 1}` : 'video'} />
          ))}
        </div>
      )}
      {entry.video_links.length > 0 && (
        <div className="hcc-media-list">
          {entry.video_links.map((url) => {
            const parsed = parseVideoLink(url);
            if (!parsed.ok) return null;
            if (parsed.data.youtubeId) return <YouTubeEmbed key={url} id={parsed.data.youtubeId} url={parsed.data.url} />;
            return (
              <a key={url} className="hcc-link-card" href={parsed.data.url} target="_blank" rel="noopener noreferrer">
                <span className="hcc-link-icon" aria-hidden="true">🔗</span>
                <span className="hcc-link-text">
                  <strong>Ver video en {linkSiteName(parsed.data.host)}</strong>
                  <small>{parsed.data.url}</small>
                </span>
              </a>
            );
          })}
        </div>
      )}
    </>
  );
}

function EntryMeta({ entry }: { entry: HouseCardEntry }) {
  return (
    <p className="hcc-entry-meta">
      <strong>✍️ {entry.created_by_name || 'Sin nombre'}</strong>
      <span> · {formatWhen(entry.created_at)}</span>
      {wasEdited(entry) && <span className="hcc-edited"> · editada {formatWhen(entry.updated_at)}</span>}
    </p>
  );
}

// ------------------------------------------------------------------ panel de una tarjeta

export function HouseCustomCardPanel({
  card,
  user,
  authUid,
  entriesVersion,
  photo,
  onOpenPhoto,
  onClosePhoto,
  onCardDeleted,
  onCardChanged,
}: {
  card: HouseCustomCard;
  user: HouseActor;
  authUid?: string | null;
  entriesVersion: number;
  photo: { entryId: string; index: number } | null;
  onOpenPhoto: (entryId: string, index: number) => void;
  onClosePhoto: () => void;
  onCardDeleted: () => void;
  onCardChanged: () => void;
}) {
  const canManage = canManageHouseCards(user);
  const manageSteps = canManageSteps(user, card);
  const addNotes = canAddNote(user, card, authUid);
  const viewerIsTarget = isCardTarget(user, card, authUid);
  const readOnly = isReadOnlyViewer(user, card);

  const [entries, setEntries] = useState<HouseCardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});
  const signedRef = useRef<Record<string, string>>({});
  useEffect(() => {
    signedRef.current = { ...photoUrls, ...videoUrls };
  }, [photoUrls, videoUrls]);
  const signedAtRef = useRef(0);

  /** 'instruccion' | 'nota' = formulario nuevo abierto; si no, null. */
  const [adding, setAdding] = useState<HouseCardEntryKind | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);

  const [renaming, setRenaming] = useState(false);
  const [renameTitle, setRenameTitle] = useState(card.title);
  const [renameIcon, setRenameIcon] = useState(card.icon || DEFAULT_ICON);
  const [renameVisible, setRenameVisible] = useState(Boolean(card.visible_to_employees));
  const [cardBusy, setCardBusy] = useState(false);

  const steps = useMemo(() => sortSteps(entries), [entries]);
  const notes = useMemo(() => sortNotes(entries), [entries]);

  const load = useCallback(async () => {
    const res = await listCardEntries(card.id);
    if (!res.ok) {
      setLoadError(res.error);
      setLoading(false);
      return;
    }
    setLoadError(null);
    setEntries(res.data);
    setLoading(false);
    const stale = Date.now() - signedAtRef.current > 45 * 60 * 1000;
    const pick = (paths: string[]) => (stale ? paths : paths.filter((p) => !signedRef.current[p]));
    const photos = pick(res.data.flatMap((e) => e.photo_paths));
    const videos = pick(res.data.flatMap((e) => e.video_paths));
    if (photos.length || videos.length) {
      const [sp, sv] = await Promise.all([signPhotoUrls(photos), signVideoUrls(videos)]);
      if (stale) signedAtRef.current = Date.now();
      setPhotoUrls((cur) => ({ ...cur, ...sp }));
      setVideoUrls((cur) => ({ ...cur, ...sv }));
    }
  }, [card.id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load, entriesVersion]);

  const startRename = () => {
    setRenameTitle(card.title);
    setRenameIcon(card.icon || DEFAULT_ICON);
    setRenameVisible(Boolean(card.visible_to_employees));
    setRenaming(true);
  };

  const onSaved = (saved: HouseCardEntry) => {
    setAdding(null);
    setEditingId(null);
    setEntries((prev) => [saved, ...prev.filter((x) => x.id !== saved.id)]);
    load();
  };

  const removeEntry = async (entry: HouseCardEntry) => {
    const isStep = entry.kind === 'instruccion';
    const media = entry.photo_paths.length + entry.video_paths.length > 0;
    const what = isStep ? `el paso ${steps.findIndex((x) => x.id === entry.id) + 1} "${entry.title || ''}"` : 'esta nota';
    if (!confirm(`¿Eliminar ${what}${media ? ' con sus fotos y videos' : ''}? No se puede deshacer.`)) return;
    const res = await deleteCardEntry(entry);
    if (!res.ok) {
      alert(res.error);
      return;
    }
    setEntries((prev) => prev.filter((x) => x.id !== entry.id));
    if (isStep) load(); // los números de los pasos se ven en orden aunque haya un hueco
  };

  const move = async (entry: HouseCardEntry, direction: -1 | 1) => {
    if (moving) return;
    setMoving(true);
    const res = await moveCardStep(entry.id, direction);
    if (!res.ok) alert(res.error);
    await load();
    setMoving(false);
  };

  const saveRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cardBusy) return;
    setCardBusy(true);
    const patch: { title: string; icon: string; visible_to_employees?: boolean } = { title: renameTitle, icon: renameIcon };
    if (!card.target_user_id) patch.visible_to_employees = renameVisible;
    const res = await updateHouseCard(card.id, patch);
    setCardBusy(false);
    if (!res.ok) {
      alert(res.error);
      return;
    }
    setRenaming(false);
    onCardChanged();
  };

  const removeCard = async () => {
    const parts: string[] = [];
    if (steps.length) parts.push(steps.length === 1 ? '1 paso' : `${steps.length} pasos`);
    if (notes.length) parts.push(notes.length === 1 ? '1 nota' : `${notes.length} notas`);
    const detail = parts.length ? ` con ${parts.join(' y ')} (y sus fotos y videos)` : '';
    if (!confirm(`¿Eliminar la tarjeta "${card.title}"${detail}? No se puede deshacer.`)) return;
    setCardBusy(true);
    const res = await deleteHouseCard(card);
    setCardBusy(false);
    if (!res.ok) {
      alert(res.error);
      return;
    }
    onCardDeleted();
  };

  // ------------------------------------------------------------ foto en grande (sin overlay)
  if (photo) {
    const entry = entries.find((x) => x.id === photo.entryId);
    const path = entry?.photo_paths?.[photo.index];
    const url = path ? photoUrls[path] : undefined;
    const where = entry?.kind === 'instruccion' ? `del paso ${steps.findIndex((x) => x.id === entry.id) + 1}` : 'de la nota';
    return (
      <div className="hcc-panel">
        <div className="hcc-photo-view">
          {!entry && !loading ? (
            <p className="hcc-empty">Esta foto ya no existe.</p>
          ) : url ? (
            <img src={url} alt={`Foto ${photo.index + 1} ${where}`} className="hcc-photo-full" />
          ) : (
            <p className="hcc-empty">Cargando foto…</p>
          )}
          {entry && (
            <p className="hcc-photo-caption">
              Foto {photo.index + 1} de {entry.photo_paths.length} {where} · {entry.created_by_name || 'Sin nombre'} · {formatWhen(entry.created_at)}
            </p>
          )}
          <div className="hcc-actions">
            <button type="button" className="hcc-btn primary" onClick={onClosePhoto}>← Volver a la tarjeta</button>
            {url && (
              <a className="hcc-btn" href={url} target="_blank" rel="noopener noreferrer">Abrir original</a>
            )}
          </div>
        </div>
      </div>
    );
  }

  const showSteps = manageSteps || steps.length > 0;
  const showNotes = addNotes || notes.length > 0 || steps.length === 0;

  return (
    <div className="hcc-panel">
      <div className="hcc-summary">
        <p className="hcc-summary-house">Casa: {card.house}</p>
        {card.target_user_id && (
          <p className="hcc-summary-target">👤 {viewerIsTarget ? 'Tarjeta para ti' : `Para: ${card.target_name || 'empleado'}`}</p>
        )}
        {!card.target_user_id && card.visible_to_employees && (
          <p className="hcc-summary-visible">👀 {readOnly ? 'Puedes leer y agregar notas' : 'Visible para empleados de la casa'}</p>
        )}
      </div>

      {canManage && (
        renaming ? (
          <form className="hcc-card-admin" onSubmit={saveRename}>
            <label className="hcc-label" htmlFor="hcc-rename">Nombre de la tarjeta</label>
            <input
              id="hcc-rename"
              className="hcc-input"
              type="text"
              value={renameTitle}
              maxLength={HOUSE_CARD_TITLE_MAX}
              onChange={(e) => setRenameTitle(e.target.value)}
              required
            />
            <div className="hcc-icon-row" role="radiogroup" aria-label="Ícono de la tarjeta">
              {CARD_ICON_CHOICES.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  role="radio"
                  aria-checked={renameIcon === choice}
                  className={`hcc-icon-btn${renameIcon === choice ? ' on' : ''}`}
                  onClick={() => setRenameIcon(choice)}
                >
                  {choice}
                </button>
              ))}
            </div>
            {!card.target_user_id && (
              <label className={`hcc-visible-check${renameVisible ? ' on' : ''}`}>
                <input type="checkbox" checked={renameVisible} onChange={(e) => setRenameVisible(e.target.checked)} />
                <span>
                  👀 Visible para empleados de la casa
                  <small> Ellos solo leen y agregan notas.</small>
                </span>
              </label>
            )}
            <div className="hcc-actions">
              <button type="submit" className="hcc-btn primary" disabled={cardBusy || !renameTitle.trim()}>Guardar</button>
              <button type="button" className="hcc-btn" onClick={() => setRenaming(false)}>Cancelar</button>
            </div>
          </form>
        ) : (
          <div className="hcc-card-admin hcc-actions">
            <button type="button" className="hcc-btn" onClick={startRename} disabled={cardBusy}>✏️ Editar tarjeta</button>
            <button type="button" className="hcc-btn danger" onClick={removeCard} disabled={cardBusy}>🗑️ Eliminar tarjeta</button>
          </div>
        )
      )}

      {loadError && <p className="hcc-error" role="alert">{loadError}</p>}

      {showSteps && (
        <section className="hcc-list-section hcc-steps-section" aria-label="Instrucciones">
          <div className="hcc-section-head">
            <h3 className="hcc-list-title">📋 Instrucciones{steps.length ? ` (${steps.length} ${steps.length === 1 ? 'paso' : 'pasos'})` : ''}</h3>
            {!manageSteps && steps.length > 0 && <span className="hcc-readonly-badge">Solo lectura</span>}
          </div>
          {loading && entries.length === 0 ? (
            <p className="hcc-empty">Cargando…</p>
          ) : steps.length === 0 ? (
            <p className="hcc-empty">Todavía no hay pasos. Agrega el primero con título, texto, fotos o un video.</p>
          ) : (
            <ol className="hcc-steps">
              {steps.map((step, i) => (
                <li key={step.id} className="hcc-step">
                  {editingId === step.id ? (
                    <EntryForm
                      card={card}
                      kind="instruccion"
                      entry={step}
                      photoUrls={photoUrls}
                      onSaved={onSaved}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <>
                      <div className="hcc-step-head">
                        <span className="hcc-step-badge">Paso {i + 1}</span>
                        <h4 className="hcc-step-title">{step.title}</h4>
                      </div>
                      {step.body && <p className="hcc-entry-body">{step.body}</p>}
                      <EntryMedia entry={step} photoUrls={photoUrls} videoUrls={videoUrls} onOpenPhoto={onOpenPhoto} />
                      {manageSteps && (
                        <>
                          <EntryMeta entry={step} />
                          <div className="hcc-actions hcc-step-actions">
                            <button type="button" className="hcc-btn" disabled={moving || i === 0} onClick={() => move(step, -1)} aria-label={`Subir el paso ${i + 1}`}>↑ Subir</button>
                            <button type="button" className="hcc-btn" disabled={moving || i === steps.length - 1} onClick={() => move(step, 1)} aria-label={`Bajar el paso ${i + 1}`}>↓ Bajar</button>
                            <button type="button" className="hcc-btn" onClick={() => { setAdding(null); setEditingId(step.id); }}>✏️ Editar</button>
                            <button type="button" className="hcc-btn danger" onClick={() => removeEntry(step)}>🗑️ Eliminar</button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ol>
          )}
          {manageSteps && (
            adding === 'instruccion' ? (
              <EntryForm card={card} kind="instruccion" photoUrls={photoUrls} onSaved={onSaved} onCancel={() => setAdding(null)} />
            ) : (
              <button type="button" className="hcc-btn hcc-add-entry" onClick={() => { setEditingId(null); setAdding('instruccion'); }}>
                + Agregar paso
              </button>
            )
          )}
        </section>
      )}

      {showNotes && (
        <section className="hcc-list-section" aria-label="Notas">
          <div className="hcc-section-head">
            <h3 className="hcc-list-title">📝 Notas ({notes.length})</h3>
            {!addNotes && notes.length > 0 && <span className="hcc-readonly-badge">Solo lectura</span>}
          </div>
          {addNotes && (
            adding === 'nota' ? (
              <EntryForm
                card={card}
                kind="nota"
                photoUrls={photoUrls}
                onSaved={onSaved}
                onCancel={() => setAdding(null)}
                notice={manageSteps ? null : 'Después de guardar, tu nota no se puede editar ni borrar. Si te equivocas, avísale al manager.'}
              />
            ) : (
              <button type="button" className="hcc-btn hcc-add-entry" onClick={() => { setEditingId(null); setAdding('nota'); }}>
                + Agregar nota
              </button>
            )
          )}
          {loading && entries.length === 0 ? (
            <p className="hcc-empty">Cargando notas…</p>
          ) : notes.length === 0 ? (
            <p className="hcc-empty">Todavía no hay notas en esta tarjeta.</p>
          ) : (
            <ul className="hcc-list">
              {notes.map((entry) => (
                <li key={entry.id} className="hcc-entry">
                  {editingId === entry.id ? (
                    <EntryForm
                      card={card}
                      kind="nota"
                      entry={entry}
                      photoUrls={photoUrls}
                      onSaved={onSaved}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <>
                      <EntryMeta entry={entry} />
                      {entry.body && <p className="hcc-entry-body">{entry.body}</p>}
                      <EntryMedia entry={entry} photoUrls={photoUrls} videoUrls={videoUrls} onOpenPhoto={onOpenPhoto} />
                      {canEditEntry(user, card, entry, authUid) && (
                        <div className="hcc-actions hcc-entry-actions">
                          <button type="button" className="hcc-btn" onClick={() => { setAdding(null); setEditingId(entry.id); }}>✏️ Editar</button>
                          <button type="button" className="hcc-btn danger" onClick={() => removeEntry(entry)}>🗑️ Eliminar</button>
                        </div>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
