import { useCallback, useState } from 'react';
import { getApiBase } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export const useTenantsManager = () => {
    const { user } = useAuth();
    const [tenants, setTenants] = useState([]);
    const [tenantsLoading, setTenantsLoading] = useState(false);
    const [tenantsError, setTenantsError] = useState('');

    const loadTenants = useCallback(async () => {
        if (user?.role !== 'master_admin') {
            setTenants([]);
            setTenantsError('Solo el usuario master admin puede ver empresas.');
            return;
        }

        setTenantsLoading(true);
        setTenantsError('');
        try {
            const token = localStorage.getItem('teflon_token');
            const res = await fetch(`${getApiBase()}/api/platform/admin/tenants`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'No se pudo cargar empresas');
            }
            const data = await res.json();
            setTenants(Array.isArray(data.items) ? data.items : []);
        } catch (err) {
            console.error('Failed to load tenants', err);
            setTenantsError('No se pudieron cargar las empresas.');
            setTenants([]);
        } finally {
            setTenantsLoading(false);
        }
    }, [user?.role]);

    return {
        tenants,
        tenantsLoading,
        tenantsError,
        loadTenants,
        isMasterAdmin: user?.role === 'master_admin',
    };
};
