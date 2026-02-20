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

    const mailjetRes = await fetch(
      `https://api.mailjet.com/v3.1/contactslist/${process.env.MJ_LIST_ID}/managecontact`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          Contacts: [
            {
              Email: email,
              Name: name,
            },
          ],
          Action: "addnoforce",
        }),
      }
    );

    const result = await mailjetRes.json();

    if (!mailjetRes.ok) {
      return res.status(400).json({
        message: "Mailjet error",
        details: result,
      });
    }

    return res.status(200).json({ message: "Success" });

  } catch (error) {
    console.error("SERVER ERROR:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
}
