app.post("/subscribe", async (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: "Missing fields" });
  }

  try {
    const LIST_ID = process.env.MJ_LIST_ID;

    const response = await fetch(
      `https://api.mailjet.com/v3.1/contactslist/${LIST_ID}/managecontact`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.MJ_APIKEY_PUBLIC}:${process.env.MJ_APIKEY_PRIVATE}`
            ).toString("base64"),
        },
        body: JSON.stringify({
          Contacts: [
            {
              Email: email,
              Name: name
            }
          ],
          Action: "addnoforce" 
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return res.status(400).json({
        message: "Mailjet error",
        details: result,
      });
    }

    return res.status(200).json({ message: "Success" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});
