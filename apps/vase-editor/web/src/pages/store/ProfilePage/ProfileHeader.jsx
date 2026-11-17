// Mi cuenta en la tienda: foto, nombre y datos de contacto.
import { Camera } from './profile-helpers.jsx';
import { Trash2 } from './profile-helpers.jsx';
import { User } from './profile-helpers.jsx';

export default function ProfileHeader({ handleProfilePhotoChange, handleRemovePhoto, profileName, profilePhoto, roleLabel }) {
    return (
        <div className="bg-white dark:bg-[#1a130c] rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21] p-4 sm:p-6 md:p-8 mb-8 flex flex-col items-center text-center lg:items-stretch lg:text-left lg:flex-row justify-between gap-4 lg:gap-6 shadow-sm">
            <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left gap-4 sm:gap-5">
                <div className="size-20 sm:size-16 rounded-full border-4 border-primary/10 overflow-hidden flex items-center justify-center bg-primary/5 text-primary shrink-0">
                    {profilePhoto ? (
                        <img src={profilePhoto} alt="Foto de perfil" className="w-full h-full object-cover" />
                    ) : (
                        <User className="h-8 w-8" />
                    )}
                </div>
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-black text-[#181411] dark:text-white leading-tight">
                        Hola, {profileName}!
                    </h1>
                    <p className="text-[#8a7560] mt-1 text-sm">
                        Administra tu cuenta, revisa tus pedidos y actualiza tus datos.
                    </p>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2 sm:gap-3 mt-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                            Cuenta activa
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                            {roleLabel}
                        </span>
                    </div>
                </div>
            </div>
            <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
                <label className="px-5 py-2.5 bg-white border border-[#e5e1de] text-[#181411] font-bold text-sm rounded-lg hover:bg-[#f5f2f0] transition-all shadow-sm flex items-center gap-2 cursor-pointer">
                    <Camera className="w-4 h-4" />
                    Subir foto
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePhotoChange}
                        className="hidden"
                    />
                </label>
                {profilePhoto ? (
                    <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="px-5 py-2.5 bg-white border border-[#e5e1de] text-red-600 font-bold text-sm rounded-lg hover:bg-red-50 transition-all shadow-sm flex items-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        Quitar foto
                    </button>
                ) : null}
            </div>
        </div>
    );
}
