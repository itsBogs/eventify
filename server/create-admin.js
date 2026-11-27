import 'dotenv/config';
import bcrypt from 'bcryptjs';
import connectDB from './config/db.js';
import User from './models/User.js';

const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || '';
const name = String(process.env.ADMIN_NAME || '').trim();

if (!email || !password || !name) {
  console.error('Set ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_NAME in server/.env first.');
  process.exit(1);
}
if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 12) {
  console.error('ADMIN_EMAIL must be valid and ADMIN_PASSWORD must be at least 12 characters.');
  process.exit(1);
}

try {
  await connectDB();
  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await User.findOneAndUpdate(
    { email },
    { $set: { name, email, password: passwordHash, role: 'admin' } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  console.log(`Super admin ready: ${admin.email}`);
} catch (error) {
  console.error('Could not create super admin:', error.message);
  process.exitCode = 1;
} finally {
  await User.db?.close().catch(() => {});
}
