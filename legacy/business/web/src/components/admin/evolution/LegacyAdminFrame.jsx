import React from 'react';

const LegacyAdminFrame = ({ tab }) => {
    const src = tab ? `/admin/legacy?tab=${encodeURIComponent(tab)}` : '/admin/legacy';

    return (
        <div className="w-full h-full min-h-[calc(100vh-120px)]">
            <iframe
                title="Admin completo"
                src={src}
                className="w-full h-full min-h-[calc(100vh-120px)] rounded-2xl border border-white/10 bg-white"
            />
        </div>
    );
};

export default LegacyAdminFrame;
