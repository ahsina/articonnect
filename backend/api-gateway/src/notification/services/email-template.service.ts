import { Injectable } from '@nestjs/common';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

@Injectable()
export class EmailTemplateService {
  private readonly baseStyles = `
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 30px 20px; text-align: center; }
      .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
      .content { padding: 30px 20px; }
      .content h2 { color: #667eea; font-size: 22px; margin-top: 0; }
      .content p { margin: 15px 0; }
      .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: 600; margin: 20px 0; }
      .button:hover { opacity: 0.9; }
      .info-box { background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
      .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
      .highlight { color: #667eea; font-weight: 600; }
      .price { font-size: 24px; font-weight: 700; color: #667eea; }
      .mission-details { background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
      .mission-details dt { font-weight: 600; color: #333; margin-top: 10px; }
      .mission-details dd { margin-left: 0; color: #666; }
      .alert { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
      .success { background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 4px; }
    </style>
  `;

  private wrapTemplate(title: string, body: string): string {
    return `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        ${this.baseStyles}
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Krafolt</h1>
          </div>
          <div class="content">
            ${body}
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Krafolt. Tous droits réservés.</p>
            <p>Vous recevez cet email car vous avez un compte sur Krafolt.</p>
            <p><a href="#" style="color: #667eea;">Se désabonner</a> | <a href="#" style="color: #667eea;">Préférences de notification</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  welcomeClient(firstName: string, email: string): EmailTemplate {
    const body = `
      <h2>Bienvenue sur Krafolt, ${firstName} !</h2>
      <p>Nous sommes ravis de vous accueillir sur notre plateforme de mise en relation avec des artisans qualifiés.</p>

      <div class="info-box">
        <p><strong>Votre compte a été créé avec succès :</strong></p>
        <p>Email : <span class="highlight">${email}</span></p>
      </div>

      <p><strong>Prochaines étapes :</strong></p>
      <ul>
        <li>Complétez votre profil pour une meilleure expérience</li>
        <li>Explorez les artisans disponibles dans votre région</li>
        <li>Créez votre première mission en quelques clics</li>
      </ul>

      <a href="${process.env.FRONTEND_URL}/client/dashboard" class="button">Accéder à mon tableau de bord</a>

      <p>Besoin d'aide ? Notre équipe est à votre disposition.</p>
    `;

    return {
      subject: 'Bienvenue sur Krafolt !',
      html: this.wrapTemplate('Bienvenue', body),
      text: `Bienvenue sur Krafolt, ${firstName} ! Votre compte ${email} a été créé avec succès. Visitez ${process.env.FRONTEND_URL}/client/dashboard pour commencer.`,
    };
  }

  welcomeArtisan(firstName: string, companyName: string, email: string): EmailTemplate {
    const body = `
      <h2>Bienvenue sur Krafolt, ${firstName} !</h2>
      <p>Félicitations ! Votre profil artisan <span class="highlight">${companyName}</span> a été créé avec succès.</p>

      <div class="success">
        <p><strong>Votre compte professionnel est maintenant actif !</strong></p>
        <p>Email : <span class="highlight">${email}</span></p>
      </div>

      <p><strong>Pour commencer à recevoir des missions :</strong></p>
      <ul>
        <li>Complétez votre profil professionnel (certifications, portfolio)</li>
        <li>Activez vos catégories de services</li>
        <li>Définissez votre zone d'intervention</li>
        <li>Configurez vos disponibilités</li>
      </ul>

      <a href="${process.env.FRONTEND_URL}/artisan/dashboard" class="button">Compléter mon profil</a>

      <p>Notre système de matching intelligent vous connectera automatiquement aux missions correspondant à vos compétences et votre localisation.</p>
    `;

    return {
      subject: 'Votre profil artisan Krafolt est actif !',
      html: this.wrapTemplate('Bienvenue Artisan', body),
      text: `Bienvenue sur Krafolt, ${firstName} ! Votre profil artisan ${companyName} est maintenant actif. Visitez ${process.env.FRONTEND_URL}/artisan/dashboard pour compléter votre profil.`,
    };
  }

  missionCreated(clientName: string, missionTitle: string, missionId: string, budget: number, category: string): EmailTemplate {
    const body = `
      <h2>Votre mission a été créée avec succès</h2>
      <p>Bonjour ${clientName},</p>
      <p>Votre mission <span class="highlight">${missionTitle}</span> est maintenant en ligne et visible par nos artisans qualifiés.</p>

      <div class="mission-details">
        <dl>
          <dt>Titre :</dt>
          <dd>${missionTitle}</dd>
          <dt>Catégorie :</dt>
          <dd>${category}</dd>
          <dt>Budget :</dt>
          <dd><span class="price">${budget}€</span></dd>
        </dl>
      </div>

      <p><strong>Que se passe-t-il maintenant ?</strong></p>
      <ul>
        <li>Les artisans qualifiés de votre région seront notifiés</li>
        <li>Vous recevrez des propositions sous 24-48h en moyenne</li>
        <li>Vous pourrez consulter les profils et choisir votre artisan</li>
      </ul>

      <a href="${process.env.FRONTEND_URL}/client/missions/${missionId}" class="button">Voir ma mission</a>

      <p>Nous vous notifierons dès qu'un artisan manifestera son intérêt.</p>
    `;

    return {
      subject: `Mission créée : ${missionTitle}`,
      html: this.wrapTemplate('Mission créée', body),
      text: `Bonjour ${clientName}, votre mission "${missionTitle}" a été créée avec succès. Budget : ${budget}€. Suivez l'avancement sur ${process.env.FRONTEND_URL}/client/missions/${missionId}`,
    };
  }

  newMissionAvailable(artisanName: string, missionTitle: string, missionId: string, budget: number, distance: number, category: string): EmailTemplate {
    const body = `
      <h2>Nouvelle mission disponible près de vous</h2>
      <p>Bonjour ${artisanName},</p>
      <p>Une nouvelle mission correspondant à vos compétences est disponible à <span class="highlight">${distance} km</span> de votre position.</p>

      <div class="mission-details">
        <dl>
          <dt>Mission :</dt>
          <dd><strong>${missionTitle}</strong></dd>
          <dt>Catégorie :</dt>
          <dd>${category}</dd>
          <dt>Budget :</dt>
          <dd><span class="price">${budget}€</span></dd>
          <dt>Distance :</dt>
          <dd>${distance} km</dd>
        </dl>
      </div>

      <div class="info-box">
        <p><strong>Conseil :</strong> Les artisans qui répondent rapidement ont 3x plus de chances d'être sélectionnés !</p>
      </div>

      <a href="${process.env.FRONTEND_URL}/artisan/missions/${missionId}" class="button">Voir la mission</a>

      <p>N'attendez pas, cette mission pourrait intéresser d'autres artisans de votre zone.</p>
    `;

    return {
      subject: `Nouvelle mission : ${missionTitle} (${distance} km)`,
      html: this.wrapTemplate('Nouvelle mission', body),
      text: `Bonjour ${artisanName}, nouvelle mission "${missionTitle}" à ${distance} km. Budget : ${budget}€. Voir : ${process.env.FRONTEND_URL}/artisan/missions/${missionId}`,
    };
  }

  missionAccepted(clientName: string, artisanName: string, missionTitle: string, missionId: string, scheduledDate: string): EmailTemplate {
    const body = `
      <h2>Votre mission a été acceptée !</h2>
      <p>Bonjour ${clientName},</p>
      <p>Excellente nouvelle ! <span class="highlight">${artisanName}</span> a accepté votre mission.</p>

      <div class="success">
        <p><strong>Mission acceptée :</strong> ${missionTitle}</p>
        <p><strong>Date prévue :</strong> ${scheduledDate}</p>
        <p><strong>Artisan :</strong> ${artisanName}</p>
      </div>

      <p><strong>Prochaines étapes :</strong></p>
      <ul>
        <li>L'artisan vous contactera pour confirmer les détails</li>
        <li>Vous pouvez discuter via notre messagerie intégrée</li>
        <li>Le paiement sera sécurisé jusqu'à la fin de la mission</li>
      </ul>

      <a href="${process.env.FRONTEND_URL}/client/missions/${missionId}" class="button">Contacter l'artisan</a>

      <p>Vous avez des questions ? N'hésitez pas à utiliser notre système de messagerie.</p>
    `;

    return {
      subject: `Mission acceptée par ${artisanName}`,
      html: this.wrapTemplate('Mission acceptée', body),
      text: `Bonjour ${clientName}, ${artisanName} a accepté votre mission "${missionTitle}". Date prévue : ${scheduledDate}. Voir : ${process.env.FRONTEND_URL}/client/missions/${missionId}`,
    };
  }

  missionCompleted(clientName: string, artisanName: string, missionTitle: string, missionId: string): EmailTemplate {
    const body = `
      <h2>Mission terminée</h2>
      <p>Bonjour ${clientName},</p>
      <p>La mission <span class="highlight">${missionTitle}</span> réalisée par <span class="highlight">${artisanName}</span> est maintenant terminée.</p>

      <div class="info-box">
        <p><strong>Votre avis compte !</strong></p>
        <p>Aidez la communauté en partageant votre expérience avec ${artisanName}. Votre évaluation aidera d'autres clients à faire leur choix.</p>
      </div>

      <a href="${process.env.FRONTEND_URL}/client/missions/${missionId}/review" class="button">Laisser un avis</a>

      <p><strong>Qualité du service :</strong></p>
      <ul>
        <li>Évaluez la qualité du travail réalisé</li>
        <li>Notez la ponctualité et le professionnalisme</li>
        <li>Partagez votre expérience en quelques mots</li>
      </ul>

      <p>Merci d'avoir utilisé Krafolt !</p>
    `;

    return {
      subject: `Mission terminée : ${missionTitle}`,
      html: this.wrapTemplate('Mission terminée', body),
      text: `Bonjour ${clientName}, la mission "${missionTitle}" avec ${artisanName} est terminée. Laissez votre avis : ${process.env.FRONTEND_URL}/client/missions/${missionId}/review`,
    };
  }

  paymentReceived(artisanName: string, amount: number, missionTitle: string, missionId: string): EmailTemplate {
    const body = `
      <h2>Paiement reçu</h2>
      <p>Bonjour ${artisanName},</p>
      <p>Le paiement pour la mission <span class="highlight">${missionTitle}</span> a été traité avec succès.</p>

      <div class="success">
        <p><strong>Montant reçu :</strong></p>
        <p class="price">${amount}€</p>
      </div>

      <div class="mission-details">
        <dl>
          <dt>Mission :</dt>
          <dd>${missionTitle}</dd>
          <dt>Montant brut :</dt>
          <dd>${amount}€</dd>
          <dt>Statut :</dt>
          <dd><span style="color: #28a745; font-weight: 600;">Transféré</span></dd>
        </dl>
      </div>

      <p><strong>Informations :</strong></p>
      <ul>
        <li>Le virement sera effectué sous 2-3 jours ouvrés</li>
        <li>Vous recevrez le paiement sur votre compte Stripe</li>
        <li>Une facture détaillée est disponible dans votre espace</li>
      </ul>

      <a href="${process.env.FRONTEND_URL}/artisan/missions/${missionId}" class="button">Voir les détails</a>

      <p>Merci pour votre professionnalisme !</p>
    `;

    return {
      subject: `Paiement reçu : ${amount}€`,
      html: this.wrapTemplate('Paiement reçu', body),
      text: `Bonjour ${artisanName}, vous avez reçu un paiement de ${amount}€ pour la mission "${missionTitle}". Le virement sera effectué sous 2-3 jours.`,
    };
  }

  negotiationReceived(userName: string, senderName: string, missionTitle: string, proposedPrice: number, currentPrice: number, missionId: string): EmailTemplate {
    const priceDiff = proposedPrice - currentPrice;
    const priceChange = priceDiff > 0 ? `+${priceDiff}€` : `${priceDiff}€`;

    const body = `
      <h2>Nouvelle proposition de prix</h2>
      <p>Bonjour ${userName},</p>
      <p><span class="highlight">${senderName}</span> a fait une contre-proposition pour la mission <span class="highlight">${missionTitle}</span>.</p>

      <div class="info-box">
        <p><strong>Détails de la proposition :</strong></p>
        <p>Prix actuel : <span style="text-decoration: line-through;">${currentPrice}€</span></p>
        <p>Prix proposé : <span class="price">${proposedPrice}€</span></p>
        <p>Différence : <span style="color: ${priceDiff > 0 ? '#dc3545' : '#28a745'}; font-weight: 600;">${priceChange}</span></p>
      </div>

      <p><strong>Vous pouvez :</strong></p>
      <ul>
        <li>Accepter cette proposition</li>
        <li>Faire une contre-proposition</li>
        <li>Refuser et maintenir votre prix</li>
      </ul>

      <a href="${process.env.FRONTEND_URL}/missions/${missionId}" class="button">Répondre maintenant</a>

      <p>Une négociation rapide améliore vos chances de finaliser la mission.</p>
    `;

    return {
      subject: `Nouvelle proposition : ${missionTitle} (${proposedPrice}€)`,
      html: this.wrapTemplate('Négociation', body),
      text: `Bonjour ${userName}, ${senderName} propose ${proposedPrice}€ pour "${missionTitle}" (actuellement ${currentPrice}€). Répondre : ${process.env.FRONTEND_URL}/missions/${missionId}`,
    };
  }

  noShowAlert(artisanName: string, clientName: string, missionTitle: string, missionId: string, feeAmount: number): EmailTemplate {
    const body = `
      <h2>Signalement de non-présentation</h2>
      <p>Bonjour ${artisanName},</p>
      <p>Votre signalement de non-présentation du client <span class="highlight">${clientName}</span> pour la mission <span class="highlight">${missionTitle}</span> a été enregistré.</p>

      <div class="alert">
        <p><strong>⚠️ Signalement en cours de traitement</strong></p>
        <p>Notre équipe examine actuellement votre signalement.</p>
      </div>

      <div class="mission-details">
        <dl>
          <dt>Mission :</dt>
          <dd>${missionTitle}</dd>
          <dt>Client concerné :</dt>
          <dd>${clientName}</dd>
          <dt>Compensation potentielle :</dt>
          <dd><span class="price">${feeAmount}€</span></dd>
        </dl>
      </div>

      <p><strong>Prochaines étapes :</strong></p>
      <ul>
        <li>Notre équipe vérifiera les preuves fournies (photos, messages)</li>
        <li>Le client sera contacté pour donner sa version</li>
        <li>Une décision sera prise sous 48-72h</li>
        <li>Vous serez notifié du résultat par email</li>
      </ul>

      <p><strong>Si votre signalement est validé :</strong></p>
      <ul>
        <li>Vous recevrez la compensation de ${feeAmount}€</li>
        <li>Le profil du client sera signalé</li>
        <li>Des mesures seront prises selon notre politique</li>
      </ul>

      <a href="${process.env.FRONTEND_URL}/artisan/missions/${missionId}" class="button">Suivre le signalement</a>

      <p>Nous prenons ces situations très au sérieux et vous remercions de votre professionnalisme.</p>
    `;

    return {
      subject: `Signalement de non-présentation enregistré`,
      html: this.wrapTemplate('No-show signalé', body),
      text: `Bonjour ${artisanName}, votre signalement de non-présentation pour "${missionTitle}" est en cours de traitement. Compensation potentielle : ${feeAmount}€. Notre équipe vous répondra sous 48-72h.`,
    };
  }

  weeklyClientSummary(
    clientName: string,
    activeMissions: number,
    completedThisWeek: number,
    totalSpent: number,
    upcomingMissions: Array<{ title: string; date: string; artisanName: string }>,
  ): EmailTemplate {
    const upcomingList = upcomingMissions.length > 0
      ? upcomingMissions.map(m => `<li><strong>${m.title}</strong> avec ${m.artisanName} - ${m.date}</li>`).join('')
      : '<li>Aucune mission planifiée</li>';

    const body = `
      <h2>Votre résumé hebdomadaire</h2>
      <p>Bonjour ${clientName},</p>
      <p>Voici un récapitulatif de votre activité sur Krafolt cette semaine.</p>

      <div class="mission-details">
        <dl>
          <dt>Missions actives :</dt>
          <dd><strong>${activeMissions}</strong></dd>
          <dt>Missions terminées cette semaine :</dt>
          <dd><strong>${completedThisWeek}</strong></dd>
          <dt>Dépenses cette semaine :</dt>
          <dd><span class="price">${totalSpent}€</span></dd>
        </dl>
      </div>

      <p><strong>Missions à venir :</strong></p>
      <ul>
        ${upcomingList}
      </ul>

      ${activeMissions > 0 ? `
        <a href="${process.env.FRONTEND_URL}/client/missions" class="button">Voir mes missions</a>
      ` : `
        <div class="info-box">
          <p>Vous n'avez pas de mission active. Créez-en une pour trouver l'artisan idéal pour vos projets !</p>
        </div>
        <a href="${process.env.FRONTEND_URL}/client/missions/new" class="button">Créer une mission</a>
      `}

      <p>Merci de faire confiance à Krafolt pour vos projets !</p>
    `;

    return {
      subject: 'Votre résumé hebdomadaire Krafolt',
      html: this.wrapTemplate('Résumé hebdomadaire', body),
      text: `Bonjour ${clientName}, cette semaine : ${activeMissions} missions actives, ${completedThisWeek} terminées, ${totalSpent}€ dépensés. Consultez ${process.env.FRONTEND_URL}/client/missions`,
    };
  }

  weeklyArtisanSummary(
    artisanName: string,
    activeMissions: number,
    completedThisWeek: number,
    totalEarned: number,
    averageRating: number,
    newReviews: number,
  ): EmailTemplate {
    const clampedRating = Math.max(0, Math.min(5, Math.round(averageRating)));
    const stars = '★'.repeat(clampedRating) + '☆'.repeat(5 - clampedRating);

    const body = `
      <h2>Votre résumé hebdomadaire</h2>
      <p>Bonjour ${artisanName},</p>
      <p>Voici vos performances sur Krafolt cette semaine.</p>

      <div class="mission-details">
        <dl>
          <dt>Missions actives :</dt>
          <dd><strong>${activeMissions}</strong></dd>
          <dt>Missions terminées cette semaine :</dt>
          <dd><strong>${completedThisWeek}</strong></dd>
          <dt>Revenus cette semaine :</dt>
          <dd><span class="price">${totalEarned}€</span></dd>
          <dt>Note moyenne :</dt>
          <dd><span style="color: #ffc107; font-size: 18px;">${stars}</span> <strong>${averageRating.toFixed(1)}/5</strong></dd>
          <dt>Nouveaux avis :</dt>
          <dd><strong>${newReviews}</strong></dd>
        </dl>
      </div>

      ${completedThisWeek > 0 ? `
        <div class="success">
          <p><strong>Félicitations !</strong> Vous avez terminé ${completedThisWeek} mission${completedThisWeek > 1 ? 's' : ''} cette semaine.</p>
        </div>
      ` : ''}

      <a href="${process.env.FRONTEND_URL}/artisan/dashboard" class="button">Voir mon tableau de bord</a>

      <p><strong>Conseils pour améliorer votre visibilité :</strong></p>
      <ul>
        <li>Répondez rapidement aux nouvelles missions</li>
        <li>Maintenez un excellent service pour vos notes</li>
        <li>Complétez votre portfolio avec des photos de réalisations</li>
        <li>Mettez à jour vos disponibilités régulièrement</li>
      </ul>

      <p>Continuez votre excellent travail !</p>
    `;

    return {
      subject: 'Votre résumé hebdomadaire Krafolt',
      html: this.wrapTemplate('Résumé hebdomadaire', body),
      text: `Bonjour ${artisanName}, cette semaine : ${completedThisWeek} missions terminées, ${totalEarned}€ gagnés, note moyenne ${averageRating.toFixed(1)}/5, ${newReviews} nouveaux avis. Consultez ${process.env.FRONTEND_URL}/artisan/dashboard`,
    };
  }

  disputeCreated(userName: string, missionTitle: string, disputeId: string, reason: string): EmailTemplate {
    const body = `
      <h2>Litige créé</h2>
      <p>Bonjour ${userName},</p>
      <p>Votre litige concernant la mission <span class="highlight">${missionTitle}</span> a été enregistré.</p>

      <div class="alert">
        <p><strong>Litige en cours d'examen</strong></p>
        <p>Motif : ${reason}</p>
      </div>

      <p><strong>Processus de résolution :</strong></p>
      <ul>
        <li>Notre équipe examine votre demande sous 24-48h</li>
        <li>Les deux parties seront contactées pour donner leur version</li>
        <li>Une médiation sera proposée si nécessaire</li>
        <li>Une décision équitable sera prise dans les 5-7 jours</li>
      </ul>

      <div class="info-box">
        <p><strong>Documents à fournir :</strong></p>
        <p>Pour accélérer le traitement, vous pouvez ajouter des preuves (photos, messages, contrat) dans votre espace litige.</p>
      </div>

      <a href="${process.env.FRONTEND_URL}/disputes/${disputeId}" class="button">Gérer mon litige</a>

      <p>Nous mettons tout en œuvre pour résoudre cette situation rapidement et équitablement.</p>
    `;

    return {
      subject: `Litige créé : ${missionTitle}`,
      html: this.wrapTemplate('Litige', body),
      text: `Bonjour ${userName}, votre litige pour "${missionTitle}" a été enregistré. Motif : ${reason}. Notre équipe vous répondra sous 24-48h. Suivre : ${process.env.FRONTEND_URL}/disputes/${disputeId}`,
    };
  }

  passwordReset(userName: string, resetToken: string): EmailTemplate {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const body = `
      <h2>Réinitialisation de votre mot de passe</h2>
      <p>Bonjour ${userName},</p>
      <p>Vous avez demandé à réinitialiser votre mot de passe Krafolt.</p>

      <div class="info-box">
        <p><strong>Ce lien est valide pendant 1 heure</strong></p>
      </div>

      <a href="${resetLink}" class="button">Réinitialiser mon mot de passe</a>

      <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe actuel reste inchangé.</p>

      <div class="alert">
        <p><strong>Sécurité :</strong></p>
        <p>Ne partagez jamais ce lien avec qui que ce soit. Notre équipe ne vous demandera jamais votre mot de passe par email.</p>
      </div>

      <p>Pour plus de sécurité, le lien expire dans 1 heure.</p>
    `;

    return {
      subject: 'Réinitialisation de votre mot de passe',
      html: this.wrapTemplate('Réinitialisation mot de passe', body),
      text: `Bonjour ${userName}, réinitialisez votre mot de passe Krafolt en cliquant ici : ${resetLink} (valide 1h). Si vous n'avez rien demandé, ignorez cet email.`,
    };
  }

  employeeInvitation(
    employeeName: string,
    companyName: string,
    inviterName: string,
    role: string,
    invitationToken: string,
  ): EmailTemplate {
    const invitationLink = `${process.env.FRONTEND_URL}/employee/accept-invitation?token=${invitationToken}`;

    const roleLabels: Record<string, string> = {
      MANAGER: 'Manager',
      SUPERVISOR: 'Superviseur',
      TECHNICIAN: 'Technicien',
      CONTRACTOR: 'Sous-traitant',
    };

    const roleLabel = roleLabels[role] || role;

    const body = `
      <h2>Invitation à rejoindre ${companyName}</h2>
      <p>Bonjour ${employeeName},</p>
      <p><span class="highlight">${inviterName}</span> vous invite à rejoindre l'équipe de <span class="highlight">${companyName}</span> sur Krafolt.</p>

      <div class="success">
        <p><strong>Détails de l'invitation :</strong></p>
        <p>Entreprise : <span class="highlight">${companyName}</span></p>
        <p>Rôle proposé : <span class="highlight">${roleLabel}</span></p>
        <p>Invité par : ${inviterName}</p>
      </div>

      <p><strong>En rejoignant cette équipe, vous pourrez :</strong></p>
      <ul>
        <li>Recevoir des missions assignées par votre entreprise</li>
        <li>Suivre vos revenus et commissions</li>
        <li>Accéder au planning de l'équipe</li>
        <li>Collaborer avec vos collègues</li>
      </ul>

      <a href="${invitationLink}" class="button">Accepter l'invitation</a>

      <div class="info-box">
        <p><strong>Cette invitation expire dans 7 jours.</strong></p>
        <p>Si vous n'avez pas demandé cette invitation ou si vous ne connaissez pas ${inviterName}, ignorez cet email.</p>
      </div>

      <p>Des questions ? Contactez directement ${inviterName} ou notre support.</p>
    `;

    return {
      subject: `${inviterName} vous invite à rejoindre ${companyName}`,
      html: this.wrapTemplate('Invitation employé', body),
      text: `Bonjour ${employeeName}, ${inviterName} vous invite à rejoindre ${companyName} en tant que ${roleLabel}. Acceptez l'invitation ici : ${invitationLink}. Cette invitation expire dans 7 jours.`,
    };
  }

  subcontractorInvitation(
    subcontractorName: string,
    artisanName: string,
    artisanCompany: string,
    invitationToken: string,
    specialties: string[],
  ): EmailTemplate {
    const invitationLink = `${process.env.FRONTEND_URL}/subcontractor/accept-invitation?token=${invitationToken}`;

    const specialtiesList = specialties.length > 0
      ? specialties.map(s => `<li>${s}</li>`).join('')
      : '<li>Toutes spécialités</li>';

    const body = `
      <h2>Invitation à devenir sous-traitant</h2>
      <p>Bonjour ${subcontractorName},</p>
      <p><span class="highlight">${artisanName}</span> de <span class="highlight">${artisanCompany}</span> souhaite vous ajouter comme sous-traitant sur Krafolt.</p>

      <div class="success">
        <p><strong>Détails de la collaboration :</strong></p>
        <p>Artisan : <span class="highlight">${artisanName}</span></p>
        <p>Entreprise : <span class="highlight">${artisanCompany}</span></p>
      </div>

      <p><strong>Spécialités recherchées :</strong></p>
      <ul>
        ${specialtiesList}
      </ul>

      <p><strong>Avantages de devenir sous-traitant :</strong></p>
      <ul>
        <li>Recevez des missions régulières</li>
        <li>Paiements sécurisés via la plateforme</li>
        <li>Développez votre réseau professionnel</li>
        <li>Gérez facilement vos collaborations</li>
      </ul>

      <a href="${invitationLink}" class="button">Accepter l'invitation</a>

      <div class="info-box">
        <p><strong>Cette invitation expire dans 14 jours.</strong></p>
        <p>Si vous ne connaissez pas ${artisanName}, ignorez cet email.</p>
      </div>

      <p>Vous pouvez discuter des conditions de collaboration directement avec ${artisanName} avant d'accepter.</p>
    `;

    return {
      subject: `${artisanName} vous invite comme sous-traitant`,
      html: this.wrapTemplate('Invitation sous-traitant', body),
      text: `Bonjour ${subcontractorName}, ${artisanName} de ${artisanCompany} souhaite vous ajouter comme sous-traitant. Acceptez l'invitation ici : ${invitationLink}. Cette invitation expire dans 14 jours.`,
    };
  }

  companyEmployeeJoined(
    ownerName: string,
    companyName: string,
    employeeName: string,
    employeeRole: string,
  ): EmailTemplate {
    const roleLabels: Record<string, string> = {
      MANAGER: 'Manager',
      SUPERVISOR: 'Superviseur',
      TECHNICIAN: 'Technicien',
      CONTRACTOR: 'Sous-traitant',
    };

    const roleLabel = roleLabels[employeeRole] || employeeRole;

    const body = `
      <h2>Nouvel employé dans votre équipe</h2>
      <p>Bonjour ${ownerName},</p>
      <p>Bonne nouvelle ! <span class="highlight">${employeeName}</span> a accepté votre invitation et rejoint <span class="highlight">${companyName}</span>.</p>

      <div class="success">
        <p><strong>Nouveau membre de l'équipe :</strong></p>
        <p>Nom : <span class="highlight">${employeeName}</span></p>
        <p>Rôle : <span class="highlight">${roleLabel}</span></p>
        <p>Date d'arrivée : ${new Date().toLocaleDateString('fr-FR')}</p>
      </div>

      <p><strong>Prochaines étapes recommandées :</strong></p>
      <ul>
        <li>Assignez-lui sa première mission</li>
        <li>Configurez ses permissions si nécessaire</li>
        <li>Planifiez ses premiers shifts</li>
        <li>Présentez-le à l'équipe existante</li>
      </ul>

      <a href="${process.env.FRONTEND_URL}/artisan/company/employees" class="button">Gérer mon équipe</a>

      <p>Votre équipe s'agrandit, félicitations !</p>
    `;

    return {
      subject: `${employeeName} a rejoint ${companyName}`,
      html: this.wrapTemplate('Nouvel employé', body),
      text: `Bonjour ${ownerName}, ${employeeName} a accepté votre invitation et rejoint ${companyName} en tant que ${roleLabel}. Gérez votre équipe sur ${process.env.FRONTEND_URL}/artisan/company/employees`,
    };
  }

  companyMissionAssigned(
    employeeName: string,
    companyName: string,
    missionTitle: string,
    missionId: string,
    scheduledDate: string,
    clientName: string,
    address: string,
  ): EmailTemplate {
    const body = `
      <h2>Nouvelle mission assignée</h2>
      <p>Bonjour ${employeeName},</p>
      <p>Une nouvelle mission vous a été assignée par <span class="highlight">${companyName}</span>.</p>

      <div class="mission-details">
        <dl>
          <dt>Mission :</dt>
          <dd><strong>${missionTitle}</strong></dd>
          <dt>Client :</dt>
          <dd>${clientName}</dd>
          <dt>Date prévue :</dt>
          <dd><span class="highlight">${scheduledDate}</span></dd>
          <dt>Adresse :</dt>
          <dd>${address}</dd>
        </dl>
      </div>

      <div class="info-box">
        <p><strong>Action requise :</strong> Consultez les détails de la mission et confirmez votre disponibilité.</p>
      </div>

      <a href="${process.env.FRONTEND_URL}/artisan/missions/${missionId}" class="button">Voir la mission</a>

      <p>Préparez-vous bien et n'hésitez pas à contacter votre responsable si vous avez des questions.</p>
    `;

    return {
      subject: `Mission assignée : ${missionTitle}`,
      html: this.wrapTemplate('Mission assignée', body),
      text: `Bonjour ${employeeName}, une mission "${missionTitle}" vous a été assignée pour le ${scheduledDate}. Client : ${clientName}. Voir : ${process.env.FRONTEND_URL}/artisan/missions/${missionId}`,
    };
  }

  companyPayoutProcessed(
    employeeName: string,
    companyName: string,
    amount: number,
    period: string,
    missionsCount: number,
  ): EmailTemplate {
    const body = `
      <h2>Paiement traité</h2>
      <p>Bonjour ${employeeName},</p>
      <p>Votre paiement de <span class="highlight">${companyName}</span> a été traité avec succès.</p>

      <div class="success">
        <p><strong>Montant versé :</strong></p>
        <p class="price">${amount.toFixed(2)}€</p>
      </div>

      <div class="mission-details">
        <dl>
          <dt>Période :</dt>
          <dd>${period}</dd>
          <dt>Missions complétées :</dt>
          <dd><strong>${missionsCount}</strong></dd>
          <dt>Statut :</dt>
          <dd><span style="color: #28a745; font-weight: 600;">Versé</span></dd>
        </dl>
      </div>

      <div class="info-box">
        <p><strong>Le virement sera effectué sous 2-3 jours ouvrés sur votre compte bancaire.</strong></p>
      </div>

      <a href="${process.env.FRONTEND_URL}/artisan/earnings" class="button">Voir mes revenus</a>

      <p>Continuez votre excellent travail !</p>
    `;

    return {
      subject: `Paiement traité : ${amount.toFixed(2)}€`,
      html: this.wrapTemplate('Paiement traité', body),
      text: `Bonjour ${employeeName}, votre paiement de ${amount.toFixed(2)}€ de ${companyName} a été traité. Période : ${period}. Missions : ${missionsCount}. Le virement sera effectué sous 2-3 jours.`,
    };
  }

  companyShiftScheduled(
    employeeName: string,
    companyName: string,
    shiftDate: string,
    startTime: string,
    endTime: string,
    shiftType: string,
  ): EmailTemplate {
    const shiftTypeLabels: Record<string, string> = {
      REGULAR: 'Horaire normal',
      OVERTIME: 'Heures supplémentaires',
      ONCALL: 'Astreinte',
      BREAK: 'Pause',
    };

    const shiftLabel = shiftTypeLabels[shiftType] || shiftType;

    const body = `
      <h2>Nouveau shift planifié</h2>
      <p>Bonjour ${employeeName},</p>
      <p>Un nouveau shift a été planifié pour vous par <span class="highlight">${companyName}</span>.</p>

      <div class="mission-details">
        <dl>
          <dt>Date :</dt>
          <dd><strong>${shiftDate}</strong></dd>
          <dt>Horaires :</dt>
          <dd><span class="highlight">${startTime} - ${endTime}</span></dd>
          <dt>Type :</dt>
          <dd>${shiftLabel}</dd>
        </dl>
      </div>

      <div class="info-box">
        <p><strong>Pensez à confirmer votre disponibilité dans l'application.</strong></p>
      </div>

      <a href="${process.env.FRONTEND_URL}/artisan/availability/calendar" class="button">Voir mon planning</a>

      <p>En cas d'indisponibilité, contactez votre responsable au plus tôt.</p>
    `;

    return {
      subject: `Shift planifié : ${shiftDate} (${startTime} - ${endTime})`,
      html: this.wrapTemplate('Shift planifié', body),
      text: `Bonjour ${employeeName}, un shift a été planifié pour le ${shiftDate} de ${startTime} à ${endTime} (${shiftLabel}). Voir : ${process.env.FRONTEND_URL}/artisan/availability/calendar`,
    };
  }

  companyPerformanceReview(
    employeeName: string,
    companyName: string,
    reviewerName: string,
    overallRating: number,
    reviewPeriod: string,
  ): EmailTemplate {
    const clampedRating = Math.max(0, Math.min(5, Math.round(overallRating)));
    const stars = '★'.repeat(clampedRating) + '☆'.repeat(5 - clampedRating);

    const body = `
      <h2>Évaluation de performance disponible</h2>
      <p>Bonjour ${employeeName},</p>
      <p><span class="highlight">${reviewerName}</span> a soumis votre évaluation de performance pour <span class="highlight">${companyName}</span>.</p>

      <div class="success">
        <p><strong>Note globale :</strong></p>
        <p><span style="color: #ffc107; font-size: 24px;">${stars}</span></p>
        <p class="price">${overallRating.toFixed(1)}/5</p>
      </div>

      <div class="mission-details">
        <dl>
          <dt>Période évaluée :</dt>
          <dd>${reviewPeriod}</dd>
          <dt>Évaluateur :</dt>
          <dd>${reviewerName}</dd>
        </dl>
      </div>

      <div class="info-box">
        <p><strong>Action requise :</strong> Consultez votre évaluation complète et accusez réception.</p>
      </div>

      <a href="${process.env.FRONTEND_URL}/artisan/company/reviews" class="button">Voir mon évaluation</a>

      <p>Votre feedback est important pour continuer à progresser.</p>
    `;

    return {
      subject: `Évaluation de performance : ${overallRating.toFixed(1)}/5`,
      html: this.wrapTemplate('Évaluation de performance', body),
      text: `Bonjour ${employeeName}, ${reviewerName} a soumis votre évaluation de performance. Note : ${overallRating.toFixed(1)}/5. Période : ${reviewPeriod}. Voir : ${process.env.FRONTEND_URL}/artisan/company/reviews`,
    };
  }
}
