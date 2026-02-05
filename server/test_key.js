import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    console.log("Checking API Key...");
    if (!process.env.GEMINI_API_KEY) {
        console.error("❌ No GEMINI_API_KEY found in environment");
        return;
    }
    console.log("Key present (starts with):", process.env.GEMINI_API_KEY.substring(0, 5) + "...");

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const modelsToTest = ["gemini-1.5-flash", "gemini-pro", "gemini-1.0-pro", "gemini-1.5-pro"];

    console.log("\nStarting connectivity test...");

    for (const modelName of modelsToTest) {
        console.log(`\nTesting model: ${modelName} ...`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hello, are you working?");
            const responseText = result.response.text();
            console.log(`✅ SUCCESS! ${modelName} is working.`);
            console.log(`Response: ${responseText.substring(0, 50)}...`);
            return; // Exit after finding first working model
        } catch (e) {
            console.log(`❌ FAILED ${modelName}`);
            console.log(`Error: ${e.message}`);
            if (e.message.includes("404")) console.log("-> Model not found or not available for this key");
            if (e.message.includes("403")) console.log("-> Permission denied (API not enabled or quota issues)");
        }
    }
    console.log("\n❌ All models failed. Please check your API key and Google Cloud Project settings.");
}

test();
