export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const auth = Buffer.from(
      `${process.env.MJ_APIKEY_PUBLIC}:${process.env.MJ_APIKEY_PRIVATE}`
    ).toString("base64");

    // create a new contact
    await fetch("https://api.mailjet.com/v3/REST/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        Email: email,
        Name: name,
        IsExcludedFromCampaigns: false,
      }),
    });

    // add to the list
    const listRes = await fetch("https://api.mailjet.com/v3/REST/listrecipient", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        ContactAlt: email,
        ListID: process.env.MJ_LIST_ID,
      }),
    });

    const result = await listRes.json();

    if (!listRes.ok) {
      return res.status(400).json({
        message: "Mailjet error",
        details: result,
      });
    }

    return res.status(200).json({ message: "Success" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
}
