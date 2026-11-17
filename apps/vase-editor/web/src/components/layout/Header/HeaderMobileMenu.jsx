// Menú del celular del encabezado de la tienda (rubros, marcas y accesos).
import { ChevronDown } from './MenuAnchor.jsx';
import { storeText } from '../../../utils/storeTexts';

export default function HeaderMobileMenu({ activeMobileTab, brandLinks, categoryTree, expandedMobileCategories, handleMobileNavigate, mobileMenuOpen, mobilePrimaryLinks, navbarTexts, setActiveMobileTab, setExpandedMobileCategories, setMobileMenuOpen, whatsappHref }) {
    return (
        <div className="lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#1f2937] dark:text-[#e7ddd3]">
            <button type="button" onClick={() => handleMobileNavigate("/catalog")} className="text-left">
              Catalogo
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="inline-flex items-center gap-2 text-[color:var(--color-primary,#0099e5)]"
            >
              {mobileMenuOpen ? "Cerrar menu" : "Explorar menu"}
              <ChevronDown className={`size-3 transition-transform ${mobileMenuOpen ? "rotate-180" : ""}`} />
            </button>
          </div>

          {mobileMenuOpen ? (
            <div className="flex flex-col h-full bg-white dark:bg-[#120c08]">
              {/* Tabs Selector */}
              <div className="flex border-b border-[#e4e9ef] dark:border-[#3d2f21]">
                <button
                  onClick={() => setActiveMobileTab("menu")}
                  className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
                    activeMobileTab === "menu"
                      ? "border-b-2 border-[color:var(--color-primary,#0099e5)] text-[color:var(--color-primary,#0099e5)]"
                      : "text-[#8a7560] hover:text-[#1f2937] dark:hover:text-[#f8f7f5]"
                  }`}
                >
                  Explorar
                </button>
                <button
                  onClick={() => setActiveMobileTab("categories")}
                  className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
                    activeMobileTab === "categories"
                      ? "border-b-2 border-[color:var(--color-primary,#0099e5)] text-[color:var(--color-primary,#0099e5)]"
                      : "text-[#8a7560] hover:text-[#1f2937] dark:hover:text-[#f8f7f5]"
                  }`}
                >
                  Categorias
                </button>
                <button
                  onClick={() => setActiveMobileTab("brands")}
                  className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
                    activeMobileTab === "brands"
                      ? "border-b-2 border-[color:var(--color-primary,#0099e5)] text-[color:var(--color-primary,#0099e5)]"
                      : "text-[#8a7560] hover:text-[#1f2937] dark:hover:text-[#f8f7f5]"
                  }`}
                >
                  Marcas
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto px-4 py-6 custom-scrollbar">
                {activeMobileTab === "menu" && (
                  <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <p className="mb-4 text-[11px] font-black uppercase tracking-[0.14em] text-[#8a7560]">Accesos directos</p>
                    <div className="grid grid-cols-1 gap-2">
                      {mobilePrimaryLinks.map((item) => (
                        <button
                          key={`mobile-p-${item.label}`}
                          type="button"
                          onClick={() => (item.external ? window.open(item.href, '_blank') : handleMobileNavigate(item.href))}
                          className="flex items-center justify-between rounded-xl border border-[#dbe2ea] bg-slate-50/50 px-5 py-4 text-left text-sm font-bold text-[#1f2937] transition-all active:scale-95 dark:border-[#3d2f21] dark:bg-[#1a130c] dark:text-[#e7ddd3]"
                        >
                          {item.label}
                          <svg className="size-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {activeMobileTab === "categories" && (
                  <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#8a7560]">Catalogo por rubro</p>
                      <button onClick={() => handleMobileNavigate("/catalog")} className="text-[10px] font-bold text-[color:var(--color-primary,#0099e5)] underline underline-offset-2">Ver todo</button>
                    </div>

                    {categoryTree.length ? (
                      <div className="grid grid-cols-2 gap-3">
                        {categoryTree.map((parent) => (
                          <div key={`mobile-cat-grid-${parent.id}`} className="group flex flex-col">
                            <button
                              type="button"
                              onClick={() => handleMobileNavigate(`/catalog?category=${encodeURIComponent(parent.id)}`)}
                              className="flex flex-col items-start rounded-2xl border border-[#e6ecf2] bg-[#f8fafc] p-4 text-left transition-all active:bg-[#e4e9ef] dark:border-[#2c1f16] dark:bg-[#1a130c]"
                            >
                              <span className="text-[13px] font-black leading-tight text-[color:var(--color-primary,#0099e5)]">{parent.name}</span>
                              <span className="mt-1 text-[10px] font-semibold text-[#8a7560]">{parent.children.length} subrubros</span>
                            </button>

                            {parent.children.length > 0 && (
                              <button
                                onClick={() => setExpandedMobileCategories(prev => ({ ...prev, [parent.id]: !prev[parent.id] }))}
                                className="mt-1 flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold text-[#64748b] hover:text-[#1f2937] dark:text-[#a59280]"
                              >
                                {expandedMobileCategories[parent.id] ? "Ocultar detalles" : "Ver subrubros"}
                                <ChevronDown className={`size-2.5 transition-transform ${expandedMobileCategories[parent.id] ? "rotate-180" : ""}`} />
                              </button>
                            )}

                            {expandedMobileCategories[parent.id] && parent.children.length > 0 && (
                              <div className="mt-2 flex flex-col gap-1 border-l-2 border-[#e6ecf2] pl-3 animate-in fade-in slide-in-from-top-2 dark:border-[#2c1f16]">
                                {parent.children.map((child) => (
                                  <button
                                    key={`mob-sub-${child.id}`}
                                    onClick={() => handleMobileNavigate(`/catalog?category=${encodeURIComponent(child.id)}`)}
                                    className="py-1.5 text-left text-[12px] font-medium text-[#4b5563] active:text-[color:var(--color-primary,#0099e5)] dark:text-[#cdbca9]"
                                  >
                                    {child.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border-2 border-dashed border-[#e6ecf2] p-8 text-center text-[#8a7560] dark:border-[#2c1f16]">
                        Cargando categorias...
                      </div>
                    )}
                  </section>
                )}

                {activeMobileTab === "brands" && (
                  <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <p className="mb-4 text-[11px] font-black uppercase tracking-[0.14em] text-[#8a7560]">Nuestras marcas</p>
                    {brandLinks.length ? (
                      <div className="grid grid-cols-2 gap-2">
                        {brandLinks.map((item) => (
                          <button
                            key={`mobile-br-${item.label}`}
                            type="button"
                            onClick={() => handleMobileNavigate(item.href)}
                            className="rounded-xl border border-[#dbe2ea] bg-white px-4 py-3 text-left text-xs font-bold text-[#1f2937] shadow-sm transition-all active:scale-95 dark:border-[#3d2f21] dark:bg-[#1a130c] dark:text-[#e7ddd3]"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="py-10 text-center text-sm text-[#8a7560]">No hay marcas disponibles.</p>
                    )}
                  </section>
                )}
              </div>

              {/* Footer simple for mobile menu */}
              <div className="mt-auto border-t border-[#e4e9ef] bg-[#f8fafc] p-6 dark:border-[#3d2f21] dark:bg-[#1a130c]/50">
                 <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase tracking-wider text-[#8a7560]">{storeText("header", "help_title", navbarTexts)}</p>
                      <p className="text-xs font-bold text-[#1f2937] dark:text-[#e7ddd3]">{storeText("header", "help_text", navbarTexts)}</p>
                    </div>
                    {whatsappHref && (
                      <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex size-10 items-center justify-center rounded-full bg-[#25d366] text-white shadow-lg shadow-green-500/20 active:scale-90 transition-transform"
                      >
                        <svg className="size-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-2.335 0-4.241 1.906-4.241 4.241 0 .741.194 1.436.53 2.031l-.564 2.057 2.106-.552c.571.31 1.221.495 1.914.495 2.335 0 4.241-1.906 4.241-4.241 0-2.335-1.906-4.241-4.241-4.241zm3.11 5.617c-.126.126-.541.313-.746.331-.205.018-.466.014-.766-.082-.3-.096-.65-.213-1.071-.397-.421-.184-.791-.453-1.109-.771-.318-.318-.587-.688-.771-1.109-.184-.421-.301-.771-.397-1.071-.096-.3-.1-.561-.082-.766.018-.205.205-.62.331-.746.126-.126.21-.157.283-.157.073 0 .147.009.215.013.068.004.142.008.201.12.059.112.184.449.201.487.017.038.026.084.004.131-.022.047-.047.073-.094.131l-.141.164c-.047.054-.097.113-.041.21.056.097.248.409.533.662.285.253.525.333.622.378.097.045.153.037.21-.028.057-.065.244-.285.309-.383.065-.098.131-.082.22-.047.089.035.565.267.663.316.098.049.164.073.188.113.024.04.024.234-.102.36zM12 2C6.477 2 2 6.477 2 12c0 1.891.526 3.658 1.438 5.161l-1.438 5.243 5.362-1.407C8.749 21.65 10.309 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.558 0-3.007-.432-4.241-1.178l-3.041.798.814-2.964C4.782 15.656 4 14.075 4 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/></svg>
                      </a>
                    )}
                 </div>
              </div>
            </div>
          ) : null}
        </div>
    );
}
