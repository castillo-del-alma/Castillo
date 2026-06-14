const { supabase } = require('./supabase-client');

exports.handler = async (event) => {
  const { email } = JSON.parse(event.body);

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
