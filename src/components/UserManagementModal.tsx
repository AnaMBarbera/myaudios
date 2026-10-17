import React, { useState, useEffect } from 'react';
import { 
  X, 
  UserPlus, 
  Users, 
  ShieldCheck, 
  GraduationCap, 
  BookOpen, 
  Search, 
  Check, 
  Pencil, 
  Trash2, 
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Clock,
  Sparkles,
  Folder,
  Plus,
  Layers,
  BookCheck
} from 'lucide-react';
import { AppUser, UserRole, CourseLevel } from '../types';
import { fetchUsers, createUser, updateUser, deleteUser } from '../services/authService';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  levels: CourseLevel[];
  onSaveLevel: (level: CourseLevel) => void;
  onCreateLevel: (name: string, description?: string, teacherIds?: string[]) => CourseLevel;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  levels,
  onSaveLevel,
  onCreateLevel,
}) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'register' | 'courses'>('list');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New user form state
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('student');
  const [newPassword, setNewPassword] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newEnrolledCourseIds, setNewEnrolledCourseIds] = useState<string[]>([]);

  // User editing state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('student');
  const [editPassword, setEditPassword] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editEnrolledCourseIds, setEditEnrolledCourseIds] = useState<string[]>([]);

  // Course creation & editing state
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [newCourseTeacherIds, setNewCourseTeacherIds] = useState<string[]>([]);

  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editCourseName, setEditCourseName] = useState('');
  const [editCourseDesc, setEditCourseDesc] = useState('');
  const [editCourseTeacherIds, setEditCourseTeacherIds] = useState<string[]>([]);

  // Course student management state (Teacher/Admin enrolling students into a course)
  const [registrationCourseFilter, setRegistrationCourseFilter] = useState<'all' | 'my'>('all');
  const [managingStudentsCourseId, setManagingStudentsCourseId] = useState<string | null>(null);
  const [selectedStudentIdsForCourse, setSelectedStudentIdsForCourse] = useState<string[]>([]);

  const isAdmin = currentUser?.role === 'admin';
  const isTeacher = currentUser?.role === 'teacher';

  const loadData = async () => {
    setIsLoading(true);
    const data = await fetchUsers();
    setUsers(data);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setError(null);
      setSuccessMessage(null);
      // Pre-select courses taught by current teacher for convenience
      if (currentUser) {
        const myCourseIds = levels
          .filter(l => l.teacherIds?.includes(currentUser.id) || l.createdById === currentUser.id)
          .map(l => l.id);
        setNewEnrolledCourseIds(myCourseIds.length > 0 ? myCourseIds : (levels.length > 0 ? [levels[0].id] : []));
        setNewCourseTeacherIds([currentUser.id]);
        if (currentUser.role === 'teacher') {
          setRegistrationCourseFilter('my');
        }
      }
    }
  }, [isOpen]);

  // Open student management for a course
  const handleOpenManageStudents = (courseId: string) => {
    setManagingStudentsCourseId(courseId);
    const enrolledIds = users
      .filter(u => u.role === 'student' && u.enrolledCourseIds?.includes(courseId))
      .map(u => u.id);
    setSelectedStudentIdsForCourse(enrolledIds);
  };

  // Save student enrollment for a course
  const handleSaveCourseEnrollment = async (courseId: string) => {
    setIsLoading(true);
    const students = users.filter(u => u.role === 'student');
    for (const student of students) {
      const isSelected = selectedStudentIdsForCourse.includes(student.id);
      const currentlyEnrolled = student.enrolledCourseIds || [];
      const hasCourse = currentlyEnrolled.includes(courseId);

      if (isSelected && !hasCourse) {
        const nextCourses = [...currentlyEnrolled, courseId];
        await updateUser(student.id, { enrolledCourseIds: nextCourses });
      } else if (!isSelected && hasCourse) {
        const nextCourses = currentlyEnrolled.filter(id => id !== courseId);
        await updateUser(student.id, { enrolledCourseIds: nextCourses });
      }
    }
    await loadData();
    setIsLoading(false);
    setManagingStudentsCourseId(null);
    setSuccessMessage('Matriculaciones del curso guardadas correctamente');
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  if (!isOpen) return null;

  // Filter available teachers from users list
  const availableTeachers = users.filter(u => u.role === 'teacher' || u.role === 'admin');

  // Submit New User
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!newUsername.trim() || !newName.trim()) {
      setError('Nombre de usuario y nombre completo son obligatorios');
      return;
    }

    // Teachers can only register students
    const roleToAssign = isTeacher && !isAdmin ? 'student' : newRole;

    const res = await createUser({
      username: newUsername.trim(),
      name: newName.trim(),
      email: newEmail.trim() || undefined,
      role: roleToAssign,
      password: newPassword.trim() || '123456',
      notes: newNotes.trim() || undefined,
      enrolledCourseIds: roleToAssign === 'student' ? newEnrolledCourseIds : undefined,
    });

    if (res.success && res.user) {
      setSuccessMessage(`Usuario "${res.user.name}" registrado correctamente.`);
      setNewUsername('');
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewNotes('');
      setNewRole('student');
      await loadData();
      setActiveTab('list');
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setError(res.error || 'Error al registrar el usuario');
    }
  };

  // Toggle user activation
  const handleToggleActive = async (user: AppUser) => {
    if (user.id === currentUser?.id) {
      alert('No puedes desactivar tu propia cuenta activa.');
      return;
    }

    const updatedStatus = !user.isActive;
    const res = await updateUser(user.id, { isActive: updatedStatus });
    if (res.success) {
      setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, isActive: updatedStatus } : u)));
    } else {
      setError(res.error || 'Error al cambiar estado del usuario');
    }
  };

  // Start Editing a user
  const handleStartEdit = (user: AppUser) => {
    setEditingUserId(user.id);
    setEditName(user.name);
    setEditRole(user.role);
    setEditPassword('');
    setEditNotes(user.notes || '');
    setEditEnrolledCourseIds(user.enrolledCourseIds || []);
  };

  // Save User Edit
  const handleSaveEdit = async (userId: string) => {
    setError(null);
    const payload: Partial<AppUser> = {
      name: editName.trim(),
      role: editRole,
      notes: editNotes.trim(),
      enrolledCourseIds: editEnrolledCourseIds,
    };
    if (editPassword.trim()) {
      payload.password = editPassword.trim();
    }

    const res = await updateUser(userId, payload);
    if (res.success && res.user) {
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, ...res.user } : u)));
      setEditingUserId(null);
      setSuccessMessage('Usuario actualizado con éxito');
      setTimeout(() => setSuccessMessage(null), 2500);
    } else {
      setError(res.error || 'Error al actualizar usuario');
    }
  };

  // Delete User
  const handleDelete = async (user: AppUser) => {
    if (user.id === currentUser?.id) {
      alert('No puedes eliminar tu propio usuario activo.');
      return;
    }
    if (!window.confirm(`¿Seguro que deseas eliminar definitivamente a ${user.name} (@${user.username})?`)) {
      return;
    }

    const res = await deleteUser(user.id);
    if (res.success) {
      setUsers(prev => prev.filter(u => u.id !== user.id));
      setSuccessMessage(`Usuario ${user.name} eliminado.`);
      setTimeout(() => setSuccessMessage(null), 2500);
    } else {
      setError(res.error || 'Error al eliminar usuario');
    }
  };

  // Course creation submit
  const handleCreateCourseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim()) return;

    const assignedTeachers = newCourseTeacherIds.length > 0 
      ? newCourseTeacherIds 
      : (currentUser ? [currentUser.id] : []);

    onCreateLevel(newCourseName.trim(), newCourseDesc.trim(), assignedTeachers);
    setNewCourseName('');
    setNewCourseDesc('');
    setIsCreatingCourse(false);
    setSuccessMessage('Nuevo curso creado con éxito');
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  // Start course edit
  const handleStartEditCourse = (lvl: CourseLevel) => {
    setEditingCourseId(lvl.id);
    setEditCourseName(lvl.name);
    setEditCourseDesc(lvl.description || '');
    setEditCourseTeacherIds(lvl.teacherIds || []);
  };

  // Save course edit
  const handleSaveCourseEdit = (courseId: string) => {
    const existing = levels.find(l => l.id === courseId);
    if (!existing) return;

    const updated: CourseLevel = {
      ...existing,
      name: editCourseName.trim() || existing.name,
      description: editCourseDesc.trim(),
      teacherIds: editCourseTeacherIds,
    };

    onSaveLevel(updated);
    setEditingCourseId(null);
    setSuccessMessage('Curso actualizado correctamente');
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  // Filtered Users List
  const filteredUsers = users.filter((u) => {
    // Teachers only see their own students (enrolled in at least one course taught by this teacher) and themselves
    if (isTeacher && !isAdmin) {
      if (u.id !== currentUser?.id) {
        if (u.role === 'admin' || u.role === 'teacher') return false;
        const myCourseIds = levels.map(l => l.id);
        const isEnrolledInMyCourses = (u.enrolledCourseIds || []).some(cId => myCourseIds.includes(cId));
        if (!isEnrolledInMyCourses) return false;
      }
    }

    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (courseFilter !== 'all') {
      if (u.role === 'student') {
        if (!u.enrolledCourseIds || !u.enrolledCourseIds.includes(courseFilter)) return false;
      } else if (u.role === 'teacher') {
        const teachesCourse = levels.find(l => l.id === courseFilter)?.teacherIds?.includes(u.id);
        if (!teachesCourse) return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = u.name.toLowerCase().includes(q);
      const matchUsername = u.username.toLowerCase().includes(q);
      const matchEmail = (u.email || '').toLowerCase().includes(q);
      return matchName || matchUsername || matchEmail;
    }
    return true;
  });

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <ShieldCheck className="w-3 h-3 text-indigo-500" />
            <span>Admin</span>
          </span>
        );
      case 'teacher':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            <GraduationCap className="w-3 h-3 text-sky-500" />
            <span>Profesor</span>
          </span>
        );
      case 'student':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <BookOpen className="w-3 h-3 text-emerald-500" />
            <span>Alumno</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-tight">
                Gestión de Usuarios, Alumnos y Cursos
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAdmin ? 'Panel de Administrador: Acceso total al centro' : 'Panel de Profesor: Gestión exclusiva de tus cursos y alumnos'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'list'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{isTeacher && !isAdmin ? 'Mis Alumnos' : 'Usuarios & Alumnos'} ({filteredUsers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('register')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'register'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Matricular Alumno</span>
          </button>

          <button
            onClick={() => setActiveTab('courses')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'courses'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{isTeacher && !isAdmin ? 'Mis Cursos' : 'Cursos & Profesores'} ({levels.length})</span>
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Main Content Body */}
        <div className="p-6 overflow-y-auto flex-1 transcript-scroll">
          {activeTab === 'list' ? (
            /* User List View with Course Badges and Filters */
            <div className="space-y-4">
              {/* Toolbar: Role Filter, Course Filter & Search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {/* Role filter buttons */}
                  <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    {(['all', 'student', 'teacher', 'admin'] as const).map(role => (
                      <button
                        key={role}
                        onClick={() => setRoleFilter(role)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg capitalize transition-colors cursor-pointer ${
                          roleFilter === role
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        {role === 'all' ? 'Todos' : role === 'student' ? 'Alumnos' : role === 'teacher' ? 'Profesores' : 'Admins'}
                      </button>
                    ))}
                  </div>

                  {/* Course Filter Dropdown */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-400 font-semibold hidden md:inline">Curso:</span>
                    <select
                      value={courseFilter}
                      onChange={(e) => setCourseFilter(e.target.value)}
                      className="px-2.5 py-1 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
                    >
                      <option value="all">Todos los cursos</option>
                      {levels.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-60">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar alumno o usuario..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              {/* Users Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                      <th className="py-2.5 px-3">Usuario / Nombre</th>
                      <th className="py-2.5 px-3">Rol</th>
                      <th className="py-2.5 px-3">Cursos Matriculados</th>
                      <th className="py-2.5 px-3">Estado</th>
                      <th className="py-2.5 px-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No se encontraron usuarios con los filtros seleccionados
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isEditing = editingUserId === u.id;
                        return (
                          <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                            {/* User details */}
                            <td className="py-3 px-3">
                              {isEditing ? (
                                <div className="space-y-1 max-w-xs">
                                  <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                                    placeholder="Nombre completo"
                                  />
                                  <input
                                    type="password"
                                    value={editPassword}
                                    onChange={(e) => setEditPassword(e.target.value)}
                                    className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                                    placeholder="Nueva contraseña (opcional)"
                                  />
                                </div>
                              ) : (
                                <div>
                                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <span>{u.name}</span>
                                    {u.id === currentUser?.id && (
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                                        Tú
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-slate-400 text-[11px] font-mono">
                                    @{u.username} {u.email && `· ${u.email}`}
                                  </div>
                                  {u.notes && (
                                    <div className="text-[10px] text-slate-500 italic mt-0.5">
                                      {u.notes}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Role badge or editor */}
                            <td className="py-3 px-3">
                              {isEditing && isAdmin ? (
                                <select
                                  value={editRole}
                                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                                  className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                                >
                                  <option value="student">Alumno / Lector</option>
                                  <option value="teacher">Profesor / Editor</option>
                                  <option value="admin">Administrador</option>
                                </select>
                              ) : (
                                getRoleBadge(u.role)
                              )}
                            </td>

                            {/* Enrolled Courses */}
                            <td className="py-3 px-3">
                              {isEditing ? (
                                <div className="space-y-1 max-w-xs">
                                  <span className="text-[10px] font-semibold text-slate-400 block">Cursos asignados:</span>
                                  <div className="flex flex-wrap gap-1">
                                    {levels.map(lvl => {
                                      const isChecked = editEnrolledCourseIds.includes(lvl.id);
                                      return (
                                        <button
                                          type="button"
                                          key={lvl.id}
                                          onClick={() => {
                                            if (isChecked) {
                                              setEditEnrolledCourseIds(prev => prev.filter(id => id !== lvl.id));
                                            } else {
                                              setEditEnrolledCourseIds(prev => [...prev, lvl.id]);
                                            }
                                          }}
                                          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                            isChecked 
                                              ? 'bg-indigo-600 text-white border-indigo-600' 
                                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                                          }`}
                                        >
                                          {lvl.name} {isChecked ? '✓' : '+'}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : u.role === 'student' ? (
                                <div className="flex flex-wrap items-center gap-1">
                                  {u.enrolledCourseIds && u.enrolledCourseIds.length > 0 ? (
                                    u.enrolledCourseIds.map(cId => {
                                      const level = levels.find(l => l.id === cId);
                                      return (
                                        <span 
                                          key={cId}
                                          className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                                        >
                                          {level ? level.name : cId}
                                        </span>
                                      );
                                    })
                                  ) : (
                                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                      Sin cursos asignados
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">
                                  {u.role === 'admin' ? 'Todos los cursos (Admin)' : 'Profesor'}
                                </span>
                              )}
                            </td>

                            {/* Active Status */}
                            <td className="py-3 px-3">
                              <button
                                onClick={() => handleToggleActive(u)}
                                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                                  u.isActive
                                    ? 'text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                    : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                {u.isActive ? (
                                  <>
                                    <ToggleRight className="w-4 h-4 text-emerald-500" />
                                    <span>Activo</span>
                                  </>
                                ) : (
                                  <>
                                    <ToggleLeft className="w-4 h-4 text-slate-400" />
                                    <span>Inactivo</span>
                                  </>
                                )}
                              </button>
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-3 text-right">
                              {isEditing ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleSaveEdit(u.id)}
                                    className="p-1 px-2 rounded bg-indigo-600 text-white font-semibold text-[11px] hover:bg-indigo-700 cursor-pointer"
                                  >
                                    Guardar
                                  </button>
                                  <button
                                    onClick={() => setEditingUserId(null)}
                                    className="p-1 px-2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => handleStartEdit(u)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    title="Editar usuario y cursos"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>

                                  {isAdmin && u.id !== currentUser?.id && (
                                    <button
                                      onClick={() => handleDelete(u)}
                                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                      title="Eliminar usuario"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'register' ? (
            /* Register New Student / User Form with Course Enrollment */
            <form onSubmit={handleRegisterSubmit} className="space-y-5 max-w-xl mx-auto">
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Alta y Matriculación de Alumnos</span>
                  <span>
                    Como {isAdmin ? 'Administrador' : 'Profesor'}, da de alta las credenciales de tu alumno y asígnale los cursos a los que tendrá acceso para practicar.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nombre de Usuario / Login *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="ej: lauragarcia, alumno_b1"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nombre y Apellidos *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="ej: Laura García Morales"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Correo Electrónico (opcional)
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="alumno@ejemplo.com"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contraseña Inicial *
                  </label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Por defecto: 123456"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Rol de Acceso *
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <div
                    onClick={() => setNewRole('student')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      newRole === 'student'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold text-xs mb-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Alumno</span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                      Lector: Solo verá el contenido de sus cursos matriculados.
                    </span>
                  </div>

                  <div
                    onClick={() => isAdmin && setNewRole('teacher')}
                    className={`p-3 rounded-xl border transition-all ${
                      !isAdmin 
                        ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-800/40' 
                        : newRole === 'teacher'
                        ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/40 ring-2 ring-sky-500/20 cursor-pointer'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-sky-700 dark:text-sky-300 font-bold text-xs mb-1">
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Profesor</span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                      Editor: Crea cursos, sube audios y matricula alumnos.
                    </span>
                  </div>

                  <div
                    onClick={() => isAdmin && setNewRole('admin')}
                    className={`p-3 rounded-xl border transition-all ${
                      !isAdmin
                        ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-800/40'
                        : newRole === 'admin'
                          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20 cursor-pointer'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-bold text-xs mb-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Admin</span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                      Acceso total a todos los cursos y usuarios.
                    </span>
                  </div>
                </div>
              </div>

              {/* Course Enrollment Selection for Students */}
              {newRole === 'student' && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <BookCheck className="w-4 h-4 text-indigo-600" />
                        <span>Cursos en los que se matricula al Alumno *</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Cada curso muestra sus profesores asignados. El alumno solo verá el contenido de sus cursos:
                      </p>
                    </div>

                    <div className="flex items-center gap-1 text-[11px]">
                      {isTeacher && !isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => setRegistrationCourseFilter(prev => prev === 'my' ? 'all' : 'my')}
                            className="px-2 py-0.5 rounded-md font-semibold text-[10px] bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 cursor-pointer"
                          >
                            {registrationCourseFilter === 'my' ? 'Ver todos los cursos' : 'Ver solo mis cursos'}
                          </button>
                          <span>·</span>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => setNewEnrolledCourseIds(levels.map(l => l.id))}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-semibold"
                      >
                        Todos
                      </button>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => setNewEnrolledCourseIds([])}
                        className="text-slate-400 hover:underline cursor-pointer"
                      >
                        Ninguno
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {levels
                      .filter(lvl => {
                        if (registrationCourseFilter === 'my' && isTeacher && !isAdmin) {
                          return lvl.teacherIds?.includes(currentUser?.id || '') || lvl.createdById === currentUser?.id;
                        }
                        return true;
                      })
                      .map(lvl => {
                        const isSelected = newEnrolledCourseIds.includes(lvl.id);
                        const isMyCourse = lvl.teacherIds?.includes(currentUser?.id || '') || lvl.createdById === currentUser?.id;
                        const teacherNames = (lvl.teacherIds || [])
                          .map(tId => users.find(u => u.id === tId)?.name || 'Profesor')
                          .join(', ');

                        return (
                          <div
                            key={lvl.id}
                            onClick={() => {
                              if (isSelected) {
                                setNewEnrolledCourseIds(prev => prev.filter(id => id !== lvl.id));
                              } else {
                                setNewEnrolledCourseIds(prev => [...prev, lvl.id]);
                              }
                            }}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-2 ${
                              isSelected
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/20'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs text-slate-900 dark:text-white">
                                  {lvl.name}
                                </span>
                                {isMyCourse && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded border border-emerald-300 dark:border-emerald-800">
                                    Tu curso
                                  </span>
                                )}
                              </div>
                              
                              {/* Teachers info for this course */}
                              <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                                <GraduationCap className="w-3 h-3 text-sky-500 shrink-0" />
                                <span className="truncate">
                                  Docentes: <strong className="text-slate-700 dark:text-slate-300">{teacherNames || 'Sin asignar'}</strong>
                                </span>
                              </div>

                              {lvl.description && (
                                <p className="text-[10px] text-slate-500 line-clamp-1 italic">
                                  {lvl.description}
                                </p>
                              )}
                            </div>

                            <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border mt-0.5 transition-colors ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700'
                            }`}>
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {newEnrolledCourseIds.length === 0 && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 italic">
                      ⚠️ Selecciona al menos un curso para que el alumno pueda acceder al contenido al iniciar sesión.
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notas u Observaciones (opcional)
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="ej: Alumno grupo mañana, preparación B1..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Guardar y Matricular</span>
                </button>
              </div>
            </form>
          ) : (
            /* Courses & Teachers Management View */
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Gestión de Cursos y Asignación de Profesores
                  </h3>
                  <p className="text-xs text-slate-500">
                    Crea nuevos cursos y asigna qué profesores los imparten. Un curso puede tener varios profesores y un profesor varios cursos.
                  </p>
                </div>

                {!isCreatingCourse && (
                  <button
                    onClick={() => {
                      setIsCreatingCourse(true);
                      setNewCourseTeacherIds(currentUser ? [currentUser.id] : []);
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Crear Nuevo Curso</span>
                  </button>
                )}
              </div>

              {/* Step Workflow Guide Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-xs text-indigo-950 dark:text-indigo-200">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <strong className="block text-indigo-900 dark:text-indigo-100">Crear Cursos y Asignar Profesores</strong>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">
                      Los profesores crean sus cursos y asignan los docentes que los impartirán (soporta múltiples profesores por curso).
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <strong className="block text-indigo-900 dark:text-indigo-100">Incluir y Matricular a los Alumnos</strong>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">
                      Incluye alumnos al curso creado. Cada alumno puede estar en varios cursos a la vez y solo verá el contenido de sus cursos.
                    </span>
                  </div>
                </div>
              </div>

              {/* Course Creation Form */}
              {isCreatingCourse && (
                <form onSubmit={handleCreateCourseSubmit} className="p-5 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/30 space-y-4">
                  <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                    <Folder className="w-4 h-4 text-indigo-600" />
                    <span>Crear Nuevo Curso</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Nombre del Curso *
                      </label>
                      <input
                        type="text"
                        required
                        value={newCourseName}
                        onChange={(e) => setNewCourseName(e.target.value)}
                        placeholder="ej: Inglés B1 - Grupo A, Inglés Negocios..."
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Descripción del Curso
                      </label>
                      <input
                        type="text"
                        value={newCourseDesc}
                        onChange={(e) => setNewCourseDesc(e.target.value)}
                        placeholder="ej: Conversación intermedia, vocabulario y reservas..."
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30"
                      />
                    </div>
                  </div>

                  {/* Multi-Teacher Assignment */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Profesores que imparten este curso (soporta múltiples profesores):
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {availableTeachers.map(teacher => {
                        const isSelected = newCourseTeacherIds.includes(teacher.id);
                        return (
                          <button
                            type="button"
                            key={teacher.id}
                            onClick={() => {
                              if (isSelected) {
                                setNewCourseTeacherIds(prev => prev.filter(id => id !== teacher.id));
                              } else {
                                setNewCourseTeacherIds(prev => [...prev, teacher.id]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <GraduationCap className="w-3.5 h-3.5" />
                            <span>{teacher.name}</span>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingCourse(false)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer"
                    >
                      Crear Curso
                    </button>
                  </div>
                </form>
              )}

              {/* Courses List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {levels.map(lvl => {
                  const isEditingThisCourse = editingCourseId === lvl.id;
                  const enrolledCount = users.filter(u => u.enrolledCourseIds?.includes(lvl.id)).length;
                  const teacherNames = (lvl.teacherIds || [])
                    .map(tId => users.find(u => u.id === tId)?.name || 'Profesor')
                    .join(', ');

                  return (
                    <div
                      key={lvl.id}
                      className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3 flex flex-col justify-between"
                    >
                      {isEditingThisCourse ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editCourseName}
                            onChange={(e) => setEditCourseName(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                            placeholder="Nombre del curso"
                          />
                          <input
                            type="text"
                            value={editCourseDesc}
                            onChange={(e) => setEditCourseDesc(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                            placeholder="Descripción"
                          />

                          <div>
                            <span className="text-[11px] font-semibold text-slate-400 block mb-1">Profesores:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {availableTeachers.map(teacher => {
                                const isSelected = editCourseTeacherIds.includes(teacher.id);
                                return (
                                  <button
                                    type="button"
                                    key={teacher.id}
                                    onClick={() => {
                                      if (isSelected) {
                                        setEditCourseTeacherIds(prev => prev.filter(id => id !== teacher.id));
                                      } else {
                                        setEditCourseTeacherIds(prev => [...prev, teacher.id]);
                                      }
                                    }}
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-colors cursor-pointer ${
                                      isSelected
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                    }`}
                                  >
                                    {teacher.name} {isSelected ? '✓' : '+'}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setEditingCourseId(null)}
                              className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveCourseEdit(lvl.id)}
                              className="px-3 py-1 text-xs rounded-lg bg-indigo-600 text-white font-semibold cursor-pointer"
                            >
                              Guardar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                <Folder className="w-4 h-4 text-indigo-500" />
                                <span>{lvl.name}</span>
                              </h4>
                              <button
                                onClick={() => handleStartEditCourse(lvl)}
                                className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                title="Editar curso y profesores asignados"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {lvl.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                {lvl.description}
                              </p>
                            )}
                          </div>

                          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                            <div className="flex items-center justify-between text-slate-500">
                              <span className="flex items-center gap-1">
                                <GraduationCap className="w-3.5 h-3.5 text-sky-500" />
                                <span>Profesores:</span>
                              </span>
                              <span className="font-semibold text-slate-700 dark:text-slate-300 max-w-[180px] truncate text-right">
                                {teacherNames || 'Sin asignar'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-slate-500">
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Alumnos matriculados:</span>
                              </span>
                              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                {enrolledCount} {enrolledCount === 1 ? 'alumno' : 'alumnos'}
                              </span>
                            </div>

                            {/* Button to quickly manage/enroll students for this course */}
                            <div className="pt-2">
                              <button
                                type="button"
                                onClick={() => handleOpenManageStudents(lvl.id)}
                                className="w-full py-1.5 px-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Matricular / Gestionar Alumnos</span>
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Course Students Enrollment Modal */}
              {managingStudentsCourseId && (() => {
                const targetCourse = levels.find(l => l.id === managingStudentsCourseId);
                const students = users.filter(u => u.role === 'student');
                const teacherNames = (targetCourse?.teacherIds || [])
                  .map(tId => users.find(u => u.id === tId)?.name || 'Profesor')
                  .join(', ');

                return (
                  <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-5">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Folder className="w-4 h-4 text-indigo-500" />
                            <span>Matricular Alumnos en "{targetCourse?.name}"</span>
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Docentes: {teacherNames || 'Sin asignar'}
                          </p>
                        </div>
                        <button
                          onClick={() => setManagingStudentsCourseId(null)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        Selecciona qué alumnos tendrán acceso a este curso. Un alumno puede estar matriculado en varios cursos simultáneamente y solo verá el contenido de sus cursos.
                      </p>

                      <div className="flex items-center justify-between text-xs pb-1">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {selectedStudentIdsForCourse.length} de {students.length} alumnos matriculados
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedStudentIdsForCourse(students.map(s => s.id))}
                            className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-semibold"
                          >
                            Seleccionar todos
                          </button>
                          <span>·</span>
                          <button
                            type="button"
                            onClick={() => setSelectedStudentIdsForCourse([])}
                            className="text-slate-400 hover:underline cursor-pointer"
                          >
                            Deseleccionar
                          </button>
                        </div>
                      </div>

                      {/* Students list */}
                      <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                        {students.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-400 italic">
                            No hay alumnos registrados aún en el sistema. Puedes dar de alta alumnos desde la pestaña "Alta de Alumno".
                          </div>
                        ) : (
                          students.map(s => {
                            const isSelected = selectedStudentIdsForCourse.includes(s.id);
                            return (
                              <div
                                key={s.id}
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedStudentIdsForCourse(prev => prev.filter(id => id !== s.id));
                                  } else {
                                    setSelectedStudentIdsForCourse(prev => [...prev, s.id]);
                                  }
                                }}
                                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/20'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                }`}
                              >
                                <div>
                                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                                    {s.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    @{s.username} {s.email && `· ${s.email}`}
                                  </div>
                                </div>

                                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                                  isSelected
                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                    : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700'
                                }`}>
                                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setManagingStudentsCourseId(null)}
                          className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleSaveCourseEnrollment(managingStudentsCourseId)}
                          className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {isLoading ? 'Guardando...' : 'Guardar Matriculaciones'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
