import { supabaseAdmin } from '@/lib/supabase-admin';
import { MessageSquare, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default async function SuperAdminTicketsPage() {
    // 1. Fetch Tickets
    const { data: tickets, error } = await supabaseAdmin
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        return <div className="p-8 text-red-400">Error fetching tickets: {error.message}</div>;
    }

    // 2. Fetch Profiles manualy to avoid relation error
    const userIds = tickets.map((t: any) => t.user_id);
    const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, email, business_name') // Assuming email might be here if sync logic exists, else we rely on ID or Auth fetch
        .in('id', userIds);

    // 3. Fetch Auth Users for Email (reliable source)
    // For simplicity, we might just use profiles if business_name is there, 
    // but let's try to get emails if possible. 
    // Optimization: If many users, listUsers might be heavy, but for tickets page (usually < 50 active) it's ok.
    // Or we just display business_name from profile.

    // Merge
    const mergedTickets = tickets.map((ticket: any) => {
        const profile = profiles?.find((p: any) => p.id === ticket.user_id);
        return {
            ...ticket,
            profiles: profile // Keep the structure consistent with previous code usage
        };
    });

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-2">Support Queue</h1>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] italic">Real-time Ticket Management</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-full px-4 py-2 flex items-center gap-3">
                        <div className="size-2 rounded-full bg-primary animate-pulse"></div>
                        <span className="text-[10px] font-black uppercase text-white tracking-widest">{mergedTickets?.length || 0} Total Tickets</span>
                    </div>
                </div>
            </div>

            <div className="grid gap-4">
                {mergedTickets?.map((ticket: any) => (
                    <div key={ticket.id} className="glass-card p-0 hover:border-primary/30 transition-all group">
                        <div className="p-6 flex items-start gap-6">
                            <div className={`size-12 rounded-2xl flex items-center justify-center shrink-0 border ${ticket.status === 'open' ? 'bg-secondary/10 border-secondary/20 text-secondary' :
                                ticket.status === 'resolved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                                    'bg-white/5 border-white/10 text-slate-400'
                                }`}>
                                <MessageSquare size={20} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${ticket.priority === 'high' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                        ticket.priority === 'medium' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' :
                                            'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                        }`}>
                                        {ticket.priority} Priority
                                    </span>
                                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                        <Clock size={10} /> {new Date(ticket.created_at).toLocaleString()}
                                    </span>
                                </div>

                                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-primary transition-colors">{ticket.subject}</h3>
                                <p className="text-sm text-slate-400 line-clamp-2 mb-3">{ticket.description || 'No description provided.'}</p>

                                <div className="flex items-center gap-2">
                                    <div className="size-5 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-[9px] font-black text-white">
                                        {ticket.profiles?.business_name?.[0] || 'U'}
                                    </div>
                                    <span className="text-xs font-bold text-slate-300">
                                        {ticket.profiles?.business_name || 'Unknown Business'}
                                        <span className="text-slate-600 font-normal ml-1">({ticket.profiles?.email || 'No Email'})</span>
                                    </span>
                                </div>
                            </div>

                            <Link
                                href={`/support?ticket=${ticket.id}`} // Assuming we reuse the support view or make a dedicated admin view
                                className="self-center px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white hover:bg-primary/20 hover:border-primary/50 transition-all"
                            >
                                Open Console
                            </Link>
                        </div>
                    </div>
                ))}

                {mergedTickets?.length === 0 && (
                    <div className="text-center py-20 opacity-50">
                        <CheckCircle2 size={48} className="mx-auto mb-4 text-emerald-500" />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">All caught up!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
