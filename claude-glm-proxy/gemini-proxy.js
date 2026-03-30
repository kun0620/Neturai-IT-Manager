const express = require("express");

const app = express();
app.use(express.json());

app.post("/v1/messages", async (req, res) => {
  try {
    const userMessage = req.body.messages?.[0]?.content || "";

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyB9wPe-i82JMKC-18riBpRA6j74J_lixBg",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: userMessage }]
            }
          ]
        })
      }
    );

    const data = await response.json();

    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";

    res.json({
      content: [
        {
          type: "text",
          text: text
        }
      ]
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log("Gemini proxy running on http://localhost:3000");
});