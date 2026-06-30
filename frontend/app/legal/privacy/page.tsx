export const metadata = { title: 'Politique de confidentialité (RGPD) — Krafolt' };

export default function PrivacyPage() {
  return (
    <>
      <h1>Politique de confidentialité</h1>
      <p>
        Krafolt traite vos données personnelles conformément au Règlement (UE) 2016/679 (« RGPD ») et aux lois
        nationales applicables (LU/FR/BE).
      </p>

      <h2>1. Responsable du traitement</h2>
      <p>
        Krafolt, [coordonnées de l&apos;éditeur — voir <a href="/legal/mentions">mentions légales</a>]. Délégué à
        la protection des données : <a href="mailto:dpo@krafolt.com">dpo@krafolt.com</a>.
      </p>

      <h2>2. Données collectées</h2>
      <p>
        Données d&apos;identification (nom, e-mail, téléphone), données de profil (adresse, entreprise, SIRET pour
        les professionnels), données de mission et de messagerie, données de paiement (traitées par Stripe — nous
        ne stockons pas les numéros de carte), données techniques (logs, adresse IP) et préférences.
      </p>

      <h2>3. Finalités et bases légales</h2>
      <p>
        Fourniture du service et exécution du contrat (art. 6.1.b), respect d&apos;obligations légales (facturation,
        lutte anti-fraude, KYC — art. 6.1.c), intérêt légitime (sécurité, amélioration — art. 6.1.f), et
        consentement pour les communications marketing et certains cookies (art. 6.1.a).
      </p>

      <h2>4. Destinataires</h2>
      <p>
        Vos données sont partagées avec les autres parties à une mission (dans la mesure nécessaire), et avec nos
        sous-traitants : <strong>Stripe</strong> (paiement), <strong>OVH</strong> (hébergement), prestataires
        d&apos;e-mail et de SMS, et services de vérification d&apos;entreprise. Des accords de sous-traitance
        encadrent ces transferts.
      </p>

      <h2>5. Durée de conservation</h2>
      <p>
        Les données sont conservées pour la durée de la relation contractuelle puis archivées selon les délais
        légaux (notamment 10 ans pour les pièces comptables).
      </p>

      <h2>6. Vos droits</h2>
      <p>
        Vous disposez des droits d&apos;accès, de rectification, d&apos;effacement, de limitation,
        d&apos;opposition et de portabilité. Vous pouvez exporter ou demander la suppression de vos données
        directement depuis <strong>Paramètres → Confidentialité</strong>, ou en écrivant à{' '}
        <a href="mailto:dpo@krafolt.com">dpo@krafolt.com</a>. Vous pouvez introduire une réclamation auprès de
        votre autorité de contrôle (CNPD au Luxembourg, CNIL en France, APD en Belgique).
      </p>

      <h2>7. Cookies</h2>
      <p>
        La gestion des cookies est décrite dans notre <a href="/legal/cookies">politique cookies</a>.
      </p>
    </>
  );
}
