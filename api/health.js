export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    status: 'ok',
    model: process.env.GEMINI_MODEL || 'gemini-flash-latest',
    timestamp: new Date().toISOString(),
  });
}
