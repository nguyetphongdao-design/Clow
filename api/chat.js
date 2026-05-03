export default async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + apiKey,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: req.body.message }]
          }
        ]
      })
    }
  );

  const data = await response.json();

  res.status(200).json({
    text: data?.candidates?.[0]?.content?.parts?.[0]?.text || "Không có phản hồi"
  });
}