exports.handler = async () => {
  return {
    statusCode: 200,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      anonKey: process.env.SUPABASE_ANON_KEY
    })
  };
};
