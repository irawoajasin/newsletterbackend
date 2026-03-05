// MEMBERSHIP AUTOMATION

const tierLists = {
  "I Am But One": process.env.MJ_I_AM_BUT_ONE_ID,
  "Shadow Siblings": process.env.MJ_SHADOW_SIBLINGS_ID,
  "Author Amplifier": process.env.MJ_AUTHOR_AMPLIFIER_ID,
  "Reading Redefiner": process.env.MJ_READING_REDEFINER_ID,
  "Co-Conspirator": process.env.MJ_CO_CONSPIRATOR_ID
};

async function mailjetFetch(url, method, body) {

  const auth = Buffer.from(
    `${process.env.MJ_APIKEY_PUBLIC}:${process.env.MJ_APIKEY_PRIVATE}`
  ).toString("base64");

  return fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`
    },
    body: body ? JSON.stringify(body) : undefined
  });
}

export default async function handler(req, res) {

  // allow GET for testing the endpoint
  if (req.method === "GET") {
    return res.status(200).json({ message: "Ko-fi webhook endpoint active" });
  }
  
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {

    // Ko-fi sends payload as data=JSON_STRING
    const payload = req.body?.data
      ? JSON.parse(req.body.data)
      : req.body;
    console.log("Webhook payload:", payload);

    const email = payload.email;
    const name = payload.from_name || "Member";
    const tier = payload.tier_name;
    const status = payload.subscription_status;

    if (!email || !tier) {
      return res.status(200).json({ message: "Ignored event" });
    }

    const listId = tierLists[tier];

    if (!listId) {
      return res.status(200).json({ message: "Tier not mapped" });
    }

    // make sure that the contact actually exists
    await mailjetFetch(
      "https://api.mailjet.com/v3/REST/contact",
      "POST",
      {
        Email: email,
        Name: name,
        IsExcludedFromCampaigns: false
      }
    );

    // handle the active subscription
    if (status === "Active") {

      await mailjetFetch(
        "https://api.mailjet.com/v3/REST/listrecipient",
        "POST",
        {
          ContactAlt: email,
          ListID: listId
        }
      );

    }

    // cancelations
    if (status === "Cancelled") {

      await mailjetFetch(
        `https://api.mailjet.com/v3/REST/listrecipient/${listId}/${email}`,
        "DELETE"
      );

    }

    return res.status(200).json({ success: true });

  } catch (error) {

    console.error("Ko-fi webhook error:", error);

    return res.status(500).json({
      error: error.message
    });

  }
}
