// Mi cuenta en la tienda: menú de secciones.
import { Heart } from './profile-helpers.jsx';
import { LogOut } from './profile-helpers.jsx';
import { MapPin } from './profile-helpers.jsx';
import { Package } from './profile-helpers.jsx';
import { Shield } from './profile-helpers.jsx';
import { User } from './profile-helpers.jsx';

export default function ProfileSidebar({ activeSection, favorites, handleLogout, profileName, profilePhoto, roleLabel, setActiveSection }) {
    return (
        <aside className="w-full lg:w-64 border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] rounded-2xl p-3 lg:p-5 flex flex-col justify-between">
            <div>
                <div className="hidden lg:flex items-center gap-3 mb-8 px-2">
                    <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary overflow-hidden border border-primary/20">
                        {profilePhoto ? (
                            <img src={profilePhoto} alt="Foto de perfil" className="w-full h-full object-cover" />
                        ) : (
                            <User className="h-6 w-6" />
                        )}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold dark:text-white">{profileName}</span>
                        <span className="text-xs text-[#8a7560]">{roleLabel}</span>
                    </div>
                </div>

                <nav className="grid grid-cols-5 gap-1 lg:flex lg:flex-col lg:gap-0 lg:space-y-1">
                    <button
                        className={`flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-3 px-1 py-2 lg:px-3 lg:py-2.5 rounded-lg transition-all ${activeSection === 'account' ? 'bg-primary/10 text-primary font-semibold' : 'text-[#181411] dark:text-gray-300 hover:bg-[#f5f2f0] dark:hover:bg-[#2c2116]'}`}
                        onClick={() => setActiveSection('account')}
                    >
                        <User className="h-5 w-5 shrink-0" />
                        <span className="text-[10px] leading-tight lg:text-sm text-center lg:text-left">Cuenta</span>
                    </button>
                    <button
                        className={`flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-3 px-1 py-2 lg:px-3 lg:py-2.5 rounded-lg transition-all ${activeSection === 'orders' ? 'bg-primary/10 text-primary font-semibold' : 'text-[#181411] dark:text-gray-300 hover:bg-[#f5f2f0] dark:hover:bg-[#2c2116]'}`}
                        onClick={() => setActiveSection('orders')}
                    >
                        <Package className="h-5 w-5 shrink-0" />
                        <span className="text-[10px] leading-tight lg:text-sm text-center lg:text-left">Pedidos</span>
                    </button>
                    <button
                        className={`flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-3 px-1 py-2 lg:px-3 lg:py-2.5 rounded-lg transition-all ${activeSection === 'addresses' ? 'bg-primary/10 text-primary font-semibold' : 'text-[#181411] dark:text-gray-300 hover:bg-[#f5f2f0] dark:hover:bg-[#2c2116]'}`}
                        onClick={() => setActiveSection('addresses')}
                    >
                        <MapPin className="h-5 w-5 shrink-0" />
                        <span className="text-[10px] leading-tight lg:text-sm text-center lg:text-left">Direcciones</span>
                    </button>
                    <button
                        className={`relative flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-3 px-1 py-2 lg:px-3 lg:py-2.5 rounded-lg transition-all ${activeSection === 'favorites' ? 'bg-primary/10 text-primary font-semibold' : 'text-[#181411] dark:text-gray-300 hover:bg-[#f5f2f0] dark:hover:bg-[#2c2116]'}`}
                        onClick={() => setActiveSection('favorites')}
                    >
                        <Heart className="h-5 w-5 shrink-0" />
                        <span className="text-[10px] leading-tight lg:text-sm text-center lg:text-left">Favoritos</span>
                        {favorites?.length ? (
                            <span className="absolute top-1 right-1 lg:static lg:ml-auto size-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#2c2116]" />
                        ) : null}
                    </button>
                    <button
                        className={`flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-3 px-1 py-2 lg:px-3 lg:py-2.5 rounded-lg transition-all ${activeSection === 'security' ? 'bg-primary/10 text-primary font-semibold' : 'text-[#181411] dark:text-gray-300 hover:bg-[#f5f2f0] dark:hover:bg-[#2c2116]'}`}
                        onClick={() => setActiveSection('security')}
                    >
                        <Shield className="h-5 w-5 shrink-0" />
                        <span className="text-[10px] leading-tight lg:text-sm text-center lg:text-left">Seguridad</span>
                    </button>
                </nav>
            </div>

            <div className="hidden lg:block pt-6 border-t border-[#e5e1de] dark:border-[#3d2f21]">
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all font-medium"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm">Cerrar sesion</span>
                </button>
            </div>
        </aside>
    );
}
