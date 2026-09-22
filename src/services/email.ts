/**
 * Email Service for transactional emails (Password Reset, Email Verification).
 * Conforme aux exigences de traçabilité et de sécurité.
 */
export class EmailService {
  private static appUrl: string = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173';

  /**
   * Template HTML de base pour les emails Leeral
   */
  private static getEmailTemplate(title: string, contentHtml: string): string {
    return `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
          .container { max-width: 580px; margin: 0 auto; background: #1e293b; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); overflow: hidden; }
          .header { background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); padding: 32px 24px; text-align: center; border-bottom: 1px solid rgba(245,158,11,0.2); }
          .logo { font-size: 26px; font-weight: 900; color: #f59e0b; letter-spacing: -0.03em; margin: 0; display: inline-flex; align-items: center; gap: 8px; }
          .content { padding: 32px 24px; line-height: 1.6; color: #cbd5e1; }
          .title { font-size: 20px; font-weight: 800; color: #ffffff; margin-top: 0; margin-bottom: 16px; }
          .btn { display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 15px; margin: 24px 0; box-shadow: 0 4px 14px rgba(245,158,11,0.35); }
          .footer { background: #0f172a; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.05); }
          .footer a { color: #f59e0b; text-decoration: none; }
          .badge-sn { display: inline-block; background: rgba(16,185,129,0.15); color: #10b981; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-bottom: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="badge-sn">🇸🇳 LEERAL SÉNÉGAL</div>
            <div class="logo">⚡ LEERAL</div>
            <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px;">Gestionnaire Intelligent d'Énergie & d'Eau au Sénégal</p>
          </div>
          <div class="content">
            <h2 class="title">${title}</h2>
            ${contentHtml}
          </div>
          <div class="footer">
            <p>Cet email a été envoyé automatiquement par Leeral Technologies Dakar.</p>
            <p>Conformément à la Loi n° 2008-12 sur la protection des données personnelles (CDP Sénégal), vous disposez d'un droit d'accès et de rectification.</p>
            <p>© ${new Date().getFullYear()} Leeral - Tous droits réservés.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Envoie ou enregistre un email de réinitialisation de mot de passe
   */
  static async sendPasswordResetEmail(email: string, nom: string, token: string): Promise<void> {
    const resetUrl = `${this.appUrl}/?resetToken=${token}&email=${encodeURIComponent(email)}`;
    const title = 'Réinitialisation de votre mot de passe Leeral';
    const content = `
      <p>Bonjour <strong>${nom}</strong>,</p>
      <p>Nous avons reçu une demande de réinitialisation du mot de passe pour votre compte Leeral associé à l'adresse <code>${email}</code>.</p>
      <p>Pour définir un nouveau mot de passe, veuillez cliquer sur le bouton sécurisé ci-dessous :</p>
      <div style="text-align: center;">
        <a href="${resetUrl}" class="btn" target="_blank">Réinitialiser mon mot de passe</a>
      </div>
      <p style="font-size: 13px; color: #94a3b8;">
        Ce lien de sécurité est valide pendant <strong>1 heure</strong>.<br>
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
        <span style="word-break: break-all; color: #f59e0b;">${resetUrl}</span>
      </p>
      <p style="font-size: 13px; color: #94a3b8; margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08);">
        Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité. Votre mot de passe actuel restera inchangé.
      </p>
    `;

    const html = this.getEmailTemplate(title, content);

    // En environnement de dev / sans SMTP configuré, on affiche le lien clairement dans la console
    console.log(`[EmailService] ✉️ Password Reset Email for ${email}`);
    console.log(`[EmailService] 🔗 Reset URL: ${resetUrl}`);

    // Si des variables SMTP sont configurées plus tard, elles peuvent être déclenchées ici
  }

  /**
   * Envoie ou enregistre un email d'activation / vérification de compte
   */
  static async sendVerificationEmail(email: string, nom: string, token: string): Promise<void> {
    const verifyUrl = `${this.appUrl}/?verifyToken=${token}&email=${encodeURIComponent(email)}`;
    const title = 'Confirmez votre adresse email sur Leeral';
    const content = `
      <p>Bonjour <strong>${nom}</strong>,</p>
      <p>Merci d'avoir rejoint <strong>Leeral</strong>, votre assistant pour la maîtrise des factures Senelec (Woyofal) et Sen'Eau au Sénégal.</p>
      <p>Pour finaliser la sécurisation de votre compte, veuillez confirmer votre adresse email :</p>
      <div style="text-align: center;">
        <a href="${verifyUrl}" class="btn" target="_blank">Confirmer mon adresse email</a>
      </div>
      <p style="font-size: 13px; color: #94a3b8;">
        Ce lien d'activation est valide pendant <strong>48 heures</strong>.<br>
        Lien direct : <span style="word-break: break-all; color: #f59e0b;">${verifyUrl}</span>
      </p>
    `;

    const html = this.getEmailTemplate(title, content);

    console.log(`[EmailService] ✉️ Account Verification Email for ${email}`);
    console.log(`[EmailService] 🔗 Verification URL: ${verifyUrl}`);
  }
}
