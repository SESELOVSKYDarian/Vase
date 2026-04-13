import { supabaseAdmin } from '@/lib/supabase-admin';
import { Database, Plus, Trash2, Save, Sparkles, Brain } from 'lucide-react';
import { revalidatePath } from 'next/cache';

async function addKnowledge(formData: FormData) {
    'use server';
    const category = formData.get('category') as string;
    const question = formData.get('question') as string;
    const answer = formData.get('answer') as string;

    if (!question || !answer) return;

    await supabaseAdmin.from('support_kb').insert({
        category,
        question,
        answer,
        tags: ['general'] // Default tag
    });
    revalidatePath('/super-admin/settings');
}

async function deleteKnowledge(id: string) {
    'use server';
    await supabaseAdmin.from('support_kb').delete().eq('id', id);
    revalidatePath('/super-admin/settings');
}

export default async function SettingsPage() {
    const { data: kbEntries } = await supabaseAdmin
        .from('support_kb')
        .select('*')
        .order('created_at', { ascending: false });

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-2">AI Neural Config</h1>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] italic">Chatbot Knowledge Base & Context</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Section */}
                <div className="lg:col-span-1">
                    <div className="glass-card p-6 sticky top-24">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="size-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                                <Plus size={16} />
                            </div>
                            <h3 className="text-sm font-black uppercase text-white tracking-widest">Add Knowledge</h3>
                        </div>

                        <form action={addKnowledge} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Category</label>
                                <select name="category" className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-primary/50">
                                    <option value="general">General Info</option>
                                    <option value="pricing">Pricing & Plans</option>
                                    <option value="technical">Technical Support</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">User Question / Topic</label>
                                <input name="question" type="text" placeholder="e.g., How do I reset my password?" className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-primary/50" required />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">AI Answer / Context</label>
                                <textarea name="answer" rows={5} placeholder="The AI will use this to answer..." className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-primary/50" required></textarea>
                            </div>

                            <button type="submit" className="w-full py-3 rounded-lg bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary-light transition-colors">
                                Inject to Neural Network
                            </button>
                        </form>
                    </div>
                </div>

                {/* List Section */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center gap-3 mb-2 px-2">
                        <Brain size={16} className="text-secondary" />
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Knowledge Matrix ({kbEntries?.length || 0})</h3>
                    </div>

                    {kbEntries?.map((entry) => (
                        <div key={entry.id} className="glass-card p-5 group hover:border-white/20 transition-all">
                            <div className="flex justify-between items-start gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-bold uppercase text-slate-500">
                                            {entry.category}
                                        </span>
                                        <span className="text-[9px] text-slate-600 font-mono">{new Date(entry.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors">{entry.question}</h4>
                                    <p className="text-xs text-slate-400 leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5 font-mono">
                                        {entry.answer}
                                    </p>
                                </div>

                                <form action={deleteKnowledge.bind(null, entry.id)}>
                                    <button className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-all">
                                        <Trash2 size={16} />
                                    </button>
                                </form>
                            </div>
                        </div>
                    ))}

                    {kbEntries?.length === 0 && (
                        <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
                            <Sparkles size={32} className="mx-auto mb-3 text-slate-600" />
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Matrix Empty</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
