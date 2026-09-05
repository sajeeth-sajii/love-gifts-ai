const http = require("http");
const fs = require("fs");
const path = require("path");

const port = Number(process.env.PORT || 8787);
const host = "0.0.0.0";
const frontendRoot = path.join(__dirname, "index.html", "css", "Project.html");
const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const systemPrompt = `You are Gemini, a conversational gift-shopping assistant for one specific Love Gifts website. Understand natural English, Tamil, Tanglish, mixed language, corrections, comparisons, vague requests, relative price changes, and references such as first, second, cheaper, another, this, அது, இது, vera, and vendam. Use the supplied conversation state, history, previous recommendations, and catalogue. Never invent a product, ID, name, price, image, availability, or user fact. Only select IDs that occur in catalogue. Return valid JSON only with this shape: {"fields":{"recipient":string|null,"occasion":string|null,"budget":number|null,"budgetMode":"under"|"above"|"between"|"around"|null,"budgetMin":number|null,"budgetMax":number|null,"type":string|null,"interests":string|null,"style":string|null,"negativePreferences":string|null,"missingInformation":string[]},"productIds":[],"action":"recommend"|"add_to_cart"|"buy_now"|"wishlist"|"clear"|"none","reply":string}. Allowed product IDs are only from catalogue. Preserve state unless the latest message adds, corrects, excludes, or replaces it. Ask only one useful follow-up when required. A love or romantic request alone means style=romantic but does not identify recipient, occasion, or budget. For recommendation requests, return up to 3 suitable catalogue IDs. For product actions, resolve ordinal references using previousRecommendations and return those exact IDs. If the user asks a normal question about a recommended item, answer from the supplied data without inventing facts.`;

function send(response, status, body){
    response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
    response.end(JSON.stringify(body));
}

function readBody(request){
    return new Promise((resolve, reject) => {
        let body = "";
        request.on("data", chunk => { body += chunk; if(body.length > 100000) reject(new Error("Request too large")); });
        request.on("end", () => resolve(JSON.parse(body || "{}")));
        request.on("error", reject);
    });
}

async function handleAssistant(request, response){
    if(!apiKey){
        send(response, 503, { error: "GEMINI_API_KEY is not configured" });
        return;
    }
    try{
        const input = await readBody(request);
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const prompt = JSON.stringify({
            conversationState: input.state || {},
            conversationHistory: input.history || [],
            previousRecommendations: input.previousRecommendations || [],
            latestUserMessage: input.message || "",
            catalogue: input.catalogue || []
        });
        const completion = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
            })
        });
        const data = await completion.json();
        if(!completion.ok) throw new Error(data.error?.message || "AI request failed");
        const resultText = data.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("") || "{}";
        const result = JSON.parse(resultText);
        send(response, 200, result);
    } catch(error){
        send(response, 500, { error: "The AI service is temporarily unavailable" });
    }
}

function serveFrontend(request, response, pathname){
    if(request.method !== "GET" && request.method !== "HEAD"){
        response.writeHead(405, { "Allow": "GET, HEAD" });
        response.end();
        return;
    }
    let relativePath;
    try{
        relativePath = decodeURIComponent(pathname === "/" ? "/sajeeth.html" : pathname);
    } catch(error){
        response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Bad request");
        return;
    }
    const filePath = path.resolve(frontendRoot, `.${relativePath}`);
    if(filePath !== frontendRoot && !filePath.startsWith(`${frontendRoot}${path.sep}`)){
        response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Forbidden");
        return;
    }
    fs.stat(filePath, (error, fileInfo) => {
        if(error || !fileInfo.isFile()){
            response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            response.end("Not found");
            return;
        }
        const extension = path.extname(filePath).toLowerCase();
        const contentTypes = {
            ".css": "text/css; charset=utf-8",
            ".html": "text/html; charset=utf-8",
            ".js": "application/javascript; charset=utf-8",
            ".json": "application/json; charset=utf-8",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".svg": "image/svg+xml",
            ".webp": "image/webp",
            ".ico": "image/x-icon",
            ".woff": "font/woff",
            ".woff2": "font/woff2"
        };
        response.writeHead(200, { "Content-Type": contentTypes[extension] || "application/octet-stream" });
        if(request.method === "HEAD"){
            response.end();
            return;
        }
        fs.createReadStream(filePath).pipe(response);
    });
}

http.createServer((request, response) => {
    if(request.method === "OPTIONS"){
        response.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" });
        response.end();
        return;
    }
    const pathname = new URL(request.url, `http://${request.headers.host || "localhost"}`).pathname;
    if(request.method === "POST" && pathname === "/api/gift-assistant"){
        handleAssistant(request, response);
        return;
    }
    serveFrontend(request, response, pathname);
}).listen(port, host, () => console.log(`Gift assistant server listening on http://${host}:${port}`));
