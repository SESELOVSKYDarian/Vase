// Parte de AuthContext.jsx: useAuth.
import { useContext } from 'react';
import { AuthContext } from './read-json-response.js';
import { AuthProvider } from './AuthProvider.jsx';

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
