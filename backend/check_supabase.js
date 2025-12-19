const { supabase, testConnection } = require('./db/supabase');
const matchRepository = require('./db/matchRepository');

(async () => {
  try {
    const ok = await testConnection();
    console.log('testConnection:', ok);

    // try count matches if repository available
    if (matchRepository) {
      const matches = await matchRepository.getMatches({ limit: 1, offset: 0 });
      console.log('sample matches count retrieved:', (matches || []).length);
    }
  } catch (err) {
    console.error('Error in check:', err.message);
  } finally {
    process.exit(0);
  }
})();