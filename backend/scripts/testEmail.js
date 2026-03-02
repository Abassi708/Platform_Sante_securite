// backend/scripts/testEmail.js
require('dotenv').config();
const { sendResetEmail } = require('../config/emailConfig');

async function testEmail() {
  console.log('📧 Test d\'envoi d\'email...');
  
  // Remplacez par votre email pour tester
  const result = await sendResetEmail(
    'kawthrr121@gmail.com',  // Votre email
    'Admin',
    'Test123456',
    'Test de configuration'
  );
  
  if (result.success) {
    console.log('✅ Email de test envoyé!');
  } else {
    console.log('❌ Échec:', result.error);
  }
}

testEmail();