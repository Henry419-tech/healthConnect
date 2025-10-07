// test-gemini.js - Test your Gemini API Key
// Run this with: node test-gemini.js

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Your API key from .env.local
const API_KEY = 'AIzaSyCBvcZcifEzCLdhCTV5ECg_EauTzYJCvts';

async function testGeminiAPI() {
  console.log('🔍 Testing Gemini API Key...\n');
  
  try {
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    console.log('✅ API Key format is valid\n');
    
    // Try different model names
    const modelsToTest = [
      'gemini-pro',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'models/gemini-pro',
      'models/gemini-1.5-pro',
      'models/gemini-1.5-flash'
    ];
    
    console.log('🧪 Testing available models...\n');
    
    for (const modelName of modelsToTest) {
      try {
        console.log(`Testing: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const result = await model.generateContent('Say "Hello" if you can hear me');
        const response = await result.response;
        const text = response.text();
        
        console.log(`✅ ${modelName} WORKS!`);
        console.log(`   Response: ${text.substring(0, 50)}...\n`);
        
        // If we found a working model, show the exact code to use
        console.log('🎉 SUCCESS! Use this model name in your code:');
        console.log(`   model: "${modelName}"\n`);
        return;
        
      } catch (error) {
        console.log(`❌ ${modelName} failed: ${error.message}\n`);
      }
    }
    
    console.log('\n❌ None of the standard model names worked.');
    console.log('\n📋 Possible issues:');
    console.log('1. API key might be invalid or expired');
    console.log('2. API key might not have Gemini API enabled');
    console.log('3. Your region might not have access to these models');
    console.log('\n🔧 Next steps:');
    console.log('1. Go to: https://makersuite.google.com/app/apikey');
    console.log('2. Create a new API key or verify your existing one');
    console.log('3. Make sure "Generative Language API" is enabled');
    console.log('4. Check if there are any usage restrictions on your key');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Verify your API key at: https://makersuite.google.com/app/apikey');
    console.log('2. Make sure you copied the entire key');
    console.log('3. Check if the key is enabled for Gemini API');
  }
}

// Also test listing available models
async function listAvailableModels() {
  console.log('\n📋 Attempting to list available models...\n');
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
    );
    
    if (!response.ok) {
      console.log(`❌ Failed to list models: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    
    if (data.models && data.models.length > 0) {
      console.log('✅ Available models for your API key:');
      data.models.forEach(model => {
        console.log(`   - ${model.name}`);
        if (model.supportedGenerationMethods) {
          console.log(`     Methods: ${model.supportedGenerationMethods.join(', ')}`);
        }
      });
    } else {
      console.log('⚠️  No models found for your API key');
    }
  } catch (error) {
    console.log(`❌ Error listing models: ${error.message}`);
  }
}

// Run tests
console.log('=' .repeat(60));
console.log('GEMINI API KEY TESTER');
console.log('=' .repeat(60) + '\n');

testGeminiAPI()
  .then(() => listAvailableModels())
  .then(() => {
    console.log('\n' + '='.repeat(60));
    console.log('Test complete!');
    console.log('='.repeat(60));
  })
  .catch(error => {
    console.error('Unexpected error:', error);
  });