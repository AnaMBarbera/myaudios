import { AppUser, UserRole, UserPermissions } from '../types';

const AUTH_STORAGE_KEY = 'lingosync_auth_user';

export function getPermissions(role: UserRole): UserPermissions {
  switch (role) {
    case 'admin':
      return {
        canManageUsers: true,
        canEditContent: true,
        canDeleteContent: true,
        canUploadAudios: true,
        canViewAudios: true,
        canCreateCourses: true,
      };
    case 'teacher':
      return {
        canManageUsers: true, // Teachers can manage/register students
        canEditContent: true,
        canDeleteContent: false, // Only admin can delete whole modules/lessons permanently
        canUploadAudios: true,
        canViewAudios: true,
        canCreateCourses: true,
      };
    case 'student':
    default:
      return {
        canManageUsers: false,
        canEditContent: false,
        canDeleteContent: false,
        canUploadAudios: false,
        canViewAudios: true,
        canCreateCourses: false,
      };
  }
}

export const DEFAULT_ADMIN_USER: AppUser = {
  id: 'user_admin_1',
  username: 'admin',
  name: 'Ana Barberá (Admin)',
  email: 'anabarbera90@gmail.com',
  role: 'admin',
  createdAt: 1718000000000,
  isActive: true,
  notes: 'Super Administrador del sistema con acceso completo',
};

export function getCurrentUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw || raw === 'guest' || raw === 'null') return null;
    return JSON.parse(raw) as AppUser;
  } catch (e) {
    console.warn('Error reading current user from storage:', e);
    return null;
  }
}

export function setCurrentUser(user: AppUser | null): void {
  try {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.setItem(AUTH_STORAGE_KEY, 'guest');
    }
  } catch (e) {
    console.warn('Error saving current user to storage:', e);
  }
}

export async function login(username: string, password: string): Promise<{ success: boolean; user?: AppUser; error?: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Error al iniciar sesión' };
    }

    setCurrentUser(data.user);
    return { success: true, user: data.user };
  } catch (err: any) {
    console.error('Network error on login:', err);
    return { success: false, error: 'Error de conexión con el servidor' };
  }
}

export function logout(): void {
  setCurrentUser(null);
}

export async function fetchUsers(): Promise<AppUser[]> {
  try {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error('Error al consultar usuarios');
    return await res.json();
  } catch (e) {
    console.warn('Error fetching users:', e);
    return [];
  }
}

export async function createUser(data: {
  username: string;
  name: string;
  email?: string;
  role: UserRole;
  password?: string;
  notes?: string;
  enrolledCourseIds?: string[];
}): Promise<{ success: boolean; user?: AppUser; error?: string }> {
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      return { success: false, error: result.error || 'Error creando usuario' };
    }
    return { success: true, user: result.user };
  } catch (err: any) {
    return { success: false, error: 'Error de red al crear usuario' };
  }
}

export async function updateUser(
  id: string,
  data: Partial<AppUser>
): Promise<{ success: boolean; user?: AppUser; error?: string }> {
  try {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      return { success: false, error: result.error || 'Error actualizando usuario' };
    }
    return { success: true, user: result.user };
  } catch (err: any) {
    return { success: false, error: 'Error de red al actualizar usuario' };
  }
}

export async function deleteUser(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
    });
    const result = await res.json();
    if (!res.ok) {
      return { success: false, error: result.error || 'Error al eliminar usuario' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: 'Error de red al eliminar usuario' };
  }
}
