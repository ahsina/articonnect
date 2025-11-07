export const getEmailLayout = (content: string): string => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .header {
      background-color: #2563eb;
      color: #ffffff;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
      color: #374151;
      line-height: 1.6;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #1d4ed8;
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px 30px;
      text-align: center;
      font-size: 14px;
      color: #6b7280;
    }
    .divider {
      height: 1px;
      background-color: #e5e7eb;
      margin: 30px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ArtiConnect</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ArtiConnect. Tous droits réservés.</p>
      <p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="color: #2563eb; text-decoration: none;">Visitez notre site web</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

export const getResetPasswordTemplate = (userName: string, resetUrl: string): string => {
  const content = `
    <p>Bonjour ${userName},</p>
    <p>Vous avez demandé la réinitialisation de votre mot de passe ArtiConnect.</p>
    <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
    <div style="text-align: center;">
      <a href="${resetUrl}" class="button">Réinitialiser mon mot de passe</a>
    </div>
    <p style="color: #6b7280; font-size: 14px;">
      Ce lien est valable pendant 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
    </p>
    <div class="divider"></div>
    <p style="font-size: 12px; color: #9ca3af;">
      Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
      <a href="${resetUrl}" style="color: #2563eb;">${resetUrl}</a>
    </p>
  `;

  return getEmailLayout(content);
};

export const getWelcomeEmailTemplate = (userName: string): string => {
  const content = `
    <p>Bonjour ${userName},</p>
    <p>Bienvenue sur <strong>ArtiConnect</strong> ! 🎉</p>
    <p>Nous sommes ravis de vous compter parmi nous. ArtiConnect est la plateforme qui connecte les clients avec les meilleurs artisans de votre région.</p>

    <h3 style="color: #1f2937; margin-top: 30px;">Que pouvez-vous faire ?</h3>
    <ul style="line-height: 1.8;">
      <li>Publier vos demandes de mission</li>
      <li>Trouver des artisans qualifiés près de chez vous</li>
      <li>Gérer vos projets en toute sécurité</li>
      <li>Payer en ligne en toute confiance</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/client/dashboard" class="button">Accéder à mon tableau de bord</a>
    </div>

    <p>Besoin d'aide ? Notre équipe est là pour vous accompagner.</p>
    <p>À bientôt sur ArtiConnect !</p>
  `;

  return getEmailLayout(content);
};

export const getEmailVerificationTemplate = (userName: string, verificationUrl: string): string => {
  const content = `
    <p>Bonjour ${userName},</p>
    <p>Merci de vous être inscrit sur ArtiConnect !</p>
    <p>Pour activer votre compte, veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous :</p>

    <div style="text-align: center;">
      <a href="${verificationUrl}" class="button">Vérifier mon email</a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">
      Ce lien est valable pendant 24 heures. Si vous n'avez pas créé de compte ArtiConnect, ignorez cet email.
    </p>

    <div class="divider"></div>
    <p style="font-size: 12px; color: #9ca3af;">
      Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
      <a href="${verificationUrl}" style="color: #2563eb;">${verificationUrl}</a>
    </p>
  `;

  return getEmailLayout(content);
};

export const getMissionNotificationTemplate = (
  userName: string,
  missionTitle: string,
  missionUrl: string,
): string => {
  const content = `
    <p>Bonjour ${userName},</p>
    <p>Une nouvelle mission correspond à vos compétences !</p>

    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0;">
      <h3 style="margin: 0 0 10px 0; color: #1f2937;">${missionTitle}</h3>
      <p style="margin: 0; color: #6b7280;">Consultez les détails pour envoyer votre proposition.</p>
    </div>

    <div style="text-align: center;">
      <a href="${missionUrl}" class="button">Voir la mission</a>
    </div>

    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
      Réagissez vite ! Les meilleures missions sont attribuées rapidement.
    </p>
  `;

  return getEmailLayout(content);
};
