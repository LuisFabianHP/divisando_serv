const mailgun = require('mailgun.js');
const FormData = require('form-data');

// Inicializar helper de Mailgun
const mg = new mailgun(FormData);

// Flag para saber si Mailgun está configurado
let mailgunConfigured = false;
let client = null;
let lastConfigKey = null;
let warnedMissingConfig = false;

const isSandboxDomain = (domain) => /^sandbox[\w-]*\./i.test(domain);

const resolveFromAddress = (domain) => {
    const explicitFrom = getEnvValue('MAIL_FROM_EMAIL');
    if (explicitFrom) {
        return explicitFrom;
    }

    // Mailgun sandbox domains usually require postmaster@<domain> as sender.
    if (isSandboxDomain(domain)) {
        return `postmaster@${domain}`;
    }

    return `noreply@${domain}`;
};

const getEnvValue = (name) => {
    const raw = process.env[name];
    if (typeof raw !== 'string') {
        return '';
    }
    const trimmed = raw.trim();
    return trimmed.replace(/^['"]|['"]$/g, '');
};

const resolveMailgunConfig = () => {
    const apiKey = getEnvValue('MAILGUN_API_KEY') || getEnvValue('MAILGUN_KEY');
    const domain = getEnvValue('MAILGUN_DOMAIN');
    const configuredBaseUrl = getEnvValue('MAILGUN_BASE_URL') || getEnvValue('MAILGUN_API_BASE_URL');
    const region = getEnvValue('MAILGUN_REGION').toLowerCase();
    const baseUrl = configuredBaseUrl || (region === 'eu' ? 'https://api.eu.mailgun.net' : '');

    return { apiKey, domain, baseUrl };
};

const ensureMailgunClient = () => {
    const { apiKey, domain, baseUrl } = resolveMailgunConfig();
    const configKey = `${apiKey}::${domain}::${baseUrl}`;

    if (!apiKey || !domain) {
        mailgunConfigured = false;
        client = null;
        lastConfigKey = null;

        if (!warnedMissingConfig) {
            console.warn('⚠️  MAILGUN_API_KEY/MAILGUN_DOMAIN no configurados. Emails se loguearán en consola.');
            warnedMissingConfig = true;
        }

        return { configured: false, domain: '' };
    }

    if (client && mailgunConfigured && lastConfigKey === configKey) {
        return { configured: true, domain, fromAddress: resolveFromAddress(domain) };
    }

    try {
        const clientConfig = {
            username: 'api',
            key: apiKey
        };

        if (baseUrl) {
            clientConfig.url = baseUrl;
        }

        client = mg.client(clientConfig);
        mailgunConfigured = true;
        lastConfigKey = configKey;
        warnedMissingConfig = false;
        console.log(`✅ Mailgun configurado correctamente (${domain}${baseUrl ? ` | ${baseUrl}` : ''})`);
        return { configured: true, domain, fromAddress: resolveFromAddress(domain) };
    } catch (err) {
        mailgunConfigured = false;
        client = null;
        lastConfigKey = null;
        console.warn('⚠️  Mailgun no disponible:', err.message);
        return { configured: false, domain: '' };
    }
};

/**
 * Envía un correo con el código de verificación.
 * @param {string} email - Correo del usuario.
 * @param {string} code - Código de verificación.
 */
const sendVerificationEmail = async (email, code) => {
    try {
        const mailgunState = ensureMailgunClient();

        // Si Mailgun no está configurado, loguear en consola
        if (!mailgunState.configured) {
            console.log(`📧 [MODO DEMO] Código de verificación para ${email}: ${code} (Expira en 5 minutos)`);
            return;
        }

        const mailOptions = {
            from: `"Divisando" <${mailgunState.fromAddress}>`,
            to: email,
            subject: 'Código de Verificación',
            text: `Tu código de verificación es: ${code}. Expira en 5 minutos.`,
            html: `<p>Tu código de verificación es: <strong>${code}</strong></p><p>Expira en 5 minutos.</p>`
        };

        await client.messages.create(mailgunState.domain, mailOptions);
        console.log(`📧 Código de verificación enviado a ${email}`);
    } catch (error) {
        const providerStatus = error?.status || error?.statusCode || null;
        const providerMessage = error?.details || error?.message || 'Unknown provider error';

        console.error(`❌ Error al enviar correo: ${providerMessage}`);
        if (providerStatus === 401 || providerStatus === 403) {
            const { domain } = resolveMailgunConfig();
            const sandboxHint = isSandboxDomain(domain)
                ? 'Revisa que el destinatario esté autorizado en Mailgun Sandbox y/o configura MAIL_FROM_EMAIL.'
                : 'Revisa MAILGUN_API_KEY, MAILGUN_DOMAIN y MAILGUN_REGION/MAILGUN_BASE_URL.';

            console.error(`⚠️  Mailgun rechazó la solicitud (${providerStatus}). ${sandboxHint}`);
        }

        const mailError = new Error('Error al enviar el correo de verificación.');
        mailError.name = 'MailDeliveryError';
        mailError.status = 503;
        mailError.statusCode = 503;
        mailError.userMessage = 'No se pudo enviar el correo de verificación. Intenta nuevamente más tarde.';
        mailError.providerStatus = providerStatus;
        mailError.providerMessage = providerMessage;
        throw mailError;
    }
};

/**
 * Envía un correo de confirmación cuando se restablece la contraseña.
 * @param {string} email - Correo del usuario.
 * @param {string} username - Nombre de usuario.
 */
const sendPasswordChangedEmail = async (email, username) => {
    try {
        const mailgunState = ensureMailgunClient();

        // Si Mailgun no está configurado, loguear en consola
        if (!mailgunState.configured) {
            console.log(`📧 [MODO DEMO] Notificación de cambio de contraseña enviada a ${email}`);
            return;
        }

        const mailOptions = {
            from: `"Divisando" <${mailgunState.fromAddress}>`,
            to: email,
            subject: '🔐 Contraseña Restablecida Exitosamente',
            text: `Hola ${username},\n\nTu contraseña ha sido restablecida exitosamente.\n\nSi no realizaste este cambio, contacta inmediatamente a soporte.\n\nSaludos,\nEquipo Divisando`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2c3e50;">🔐 Contraseña Restablecida</h2>
                    <p>Hola <strong>${username}</strong>,</p>
                    <p>Tu contraseña ha sido <strong>restablecida exitosamente</strong>.</p>
                    <p>Ahora puedes iniciar sesión con tu nueva contraseña.</p>
                    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>⚠️ Aviso de Seguridad:</strong></p>
                        <p style="margin: 5px 0 0 0;">Si no realizaste este cambio, contacta inmediatamente a nuestro equipo de soporte.</p>
                    </div>
                    <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">
                        Este es un mensaje automático. No respondas a este correo.
                    </p>
                    <p style="color: #7f8c8d; font-size: 12px;">
                        Saludos,<br>
                        <strong>Equipo Divisando</strong>
                    </p>
                </div>
            `
        };

        await client.messages.create(mailgunState.domain, mailOptions);
        console.log(`📧 Confirmación de cambio de contraseña enviada a ${email}`);
    } catch (error) {
        console.error(`❌ Error al enviar correo de confirmación: ${error.message}`);
        // No lanzamos error para no bloquear el flujo de resetPassword
    }
};

module.exports = { sendVerificationEmail, sendPasswordChangedEmail };
