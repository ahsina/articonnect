export const metadata = { title: 'CGU / CGV — Krafolt' };

export default function TermsPage() {
  return (
    <>
      <p className="!mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Document juridique</p>
      <h1>Conditions Générales d&apos;Utilisation et de Vente</h1>
      <p className="!mt-1 text-sm text-muted-foreground">Version en vigueur au 1er juin 2026 · Applicable LU · FR · BE</p>

      <h2>1. Objet</h2>
      <p>
        Krafolt est une place de marché qui met en relation des <strong>clients</strong> (particuliers ou
        professionnels) et des <strong>artisans</strong> indépendants ou entreprises, pour la réalisation de
        prestations de services et la vente de produits. Krafolt agit en qualité d&apos;intermédiaire technique et
        de paiement, et n&apos;est pas partie au contrat de prestation conclu entre le client et l&apos;artisan.
      </p>

      <h2>2. Inscription et compte</h2>
      <p>
        L&apos;accès aux services nécessite la création d&apos;un compte. L&apos;utilisateur garantit
        l&apos;exactitude des informations fournies. Les artisans professionnels doivent justifier de leur
        immatriculation (SIRET / RCS / KBO) et des assurances requises par leur activité.
      </p>

      <h2>3. Missions, devis et négociation</h2>
      <p>
        Le client publie une mission ; les artisans proposent des offres. Le prix convenu (« prix accordé ») fait
        foi entre les parties. La négociation est limitée à un nombre d&apos;échanges défini sur la Plateforme.
      </p>

      <h2>4. Paiement et séquestre (escrow)</h2>
      <p>
        Les paiements sont opérés via notre prestataire <strong>Stripe</strong>. Les fonds sont placés sous
        séquestre et libérés à l&apos;artisan après validation de la prestation par le client (ou validation
        automatique à l&apos;issue du délai prévu). Krafolt prélève une commission de service sur chaque
        transaction, indiquée avant paiement.
      </p>

      <h2>5. Annulation et remboursement</h2>
      <p>
        Les conditions d&apos;annulation et le barème de frais applicables sont présentés au moment de
        l&apos;annulation. Les remboursements éventuels sont effectués sur le moyen de paiement d&apos;origine.
        Le droit de rétractation légal s&apos;applique dans les conditions prévues par la réglementation
        applicable aux consommateurs (LU/FR/BE).
      </p>

      <h2>6. Litiges</h2>
      <p>
        En cas de désaccord, les parties peuvent ouvrir un litige sur la Plateforme. Krafolt peut proposer une
        médiation mais ne se substitue pas aux tribunaux compétents.
      </p>

      <h2>7. Marketplace produits</h2>
      <p>
        Les produits vendus sur la Plateforme le sont par les artisans-vendeurs, sous leur responsabilité. Les
        prix s&apos;entendent TTC ; les frais de livraison et la TVA applicables sont affichés avant validation de
        la commande.
      </p>

      <h2>8. Responsabilité</h2>
      <p>
        Krafolt met en œuvre les moyens raisonnables pour assurer la disponibilité du service mais ne saurait
        être tenue responsable de la bonne exécution des prestations réalisées par les artisans.
      </p>

      <h2>9. Données personnelles</h2>
      <p>
        Le traitement des données est décrit dans notre <a href="/legal/privacy">Politique de confidentialité</a>.
      </p>

      <h2>10. Droit applicable</h2>
      <p>
        Les présentes conditions sont régies par le droit applicable au siège de l&apos;éditeur, sans préjudice
        des dispositions impératives protectrices du consommateur de son pays de résidence (LU/FR/BE).
      </p>
    </>
  );
}
