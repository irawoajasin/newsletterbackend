export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

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
        ListID: process.env.MJ_PENDING_LIST_ID,
        //ListID: process.env.MJ_LIST_ID,
      }),
    });

    const result = await listRes.json();

    if (!listRes.ok) {
      const errorMessage =
        result?.ErrorMessage || JSON.stringify(result);
    
      // If duplicate
      if (errorMessage.toLowerCase().includes("already")) {
        return res.status(200).json({
          message: "You're already subscribed!",
        });
      }
    
      return res.status(400).json({
        message: "There was an issue subscribing. Please try again.",
        details: result,
      });
    }

    return res.status(200).json({ message: "You're on the list, thank you for joining us!" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
}
