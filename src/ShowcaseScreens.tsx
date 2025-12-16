import React from 'react';
import { ChangePasswordScreen } from './components/screens/ChangePasswordScreen';
import { HomeScreen } from './components/screens/HomeScreen';
import { LanguageProvider } from './utils/LanguageContext';

export default function ShowcaseScreens() {
  return (
    <LanguageProvider>
      <div className="min-h-screen bg-neutral-line-100 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl mb-8 text-center text-neutral-ink-900">
            CasaZero Updated Screens Showcase
          </h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Change Password Screen */}
            <div className="space-y-4">
              <h2 className="text-xl text-center text-neutral-ink-800">
                1️⃣ Change Password Page
              </h2>
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ height: '844px', maxWidth: '430px', margin: '0 auto' }}>
                <ChangePasswordScreen
                  onBack={() => console.log('Back')}
                  onSuccess={() => console.log('Success')}
                />
              </div>
              <div className="max-w-[430px] mx-auto">
                <ul className="text-sm text-neutral-ink-600 space-y-2">
                  <li>✓ Blurred background with building image</li>
                  <li>✓ Soft black gradient overlay (40% opacity)</li>
                  <li>✓ CasaZero white logo centered at top</li>
                  <li>✓ Clean form with 3 input fields</li>
                  <li>✓ Rounded semi-transparent white card</li>
                  <li>✓ Green primary button (#22C55E)</li>
                  <li>✓ Password requirements validation</li>
                  <li>✓ Modern minimal typography</li>
                </ul>
              </div>
            </div>

            {/* Home Screen with Construction Progress */}
            <div className="space-y-4">
              <h2 className="text-xl text-center text-neutral-ink-800">
                2️⃣ Home Screen - Construction Progress
              </h2>
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ height: '844px', maxWidth: '430px', margin: '0 auto' }}>
                <HomeScreen
                  role="client"
                  firstName="Marco"
                  fullName="Marco Rossi"
                  residenceStatus="under-construction"
                  onNavigate={(screen) => console.log('Navigate to:', screen)}
                />
              </div>
              <div className="max-w-[430px] mx-auto">
                <ul className="text-sm text-neutral-ink-600 space-y-2">
                  <li>✓ Horizontal timeline before notifications</li>
                  <li>✓ 6 construction phases with icons</li>
                  <li>✓ Color coding: Grey → In Progress → Green</li>
                  <li>✓ Dynamic progress line animation</li>
                  <li>✓ Phase labels: Getto Platea, Struttura, Facciate, Impianti, Finiture, Consegna</li>
                  <li>✓ Icons: Hard Hat, Building, Paintbrush, Zap, Wrench, Key</li>
                  <li>✓ Elegant spacing and soft shadows</li>
                  <li>✓ Pulse animation on current phase</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Implementation Notes */}
          <div className="mt-12 bg-white rounded-2xl shadow-xl p-8 max-w-4xl mx-auto">
            <h2 className="text-2xl mb-4 text-neutral-ink-900">Implementation Notes</h2>
            <div className="space-y-4 text-neutral-ink-700">
              <div>
                <h3 className="font-semibold mb-2">Change Password Screen:</h3>
                <p className="text-sm">
                  The screen uses the same building background as the login screen with a darkened overlay for consistency. 
                  The form includes real-time password validation showing requirements (8+ chars, uppercase, lowercase, number, special char). 
                  The green button (#22C55E) provides clear call-to-action. Navigation is handled through the back button and success callback.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Construction Timeline:</h3>
                <p className="text-sm">
                  The timeline component features a horizontal layout inspired by Amazon order tracking. Each phase has a circular icon 
                  with color-coded status (grey for not started, light green for in-progress with pulse animation, dark green with checkmark 
                  for completed). The connecting line dynamically fills from left to right as construction progresses. When all phases are 
                  complete (residenceStatus='completed'), the home screen automatically switches to the standard layout with welcome message 
                  and notifications.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Multilingual Support:</h3>
                <p className="text-sm">
                  Both screens support Italian/English with Italian as default. All labels are connected to the LanguageContext translation system.
                  Construction phase names include proper Italian terms: Getto Platea (foundation), Struttura Edificio (structure), 
                  Facciate (facades), Impianti (systems), Finiture Interne (interior finishes), Consegna Finale (final delivery).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LanguageProvider>
  );
}
