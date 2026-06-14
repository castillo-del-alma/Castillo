exports.handler = async () => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      anonKey: process.env.SUPABASE_ANON_KEY
    })
  };
};
