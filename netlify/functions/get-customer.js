const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const { email } = JSON.parse(event.body);

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
  );

  const { data, error } = await supabase
    .from('customers')
    .select('*, bookings(*, payments(*), charges(*))')
    .eq('email', email)
    .single();

  if (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(data)
  };
};
