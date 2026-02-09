import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing in .env. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const sampleUsers = [
  {
    email: 'john.doe@example.com',
    password: 'password123',
    full_name: 'John Doe',
    role: 'Employee',
    status: 'Active',
    phone: '111-222-3333',
  },
  {
    email: 'jane.smith@example.com',
    password: 'password123',
    full_name: 'Jane Smith',
    role: 'Manager',
    status: 'Active',
    phone: '444-555-6666',
  },
  {
    email: 'peter.jones@example.com',
    password: 'password123',
    full_name: 'Peter Jones',
    role: 'Employee',
    status: 'Inactive',
    phone: '777-888-9999',
  },
  {
    email: 'alice.brown@example.com',
    password: 'password123',
    full_name: 'Alice Brown',
    role: 'Admin',
    status: 'Active',
    phone: '000-111-2222',
  },
  {
    email: 'bob.white@example.com',
    password: 'password123',
    full_name: 'Bob White',
    role: 'Employee',
    status: 'Active',
    phone: '333-444-5555',
  },
];

async function seedProfiles() {
  console.log('Starting to seed sample profiles...');

  for (const user of sampleUsers) {
    try {
      // First, try to sign up the user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: {
            full_name: user.full_name,
          },
        },
      });

      let userId: string | undefined;

      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          console.log(`User ${user.email} already exists. Attempting to retrieve profile and update.`);
          // If user exists, try to get their profile by email
          const { data: existingProfile, error: getProfileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', user.email)
            .single();

          if (getProfileError) {
            console.error(`Error fetching existing profile for ${user.email}:`, getProfileError.message);
            continue;
          }
          userId = existingProfile?.id;
        } else {
          console.error(`Error signing up ${user.email}:`, signUpError.message);
          continue;
        }
      } else {
        userId = signUpData.user?.id;
      }

      if (userId) {
        // Update the profile with additional details
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            full_name: user.full_name,
            role: user.role,
            status: user.status,
            phone: user.phone,
            email: user.email, // Ensure email is also updated if it was null
          })
          .eq('id', userId);

        if (updateError) {
          console.error(`Error updating profile for ${user.email}:`, updateError.message);
        } else {
          console.log(`Successfully processed profile for: ${user.full_name} (${user.email})`);
        }
      } else {
        console.error(`Could not determine user ID for ${user.email}.`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`An unexpected error occurred for ${user.email}:`, message);
    }
  }
  console.log('Seeding process finished.');
}

seedProfiles();
