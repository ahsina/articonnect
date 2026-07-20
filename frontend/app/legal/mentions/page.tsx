export const metadata = { title: 'Mentions légales — Krafolt' };

export default function MentionsPage() {
  return (
    <>
      <p className="!mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Document juridique</p>
      <h1>Mentions légales</h1>
      <p className="!mt-1 text-sm text-muted-foreground">Version en vigueur au 1er juin 2026 · Applicable LU · FR · BE</p>

      <h2>Éditeur</h2>
      <p>
        Le présent site <strong>krafolt.com</strong> est édité par <strong>Krafolt</strong> (la « Plateforme »),
        place de marché mettant en relation des clients et des artisans au Luxembourg, en France et en Belgique.
      </p>
      <p>
        Raison sociale : <strong>[à compléter]</strong> — Forme juridique : [à compléter] — Capital social :
        [à compléter] — Siège social : [adresse] — Immatriculation (RCS / SIRET / KBO) : [à compléter] —
        N° TVA intracommunautaire : [à compléter].
      </p>

      <h2>Directeur de la publication</h2>
      <p>[Nom du représentant légal].</p>

      <h2>Contact</h2>
      <p>
        E-mail : <a href="mailto:contact@krafolt.com">contact@krafolt.com</a> — Support :{' '}
        <a href="mailto:support@krafolt.com">support@krafolt.com</a>.
      </p>

      <h2>Hébergement</h2>
      <p>
        Le site est hébergé par <strong>OVH</strong> (OVH SAS, 2 rue Kellermann, 59100 Roubaix, France).
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble des éléments de la Plateforme (marque, logo, textes, interface, code) est protégé par le
        droit de la propriété intellectuelle. Toute reproduction non autorisée est interdite.
      </p>

      <h2>Médiation de la consommation</h2>
      <p>
        Conformément à la réglementation, le consommateur peut recourir à un médiateur de la consommation. La
        plateforme européenne de règlement en ligne des litiges est accessible à l&apos;adresse{' '}
        <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">
          ec.europa.eu/consumers/odr
        </a>
        .
      </p>
    </>
  );
}
