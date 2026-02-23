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

    // 1️⃣ Create contact
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

    // 2️⃣ Add to list
    const listRes = await fetch(
      "https://api.mailjet.com/v3/REST/listrecipient",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          ContactAlt: email,
          ListID: process.env.MJ_LIST_ID,
        }),
      }
    );

    const result = await listRes.json();

    if (!listRes.ok) {
      const errorMessage =
        result?.ErrorMessage || JSON.stringify(result);

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

    // 3️⃣ Send Welcome Email (NEW PART)
    await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        Messages: [
          {
            From: {
              Email: "info@sojourners4justice.press",
              Name: "SJP",
            },
            To: [
              {
                Email: email,
                Name: name,
              },
            ],
            TemplateID: 7776244, // 🔥 replace if needed
            TemplateLanguage: true,
            Subject: "Sojourners for Justice Press Newsletter",
            Variables: {
              name: name || "Reader",
            },
          },
        ],
      }),
    });

    return res
      .status(200)
      .json({ message: "You're on the list, thank you for joining us!" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
}
