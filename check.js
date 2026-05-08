const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI('AIzaSyCNqf1dYNe6JCQYLBXRyUaiV3ZS27vwyhI');

async function check() {
  const result = await genAI.listModels();
  for await (const model of result) {
    console.log(model.name);
  }
}
check();