// pages/api/symptom-checker.js
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { symptoms, age, gender } = req.body;

    const prompt = `As a medical information assistant, provide general health information for these symptoms: ${symptoms}
    
Patient info: ${age} years old, ${gender}

IMPORTANT: This is for informational purposes only. Always recommend consulting with a healthcare professional for proper diagnosis and treatment.

Provide:
1. Possible common causes (2-3 most likely)
2. When to seek immediate medical attention
3. General self-care suggestions
4. Clear disclaimer about consulting healthcare providers

Keep response concise and helpful.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful medical information assistant. Always emphasize that your responses are for informational purposes only and not a substitute for professional medical advice."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const analysis = completion.choices[0].message.content;

    res.status(200).json({
      analysis,
      disclaimer: "This information is for educational purposes only. Always consult with a qualified healthcare provider for proper medical advice, diagnosis, or treatment."
    });

  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze symptoms',
      message: 'Please try again later or consult with a healthcare provider directly.'
    });
  }
}