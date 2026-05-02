import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <main style={{ maxWidth: 600, margin: '40px auto', padding: 24 }}>
      <h1>Dashboard</h1>
      {user ? (
        <>
          <p>Bienvenido, <strong>{user.name}</strong></p>
          <p>Correo: {user.email}</p>
          <p>Rol: {user.role}</p>
          <p>Email verificado: {user.emailVerified ? 'Sí' : 'No'}</p>
          <button onClick={handleLogout} style={{ marginTop: 16, padding: '8px 24px' }}>
            Cerrar sesión
          </button>
        </>
      ) : (
        <p>No hay sesión activa.</p>
      )}
    </main>
  );
}
