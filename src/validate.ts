export type FieldError = { field: string; message: string };

const ACTIONS = new Set(['status', 'health', 'login', 'warehouse.sync', 'platforms.search']);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CTRL = /[\u0000-\u001F\u007F]/;

export function str(v: unknown, max = 200) {
  if (v == null) return '';
  return String(v).trim().slice(0, max);
}

export function validateAction(action: string): FieldError[] {
  if (!ACTIONS.has(action)) return [{ field: 'action', message: 'invalid action' }];
  return [];
}

export function validateLogin(body: any): FieldError[] {
  const errs: FieldError[] = [];
  const email = str(body.email, 120);
  const password = str(body.password, 128);
  if (email && email !== 'admin' && !EMAIL.test(email)) errs.push({ field: 'email', message: 'invalid email' });
  if (password.length < 8) errs.push({ field: 'password', message: 'min 8 chars' });
  if (CTRL.test(email) || CTRL.test(password)) errs.push({ field: 'input', message: 'control chars' });
  return errs;
}

export function validateQuery(q: unknown): FieldError[] {
  const query = str(q, 80);
  if (!query) return [{ field: 'query', message: 'required' }];
  if (query.length < 2) return [{ field: 'query', message: 'min 2 chars' }];
  if (CTRL.test(query)) return [{ field: 'query', message: 'invalid chars' }];
  return [];
}
