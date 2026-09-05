(function(){
    const productSelectors = ".cart, .secondone, .thirdone";
    const categoryNames = ["Flowers", "Chocolates", "Teddy", "Jewelry", "Gifts", "Hearts"];
    const cataloguePages = [
        ["flowers.html", "Flowers"],
        ["chocolates.html", "Chocolates"],
        ["teddy.html", "Teddy"],
        ["jewelry.html", "Jewelry"],
        ["gifts.html", "Gifts"],
        ["hearts.html", "Hearts"]
    ];
    let externalCataloguePromise;

    function escapeHtml(value){
        return String(value).replace(/[&<>\"']/g, character => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;"
        }[character]));
    }

    function getProducts(){
        return Array.from(document.querySelectorAll(productSelectors)).map((card, index) => {
            const name = card.querySelector("h3")?.innerText.trim() || "";
            const priceText = card.querySelector("p")?.innerText || "";
            const price = Number(priceText.replace(/[^0-9]/g, ""));
            const image = card.querySelector("img")?.src || "";
            const words = `${name} ${card.querySelector("img")?.alt || ""}`.toLowerCase();
            let category = "Gifts";
            if(/chocolat/.test(words)) category = "Chocolates";
            else if(/teddy|bear/.test(words)) category = "Teddy";
            else if(/jwell|jewel|gold|chain/.test(words)) category = "Jewelry";
            else if(/heart/.test(words)) category = "Hearts";
            else if(/rose|bouquet|flower/.test(words)) category = "Flowers";
            return { id: `page-product-${index}`, name, price, priceText, image, category, card, index };
        }).filter(product => product.name && product.price > 0);
    }

    function getAllProducts(){
        if(!externalCataloguePromise){
            externalCataloguePromise = Promise.all(cataloguePages.map(([page, category]) => new Promise(resolve => {
                if(location.pathname.toLowerCase().endsWith(`/${page}`)){
                    resolve([]);
                    return;
                }
                const frame = document.createElement("iframe");
                frame.hidden = true;
                frame.src = `${page}?assistant-catalogue=1`;
                frame.onload = () => {
                    const frameProducts = Array.from(frame.contentDocument?.querySelectorAll(productSelectors) || []).map((card, index) => {
                        const name = card.querySelector("h3")?.innerText.trim() || "";
                        const priceText = card.querySelector("p")?.innerText || "";
                        return {
                            id: `catalogue-${category.toLowerCase()}-${index}`,
                            name,
                            price: Number(priceText.replace(/[^0-9]/g, "")),
                            priceText,
                            image: card.querySelector("img")?.src || "",
                            category,
                            card,
                            index
                        };
                    }).filter(product => product.name && product.price > 0);
                    resolve(frameProducts);
                };
                frame.onerror = () => resolve([]);
                document.body.appendChild(frame);
            }))).then(groups => {
                const localProducts = getProducts();
                const allProducts = [...localProducts, ...groups.flat()];
                return allProducts.filter((product, index, products) => products.findIndex(candidate => candidate.name === product.name && candidate.price === product.price) === index);
            });
        }
        return externalCataloguePromise;
    }

    function scoreProduct(product, answers){
        let score = 0;
        if(answers.type !== "Any" && product.category === answers.type) score += 8;
        if(answers.budget && product.price <= Number(answers.budget)) score += 5;
        if(answers.interests){
            answers.interests.toLowerCase().split(/[, ]+/).filter(Boolean).forEach(token => {
                if(`${product.name} ${product.category}`.toLowerCase().includes(token)) score += 3;
            });
        }
        if(answers.style === "premium" || answers.style === "expensive") score += product.price;
        if(answers.style === "cheap") score += Math.max(0, 5000 - product.price);
        if(answers.style === "cute" && ["Teddy", "Hearts", "Chocolates"].includes(product.category)) score += 5;
        if(["Girlfriend", "Wife", "Proposal", "Valentine's Day", "Anniversary"].includes(answers.recipient) && product.category === "Flowers") score += 2;
        if(["Boyfriend", "Husband"].includes(answers.recipient) && ["Gifts", "Chocolates"].includes(product.category)) score += 2;
        if(answers.occasion === "Birthday" && ["Gifts", "Chocolates", "Teddy"].includes(product.category)) score += 2;
        return score;
    }

    function reasonFor(product, answers){
        if(answers.interests && product.name.toLowerCase().includes(answers.interests.toLowerCase())) return `A lovely match for their ${answers.interests} interest.`;
        if(answers.budget && product.price <= Number(answers.budget)) return `It fits comfortably within your ₹${answers.budget} budget.`;
        if(answers.type !== "Any" && product.category === answers.type) return `A thoughtful ${product.category.toLowerCase()} choice for this occasion.`;
        return `A versatile ${product.category.toLowerCase()} pick for ${answers.occasion.toLowerCase()}.`;
    }

    function createAssistant(){
        if(document.querySelector(".ai-gift-launcher")) return;
        const typeOptions = ["Any", ...categoryNames].map(value => `<option>${value}</option>`).join("");
        document.body.insertAdjacentHTML("beforeend", `
            <button class="ai-gift-launcher" type="button" aria-controls="aiGiftPanel" aria-expanded="false">💝 AI Gift Assistant</button>
            <section class="ai-gift-panel" id="aiGiftPanel" aria-label="AI Gift Assistant">
                <div class="ai-gift-header"><h2>💝 AI Gift Assistant</h2><div><button class="ai-gift-clear" type="button" id="aiGiftClear">Clear</button><button class="ai-gift-close" type="button" aria-label="Close assistant">×</button></div></div>
                <div class="ai-gift-content">
                    <div class="ai-gift-chat" id="aiGiftChat" aria-live="polite"><div class="ai-gift-message ai">Tell me about the moment and I’ll find gifts from this collection.</div></div>
                    <p class="ai-gift-intro">You can type in the form or speak naturally.</p>
                    <form class="ai-gift-form" id="aiGiftForm">
                        <label>Who are you buying for?<select name="recipient"><option>Girlfriend</option><option>Boyfriend</option><option>Wife</option><option>Husband</option><option>Friend</option><option>Family</option></select></label>
                        <label>What is the occasion?<select name="occasion"><option>Birthday</option><option>Anniversary</option><option>Valentine's Day</option><option>Wedding</option><option>Proposal</option><option>Just Because</option></select></label>
                        <label>Budget<select name="budget"><option value="500">Under ₹500</option><option value="1000">Under ₹1,000</option><option value="2000">Under ₹2,000</option><option value="5000">Any budget</option></select></label>
                        <label>Gift type preference<select name="type">${typeOptions}</select></label>
                        <label>Interests or preferences<input name="interests" type="text" placeholder="e.g. roses, chocolate, gold"></label>
                        <button class="ai-gift-submit" type="submit">Find my gifts</button>
                    </form>
                    <form class="ai-gift-composer" id="aiGiftComposer">
                        <input id="aiGiftText" type="text" placeholder="Type your gift request..." autocomplete="off">
                        <button type="submit">Send</button>
                    </form>
                    <div class="ai-gift-voice" aria-live="polite">
                        <button type="button" class="ai-gift-mic" id="aiGiftMic">🎙️ Speak your request</button>
                        <button type="button" class="ai-gift-stop" id="aiGiftStop" hidden>Stop listening</button>
                        <span id="aiGiftVoiceStatus">Voice input is optional.</span>
                    </div>
                    <div class="ai-gift-quick" aria-label="Quick suggestions">
                        <button type="button" data-quick="birthday">🎂 Birthday</button><button type="button" data-quick="anniversary">💑 Anniversary</button><button type="button" data-quick="valentine">❤️ Valentine's Day</button><button type="button" data-quick="budget">🎁 Under ₹500</button><button type="button" data-quick="premium">💎 Premium Gift</button>
                    </div>
                    <div class="ai-gift-results" id="aiGiftResults"></div>
                </div>
            </section>
        `);
        const launcher = document.querySelector(".ai-gift-launcher");
        const panel = document.querySelector(".ai-gift-panel");
        const form = document.getElementById("aiGiftForm");
        const results = document.getElementById("aiGiftResults");
        const micButton = document.getElementById("aiGiftMic");
        const stopButton = document.getElementById("aiGiftStop");
        const voiceStatus = document.getElementById("aiGiftVoiceStatus");
        const chat = document.getElementById("aiGiftChat");
        const composer = document.getElementById("aiGiftComposer");
        const textInput = document.getElementById("aiGiftText");
        let conversationRequest = 0;
        const voiceContext = {
            recipient: null,
            occasion: null,
            budget: null,
            budgetMode: null,
            budgetMin: null,
            budgetMax: null,
            type: null,
            interests: null,
            style: null,
            negativePreferences: null,
            previousRecommendations: [],
            selectedProduct: null,
            conversationHistory: []
        };
        const setOpen = open => { panel.classList.toggle("open", open); launcher.setAttribute("aria-expanded", String(open)); };
        launcher.addEventListener("click", () => setOpen(!panel.classList.contains("open")));
        panel.querySelector(".ai-gift-close").addEventListener("click", () => setOpen(false));

        async function recommend(overrideAnswers, selectedIds, excludeIds){
            const answers = overrideAnswers || Object.fromEntries(new FormData(form).entries());
            if(!externalCataloguePromise) voiceStatus.textContent = "Searching the Love Gifts collection...";
            const products = await getAllProducts();
            const budget = Number(answers.budget) || 5000;
            const budgetMatches = products.filter(product => {
                if(answers.budgetMode === "above") return product.price >= Number(answers.budgetMin || answers.budget);
                if(answers.budgetMode === "between") return product.price >= Number(answers.budgetMin) && product.price <= Number(answers.budgetMax);
                return product.price <= budget;
            });
            let matches = budgetMatches;
            if(answers.type !== "Any") matches = matches.filter(product => product.category === answers.type);
            if(answers.negativePreferences){
                const excluded = answers.negativePreferences.toLowerCase();
                matches = matches.filter(product => !excluded.includes(product.category.toLowerCase()) && !excluded.includes(product.name.toLowerCase()));
            }
            if(!matches.length && answers.type !== "Any"){
                matches = budgetMatches.filter(product => !answers.negativePreferences || !answers.negativePreferences.toLowerCase().includes(product.category.toLowerCase()));
            }
            if(selectedIds?.length){
                const selected = new Set(selectedIds);
                const selectedMatches = matches.filter(product => selected.has(product.id));
                if(selectedMatches.length) matches = selectedMatches;
            }
            if(excludeIds?.length){
                const excluded = new Set(excludeIds);
                const alternatives = matches.filter(product => !excluded.has(product.id));
                matches = alternatives.length ? alternatives : budgetMatches.filter(product => !excluded.has(product.id));
            }
            matches.sort((first, second) => scoreProduct(second, answers) - scoreProduct(first, answers) || (answers.style === "premium" || answers.style === "expensive" ? second.price - first.price : first.price - second.price));
            if(!matches.length){
                results.innerHTML = `<div class="ai-gift-empty">I couldn’t find a matching product on this page. Try “Any” gift type or a larger budget.</div>`;
                return;
            }
            const shownMatches = matches.slice(0, 3);
            const combo = getCombination(matches, budget, answers);
            results.innerHTML = shownMatches.map((product, index) => `
                <article class="ai-gift-result"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}"><div><h3>${escapeHtml(product.name)}</h3><p>₹${product.price} · ${escapeHtml(reasonFor(product, answers))}</p><div class="ai-gift-result-actions"><button type="button" data-action="view" data-index="${index}">View</button><button type="button" data-action="buy" data-index="${index}">Buy Now</button><button type="button" data-action="cart" data-index="${index}">Add to cart</button><button type="button" data-action="wishlist" data-index="${index}">Wishlist</button></div></div></article>
            `).join("") + (combo ? `<article class="ai-gift-combo"><strong>💕 Gift combination</strong><p>${combo.items.map(item => `${escapeHtml(item.name)} ₹${item.price}`).join(" + ")} = ₹${combo.total}</p><button type="button" data-action="combo-cart">Add Both to Cart</button></article>` : "");
            results._matches = shownMatches;
            results._combo = combo;
            voiceContext.previousRecommendations = shownMatches.map(product => ({ id: product.id, name: product.name, price: product.price, category: product.category }));
        }

        function getCombination(products, budget, answers){
            if(answers.type !== "Any" || products.length < 2) return null;
            const preferred = products.filter(product => ["Flowers", "Chocolates"].includes(product.category));
            for(let firstIndex = 0; firstIndex < preferred.length; firstIndex++){
                for(let secondIndex = firstIndex + 1; secondIndex < preferred.length; secondIndex++){
                    const items = [preferred[firstIndex], preferred[secondIndex]];
                    const total = items[0].price + items[1].price;
                    if(total <= budget) return { items, total };
                }
            }
            return null;
        }

        function addChatMessage(role, text){
            const message = document.createElement("div");
            message.className = `ai-gift-message ${role}`;
            message.textContent = text;
            chat.appendChild(message);
            chat.scrollTop = chat.scrollHeight;
            voiceContext.conversationHistory.push({ role, content: text });
        }

        function setAssistantResponse(text){
            voiceStatus.textContent = text;
            addChatMessage("ai", text);
            speak(text);
        }

        function clearConversation(){
            conversationRequest++;
            if(recognition) recognition.stop();
            if("speechSynthesis" in window) window.speechSynthesis.cancel();
            Object.keys(voiceContext).forEach(key => voiceContext[key] = key === "conversationHistory" ? [] : null);
            form.reset();
            results.innerHTML = "";
            results._matches = [];
            results._combo = null;
            chat.innerHTML = '<div class="ai-gift-message ai">Tell me about the moment and I’ll find gifts from this collection.</div>';
            voiceStatus.textContent = "Voice input is optional.";
            textInput.value = "";
        }

        function selectBudget(amount){
            const budgetOptions = Array.from(form.elements.budget.options);
            const suitableOption = budgetOptions.find(option => Number(option.value) >= amount);
            form.elements.budget.value = suitableOption ? suitableOption.value : "5000";
        }

        function parseVoiceRequest(transcript){
            const spoken = transcript.toLowerCase().replace(/[.,!?]/g, " ");
            const recipientMap = [
                ["Girlfriend", /girlfriend|girl friend|en ponnu|en lover|en gf/],
                ["Boyfriend", /boyfriend|boy friend|en paiyan|en bf/],
                ["Wife", /wife|my woman|en manaivi/],
                ["Husband", /husband|en kanavar/],
                ["Friend", /friend|nanban|nanbi|thozhi/],
                ["Family", /family|amma|mother|mom|app?a|father|sister|brother|kudumbam/]
            ];
            const occasionMap = [
                ["Valentine's Day", /valentine|kadhalar thinam|kaadhalar thinam/],
                ["Anniversary", /anniversary|thirumana naal/],
                ["Birthday", /birthday|birth day|pirandha naal|porandha naal/],
                ["Wedding", /wedding|marriage|thirumanam/],
                ["Proposal", /proposal|propose/],
                ["Just Because", /just because|surprise|summa|special gift/]
            ];
            const categoryMap = [
                ["Flowers", /flower|flowers|rose|roses|bouquet|malar|poo/],
                ["Chocolates", /chocolate|chocolates|cocoa/],
                ["Teddy", /teddy|bear/],
                ["Jewelry", /jewel|jewell|jwell|gold|chain|nagai/],
                ["Hearts", /heart|hearts|idhayam/],
                ["Gifts", /(?:show|display|give|list|options?|now|instead|only|need)\s+(?:me\s+)?gifts?|general\s+gifts?/]
            ];
            const findMatch = dictionary => dictionary.find(([, pattern]) => pattern.test(spoken))?.[0] || null;
            const matchedCategories = categoryMap.filter(([, pattern]) => pattern.test(spoken)).map(([name]) => name);
            const rangeMatch = spoken.match(/(?:between|from)\s*(\d{2,5})\s*(?:and|to)\s*(\d{2,5})/i);
            const aboveMatch = spoken.match(/(?:above|over|more than|ku mela|க்கு மேல)\s*(?:₹|rs\.?|rupees?\s*)?(\d{2,5})/i);
            const numberWords = { "five hundred": 500, "six hundred": 600, "seven hundred": 700, "eight hundred": 800, "nine hundred": 900, "one thousand": 1000, thousand: 1000 };
            const wordBudget = Object.entries(numberWords).find(([phrase]) => spoken.includes(phrase));
            const budgetMatch = spoken.match(/(?:under|below|around|budget|₹|rs\.?|rupees?|ரூபாய்)\s*(?:is\s*)?(?:of\s*)?(\d{2,5})|\b(\d{2,5})\s*(?:rupees?|rs\.?|ரூபாய்|kulla|kullae|ku kulla)/i);
            const showAlternative = /show more|more options|another|different|vera|don't like|dont like|vendam|not these/.test(spoken);
            const interestWords = ["rose", "roses", "flower", "flowers", "chocolate", "chocolates", "teddy", "jewelry", "jewellery", "gold", "heart"].filter(word => spoken.includes(word));
            const negativePreference = (spoken.match(/(?:no|not|don't want|dont want|vendam|vend[aă]m)\s+(flowers?|chocolates?|tedd(?:y|ies)|jewel(?:ry|lery)|hearts?|gifts?)/i)?.[1] || null);
            const positiveCategories = matchedCategories.filter(value => !negativePreference || !negativePreference.toLowerCase().includes(value.toLowerCase().replace("jewelry", "jewel")));
            return {
                recipient: findMatch(recipientMap),
                occasion: findMatch(occasionMap),
                type: positiveCategories.length === 1 ? positiveCategories[0] : null,
                budget: wordBudget ? wordBudget[1] : rangeMatch ? Number(rangeMatch[2]) : aboveMatch ? Number(aboveMatch[1]) : budgetMatch ? Number(budgetMatch[1] || budgetMatch[2]) : null,
                budgetMode: rangeMatch ? "between" : aboveMatch ? "above" : budgetMatch ? (/under|below|kulla|kullae|kulla|க்கு/.test(spoken) ? "under" : "around") : null,
                budgetMin: rangeMatch ? Number(rangeMatch[1]) : aboveMatch ? Number(aboveMatch[1]) : null,
                budgetMax: rangeMatch ? Number(rangeMatch[2]) : null,
                interests: [...new Set([...interestWords, ...matchedCategories.map(value => value.toLowerCase())])].join(", ") || null,
                style: /premium|luxury|expensive|high.?end/.test(spoken) ? "premium" : /cheap|budget.?friendly|low.?cost/.test(spoken) ? "cheap" : /cute|kawaii/.test(spoken) ? "cute" : /love|romantic|special|kadhal|kaadhal|anbu/.test(spoken) ? "romantic" : null,
                negativePreferences: negativePreference,
                showAlternative,
                intent: /gift|present|parisu|venum|v?e?ndu[mn]|want|need|looking|something/.test(spoken)
            };
        }

        function applyVoiceContext(parsed){
            const canonical = value => {
                if(!value || typeof value !== "string") return value;
                const match = [...categoryNames, "Girlfriend", "Boyfriend", "Wife", "Husband", "Friend", "Family", "Birthday", "Anniversary", "Valentine's Day", "Wedding", "Proposal", "Just Because"].find(option => option.toLowerCase() === value.toLowerCase());
                return match || value;
            };
            Object.keys(voiceContext).forEach(key => {
                if(parsed[key]) voiceContext[key] = key === "recipient" || key === "occasion" || key === "type" ? canonical(parsed[key]) : parsed[key];
            });
            if(voiceContext.recipient) form.elements.recipient.value = voiceContext.recipient;
            if(voiceContext.occasion) form.elements.occasion.value = voiceContext.occasion;
            if(voiceContext.type) form.elements.type.value = voiceContext.type;
            if(voiceContext.budget) selectBudget(voiceContext.budget);
            if(voiceContext.interests) form.elements.interests.value = voiceContext.interests;
        }

        async function understandWithServer(transcript){
            const endpoint = window.AI_GIFT_API_URL || (window.location.protocol === "file:" ? "http://localhost:8787/api/gift-assistant" : "/api/gift-assistant");
            let timeout;
            try{
            const catalogue = await getAllProducts();
                const controller = new AbortController();
                timeout = setTimeout(() => controller.abort(), 2500);
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    signal: controller.signal,
                    body: JSON.stringify({ message: transcript, state: voiceContext, history: voiceContext.conversationHistory, previousRecommendations: voiceContext.previousRecommendations, catalogue: catalogue.map(({ id, name, price, category }) => ({ id, name, price, category })) })
                });
                if(!response.ok) return null;
                return await response.json();
            } catch(error){
                return null;
            } finally {
                if(timeout) clearTimeout(timeout);
            }
        }

        function getVoiceFollowUp(){
            const hasShoppingSignal = voiceContext.type || voiceContext.budget || voiceContext.style || voiceContext.interests;
            if(!voiceContext.recipient && !hasShoppingSignal) return "💕 Of course! Who are you buying it for?";
            if(voiceContext.recipient && !voiceContext.occasion && !hasShoppingSignal) return `Nice! I’ll find something special for your ${voiceContext.recipient.toLowerCase()}. What’s the occasion?`;
            if(voiceContext.recipient && voiceContext.occasion && !voiceContext.budget && !voiceContext.type && !voiceContext.style) return `A ${voiceContext.occasion.toLowerCase()} gift for your ${voiceContext.recipient.toLowerCase()} sounds lovely. What’s your budget?`;
            return null;
        }

        async function updateFromSpeech(transcript){
            const requestId = ++conversationRequest;
            addChatMessage("user", transcript);
            const serverResult = await understandWithServer(transcript);
            if(requestId !== conversationRequest) return;
            const parsed = serverResult?.fields || parseVoiceRequest(transcript);
            applyVoiceContext(parsed);
            const shouldShowAlternative = parsed.showAlternative || /show more|more options|another|different|vera|vendam|not these/i.test(transcript);
            if(serverResult?.action === "clear"){
                clearConversation();
                return;
            }
            if(serverResult?.action === "add_to_cart" || serverResult?.action === "wishlist" || serverResult?.action === "buy_now"){
                const actionProducts = getProducts().filter(product => (serverResult.productIds || []).includes(product.id));
                actionProducts.forEach(product => {
                    if(serverResult.action === "add_to_cart") product.card.querySelector(".cartHra")?.click();
                    if(serverResult.action === "wishlist") product.card.querySelector(".wishlist-btn")?.click();
                    if(serverResult.action === "buy_now" && typeof handleBuyNow === "function") handleBuyNow(product.card.querySelector(".buy-now") || product.card.querySelector(".cartHra"));
                });
                setAssistantResponse(serverResult.reply || "Done. I used the existing product action for that item.");
                return;
            }
            if(serverResult?.reply){
                const missing = getVoiceFollowUp();
                if(missing || serverResult.fields?.missingInformation?.length){
                    setAssistantResponse(missing || serverResult.reply);
                    return;
                }
            }
            const followUp = getVoiceFollowUp();
            if(followUp){
                setAssistantResponse(followUp);
                return;
            }
            await recommend({
                recipient: voiceContext.recipient || "Friend",
                occasion: voiceContext.occasion || "Just Because",
                budget: voiceContext.budget || 5000,
                budgetMode: voiceContext.budgetMode || "under",
                budgetMin: voiceContext.budgetMin || null,
                budgetMax: voiceContext.budgetMax || null,
                type: voiceContext.type || "Any",
                interests: voiceContext.interests || "",
                negativePreferences: voiceContext.negativePreferences || ""
            }, serverResult?.productIds, shouldShowAlternative ? voiceContext.previousRecommendations.map(product => product.id) : []);
            const response = serverResult?.reply || `Here are some ${voiceContext.style || "lovely"}${voiceContext.occasion ? ` ${voiceContext.occasion.toLowerCase()}` : ""} gift ideas${voiceContext.recipient ? ` for your ${voiceContext.recipient.toLowerCase()}` : ""}${voiceContext.budget ? ` under ₹${voiceContext.budget}` : ""}.`;
            setAssistantResponse(response);
        }

        function speak(message){
            if("speechSynthesis" in window){
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(message);
                utterance.rate = 1;
                window.speechSynthesis.speak(utterance);
            }
        }

        const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        let recognition;
        if(!Recognition){
            micButton.disabled = true;
            voiceStatus.textContent = "Voice input is not supported here. You can still use the form.";
        } else {
            recognition = new Recognition();
            recognition.lang = "en-IN";
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;
            recognition.onstart = () => {
                micButton.classList.add("listening");
                micButton.textContent = "🎙️ Listening...";
                stopButton.hidden = false;
                voiceStatus.textContent = "Listening for your gift request...";
            };
            recognition.onresult = event => {
                const transcript = event.results[0][0].transcript;
                voiceStatus.textContent = `Heard: “${transcript}”`;
                updateFromSpeech(transcript);
            };
            recognition.onerror = event => {
                const message = event.error === "not-allowed" ? "Microphone permission was denied. You can still use the form." : "I could not hear that. Please try again or use the form.";
                voiceStatus.textContent = message;
                speak(message);
            };
            recognition.onend = () => {
                micButton.classList.remove("listening");
                micButton.textContent = "🎙️ Speak your request";
                stopButton.hidden = true;
            };
            micButton.addEventListener("click", () => {
                try { recognition.start(); } catch(error) { voiceStatus.textContent = "Voice input is already active."; }
            });
            stopButton.addEventListener("click", () => recognition.stop());
        }

        form.addEventListener("submit", event => { event.preventDefault(); recommend(); });
        panel.querySelectorAll("[data-quick]").forEach(button => button.addEventListener("click", () => {
            const action = button.dataset.quick;
            if(action === "birthday") form.elements.occasion.value = "Birthday";
            if(action === "anniversary") form.elements.occasion.value = "Anniversary";
            if(action === "valentine") form.elements.occasion.value = "Valentine's Day";
            if(action === "budget") form.elements.budget.value = "500";
            if(action === "premium") form.elements.budget.value = "5000";
            recommend();
        }));
        results.addEventListener("click", event => {
            const button = event.target.closest("button[data-action]");
            if(!button || !results._matches) return;
            const product = results._matches[Number(button.dataset.index)];
            if(button.dataset.action === "view") product.card.scrollIntoView({ behavior: "smooth", block: "center" });
            if(button.dataset.action === "buy" && typeof handleBuyNow === "function") handleBuyNow(product.card.querySelector(".buy-now") || product.card.querySelector(".cartHra"));
            if(button.dataset.action === "cart"){
                const addButton = product.card.querySelector(".cartHra");
                if(addButton) addButton.click();
            }
            if(button.dataset.action === "wishlist"){
                const wishlistButton = product.card.querySelector(".wishlist-btn");
                if(wishlistButton) wishlistButton.click();
            }
            if(button.dataset.action === "combo-cart" && results._combo){
                results._combo.items.forEach(product => product.card.querySelector(".cartHra")?.click());
            }
        });
        composer.addEventListener("submit", event => {
            event.preventDefault();
            const message = textInput.value.trim();
            if(!message){
                setAssistantResponse("Please type a gift request or use the microphone.");
                return;
            }
            textInput.value = "";
            updateFromSpeech(message);
        });
        document.getElementById("aiGiftClear").addEventListener("click", clearConversation);
    }

    document.addEventListener("DOMContentLoaded", () => {
        if(new URLSearchParams(window.location.search).has("assistant-catalogue")) return;
        createAssistant();
        createRecommendationFeature();
    });

    function createRecommendationFeature(){
        const form = document.getElementById("aiRecommendationForm");
        if(!form) return;
        const budgetSelect = form.elements.budget;
        const customBudget = form.querySelector(".custom-budget-field");
        const status = document.getElementById("aiRecommendationStatus");
        const results = document.getElementById("aiRecommendationResults");
        const submit = form.querySelector("button[type=submit]");
        let requestInProgress = false;

        budgetSelect.addEventListener("change", () => {
            const isCustom = budgetSelect.value === "custom";
            customBudget.hidden = !isCustom;
            form.elements.customBudget.required = isCustom;
        });

        function safeText(value){
            return String(value ?? "").replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[character]));
        }

        function getCatalogue(){
            return Array.from(document.querySelectorAll(".cart, .secondone, .thirdone")).map((card, index) => ({
                id: `home-product-${index}`,
                name: card.querySelector("h3")?.innerText.trim() || "",
                price: Number((card.querySelector("p")?.innerText || "").replace(/[^0-9]/g, "")),
                category: getProductCategory(card),
                searchText: `${card.querySelector("h3")?.innerText || ""} ${card.querySelector("img")?.alt || ""}`.toLowerCase(),
                card
            })).filter(product => product.name && product.price > 0);
        }

        function getProductCategory(card){
            const words = `${card.querySelector("h3")?.innerText || ""} ${card.querySelector("img")?.alt || ""}`.toLowerCase();
            if(/chocolat/.test(words)) return "Chocolates";
            if(/teddy|bear/.test(words)) return "Teddy";
            if(/jwell|jewel|gold|chain|frame/.test(words)) return "Jewelry";
            if(/heart/.test(words)) return "Hearts";
            if(/rose|bouquet|flower/.test(words)) return "Flowers";
            return "Gifts";
        }

        async function getModel(){
            await window.loveGiftsFirebaseReady;
            if(!window.loveGiftsFirebaseApp) throw new Error("Firebase is unavailable");
            const [{ getAI, getGenerativeModel, GoogleAIBackend }] = await Promise.all([
                import("https://www.gstatic.com/firebasejs/12.0.0/firebase-ai.js")
            ]);
            const ai = getAI(window.loveGiftsFirebaseApp, { backend: new GoogleAIBackend() });
            return getGenerativeModel(ai, { model: "gemini-3.7-flash", generationConfig: { responseMimeType: "application/json", temperature: 0.35 } }, { timeout: 30000 });
        }

        async function generateRecommendations(prompt){
            const response = await Promise.race([
                getModel().then(model => model.generateContent(prompt)),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Gemini request timed out")), 10000))
            ]);
            const responseText = response?.response?.text?.();
            if(!responseText || !responseText.trim()) throw new Error("Gemini returned an empty response");
            return JSON.parse(responseText);
        }

        function getCatalogFallback(values, budget, catalogue){
            const interests = values.interests.toLowerCase().split(/[,\s]+/).filter(Boolean);
            const preferences = `${values.personality || ""} ${values.occasion} ${values.recipient}`.toLowerCase();
            const romanticRecipients = ["girlfriend", "boyfriend", "wife", "husband"].includes(values.recipient.toLowerCase());
            const ranked = catalogue.map(product => {
                let score = 0;
                const text = `${product.name} ${product.searchText} ${product.category}`;
                interests.forEach(token => { if(text.includes(token)) score += 12; });
                if(product.price <= budget) score += 10;
                else score -= Math.min(10, Math.ceil((product.price - budget) / 250));
                if(/birthday/.test(preferences) && ["Gifts", "Chocolates", "Teddy"].includes(product.category)) score += 5;
                if(/anniversary|valentine|wedding|romantic/.test(preferences) && ["Flowers", "Hearts", "Jewelry"].includes(product.category)) score += 6;
                if(/friendship|friend/.test(preferences) && ["Gifts", "Chocolates", "Teddy"].includes(product.category)) score += 5;
                if(romanticRecipients && ["Flowers", "Hearts", "Jewelry"].includes(product.category)) score += 4;
                if(/cute/.test(preferences) && ["Teddy", "Hearts", "Chocolates"].includes(product.category)) score += 5;
                if(/elegant|simple/.test(preferences) && ["Jewelry", "Flowers", "Gifts"].includes(product.category)) score += 4;
                return { product, score };
            }).sort((first, second) => second.score - first.score || first.product.price - second.product.price);
            const withinBudget = ranked.filter(({ product }) => product.price <= budget);
            const selected = (withinBudget.length >= 3 ? withinBudget : ranked).slice(0, 3);
            return { recommendations: selected.map(({ product }, index) => ({
                productId: product.id,
                whyItSuits: `${product.category} gift selected for ${values.recipient} on ${values.occasion}.`,
                personalizedReason: `Matches ${values.interests}${values.personality ? ` and their ${values.personality} style` : ""}.`,
                match: index === 0 ? "Perfect Match" : index === 1 ? "Great Match" : "Good Match"
            })) };
        }

        function renderRecommendations(data, catalogue){
            const recommendations = Array.isArray(data) ? data : data.recommendations;
            if(!Array.isArray(recommendations) || recommendations.length !== 3) throw new Error("Gemini did not return exactly three recommendations");
            const catalogById = new Map(catalogue.map(item => [item.id, item]));
            const productIds = recommendations.map(recommendation => recommendation.productId || recommendation.id);
            if(new Set(productIds).size !== 3 || productIds.some(productId => !catalogById.has(productId))) throw new Error("Gemini returned a product outside the catalog");
            results.innerHTML = recommendations.map(recommendation => {
                const product = catalogById.get(recommendation.productId || recommendation.id);
                const name = product.name;
                return `<article class="ai-recommendation-card"><img class="ai-recommendation-image" src="${safeText(product.card.querySelector("img")?.src || "")}" alt="${safeText(name)}"><h3>${safeText(name)}</h3><p class="ai-recommendation-price">₹${product.price}</p><span class="ai-recommendation-match">${safeText(recommendation.match || "Good Match")}</span><p><strong>Why:</strong> ${safeText(recommendation.whyItSuits || "A thoughtful choice based on your preferences.")}</p><p><strong>Personalized for you:</strong> ${safeText(recommendation.personalizedReason || "Chosen around the preferences you shared.")}</p><button class="ai-recommendation-view" type="button" data-product-id="${product.id}">View Gift</button><button class="ai-recommendation-cart" type="button" data-cart-product-id="${product.id}">Add to cart</button><button class="ai-recommendation-wishlist" type="button" data-wishlist-product-id="${product.id}">Wishlist</button></article>`;
            }).join("");
        }

        form.addEventListener("submit", async event => {
            event.preventDefault();
            if(requestInProgress) return;
            const values = Object.fromEntries(new FormData(form).entries());
            const budget = values.budget === "custom" ? Number(values.customBudget) : Number(values.budget);
            if(!values.recipient || !values.occasion || !budget || budget < 1 || !values.interests.trim()){
                status.textContent = "Please choose a recipient, occasion, budget, and tell us what they like.";
                results.innerHTML = "";
                return;
            }
            requestInProgress = true;
            submit.disabled = true;
            status.textContent = "✨ Checking the Love Gifts collection...";
            results.innerHTML = "";
            const catalogue = getCatalogue();
            try{
                if(catalogue.length < 3) throw new Error("Catalog contains fewer than three products");
                const prompt = `Recommend exactly 3 different products for a Love Gifts customer. Use recipient, occasion, budget, interests/likes, and personality/preference to rank and explain the best matches. You MUST return only productId values copied exactly from the supplied catalogue. Never create or alter a product name, price, image, ID, or URL. Return JSON only in this shape: {"recommendations":[{"productId":"exact catalogue id","whyItSuits":"short explanation","personalizedReason":"short personalized explanation","match":"Perfect Match|Great Match|Good Match"}]}. Prefer products within budget, but always return three different catalogue IDs when at least three products are supplied. Inputs: recipient=${values.recipient}; occasion=${values.occasion}; budget=₹${budget}; interests=${values.interests}; personality=${values.personality || "not provided"}. Catalogue: ${JSON.stringify(catalogue.map(({id, name, price, category, searchText}) => ({id, name, price, category, searchText})))}.`;
                const recommendationData = await generateRecommendations(prompt);
                renderRecommendations(recommendationData, catalogue);
                status.textContent = "💕 Your AI Gift Recommendations";
                if(window.loveGiftsFirebaseApp && window.firebase?.auth && firebase.auth().currentUser && window.firebase?.firestore){
                    firebase.firestore().collection("users").doc(firebase.auth.currentUser.uid).collection("recommendations").add({ inputPreferences: { ...values, budget }, aiRecommendations: recommendationData.recommendations, createdAt: firebase.firestore.FieldValue.serverTimestamp() }).catch(() => {});
                }
            } catch(error){
                console.error("AI Gift Recommendation error:", {
                    name: error?.name || "Error",
                    code: error?.code || "unknown",
                    message: error?.message || String(error),
                    details: error?.customData || error?.customErrorData || null
                });
                try{
                    const fallback = getCatalogFallback(values, budget, catalogue);
                    if(fallback.recommendations.length === 3){
                        renderRecommendations(fallback, catalogue);
                        status.textContent = "AI is taking a short break. Here are the best matches from our Love Gifts collection.";
                    } else {
                        throw new Error("Catalog contains fewer than three products");
                    }
                } catch(fallbackError){
                    console.error("Catalog fallback failed:", fallbackError);
                    status.textContent = "We need a few more products in the Love Gifts collection to make three recommendations.";
                }
            } finally {
                requestInProgress = false;
                submit.disabled = false;
            }
        });
        results.addEventListener("click", event => {
            const product = getCatalogue().find(item => item.id === event.target.dataset.productId);
            if(product) product.card.scrollIntoView({ behavior: "smooth", block: "center" });
            const cartProduct = getCatalogue().find(item => item.id === event.target.dataset.cartProductId);
            if(cartProduct) cartProduct.card.querySelector(".cartHra")?.click();
            const wishlistProduct = getCatalogue().find(item => item.id === event.target.dataset.wishlistProductId);
            if(wishlistProduct) wishlistProduct.card.querySelector(".wishlist-btn")?.click();
        });
    }
})();
