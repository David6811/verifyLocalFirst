import { useState, useEffect } from 'react';
import { signIn, signOut, getCurrentUser } from '../externals/auth-operations';
import { Effect } from 'effect';

interface AuthSectionProps {
  onUserChange: (user: any) => void;
  onMessage: (message: string) => void;
}

export default function AuthSection({ onUserChange, onMessage }: AuthSectionProps) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Load current user on mount
  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await Effect.runPromise(getCurrentUser());
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
      const result = await Effect.runPromise(signIn({
        email: 'weixu.craftsman@gmail.com',
        password: '123456'
      }));
      
      if (result.success && result.user) {
        setCurrentUser(result.user);
        onUserChange(result.user);
        onMessage(`✅ Login successful! Welcome ${result.user.email}`);
      } else {
        throw new Error(result.error || 'Login failed');
      }
    } catch (error) {
      onMessage(`❌ Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    onMessage('');
    
    try {
      const result = await Effect.runPromise(signOut());
      
      if (result.success) {
        setCurrentUser(null);
        onUserChange(null);
        onMessage('✅ Logout successful!');
      } else {
        throw new Error(result.error || 'Logout failed');
      }
    } catch (error) {
      onMessage(`❌ Logout failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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