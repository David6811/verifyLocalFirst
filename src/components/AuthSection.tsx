import { useState, useEffect } from 'react';
import { login, logout, getCurrentUser, quickLogin, User } from '../externals';

interface AuthSectionProps {
  onUserChange: (user: any) => void;
  onMessage: (message: string) => void;
}

export default function AuthSection({ onUserChange, onMessage }: AuthSectionProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Load current user on mount
  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      onUserChange(user);
    } catch (error) {
      console.log('No user logged in');
      onUserChange(null);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    onMessage('');
    
    try {
      const user = await quickLogin();
      setCurrentUser(user);
      onUserChange(user);
      onMessage(`✅ Login successful! Welcome ${user.email}`);
    } catch (error) {
      onMessage(`❌ Login failed: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    onMessage('');
    
    try {
      await logout();
      setCurrentUser(null);
      onUserChange(null);
      onMessage('✅ Logout successful!');
    } catch (error) {
      onMessage(`❌ Logout failed: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      width: '100%'
    }}>
      <button
        onClick={handleLogin}
        disabled={isLoading}
        style={{
          padding: '10px 16px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          opacity: isLoading ? 0.6 : 1
        }}
      >
        {isLoading ? 'Loading...' : 'Login'}
      </button>

      <button
        onClick={handleLogout}
        disabled={isLoading}
        style={{
          padding: '10px 16px',
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          opacity: isLoading ? 0.6 : 1
        }}
      >
        {isLoading ? 'Loading...' : 'Logout'}
      </button>

      {/* User Status Display */}
      {currentUser && (
        <div style={{
          padding: '8px',
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#155724'
        }}>
          👤 Logged in as: {currentUser.email}
        </div>
      )}
    </div>
  );
}