require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting - förhindra spam
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuter
    max: 5, // Max 5 förfrågningar per IP per 15 min
    message: {
        success: false,
        message: 'För många förfrågningar. Försök igen om 15 minuter.'
    }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static('public'));

// Konfigurera email transporter med miljövariabler
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'mouazjamal05@gmail.com',
        pass: process.env.EMAIL_PASS || 'sdwm dyhw xyez jyud'
    }
});

// Serve HTML formulär
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Hantera formulär submission med rate limiting
app.post('/send-contact', limiter, async (req, res) => {
    try {
        const { customerEmail, phoneNumber, customerType, cleaningService, additionalInfo } = req.body;

        // Validering
        if (!customerEmail || !phoneNumber || !customerType || !cleaningService) {
            return res.status(400).json({
                success: false,
                message: 'Alla obligatoriska fält måste fyllas i'
            });
        }

        // Email validering
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customerEmail)) {
            return res.status(400).json({
                success: false,
                message: 'Ogiltig email-adress'
            });
        }

        // Skapa email innehåll
        const mailOptions = {
            from: process.env.EMAIL_USER || 'mouazjamal05@gmail.com',
            to: process.env.EMAIL_USER || 'mouazjamal05@gmail.com',
            subject: `Ny förfrågan från ${customerType === 'privat' ? 'privatkund' : 'företagskund'}`,
            html: `
                <h2>Ny kontaktförfrågan - Städtjänst</h2>
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <p><strong>Kund Information:</strong></p>
                    <ul>
                        <li><strong>Email:</strong> ${customerEmail}</li>
                        <li><strong>Telefonnummer:</strong> ${phoneNumber}</li>
                        <li><strong>Kundtyp:</strong> ${customerType === 'privat' ? 'Privatkund' : 'Företagskund'}</li>
                    </ul>
                    
                    <p><strong>Önskad städtjänst:</strong></p>
                    <p>${cleaningService}</p>
                    
                    ${additionalInfo ? `
                        <p><strong>Ytterligare information:</strong></p>
                        <p>${additionalInfo}</p>
                    ` : ''}
                    
                    <hr>
                    <p><em>Detta meddelande skickades från kontaktformuläret på din webbsida.</em></p>
                </div>
            `
        };

        // Skicka email
        await transporter.sendMail(mailOptions);

        res.json({
            success: true,
            message: 'Tack för din förfrågan! Vi kontaktar dig inom kort.'
        });

    } catch (error) {
        console.error('Fel vid email-sändning:', error);
        res.status(500).json({
            success: false,
            message: 'Något gick fel. Försök igen senare.'
        });
    }
});

// Starta servern
app.listen(PORT, () => {
    console.log(`Server körs på http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nStänger ner servern...');
    process.exit(0);
});