import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <nav className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-600">ArtiConnect</h1>
          <div className="space-x-4">
            <Link href="/login">
              <Button variant="ghost">Connexion</Button>
            </Link>
            <Link href="/register">
              <Button>S'inscrire</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Trouvez des artisans locaux en quelques clics
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            ArtiConnect met en relation clients et artisans pour tous vos besoins :
            dépannage d'urgence, installation, rénovation...
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register?role=client">
              <Button size="lg">Je cherche un artisan</Button>
            </Link>
            <Link href="/register?role=artisan">
              <Button size="lg" variant="outline">
                Je suis artisan
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="text-center p-6">
            <div className="text-4xl mb-4">📍</div>
            <h3 className="text-xl font-semibold mb-2">Géolocalisation</h3>
            <p className="text-gray-600">
              Trouvez des artisans près de chez vous en temps réel
            </p>
          </div>
          <div className="text-center p-6">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-xl font-semibold mb-2">Négociation</h3>
            <p className="text-gray-600">
              Discutez et négociez les prix directement avec l'artisan
            </p>
          </div>
          <div className="text-center p-6">
            <div className="text-4xl mb-4">⭐</div>
            <h3 className="text-xl font-semibold mb-2">Avis vérifiés</h3>
            <p className="text-gray-600">
              Consultez les avis authentiques d'autres clients
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
