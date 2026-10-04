// Who an employee is allowed to see in Tareas Extra and trabajos asignados.
// Names are stored either as the username or as the email local-part (before @),
// in any mix of case. Managers and the owner are not filtered with this helper.

export type EmployeeIdentity = {
  username?: string | null;
  email?: string | null;
};

function addKey(keys: Set<string>, value?: string | null) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return;
  keys.add(raw);
  const at = raw.indexOf('@');
  if (at > 0) keys.add(raw.slice(0, at));
}

export function employeeMatchKeys(identity: EmployeeIdentity | string | null | undefined): string[] {
  const keys = new Set<string>();
  if (typeof identity === 'string' || identity == null) {
    addKey(keys, typeof identity === 'string' ? identity : '');
  } else {
    addKey(keys, identity.username);
    addKey(keys, identity.email);
  }
  return Array.from(keys);
}

export function isEmpleadoRole(role?: string | null): boolean {
  return String(role || '').trim().toLowerCase() === 'empleado';
}

/** True when a stored assignee/employee name is this person. Empty names never match. */
export function nameBelongsToEmployee(
  stored: string | null | undefined,
  identity: EmployeeIdentity | string | null | undefined
): boolean {
  const raw = String(stored || '').trim().toLowerCase();
  if (!raw) return false;
  const keys = new Set(employeeMatchKeys(identity));
  if (keys.size === 0) return false;
  if (keys.has(raw)) return true;
  const at = raw.indexOf('@');
  if (at > 0 && keys.has(raw.slice(0, at))) return true;
  return false;
}
