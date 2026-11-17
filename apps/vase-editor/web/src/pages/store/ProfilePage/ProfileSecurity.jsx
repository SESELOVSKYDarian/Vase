// Mi cuenta en la tienda: pestaña Seguridad.
import { Shield } from './profile-helpers.jsx';

export default function ProfileSecurity({  }) {
    return (
        <div className="lg:col-span-3 bg-white dark:bg-[#1a130c] rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21] p-8 space-y-4">
            <div className="flex items-center gap-2 text-[#181411] dark:text-white font-bold">
                <Shield className="h-6 w-6 text-primary fill-current" />
                Seguridad
            </div>
            <div>
                <label className="text-xs font-bold uppercase text-[#8a7560]">Nueva contrasena</label>
                <input
                    type="password"
                    className="w-full mt-2 px-3 py-2 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent"
                    placeholder="********"
                />
            </div>
            <div>
                <label className="text-xs font-bold uppercase text-[#8a7560]">Confirmar contrasena</label>
                <input
                    type="password"
                    className="w-full mt-2 px-3 py-2 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent"
                    placeholder="********"
                />
            </div>
            <button className="w-full bg-primary text-white font-bold py-2 rounded-lg hover:bg-primary/90 transition-all">
                Guardar cambios
            </button>
        </div>
    );
}
