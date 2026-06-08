async function readJsonSafe(response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

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
    const { name, email } = req.body || {};

    if (!name || !email) {
      return res.status(400).json({ message: "Missing name or email" });
    }

    if (
      !process.env.MJ_APIKEY_PUBLIC ||
      !process.env.MJ_APIKEY_PRIVATE ||
      !process.env.MJ_LIST_ID
    ) {
      return res.status(500).json({
        message: "Missing Mailjet environment variables",
      });
    }

    const auth = Buffer.from(
      `${process.env.MJ_APIKEY_PUBLIC}:${process.env.MJ_APIKEY_PRIVATE}`
    ).toString("base64");

    // Create or update contact
    const contactRes = await fetch("https://api.mailjet.com/v3/REST/contact", {
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

    const contactResult = await readJsonSafe(contactRes);

    if (!contactRes.ok) {
      const errorMessage =
        contactResult?.ErrorMessage || JSON.stringify(contactResult);

      if (!errorMessage.toLowerCase().includes("already")) {
        return res.status(400).json({
          message: "Could not create Mailjet contact",
          details: contactResult,
        });
      }
    }

    // Add contact to newsletter list
    const listRes = await fetch("https://api.mailjet.com/v3/REST/listrecipient", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        ContactAlt: email,
        ListID: Number(process.env.MJ_LIST_ID),
      }),
    });

    const listResult = await readJsonSafe(listRes);

    if (!listRes.ok) {
      const errorMessage =
        listResult?.ErrorMessage || JSON.stringify(listResult);

      if (errorMessage.toLowerCase().includes("already")) {
        return res.status(200).json({
          message: "You're already subscribed!",
        });
      }

      return res.status(400).json({
        message: "Could not add contact to newsletter list",
        details: listResult,
      });
    }

    // Send welcome email
    const sendRes = await fetch("https://api.mailjet.com/v3.1/send", {
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
            TemplateID: 7776244,
            TemplateLanguage: true,
            Subject: "Sojourners for Justice Press Newsletter",
            Variables: {
              name: name || "Reader",
            },
          },
        ],
      }),
    });

    const sendResult = await readJsonSafe(sendRes);

    if (!sendRes.ok) {
      return res.status(200).json({
        message:
          "You're subscribed, but there was an issue sending the welcome email.",
        details: sendResult,
      });
    }

    return res.status(200).json({
      message: "You're on the list, thank you for joining us!",
    });
  } catch (error) {
    console.error("Server error:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
}
