const { supabase } = require("../services/supabase");

async function getClients(req, res) {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("name");

  if (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message,
    });
  }

  res.json(data);
}

module.exports = {
  getClients,
};