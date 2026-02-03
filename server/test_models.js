import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        const models = await genAI.getGenerativeModel({ model: 'gemini-pro' }).apiKey; // Hack to just check init
        // Better way to list models doesn't seem directly exposed easily in simple init, 
        // but let's try to just run a simple prompt with 'gemini-pro'

        console.log("Checking gemini-pro...");
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Hello");
        console.log("gemini-pro success: ", result.response.text());

        console.log("Checking gemini-1.5-flash...");
        const model2 = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result2 = await model2.generateContent("Hello");
        console.log("gemini-1.5-flash success: ", result2.response.text());

    } catch (e) {
        console.error("Error:", e);
    }
}

listModels();
