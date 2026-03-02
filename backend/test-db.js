// backend/test-db.js
const sequelize = require('./config/database');
const User = require('./models/User');

async function test() {
  try {
    console.log('🔄 Test de connexion...');
    await sequelize.authenticate();
    console.log('✅ Connexion DB OK');
    
    const users = await User.findAll();
    console.log(`✅ ${users.length} utilisateurs trouvés`);
    
    const user = await User.findOne({ where: { Login: 'kawther@gmail.com' } });
    if (user) {
      console.log('✅ Utilisateur trouvé:', {
        id: user.Id_utilisateur,
        email: user.Login,
        role: user.Role
      });
    } else {
      console.log('❌ Utilisateur NON trouvé');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

test();