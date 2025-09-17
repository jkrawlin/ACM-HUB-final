const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

// Configure Nodemailer transporter
const transporter = nodemailer.createTransporter({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: functions.config().email.smtp_user,
        pass: functions.config().email.smtp_pass
    }
});

// Trigger on new sale creation
exports.onNewSale = functions.firestore
    .document('sales/{saleId}')
    .onCreate(async (snap, context) => {
        const sale = snap.data();
        const db = admin.firestore();

        if (!sale.referral || !sale.amount) return null;  // No referral or invalid sale

        // Parse amount (e.g., "QR 320" -> 320)
        const amountNum = parseFloat(sale.amount.replace('QR ', '').replace(',', ''));

        if (isNaN(amountNum) || amountNum <= 0) return null;

        // Find referrer customer by affiliate code
        const referrerSnapshot = await db.collection('customers')
            .where('affiliateCode', '==', sale.referral)
            .limit(1)
            .get();

        if (referrerSnapshot.empty) {
            console.log('No referrer found for code:', sale.referral);
            return null;
        }

        const referrer = referrerSnapshot.docs[0].data();
        const referrerId = referrerSnapshot.docs[0].id;
        const commissionRate = 0.03;  // 3% from your code
        const commissionAmount = amountNum * commissionRate;

        // Update referrer's balance
        await db.collection('customers').doc(referrerId).update({
            accountBalance: admin.firestore.FieldValue.increment(commissionAmount),
            lastCommissionEarned: commissionAmount,
            lastCommissionDate: admin.firestore.FieldValue.serverTimestamp()
        });

        // Send email
        const mailOptions = {
            from: `"ACM HUB" <${functions.config().email.smtp_user}>`,  // Your Gmail
            to: referrer.email,
            subject: `Commission Earned: QR ${commissionAmount.toFixed(2)} from Referral!`,
            html: `
                <h2>Great News, ${referrer.name}!</h2>
                <p>You earned <strong>QR ${commissionAmount.toFixed(2)}</strong> commission (3% of QR ${amountNum.toFixed(2)}) from a referral sale using your code <strong>${sale.referral}</strong>.</p>
                <p><strong>Sale Details:</strong><br>
                - Date: ${sale.date}<br>
                - Invoice: ${sale.invoice}<br>
                - Customer: ${sale.customer}<br>
                - Services: ${sale.services}</p>
                <p>Your new account balance: <strong>QR ${(referrer.accountBalance + commissionAmount).toFixed(2)}</strong></p>
                <p>Thank you for referring customers to ACM HUB!<br>
                <a href="https://your-app-url.com">Log in to view balance</a></p>
                <hr>
                <small>This is an automated message. Reply to contact support.</small>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log('Email sent to:', referrer.email);
        } catch (emailError) {
            console.error('Email send failed:', emailError);
            // Optionally, log to Firestore for retry
        }

        return null;
    });
