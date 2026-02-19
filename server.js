const express = require("express");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
app.use(express.json());

app.post("/subscribe", async (req, res) => {
    const { name, email } = req.body;

    if (!name || !email) {
        return res.status(400).json({ message: "Missing fields" });
    }

    try {
        const response = await fetch("https://api.mailjet.com/v3/REST/contact", {
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
                Email: email,
                Name: name,
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            return res.status(400).json({ message: "Mailjet error", details: err });
        }

        return res.status(200).json({ message: "Success" });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running"));
