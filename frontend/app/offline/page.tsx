'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="text-6xl mb-4">📡</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Vous êtes hors ligne
          </h1>
          <p className="text-gray-600">
            Impossible de se connecter au réseau. Veuillez vérifier votre connexion Internet.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">
            Que pouvez-vous faire ?
          </h2>
          <ul className="text-left text-gray-600 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>Vérifier votre connexion WiFi ou données mobiles</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>Réessayer dans quelques instants</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>Les pages récemment visitées peuvent être disponibles en cache</span>
            </li>
          </ul>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Réessayer
        </button>

        <button
          onClick={() => window.history.back()}
          className="w-full mt-3 bg-white text-gray-700 px-6 py-3 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          Retour
        </button>
      </div>
    </div>
  );
}
