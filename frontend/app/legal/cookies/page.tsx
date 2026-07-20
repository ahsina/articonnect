export const metadata = { title: 'Politique cookies — Krafolt' };

export default function CookiesPage() {
  return (
    <>
      <p className="!mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Document juridique</p>
      <h1>Politique de gestion des cookies</h1>
      <p className="!mt-1 text-sm text-muted-foreground">Version en vigueur au 1er juin 2026 · Applicable LU · FR · BE</p>
      <p>
        Krafolt utilise des cookies et technologies similaires pour faire fonctionner la Plateforme, sécuriser
        votre session et, avec votre consentement, mesurer l&apos;audience.
      </p>

      <h2>1. Cookies strictement nécessaires</h2>
      <p>
        Indispensables au fonctionnement (authentification par cookie httpOnly, sécurité, préférence de langue).
        Ils ne nécessitent pas de consentement et ne peuvent pas être désactivés.
      </p>

      <h2>2. Cookies de mesure d&apos;audience</h2>
      <p>
        Soumis à votre consentement, ils nous aident à comprendre l&apos;usage du service. Ils ne sont déposés
        qu&apos;après acceptation via le bandeau de consentement.
      </p>

      <h2>3. Gestion du consentement</h2>
      <p>
        Vous pouvez accepter ou refuser les cookies non essentiels via le bandeau affiché lors de votre première
        visite. Votre choix est conservé et peut être modifié à tout moment en effaçant les cookies de votre
        navigateur. Tant que le consentement n&apos;est pas donné, aucun cookie de mesure n&apos;est déposé.
      </p>

      <h2>4. Durée</h2>
      <p>Le consentement est conservé 6 mois ; au-delà, il vous sera redemandé.</p>
    </>
  );
}
