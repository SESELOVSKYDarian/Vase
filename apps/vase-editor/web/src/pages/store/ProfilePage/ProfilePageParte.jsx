// Parte de ProfilePage.
import ProfileAddresses from './ProfileAddresses.jsx';
import ProfileFavorites from './ProfileFavorites.jsx';
import ProfileHeader from './ProfileHeader.jsx';
import ProfileOrders from './ProfileOrders.jsx';
import ProfileSecurity from './ProfileSecurity.jsx';
import ProfileSidebar from './ProfileSidebar.jsx';
import StoreLayout from '../../../components/layout/StoreLayout';
import { ChevronRight } from './profile-helpers.jsx';
import { navigate } from '../../../utils/navigation';

export default function ProfilePageParte({ activeSection, addToCart, address, addressDraft, addressesSpanClass, billingDetails, citiesLoading, cityOptions, citySuggestionsEnabled, countriesLoading, countryInput, countryOptions, currency, favorites, formatOrderDate, handleCityInputChange, handleCountryInputChange, handleLogout, handleProfilePhotoChange, handleProvinceInputChange, handleRemovePhoto, handleViewOrder, handleWholesaleQuote, hasProfileBillingInfo, isArgentinaCountry, isEditingAddress, isWholesaleUser, locale, ordersSpanClass, profileName, profilePhoto, provinceLoading, provinceOptions, provinceSuggestionsEnabled, removeFavorite, resetAddress, roleLabel, saveAddress, sectionLabels, setActiveSection, setAddressDraft, setIsEditingAddress, showAddresses, showOrders, showPrices, updateOrderStatus, visibleOrders, wholesaleQuoteUrl }) {
    return (
        <StoreLayout>
            <div className="mx-auto w-full max-w-[1400px] px-4 md:px-10 py-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    <ProfileSidebar activeSection={activeSection} favorites={favorites} handleLogout={handleLogout} profileName={profileName} profilePhoto={profilePhoto} roleLabel={roleLabel} setActiveSection={setActiveSection} />

                    <main className="flex-1 bg-[#f8f7f5] dark:bg-[#1a140d] rounded-2xl p-6 md:p-8">
                        <div className="flex items-center gap-2 text-xs text-[#8a7560] mb-6 uppercase tracking-wider font-semibold">
                            <button className="hover:text-primary transition-colors" onClick={() => navigate('/')}>
                                Inicio
                            </button>
                            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-primary">{sectionLabels[activeSection]}</span>
                        </div>

                        {activeSection === 'account' ? (
                            <ProfileHeader handleProfilePhotoChange={handleProfilePhotoChange} handleRemovePhoto={handleRemovePhoto} profileName={profileName} profilePhoto={profilePhoto} roleLabel={roleLabel} />
                        ) : null}

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                            {showOrders ? (
                                <ProfileOrders currency={currency} formatOrderDate={formatOrderDate} handleViewOrder={handleViewOrder} locale={locale} ordersSpanClass={ordersSpanClass} setActiveSection={setActiveSection} updateOrderStatus={updateOrderStatus} visibleOrders={visibleOrders} />
                            ) : null}

                            {showAddresses ? (
                                <ProfileAddresses address={address} addressDraft={addressDraft} addressesSpanClass={addressesSpanClass} billingDetails={billingDetails} citiesLoading={citiesLoading} cityOptions={cityOptions} citySuggestionsEnabled={citySuggestionsEnabled} countriesLoading={countriesLoading} countryInput={countryInput} countryOptions={countryOptions} handleCityInputChange={handleCityInputChange} handleCountryInputChange={handleCountryInputChange} handleProvinceInputChange={handleProvinceInputChange} handleWholesaleQuote={handleWholesaleQuote} hasProfileBillingInfo={hasProfileBillingInfo} isArgentinaCountry={isArgentinaCountry} isEditingAddress={isEditingAddress} isWholesaleUser={isWholesaleUser} profileName={profileName} provinceLoading={provinceLoading} provinceOptions={provinceOptions} provinceSuggestionsEnabled={provinceSuggestionsEnabled} resetAddress={resetAddress} roleLabel={roleLabel} saveAddress={saveAddress} setAddressDraft={setAddressDraft} setIsEditingAddress={setIsEditingAddress} wholesaleQuoteUrl={wholesaleQuoteUrl} />
                            ) : null}

                            {activeSection === 'favorites' ? (
                                <ProfileFavorites addToCart={addToCart} currency={currency} favorites={favorites} locale={locale} removeFavorite={removeFavorite} showPrices={showPrices} />
                            ) : null}

                            {activeSection === 'security' ? (
                                <ProfileSecurity />
                            ) : null}
                        </div>
                    </main>
                </div>
            </div>
        </StoreLayout>
    );
}
