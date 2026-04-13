import { supabaseAdmin } from '@/lib/supabase-admin';
import { Mail, Shield, Smartphone, Briefcase, User as UserIcon, Calendar, Search } from 'lucide-react';

export default async function SuperAdminUsersPage() {
    // 1. Fetch Users from Auth (for emails)
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
        return <div className="p-8 text-red-400">Error fetching users: {authError.message}</div>;
    }

    // 2. Fetch Profiles (for business data & roles)
    const { data: profiles, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*');

    if (profileError) {
        return <div className="p-8 text-red-400">Error fetching profiles: {profileError.message}</div>;
    }

    // 3. Merge Data
    const mergedUsers = users.map(user => {
        const profile = profiles?.find(p => p.id === user.id);
        return {
            ...user,
            profile: profile || null
        };
    });

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-2">Global Users</h1>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] italic">System Registry & Access Control</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-full px-4 py-2 flex items-center gap-3">
                        <div className="size-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-[10px] font-black uppercase text-white tracking-widest">{mergedUsers.length} Active Nodes</span>
                    </div>
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Identity</th>
                                <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Role / Access</th>
                                <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Business Unit</th>
                                <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Current Plan</th>
                                <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Created At</th>
                                <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-500 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {mergedUsers.map(user => (
                                <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`size-10 rounded-xl flex items-center justify-center border ${user.profile?.role === 'super_admin' ? 'bg-primary/10 border-primary/20 text-primary' :
                                                user.profile?.role === 'support' ? 'bg-secondary/10 border-secondary/20 text-secondary' :
                                                    'bg-white/5 border-white/10 text-slate-400'
                                                }`}>
                                                {user.profile?.role === 'super_admin' ? <Shield size={18} /> :
                                                    user.profile?.role === 'support' ? <Briefcase size={18} /> : <UserIcon size={18} />}
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-white flex items-center gap-2">
                                                    {user.email}
                                                </div>
                                                <div className="text-[9px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">ID: {user.id.slice(0, 8)}...</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider ${user.profile?.role === 'super_admin' ? 'bg-primary/5 border-primary/20 text-primary' :
                                            user.profile?.role === 'support' ? 'bg-secondary/5 border-secondary/20 text-secondary' :
                                                'bg-emerald-500/5 border-emerald-500/20 text-emerald-500'
                                            }`}>
                                            {user.profile?.role || 'business'}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {user.profile?.business_name ? (
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-200">{user.profile.business_name}</span>
                                                <span className="text-[9px] text-slate-500 uppercase">{user.profile.business_type || 'N/A'}</span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-600 text-[10px] italic">No Business Data</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider ${user.profile?.plan === 'enterprise' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                                                user.profile?.plan === 'pro' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' :
                                                    'bg-slate-500/10 border-slate-500/20 text-slate-500'
                                            }`}>
                                            {user.profile?.plan || 'free'}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 text-slate-400 text-[10px] font-medium">
                                            <Calendar size={12} />
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors border border-transparent hover:border-white/10 px-3 py-1.5 rounded-lg">
                                            Manage
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
