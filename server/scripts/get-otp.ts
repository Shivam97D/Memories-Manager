import mongoose from 'mongoose';
import 'dotenv/config';

const email = process.argv[2] || 'shivam1771dahifale@gmail.com';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection.db!;
  const user = await db.collection('users').findOne({ email });
  if (!user) { console.log('USER_NOT_FOUND'); process.exit(1); }
  console.log(user.otp || 'NO_OTP');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(() => { console.log('ERROR'); process.exit(1); });
