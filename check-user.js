import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

async function checkAndCreateTestUser() {
  try {
    // Connect to the local MongoDB (default for the server)
    const mongoUri = 'mongodb://localhost:27017/callcenter';
    console.log('Connecting to:', mongoUri);

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const UserSchema = new mongoose.Schema({
      username: { type: String, required: true, unique: true },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      role: { type: String, default: 'agent' },
      createdAt: { type: Date, default: Date.now },
    });

    const User = mongoose.model('CallCenterUser', UserSchema);

    // Check if test user already exists
    const existingUser = await User.findOne({ email: 'test@example.com' });
    if (existingUser) {
      console.log('✅ Test user already exists');
      console.log('Email: test@example.com');

      // Verify password
      const isValid = await bcrypt.compare('test123', existingUser.password);
      console.log('Password valid:', isValid);

      if (!isValid) {
        console.log('🔄 Password incorrect, updating...');
        const hashedPassword = await bcrypt.hash('test123', 10);
        existingUser.password = hashedPassword;
        await existingUser.save();
        console.log('✅ Password updated');
      }
    } else {
      console.log('❌ Test user not found, creating...');
      const hashedPassword = await bcrypt.hash('test123', 10);
      const testUser = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: hashedPassword,
        role: 'agent'
      });

      await testUser.save();
      console.log('✅ Test user created successfully');
      console.log('Email: test@example.com');
      console.log('Password: test123');
    }

    // List all users
    const allUsers = await User.find({}, 'username email role createdAt');
    console.log('\n📋 All users in database:');
    allUsers.forEach(user => {
      console.log(`  - ${user.username} (${user.email}) - ${user.role} - ${user.createdAt}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

checkAndCreateTestUser();