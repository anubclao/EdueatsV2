import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { db } from '../../services/db';
import { User, Role, ImportedUserData } from '../../types';
import { Plus, Trash2, Search, Pencil, CheckCircle, AlertTriangle, GraduationCap, User as UserIcon, Briefcase, Upload, FileDown, Loader2 } from 'lucide-react';

export const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | '' } | null>(null);
  
  // Form State
  const initialFormState: User = {
    id: '',
    name: '',
    email: '',
    phone: '',
    role: 'student',
    emailVerified: false,
    grade: 1,
    section: 'A',
    allergies: ''
  };
  
  const [formData, setFormData] = useState<User>(initialFormState);

  const fetchUsers = async () => {
    setUsers(await db.getUsers());
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // --- CRUD HANDLERS ---

  const handleOpenAddModal = () => {
    setFormData({ ...initialFormState, id: crypto.randomUUID(), emailVerified: true }); // Admin created users are verified by default
    setIsModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setFormData(user);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.')) {
      await db.deleteUser(id);
      await fetchUsers();
    }
  };

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  const validatePhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length === 10;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validation: Email Format
    if (!validateEmail(formData.email)) {
        alert("El formato del correo electrónico no es válido.");
        return;
    }

    // Validation: Phone Format
    if (formData.phone && !validatePhone(formData.phone)) {
        alert("El número de teléfono debe tener exactamente 10 dígitos.");
        return;
    }

    // Validate role logic
    const userToSave = { ...formData };
    
    // Clean data based on role
    if (userToSave.role !== 'student') {
        delete userToSave.grade;
        delete userToSave.section;
    }
    
    // If it's a new user (check if ID exists in current list to decide update vs add)
    const exists = users.find(u => u.id === userToSave.id);
    
    if (exists) {
        // UPDATE EXISTING
        try {
          const res = await db.updateUser(userToSave);
            if (!res.success) {
                setMessage({ text: res.message || "Error al actualizar usuario.", type: 'error' });
                return;
            }
            setMessage({ text: "Registro modificado satisfactoriamente.", type: 'success' });
        } catch (error: unknown) {
            setMessage({ text: `Error al actualizar usuario: ${(error as Error).message || error}`, type: 'error' });
            return;
        }
    } else {
        // CREATE NEW
        try {
          const res = await db.registerUser(userToSave);
            if (!res.success) {
                setMessage({ text: "Error: El usuario ya existe con este correo electrónico.", type: 'error' });
                return;
            }

        if (userToSave.emailVerified) {
          const savedUser = await db.findUserByEmail(userToSave.email);
          if (savedUser) {
            await db.updateUser({ ...savedUser, emailVerified: true });
          }
        }

            setMessage({ text: "Usuario creado exitosamente.", type: 'success' });
        } catch (error: unknown) {
            setMessage({ text: `Error al crear usuario: ${(error as Error).message || error}`, type: 'error' });
            return;
        }
    }
    
    setIsModalOpen(false);
    await fetchUsers();
    // Clear message after a few seconds
    setTimeout(() => setMessage(null), 5000);
  };

  const handleManualVerification = async (user: User) => {
    const isVerifying = !user.emailVerified;
    const actionText = isVerifying ? 'verificar' : 'revocar verificación a';
    
    if (confirm(`¿Seguro que deseas manualmente ${actionText} ${user.name}?`)) {
        const updated = { ...user, emailVerified: isVerifying };
      await db.updateUser(updated);
      await fetchUsers();
    }
  };

  // --- BULK IMPORT / EXPORT LOGIC ---

  const handleDownloadTemplate = () => {
    if (!window.XLSX) {
        alert("Librería Excel no cargada.");
        return;
    }

    // Define headers and example rows
    const ws_data = [
        ["Nombre", "Email", "Rol", "Grado", "Seccion", "Alergias"],
        ["Juan Pérez", "juan@ejemplo.com", "student", "5", "A", "Ninguna"],
        ["Maria Profe", "maria@ejemplo.com", "teacher", "", "", "Nueces"],
        ["Admin Demo", "admin2@ejemplo.com", "staff", "", "", ""]
    ];

    const wb = window.XLSX.utils.book_new();
    const ws = window.XLSX.utils.aoa_to_sheet(ws_data);
    
    // Add help comments (metadata not strictly supported in simple csv/xlsx but we assume standard columns)
    
    window.XLSX.utils.book_append_sheet(wb, ws, "Plantilla Usuarios");
    window.XLSX.writeFile(wb, "Plantilla_Carga_Usuarios.xlsx");
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.XLSX) {
        alert("Librería Excel no lista.");
        return;
    }

    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const bstr = evt.target?.result;
            const wb = window.XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = window.XLSX.utils.sheet_to_json(ws) as ImportedUserData[];

            processImportData(data);
        } catch (error) {
            console.error(error);
            alert("Error al leer el archivo. Asegúrate de usar la plantilla correcta.");
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
        }
    };
    reader.readAsBinaryString(file);
  };

  const processImportData = async (data: ImportedUserData[]) => {
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const [index, row] of data.entries()) {
        const rowNum = index + 2; // +2 for header and 0-index
        
        // Basic mapping
        const name = row['Nombre'];
        const email = row['Email'];
        const roleRaw = (row['Rol'] || 'student').toLowerCase();
        
        // Map Role
        let role: Role = 'student';
        if (['admin', 'teacher', 'staff', 'visitor'].includes(roleRaw)) {
            role = roleRaw as Role;
        }

        if (!name || !email) {
            failCount++;
            errors.push(`Fila ${rowNum}: Falta Nombre o Email.`);
          continue;
        }

        const newUser: User = {
            id: crypto.randomUUID(),
            name,
            email,
            role,
            emailVerified: true, // Auto-verify bulk imports
            grade: role === 'student' ? Number(row['Grado'] || 0) : undefined,
            section: role === 'student' ? String(row['Seccion'] || 'A') : undefined,
            allergies: row['Alergias'] || ''
        };

        const res = await db.registerUser(newUser);
        if (res.success) {
            // Need to manually set verified because registerUser defaults to false
          const saved = await db.findUserByEmail(email);
            if (saved) {
                saved.emailVerified = true;
            await db.updateUser(saved);
            }
            successCount++;
        } else {
            failCount++;
            errors.push(`Fila ${rowNum}: El email ${email} ya existe.`);
        }
      }

      await fetchUsers();
    
    let message = `Proceso finalizado.\n\n✅ Creados: ${successCount}\n❌ Fallidos: ${failCount}`;
    if (errors.length > 0) {
        message += `\n\nErrores (primeros 5):\n${errors.slice(0, 5).join('\n')}`;
    }
    alert(message);
  };

  // --- FILTERS & RENDER HELPERS ---

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.role === 'student' && u.grade?.toString().includes(searchTerm))
  );

  const getRoleIcon = (role: Role) => {
      switch(role) {
          case 'admin': return <UserIcon size={16} className="text-blue-600" />;
          case 'student': return <GraduationCap size={16} className="text-emerald-600" />;
          case 'teacher': return <Briefcase size={16} className="text-purple-600" />;
          case 'staff': return <UserIcon size={16} className="text-orange-600" />;
          default: return <UserIcon size={16} className="text-gray-600" />;
      }
  };

  const getRoleLabel = (role: Role) => {
    switch(role) {
        case 'admin': return 'Admin';
        case 'student': return 'Estudiante';
        case 'teacher': return 'Profesor';
        case 'staff': return 'Personal';
        case 'visitor': return 'Visitante';
        default: return role;
    }
};

  const getGradeDisplay = (grade: number | undefined) => {
    if (grade === undefined) return '-';
    switch(grade) {
        case -2: return 'Prejardín';
        case -1: return 'Jardín';
        case 0: return 'Pre-escolar';
        default: return `${grade}°`;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <UserIcon className="text-primary" /> Gestión de Usuarios
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Administra el acceso y roles de la plataforma.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            {/* Hidden Input for Import */}
            <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx, .xls, .csv"
                className="hidden"
            />

            <button 
                onClick={handleDownloadTemplate}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium shadow-sm"
                title="Descargar formato Excel de ejemplo"
            >
                <FileDown size={16} /> <span className="hidden sm:inline">Plantilla</span>
            </button>

            <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors text-sm font-medium shadow-sm"
            >
                {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} 
                <span className="hidden sm:inline">Importar Masivo</span>
            </button>

            <button 
                onClick={handleOpenAddModal}
                className="bg-primary hover:bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm text-sm font-bold"
            >
                <Plus size={18} /> <span className="hidden sm:inline">Nuevo Usuario</span>
                <span className="sm:hidden">Nuevo</span>
            </button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar por nombre, correo o grado..." 
          className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">Usuario</th>
                <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">Rol</th>
                <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">Detalles</th>
                <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 text-center">Acceso</th>
                <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4">
                        <div className="flex flex-col">
                            <span className="font-bold text-gray-900 dark:text-white">{user.name}</span>
                            <span className="text-gray-500 text-xs">{user.email}</span>
                            {user.phone && <span className="text-primary text-[10px] font-medium">WA: {user.phone}</span>}
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 border-gray-200 text-gray-700`}>
                            {getRoleIcon(user.role)}
                            {getRoleLabel(user.role)}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {user.role === 'student' ? (
                            <div className="flex flex-col gap-1">
                                <span>Grado: <strong>{getGradeDisplay(user.grade)} {user.section}</strong></span>
                                {user.allergies && <span className="text-xs text-red-500 truncate max-w-[150px]" title={user.allergies}>⚠️ {user.allergies}</span>}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1">
                                {user.allergies ? <span className="text-xs text-red-500 truncate max-w-[150px]" title={user.allergies}>⚠️ {user.allergies}</span> : <span className="italic text-gray-400">-</span>}
                            </div>
                        )}
                    </td>
                    <td className="px-6 py-4 text-center">
                        <div className="flex flex-col gap-2 items-center">
                            <button 
                                onClick={() => handleManualVerification(user)}
                                className={`w-24 inline-flex items-center justify-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md transition-colors border ${
                                    user.emailVerified 
                                        ? 'bg-green-100 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300' 
                                        : 'bg-yellow-100 border-yellow-200 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-300'
                                }`}
                                title="Estado de Verificación de Correo"
                            >
                                {user.emailVerified ? <CheckCircle size={12} /> : <AlertTriangle size={12} />} 
                                {user.emailVerified ? 'Verificado' : 'Pendiente'}
                            </button>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                            <button onClick={() => handleEdit(user)} className="p-1 text-gray-400 hover:text-blue-500 transition-colors">
                                <Pencil size={18} />
                            </button>
                            <button onClick={() => handleDelete(user.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    <UserIcon size={48} className="mx-auto mb-4 opacity-20" />
                    No se encontraron usuarios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INDIVIDUAL USER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
              <UserIcon className="text-primary" />
              {formData.id && users.find(u => u.id === formData.id) ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h3>

            {message && (
              <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                <span>{message.text}</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre Completo</label>
                <input 
                  required
                  className="w-full mt-1 border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                  value={formData.name || ''} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Correo Electrónico</label>
                <input 
                  required
                  type="email"
                  className="w-full mt-1 border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                  value={formData.email || ''} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Teléfono / WhatsApp</label>
                <input 
                  required
                  type="tel"
                  placeholder="3001234567"
                  className="w-full mt-1 border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                  value={formData.phone || ''} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rol</label>
                  <select 
                    className="w-full mt-1 border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={formData.role || 'student'}
                    onChange={e => setFormData({...formData, role: e.target.value as Role})}
                  >
                    <option value="student">Estudiante</option>
                    <option value="teacher">Profesor</option>
                    <option value="staff">Personal Admin</option>
                    <option value="visitor">Visitante</option>
                    <option value="admin">Administrador Sistema</option>
                  </select>
                </div>
                
                <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="checkbox"
                            checked={formData.emailVerified}
                            onChange={e => setFormData({...formData, emailVerified: e.target.checked})}
                            className="w-4 h-4 text-primary rounded"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Correo Verificado</span>
                    </label>
                </div>
              </div>

              {formData.role === 'student' && (
                  <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg space-y-4 border border-gray-100 dark:border-gray-700">
                      <h4 className="font-semibold text-sm text-gray-500 uppercase">Datos del Estudiante</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Grado</label>
                            <select 
                                className="w-full mt-1 border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                value={formData.grade || 1}
                                onChange={e => setFormData({...formData, grade: Number(e.target.value)})}
                            >
                                <optgroup label="Preescolar">
                                    <option value={-2}>Prejardín</option>
                                    <option value={-1}>Jardín</option>
                                    <option value={0}>Pre-escolar</option>
                                </optgroup>
                                <optgroup label="Primaria">
                                    {[1,2,3,4,5].map(g => <option key={g} value={g}>{g}°</option>)}
                                </optgroup>
                                <optgroup label="Bachillerato">
                                    {[6,7,8,9,10,11].map(g => <option key={g} value={g}>{g}°</option>)}
                                </optgroup>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sección</label>
                            <select 
                                className="w-full mt-1 border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                value={formData.section || 'A'}
                                onChange={e => setFormData({...formData, section: e.target.value})}
                            >
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="Unica">Única</option>
                            </select>
                        </div>
                      </div>
                  </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Alergias / Observaciones</label>
                <textarea 
                    rows={2}
                    className="w-full mt-1 border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={formData.allergies || ''}
                    onChange={e => setFormData({...formData, allergies: e.target.value})}
                />
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-emerald-600">
                  Guardar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};