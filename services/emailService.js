const mailgun = require('mailgun.js');
const FormData = require('form-data');

// Inicializar cliente de Mailgun con API Key
const mg = new mailgun(FormData);
const domain = process.env.MAILGUN_DOMAIN;
const client = mg.client({ 
    username: 'api', 
    key: process.env.MAILGUN_API_KEY 
});

/**
 * Envía un correo con el código de verificación.
 * @param {string} email - Correo del usuario.
 * @param {string} code - Código de verificación.
 */
const sendVerificationEmail = async (email, code) => {
    try {
        const mailOptions = {
            from: `"Divisando" <noreply@${domain}>`,
            to: email,
            subject: 'Código de Verificación',
            text: `Tu código de verificación es: ${code}. Expira en 5 minutos.`,
            html: `<p>Tu código de verificación es: <strong>${code}</strong></p><p>Expira en 5 minutos.</p>`
        };

        await client.messages.create(domain, mailOptions);
        console.log(`📧 Código de verificación enviado a ${email}`);
    } catch (error) {
        console.error(`❌ Error al enviar correo: ${error.message}`);
        throw new Error('Error al enviar el correo de verificación.');
    }
};

module.exports = { sendVerificationEmail };
