// Tarjetas personalizadas por casa (ej. "Notas", "Instrucciones") con notas, pasos, fotos y videos.
// Tablas: house_custom_cards, house_card_entries.
// Buckets privados: house-card-photos (fotos, 5 MB) y house-card-videos (videos, 50 MB).
// La casa se guarda por nombre, igual que tasks.house / calendar_assignments.house.
//
// Dos tipos de tarjeta: de casa (target_user_id null) o de UN empleado de esa casa.
// Una tarjeta de casa puede ser "visible para empleados de la casa" (solo lectura para ellos).
// Dos tipos de entrada: 'instruccion' (pasos numerados, ordenados por position) y 'nota'.
// Permisos (iguales a la base, ver supabase/migrations/*_tarjetas_*.sql):
//   - Crear / renombrar / borrar tarjetas y cambiar la visibilidad: solo Jonathan (dueño).
//   - Jonathan y el manager de la casa: ven todas las tarjetas de la casa y crean, editan, borran
//     y ordenan todo (pasos y notas, fotos, videos, enlaces).
//   - Empleado destino de una tarjeta de empleado y empleados de la casa en una tarjeta de casa
//     visible: leen todo y SOLO AGREGAN notas (con fotos, videos o enlaces). No editan ni borran
//     nada, ni siquiera sus propias notas.
// La base decide por profiles.id (auth.uid()); el nombre (employeeScope) solo es respaldo visual.

import { getSupabaseClient } from './supabaseClient';
import { canCloseExtraTask, type HouseActor } from './completeExtraTask';
import { isEmpleadoRole, nameBelongsToEmployee } from './employeeScope';
import { compressImage } from './compressImage';

export const HOUSE_CARD_PHOTOS_BUCKET = 'house-card-photos';
export const HOUSE_CARD_VIDEOS_BUCKET = 'house-card-videos';
export const HOUSE_CARD_MAX_PHOTOS = 10;
export const HOUSE_CARD_MAX_VIDEOS = 3;
export const HOUSE_CARD_MAX_LINKS = 5;
export const HOUSE_CARD_TITLE_MAX = 60;
export const HOUSE_CARD_STEP_TITLE_MAX = 120;
export const HOUSE_CARD_BODY_MAX = 5000;
export const HOUSE_CARD_LINK_MAX = 500;
/** Igual que file_size_limit del bucket house-card-videos (y el límite por archivo del plan gratis). */
export const HOUSE_CARD_VIDEO_MAX_MB = 50;
export const HOUSE_CARD_VIDEO_MAX_BYTES = HOUSE_CARD_VIDEO_MAX_MB * 1024 * 1024;
export const HOUSE_CARD_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const SIGNED_URL_SECONDS = 60 * 60;

/** Prefijo de selectedModalCard para abrir una tarjeta personalizada. */
export const CUSTOM_CARD_MODAL_PREFIX = 'custom:';

export type HouseCustomCard = {
  id: string;
  house: string;
  title: string;
  icon: string | null;
  position: number;
  /** null = tarjeta de toda la casa; si no, profiles.id del empleado. */
  target_user_id: string | null;
  target_name: string | null;
  /** Solo tarjetas de casa: todos los empleados de la casa la ven (solo lectura). */
  visible_to_employees: boolean;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
};

export type HouseCardEntryKind = 'nota' | 'instruccion';

export type HouseCardEntry = {
  id: string;
  card_id: string;
  house: string;
  target_user_id: string | null;
  kind: HouseCardEntryKind;
  /** Título del paso (obligatorio en instrucciones). */
  title: string | null;
  /** Orden del paso (1, 2, 3…). En notas siempre 0. */
  position: number;
  body: string;
  photo_paths: string[];
  video_paths: string[];
  /** Enlaces externos (YouTube, Vimeo, Drive…), solo http(s). */
  video_links: string[];
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
};

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

function normalizeHouse(value?: string | null): string {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Solo Jonathan (dueño). Igual que public.is_full_access(). */
export function canManageHouseCards(user: HouseActor | null | undefined): boolean {
  if (!user) return false;
  const role = String(user.role || '').trim().toLowerCase();
  const username = String(user.username || '').trim().toLowerCase();
  const email = String(user.email || '').trim().toLowerCase();
  if (username === 'jonathan' || email === 'jonathan@360pro.com') return true;
  if (role === 'owner' || role === 'dueno') return true;
  return normalizeHouse(user.house) === 'all';
}

/** Jonathan o el manager de esa casa. Empleados no. Igual que public.can_access_house_cards(). */
export function canUseHouseCards(user: HouseActor | null | undefined, house: string | null | undefined): boolean {
  if (!user || !normalizeHouse(house)) return false;
  if (canManageHouseCards(user)) return true;
  return canCloseExtraTask(user, { house });
}

/** Empleado de esa casa (puede ver tarjetas hechas para él). */
export function isEmployeeOfHouse(user: HouseActor | null | undefined, house: string | null | undefined): boolean {
  if (!user || !isEmpleadoRole(user.role)) return false;
  const h = normalizeHouse(house);
  return Boolean(h) && normalizeHouse(user.house) === h;
}

/** Puede tener tarjetas en esa casa: Jonathan, el manager o un empleado de la casa. */
export function canSeeHouseCards(user: HouseActor | null | undefined, house: string | null | undefined): boolean {
  return canUseHouseCards(user, house) || isEmployeeOfHouse(user, house);
}

type CardAudience = Pick<HouseCustomCard, 'house' | 'target_user_id' | 'target_name'> & {
  visible_to_employees?: boolean | null;
};

/** La tarjeta está hecha para este empleado. Por id si lo tenemos; si no, por nombre. */
export function isCardTarget(
  user: HouseActor | null | undefined,
  card: CardAudience,
  authUid?: string | null
): boolean {
  if (!card.target_user_id || !isEmployeeOfHouse(user, card.house)) return false;
  if (authUid) return card.target_user_id === authUid;
  return nameBelongsToEmployee(card.target_name, user || null);
}

/** Empleado de la casa que ve una tarjeta de casa marcada como visible (lee y agrega notas). */
export function isReadOnlyViewer(user: HouseActor | null | undefined, card: CardAudience): boolean {
  if (card.target_user_id || !card.visible_to_employees) return false;
  return !canUseHouseCards(user, card.house) && isEmployeeOfHouse(user, card.house);
}

export function canViewCard(user: HouseActor | null | undefined, card: CardAudience, authUid?: string | null): boolean {
  return canUseHouseCards(user, card.house) || isCardTarget(user, card, authUid) || isReadOnlyViewer(user, card);
}

/** Pasos de instrucciones: agregar, editar, borrar y ordenar. Solo Jonathan y el manager. */
export function canManageSteps(user: HouseActor | null | undefined, card: CardAudience): boolean {
  return canUseHouseCards(user, card.house);
}

/** Agregar notas: todos los que ven la tarjeta (Jonathan, manager, empleado destino y empleados
 *  de la casa si la tarjeta es visible). */
export function canAddNote(user: HouseActor | null | undefined, card: CardAudience, authUid?: string | null): boolean {
  return canViewCard(user, card, authUid);
}

/** Editar / borrar pasos y notas: solo Jonathan y el manager. Los empleados nunca (ni sus notas). */
export function canEditEntry(
  user: HouseActor | null | undefined,
  card: CardAudience,
  _entry?: Pick<HouseCardEntry, 'created_by'> & { kind?: HouseCardEntryKind | null },
  _authUid?: string | null
): boolean {
  return canUseHouseCards(user, card.house);
}

/** auth.uid() de la sesión actual (el objeto user de la app no trae el id). */
export async function getAuthUserId(): Promise<string | null> {
  try {
    const { data } = await getSupabaseClient().auth.getSession();
    return data?.session?.user?.id || null;
  } catch {
    return null;
  }
}

export function houseSlug(house: string): string {
  const slug = String(house || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'casa';
}

function friendlyError(error: any, fallback: string): string {
  const code = String(error?.code || '');
  const msg = String(error?.message || '');
  if (code === '23505' || /duplicate key/i.test(msg)) return 'Ya existe una tarjeta con ese nombre para esta casa o empleado';
  if (/no pertenece a esta casa/i.test(msg)) return 'Ese empleado no pertenece a esta casa';
  if (code === '42501' || /row-level security|permission denied/i.test(msg)) {
    return 'No tienes permiso para hacer esto';
  }
  if (code === '42P01' || /does not exist|schema cache/i.test(msg)) {
    return 'Falta activar las tarjetas en la base de datos';
  }
  if (/payload too large|exceeded the maximum|maximum allowed size|413/i.test(msg)) {
    return `El archivo es demasiado grande (fotos máx. 5 MB, videos máx. ${HOUSE_CARD_VIDEO_MAX_MB} MB)`;
  }
  if (/mime type|invalid_mime|not supported/i.test(msg)) return 'Ese tipo de archivo no se puede subir';
  if (/house_card_entries_step_title|step_title/i.test(msg)) return 'Cada paso necesita un título';
  if (/links_ok|video_links/i.test(msg)) return 'Hay un enlace que no es válido';
  return msg ? `${fallback}: ${msg}` : fallback;
}

function uuid(): string {
  const c: any = typeof crypto !== 'undefined' ? crypto : null;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ----------------------------------------------------------------------------------- tarjetas

export async function listHouseCards(house: string): Promise<Result<HouseCustomCard[]>> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase.from('house_custom_cards') as any)
      .select('*')
      .eq('house', house)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) return { ok: false, error: friendlyError(error, 'No se pudieron cargar las tarjetas') };
    return { ok: true, data: (data || []) as HouseCustomCard[] };
  } catch (err: any) {
    return { ok: false, error: friendlyError(err, 'No se pudieron cargar las tarjetas') };
  }
}

export type HouseCardCounts = { notes: number; steps: number };

/** Cantidad de pasos y notas por tarjeta en una casa (para la descripción de la tarjeta). */
export async function countHouseCardEntries(house: string): Promise<Record<string, HouseCardCounts>> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase.from('house_card_entries') as any)
      .select('card_id, kind')
      .eq('house', house);
    if (error || !data) return {};
    const counts: Record<string, HouseCardCounts> = {};
    (data as any[]).forEach((row) => {
      const key = String(row.card_id);
      const cur = counts[key] || { notes: 0, steps: 0 };
      if (row.kind === 'instruccion') cur.steps += 1;
      else cur.notes += 1;
      counts[key] = cur;
    });
    return counts;
  } catch {
    return {};
  }
}

function cleanCardTitle(title: string): Result<string> {
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) return { ok: false, error: 'Escribe un nombre para la tarjeta' };
  if (cleanTitle.length > HOUSE_CARD_TITLE_MAX) {
    return { ok: false, error: `El nombre puede tener máximo ${HOUSE_CARD_TITLE_MAX} letras` };
  }
  return { ok: true, data: cleanTitle };
}

export async function createHouseCard(
  house: string,
  title: string,
  icon: string | null,
  position: number,
  targetUserId: string | null = null,
  visibleToEmployees = false
): Promise<Result<HouseCustomCard>> {
  const t = cleanCardTitle(title);
  if (!t.ok) return t;
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase.from('house_custom_cards') as any)
      .insert([{
        house,
        title: t.data,
        icon: icon || null,
        position,
        target_user_id: targetUserId || null,
        // Las tarjetas de un empleado nunca son visibles para el resto (la base también lo fuerza).
        visible_to_employees: targetUserId ? false : Boolean(visibleToEmployees),
      }])
      .select()
      .single();
    if (error) return { ok: false, error: friendlyError(error, 'No se pudo crear la tarjeta') };
    return { ok: true, data: data as HouseCustomCard };
  } catch (err: any) {
    return { ok: false, error: friendlyError(err, 'No se pudo crear la tarjeta') };
  }
}

export async function updateHouseCard(
  cardId: string,
  updates: { title?: string; icon?: string | null; visible_to_employees?: boolean }
): Promise<Result<HouseCustomCard>> {
  const patch: Record<string, any> = {};
  if (updates.title !== undefined) {
    const t = cleanCardTitle(updates.title);
    if (!t.ok) return t;
    patch.title = t.data;
  }
  if (updates.icon !== undefined) patch.icon = updates.icon || null;
  if (updates.visible_to_employees !== undefined) patch.visible_to_employees = Boolean(updates.visible_to_employees);
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase.from('house_custom_cards') as any)
      .update(patch)
      .eq('id', cardId)
      .select()
      .single();
    if (error) return { ok: false, error: friendlyError(error, 'No se pudo guardar la tarjeta') };
    return { ok: true, data: data as HouseCustomCard };
  } catch (err: any) {
    return { ok: false, error: friendlyError(err, 'No se pudo guardar la tarjeta') };
  }
}

/** Borra la tarjeta, sus entradas (ON DELETE CASCADE) y sus fotos y videos de los buckets. */
export async function deleteHouseCard(card: Pick<HouseCustomCard, 'id' | 'house'>): Promise<Result<true>> {
  try {
    const supabase = getSupabaseClient();
    const { data: entries } = await (supabase.from('house_card_entries') as any)
      .select('photo_paths, video_paths')
      .eq('card_id', card.id);
    const photos = new Set<string>();
    const videos = new Set<string>();
    ((entries || []) as any[]).forEach((e) => {
      (e.photo_paths || []).forEach((p: string) => p && photos.add(p));
      (e.video_paths || []).forEach((p: string) => p && videos.add(p));
    });
    // Archivos sueltos en la carpeta de la tarjeta (ej. una subida que no llegó a guardarse).
    const folder = `${houseSlug(card.house)}/${card.id}`;
    const [{ data: listedPhotos }, { data: listedVideos }] = await Promise.all([
      supabase.storage.from(HOUSE_CARD_PHOTOS_BUCKET).list(folder, { limit: 1000 }),
      supabase.storage.from(HOUSE_CARD_VIDEOS_BUCKET).list(folder, { limit: 1000 }),
    ]);
    ((listedPhotos || []) as any[]).forEach((f) => f?.name && photos.add(`${folder}/${f.name}`));
    ((listedVideos || []) as any[]).forEach((f) => f?.name && videos.add(`${folder}/${f.name}`));
    await Promise.all([removePhotos(Array.from(photos)), removeVideos(Array.from(videos))]);

    const { error } = await (supabase.from('house_custom_cards') as any).delete().eq('id', card.id);
    if (error) return { ok: false, error: friendlyError(error, 'No se pudo eliminar la tarjeta') };
    return { ok: true, data: true };
  } catch (err: any) {
    return { ok: false, error: friendlyError(err, 'No se pudo eliminar la tarjeta') };
  }
}

// ------------------------------------------------------------------------- videos y enlaces

function formatMb(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 10 ? String(Math.round(mb)) : mb.toFixed(1).replace('.', ',');
}

function videoExtension(file: File): 'mp4' | 'mov' | 'webm' | null {
  const type = String(file.type || '').toLowerCase();
  if (type === 'video/mp4') return 'mp4';
  if (type === 'video/quicktime') return 'mov';
  if (type === 'video/webm') return 'webm';
  const name = String(file.name || '').toLowerCase();
  if (/\.(mp4|m4v)$/.test(name)) return 'mp4';
  if (/\.mov$/.test(name)) return 'mov';
  if (/\.webm$/.test(name)) return 'webm';
  return null;
}

const VIDEO_CONTENT_TYPE = { mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm' } as const;

/** null si el video se puede subir; si no, el mensaje para mostrar. */
export function videoFileProblem(file: File): string | null {
  if (!videoExtension(file)) {
    return `"${file.name}" no es un video MP4, MOV o WebM. Para otros formatos súbelo a YouTube y pega el enlace.`;
  }
  if (file.size > HOUSE_CARD_VIDEO_MAX_BYTES) {
    return `El video "${file.name}" pesa ${formatMb(file.size)} MB. El máximo es ${HOUSE_CARD_VIDEO_MAX_MB} MB `
      + '(más o menos 1 minuto). Para videos más largos súbelo a YouTube (puede ser "No listado") y pega el enlace aquí.';
  }
  return null;
}

/** ID de YouTube (11 caracteres) de watch?v=, youtu.be/, /shorts/, /embed/, /live/ o m.youtube.com. */
export function youtubeVideoId(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(String(raw || '').trim());
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.|music\.)/, '');
  const okId = (id?: string | null) => (id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null);
  if (host === 'youtu.be') return okId(url.pathname.split('/')[1]);
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') return okId(url.searchParams.get('v'));
    const m = url.pathname.match(/^\/(shorts|embed|live|v)\/([^/?#]+)/);
    return okId(m?.[2]);
  }
  return null;
}

/** Reproductor de YouTube sin cookies de seguimiento. */
export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0`;
}

export type ParsedVideoLink = { url: string; host: string; youtubeId: string | null };

/** Valida y normaliza un enlace (acepta "youtu.be/..." sin https://). Solo http(s). */
export function parseVideoLink(raw: string): Result<ParsedVideoLink> {
  let text = String(raw || '').trim();
  if (!text) return { ok: false, error: 'Pega un enlace' };
  if (/\s/.test(text)) return { ok: false, error: 'El enlace no puede tener espacios' };
  if (!/^[a-z][a-z0-9+.-]*:/i.test(text)) text = `https://${text}`;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { ok: false, error: 'Ese enlace no es válido' };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { ok: false, error: 'Solo se aceptan enlaces que empiezan con https://' };
  }
  if (!url.hostname.includes('.')) return { ok: false, error: 'Ese enlace no es válido' };
  const href = url.toString();
  if (href.length > HOUSE_CARD_LINK_MAX) return { ok: false, error: `El enlace puede tener máximo ${HOUSE_CARD_LINK_MAX} letras` };
  return { ok: true, data: { url: href, host: url.hostname.replace(/^www\./, ''), youtubeId: youtubeVideoId(href) } };
}

// ---------------------------------------------------------------------- pasos y notas

function normalizeEntry(row: any): HouseCardEntry {
  return {
    ...row,
    kind: row.kind === 'instruccion' ? 'instruccion' : 'nota',
    title: row.title ?? null,
    position: Number(row.position) || 0,
    body: row.body || '',
    photo_paths: row.photo_paths || [],
    video_paths: row.video_paths || [],
    video_links: row.video_links || [],
  } as HouseCardEntry;
}

/** Pasos en orden (1, 2, 3…). */
export function sortSteps(entries: HouseCardEntry[]): HouseCardEntry[] {
  return entries
    .filter((e) => e.kind === 'instruccion')
    .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}

/** Notas, la más nueva primero. */
export function sortNotes(entries: HouseCardEntry[]): HouseCardEntry[] {
  return entries.filter((e) => e.kind !== 'instruccion').sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function listCardEntries(cardId: string): Promise<Result<HouseCardEntry[]>> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase.from('house_card_entries') as any)
      .select('*')
      .eq('card_id', cardId)
      .order('created_at', { ascending: false });
    if (error) return { ok: false, error: friendlyError(error, 'No se pudo cargar el contenido') };
    return { ok: true, data: ((data || []) as any[]).map(normalizeEntry) };
  } catch (err: any) {
    return { ok: false, error: friendlyError(err, 'No se pudo cargar el contenido') };
  }
}

/** Comprime y sube fotos. Devuelve las rutas guardadas. Si una falla, borra las ya subidas. */
export async function uploadCardPhotos(
  card: Pick<HouseCustomCard, 'id' | 'house'>,
  files: File[],
  onProgress?: (done: number, total: number) => void
): Promise<Result<string[]>> {
  const supabase = getSupabaseClient();
  const uploaded: string[] = [];
  try {
    for (let i = 0; i < files.length; i += 1) {
      onProgress?.(i, files.length);
      const blob = await compressImage(files[i]);
      const path = `${houseSlug(card.house)}/${card.id}/${uuid()}.jpg`;
      const { error } = await supabase.storage
        .from(HOUSE_CARD_PHOTOS_BUCKET)
        .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });
      if (error) throw error;
      uploaded.push(path);
    }
    onProgress?.(files.length, files.length);
    return { ok: true, data: uploaded };
  } catch (err: any) {
    await removePhotos(uploaded);
    return { ok: false, error: friendlyError(err, 'No se pudo subir la foto') };
  }
}

/** Sube videos tal cual (no se recomprimen en el teléfono). Si uno falla, borra los ya subidos. */
export async function uploadCardVideos(
  card: Pick<HouseCustomCard, 'id' | 'house'>,
  files: File[],
  onProgress?: (done: number, total: number) => void
): Promise<Result<string[]>> {
  for (const f of files) {
    const problem = videoFileProblem(f);
    if (problem) return { ok: false, error: problem };
  }
  const supabase = getSupabaseClient();
  const uploaded: string[] = [];
  try {
    for (let i = 0; i < files.length; i += 1) {
      onProgress?.(i, files.length);
      const ext = videoExtension(files[i]) || 'mp4';
      const path = `${houseSlug(card.house)}/${card.id}/${uuid()}.${ext}`;
      const { error } = await supabase.storage
        .from(HOUSE_CARD_VIDEOS_BUCKET)
        .upload(path, files[i], { contentType: VIDEO_CONTENT_TYPE[ext], cacheControl: '31536000', upsert: false });
      if (error) throw error;
      uploaded.push(path);
    }
    onProgress?.(files.length, files.length);
    return { ok: true, data: uploaded };
  } catch (err: any) {
    await removeVideos(uploaded);
    return { ok: false, error: friendlyError(err, 'No se pudo subir el video') };
  }
}

async function removeFromBucket(bucket: string, paths: string[]): Promise<void> {
  const clean = paths.filter(Boolean);
  if (!clean.length) return;
  try {
    const supabase = getSupabaseClient();
    for (let i = 0; i < clean.length; i += 100) {
      await supabase.storage.from(bucket).remove(clean.slice(i, i + 100));
    }
  } catch (err) {
    console.error(`No se pudieron borrar archivos de ${bucket}:`, err);
  }
}

export function removePhotos(paths: string[]): Promise<void> {
  return removeFromBucket(HOUSE_CARD_PHOTOS_BUCKET, paths);
}

export function removeVideos(paths: string[]): Promise<void> {
  return removeFromBucket(HOUSE_CARD_VIDEOS_BUCKET, paths);
}

/** Lo que el formulario manda para crear o editar un paso o una nota. */
export type EntryInput = {
  title?: string;
  body: string;
  keepPhotoPaths?: string[];
  newPhotos?: File[];
  keepVideoPaths?: string[];
  newVideos?: File[];
  links?: string[];
};

type CleanEntry = { title: string | null; body: string; links: string[] };

function validateEntry(kind: HouseCardEntryKind, input: EntryInput): Result<CleanEntry> {
  const title = String(input.title || '').trim();
  const body = String(input.body || '').trim();
  const photos = (input.keepPhotoPaths?.length || 0) + (input.newPhotos?.length || 0);
  const videos = (input.keepVideoPaths?.length || 0) + (input.newVideos?.length || 0);
  const what = kind === 'instruccion' ? 'el paso' : 'la nota';
  if (kind === 'instruccion' && !title) return { ok: false, error: 'Escribe un título para el paso' };
  if (title.length > HOUSE_CARD_STEP_TITLE_MAX) {
    return { ok: false, error: `El título puede tener máximo ${HOUSE_CARD_STEP_TITLE_MAX} letras` };
  }
  if (body.length > HOUSE_CARD_BODY_MAX) return { ok: false, error: `El texto puede tener máximo ${HOUSE_CARD_BODY_MAX} letras` };
  if (photos > HOUSE_CARD_MAX_PHOTOS) return { ok: false, error: `Máximo ${HOUSE_CARD_MAX_PHOTOS} fotos en ${what}` };
  if (videos > HOUSE_CARD_MAX_VIDEOS) return { ok: false, error: `Máximo ${HOUSE_CARD_MAX_VIDEOS} videos en ${what}` };
  const links: string[] = [];
  for (const raw of input.links || []) {
    const parsed = parseVideoLink(raw);
    if (!parsed.ok) return { ok: false, error: `${parsed.error}: ${raw}` };
    if (!links.includes(parsed.data.url)) links.push(parsed.data.url);
  }
  if (links.length > HOUSE_CARD_MAX_LINKS) return { ok: false, error: `Máximo ${HOUSE_CARD_MAX_LINKS} enlaces en ${what}` };
  for (const f of input.newVideos || []) {
    const problem = videoFileProblem(f);
    if (problem) return { ok: false, error: problem };
  }
  if (!title && !body && photos === 0 && videos === 0 && links.length === 0) {
    return { ok: false, error: 'Escribe algo o agrega una foto, un video o un enlace' };
  }
  return { ok: true, data: { title: title || null, body, links } };
}

/** Sube fotos y videos nuevos. Avisa el progreso en palabras. */
async function uploadEntryMedia(
  card: Pick<HouseCustomCard, 'id' | 'house'>,
  input: EntryInput,
  onProgress?: (label: string | null) => void
): Promise<Result<{ photos: string[]; videos: string[] }>> {
  const newPhotos = input.newPhotos || [];
  const newVideos = input.newVideos || [];
  const photos = await uploadCardPhotos(card, newPhotos, (done, total) => {
    if (total) onProgress?.(`Subiendo fotos ${Math.min(done + 1, total)} de ${total}…`);
  });
  if (!photos.ok) return photos;
  const videos = await uploadCardVideos(card, newVideos, (done, total) => {
    if (total && done < total) onProgress?.(`Subiendo video ${done + 1} de ${total}… (puede tardar un poco)`);
  });
  onProgress?.(null);
  if (!videos.ok) {
    await removePhotos(photos.data);
    return videos;
  }
  return { ok: true, data: { photos: photos.data, videos: videos.data } };
}

export async function createCardEntry(
  card: Pick<HouseCustomCard, 'id' | 'house'>,
  kind: HouseCardEntryKind,
  input: EntryInput,
  onProgress?: (label: string | null) => void
): Promise<Result<HouseCardEntry>> {
  const v = validateEntry(kind, { ...input, keepPhotoPaths: [], keepVideoPaths: [] });
  if (!v.ok) return v;
  const up = await uploadEntryMedia(card, input, onProgress);
  if (!up.ok) return up;
  const what = kind === 'instruccion' ? 'el paso' : 'la nota';
  const cleanup = () => Promise.all([removePhotos(up.data.photos), removeVideos(up.data.videos)]);
  try {
    const supabase = getSupabaseClient();
    // position la pone la base: el paso nuevo va al final.
    const { data, error } = await (supabase.from('house_card_entries') as any)
      .insert([{
        card_id: card.id,
        house: card.house,
        kind,
        title: v.data.title,
        body: v.data.body,
        photo_paths: up.data.photos,
        video_paths: up.data.videos,
        video_links: v.data.links,
      }])
      .select()
      .single();
    if (error) {
      await cleanup();
      return { ok: false, error: friendlyError(error, `No se pudo guardar ${what}`) };
    }
    return { ok: true, data: normalizeEntry(data) };
  } catch (err: any) {
    await cleanup();
    return { ok: false, error: friendlyError(err, `No se pudo guardar ${what}`) };
  }
}

export async function updateCardEntry(
  card: Pick<HouseCustomCard, 'id' | 'house'>,
  entry: HouseCardEntry,
  input: EntryInput,
  onProgress?: (label: string | null) => void
): Promise<Result<HouseCardEntry>> {
  const keepPhotos = input.keepPhotoPaths ?? entry.photo_paths ?? [];
  const keepVideos = input.keepVideoPaths ?? entry.video_paths ?? [];
  const v = validateEntry(entry.kind, { ...input, keepPhotoPaths: keepPhotos, keepVideoPaths: keepVideos });
  if (!v.ok) return v;
  const up = await uploadEntryMedia(card, input, onProgress);
  if (!up.ok) return up;
  const what = entry.kind === 'instruccion' ? 'el paso' : 'la nota';
  const cleanup = () => Promise.all([removePhotos(up.data.photos), removeVideos(up.data.videos)]);
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase.from('house_card_entries') as any)
      .update({
        title: v.data.title,
        body: v.data.body,
        photo_paths: [...keepPhotos, ...up.data.photos],
        video_paths: [...keepVideos, ...up.data.videos],
        video_links: v.data.links,
      })
      .eq('id', entry.id)
      .select()
      .single();
    if (error) {
      await cleanup();
      return { ok: false, error: friendlyError(error, `No se pudo guardar ${what}`) };
    }
    await Promise.all([
      removePhotos((entry.photo_paths || []).filter((p) => !keepPhotos.includes(p))),
      removeVideos((entry.video_paths || []).filter((p) => !keepVideos.includes(p))),
    ]);
    return { ok: true, data: normalizeEntry(data) };
  } catch (err: any) {
    await cleanup();
    return { ok: false, error: friendlyError(err, `No se pudo guardar ${what}`) };
  }
}

export async function deleteCardEntry(entry: HouseCardEntry): Promise<Result<true>> {
  const what = entry.kind === 'instruccion' ? 'el paso' : 'la nota';
  try {
    const supabase = getSupabaseClient();
    const { error } = await (supabase.from('house_card_entries') as any).delete().eq('id', entry.id);
    if (error) return { ok: false, error: friendlyError(error, `No se pudo eliminar ${what}`) };
    await Promise.all([removePhotos(entry.photo_paths || []), removeVideos(entry.video_paths || [])]);
    return { ok: true, data: true };
  } catch (err: any) {
    return { ok: false, error: friendlyError(err, `No se pudo eliminar ${what}`) };
  }
}

/** Sube (-1) o baja (+1) un paso. La base renumera 1..n. false = ya estaba en el borde. */
export async function moveCardStep(entryId: string, direction: -1 | 1): Promise<Result<boolean>> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase as any).rpc('move_house_card_step', {
      p_entry: entryId,
      p_direction: direction,
    });
    if (error) return { ok: false, error: friendlyError(error, 'No se pudo mover el paso') };
    return { ok: true, data: Boolean(data) };
  } catch (err: any) {
    return { ok: false, error: friendlyError(err, 'No se pudo mover el paso') };
  }
}

async function signUrls(bucket: string, paths: string[]): Promise<Record<string, string>> {
  const clean = Array.from(new Set(paths.filter(Boolean)));
  if (!clean.length) return {};
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.storage.from(bucket).createSignedUrls(clean, SIGNED_URL_SECONDS);
    if (error || !data) return {};
    const out: Record<string, string> = {};
    (data as any[]).forEach((row) => {
      if (row?.path && row?.signedUrl) out[row.path] = row.signedUrl;
    });
    return out;
  } catch {
    return {};
  }
}

/** URLs firmadas (1 hora) para mostrar fotos del bucket privado. */
export function signPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  return signUrls(HOUSE_CARD_PHOTOS_BUCKET, paths);
}

/** URLs firmadas (1 hora) para reproducir videos del bucket privado. */
export function signVideoUrls(paths: string[]): Promise<Record<string, string>> {
  return signUrls(HOUSE_CARD_VIDEOS_BUCKET, paths);
}

// ---------------------------------------------------------------------------- tiempo real

/**
 * Escucha cambios de tarjetas y notas de una casa. Los INSERT/UPDATE vienen filtrados por casa;
 * los DELETE no se pueden filtrar en Supabase Realtime, así que llegan todos y el callback
 * simplemente vuelve a cargar. RLS limita lo que cada usuario recibe.
 */
export function subscribeToHouseCards(house: string, onChange: (table: string, payload: any) => void) {
  try {
    const supabase = getSupabaseClient();
    const tag = `${houseSlug(house)}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const channel = (supabase as any).channel(`house-cards-${tag}`);
    (['house_custom_cards', 'house_card_entries'] as const).forEach((table) => {
      channel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter: `house=eq.${house}` }, (p: any) => onChange(table, p))
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table, filter: `house=eq.${house}` }, (p: any) => onChange(table, p))
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table }, (p: any) => onChange(table, p));
    });
    channel.subscribe();
    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        /* ignore */
      }
    };
  } catch (error) {
    console.error('Error suscribiendo tarjetas de la casa:', error);
    return () => {};
  }
}
