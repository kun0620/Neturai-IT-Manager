const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

app.post("/v1/messages", async (req, res) => {
  try {
    const anthropicReq = req.body;

    const glmRes = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer YOUR_GLM_API_KEY`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "glm-4",
        messages: anthropicReq.messages
      })
    });

    const data = await glmRes.json();

    res.json({
      id: "msg_glm",
      type: "message",
      role: "assistant",
      content: [
        {
          type: "text",
          text: data.choices?.[0]?.message?.content || ""
        }
      ]
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log("Proxy running at http://localhost:3000");
});