const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.MAILGUN_SMTP_HOST,
    port: process.env.MAILGUN_SMTP_PORT,
    auth: {
        user: process.env.MAILGUN_SMTP_USER,
        pass: process.env.MAILGUN_SMTP_PASS
    }
});

/**
 * Envía un correo con el código de verificación.
 * @param {string} email - Correo del usuario.
 * @param {string} code - Código de verificación.
 */
const sendVerificationEmail = async (email, code) => {
    try {
        const mailOptions = {
            from: `"Divisando" <${process.env.MAILGUN_SMTP_USER}>`,
            to: email,
            subject: 'Código de Verificación',
            text: `Tu código de verificación es: ${code}. Expira en 5 minutos.`,
            html: `<p>Tu código de verificación es: <strong>${code}</strong></p><p>Expira en 5 minutos.</p>`
        };

        await transporter.sendMail(mailOptions);
        console.log(`📧 Código de verificación enviado a ${email}`);
    } catch (error) {
        console.error(`❌ Error al enviar correo: ${error.message}`);
        throw new Error('Error al enviar el correo de verificación.');
    }
};

module.exports = { sendVerificationEmail };
