const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI('YOUR_API_KEY');

async function check() {
  const result = await genAI.listModels();
  for await (const model of result) {
    console.log(model.name);
  }
}
check();